import expect from 'expect';
import combineSubscribers from '../src/combineSubscribers';

describe('combineSubscribers', () => {
  it('returns a composite subscriber that ' +
    'maps the state keys to given subscribers', () => {
    let traceFoo = [];
    let traceBar = [];
    const foo = expect.createSpy((state) => {
      traceFoo.push(state);
    }).andCallThrough();
    const bar = expect.createSpy((state) => {
      traceBar.push(state);
    }).andCallThrough();

    const subscriber = combineSubscribers({
      foo,
      bar
    });

    return subscriber({ foo: 4, bar: 5 }).then(() => {
      expect(foo.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(1);
      expect(traceFoo).toEqual([ 4 ]);
      expect(traceBar).toEqual([ 5 ]);

      return subscriber({ foo: 2, bar: 2 });
    }).then(() => {
      expect(foo.calls.length).toEqual(2);
      expect(bar.calls.length).toEqual(2);
      expect(traceFoo).toEqual([ 4, 2 ]);
      expect(traceBar).toEqual([ 5, 2 ]);
    });
  });

  it('notify subscriber only has state been changed', () => {
    let traceFoo = [];
    let traceBar = [];
    const foo = expect.createSpy((state) => {
      traceFoo.push(state);
    }).andCallThrough();
    const bar = expect.createSpy((state) => {
      traceBar.push(state);
    }).andCallThrough();

    const subscriber = combineSubscribers({
      foo,
      bar
    });

    return subscriber({ foo: 4, bar: 5 }).then(() => {
      expect(foo.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(1);
      expect(traceFoo).toEqual([ 4 ]);
      expect(traceBar).toEqual([ 5 ]);

      return subscriber({ foo: 4, bar: 2 });
    }).then(() => {
      expect(foo.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(2);
      expect(traceFoo).toEqual([ 4 ]);
      expect(traceBar).toEqual([ 5, 2 ]);
    });
  });

  it('support promise in subscribers', () => {
    let traceFoo = [];
    let traceBar = [];
    const foo = expect.createSpy((state) => {
      return new Promise((resolve) => {
        traceFoo.push(state);
        resolve();
      });
    }).andCallThrough();
    const bar = expect.createSpy((state) => {
      return new Promise((resolve) => {
        traceBar.push(state);
        resolve();
      });
    }).andCallThrough();

    const subscriber = combineSubscribers({
      foo,
      bar
    });

    return subscriber({ foo: 4, bar: 5 }).then(() => {
      expect(foo.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(1);
      expect(traceFoo).toEqual([ 4 ]);
      expect(traceBar).toEqual([ 5 ]);

      return subscriber({ foo: 4, bar: 2 });
    }).then(() => {
      expect(foo.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(2);
      expect(traceFoo).toEqual([ 4 ]);
      expect(traceBar).toEqual([ 5, 2 ]);
    });
  });

  it('support recursive combination', () => {
    let traceOne = [];
    let traceTwo = [];
    let traceThree = [];

    const one = expect.createSpy((state) => {
      traceOne.push(state);
    }).andCallThrough();
    const two = expect.createSpy((state) => {
      traceTwo.push(state);
    }).andCallThrough();
    const three = expect.createSpy((state) => {
      traceThree.push(state);
    }).andCallThrough();

    const subscriber = combineSubscribers({
      tree: {
        one,
        children: {
          two,
          three
        }
      }
    });

    return subscriber({
      tree: {
        one: 1,
        children: {
          two: 2,
          three: 3
        }
      }
    }).then(() => {
      expect(one.calls.length).toEqual(1);
      expect(two.calls.length).toEqual(1);
      expect(three.calls.length).toEqual(1);
      expect(traceOne).toEqual([ 1 ]);
      expect(traceTwo).toEqual([ 2 ]);
      expect(traceThree).toEqual([ 3 ]);

      return subscriber({
        tree: {
          one: 1,
          children: {
            two: 20,
            three: 3
          }
        }
      });
    }).then(() => {
      expect(one.calls.length).toEqual(1);
      expect(two.calls.length).toEqual(2);
      expect(three.calls.length).toEqual(1);
      expect(traceOne).toEqual([ 1 ]);
      expect(traceTwo).toEqual([ 2, 20 ]);
      expect(traceThree).toEqual([ 3 ]);
    });
  });

  it('ignores all props which are not a function or a plain object', () => {
    let stack = [];
    const subscriber = combineSubscribers({
      fake: true,
      broken: 'string',
      stack: (e) => stack.push(e)
    });

    return subscriber({ fake: 1, broken: 1, stack: 1 }).then(() => {
      expect(stack).toEqual([ 1 ]);
    });
  });

  it('throws error if invalid subscribers ' +
    'are passed to combineSubscribers', () => {
    expect(() => {
      combineSubscribers(233);
    }).toThrow(/Invalid subscriber.*/);

    expect(() => {
      combineSubscribers('233');
    }).toThrow(/Invalid subscriber.*/);

    expect(() => {
      combineSubscribers(() => {});
    }).toThrow(/Invalid subscriber.*/);

    expect(() => {
      combineSubscribers({ bar: 233 });
    }).toThrow(/Invalid subscriber.*/);

    expect(() => {
      combineSubscribers({ foo: { bar: 233 } });
    }).toThrow(/Invalid subscriber.*on foo/);
  });

  it('throws error if subscriber shape does not match state shape', () => {
    const subscriber = combineSubscribers({
      foo: {
        bar: (state) => state
      }
    });

    subscriber({ foo: 233 }).catch((e) => {
      expect(() => {throw e;}).toThrow(
        /state foo.*type "number"/
      );
    });
  });
});
