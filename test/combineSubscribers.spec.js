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

    subscriber({ foo: 4, bar: 5 });

    expect(foo.calls.length).toEqual(1);
    expect(bar.calls.length).toEqual(1);
    expect(traceFoo).toEqual([ 4 ]);
    expect(traceBar).toEqual([ 5 ]);

    subscriber({ foo: 2, bar: 2 });

    expect(foo.calls.length).toEqual(2);
    expect(bar.calls.length).toEqual(2);
    expect(traceFoo).toEqual([ 4, 2 ]);
    expect(traceBar).toEqual([ 5, 2 ]);
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

    subscriber({ foo: 4, bar: 5 });

    expect(foo.calls.length).toEqual(1);
    expect(bar.calls.length).toEqual(1);
    expect(traceFoo).toEqual([ 4 ]);
    expect(traceBar).toEqual([ 5 ]);

    subscriber({ foo: 4, bar: 2 });

    expect(foo.calls.length).toEqual(1);
    expect(bar.calls.length).toEqual(2);
    expect(traceFoo).toEqual([ 4 ]);
    expect(traceBar).toEqual([ 5, 2 ]);
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

    subscriber({
      tree: {
        one: 1,
        children: {
          two: 2,
          three: 3
        }
      }
    });

    expect(one.calls.length).toEqual(1);
    expect(two.calls.length).toEqual(1);
    expect(three.calls.length).toEqual(1);
    expect(traceOne).toEqual([ 1 ]);
    expect(traceTwo).toEqual([ 2 ]);
    expect(traceThree).toEqual([ 3 ]);

    subscriber({
      tree: {
        one: 1,
        children: {
          two: 20,
          three: 3
        }
      }
    });

    expect(one.calls.length).toEqual(1);
    expect(two.calls.length).toEqual(2);
    expect(three.calls.length).toEqual(1);
    expect(traceOne).toEqual([ 1 ]);
    expect(traceTwo).toEqual([ 2, 20 ]);
    expect(traceThree).toEqual([ 3 ]);
  });

  it('ignores all props which are not a function or a plain object', () => {
    let stack = [];
    const subscriber = combineSubscribers({
      fake: true,
      broken: 'string',
      stack: (e) => stack.push(e)
    });

    subscriber({ fake: 1, broken: 1, stack: 1 });

    expect(stack).toEqual([ 1 ]);
  });

  it('throws error if invalid subscribers ' +
    'are passed to combineSubscribers', () => {
    expect(() => {
      combineSubscribers(233);
    }).toThrow(/Expected subscriber/);

    expect(() => {
      combineSubscribers('233');
    }).toThrow(/Expected subscriber/);

    expect(() => {
      combineSubscribers(() => {});
    }).toThrow(/Expected subscriber/);

    expect(() => {
      combineSubscribers({ bar: 233 });
    }).toThrow(/Expected subscriber/);

    expect(() => {
      combineSubscribers({ foo: { bar: 233 } });
    }).toThrow(/Expected subscriber.*on foo/);
  });

  it('throws error if subscriber shape does not match state shape', () => {
    const subscriber = combineSubscribers({
      foo: {
        bar: (state) => state
      }
    });

    expect(() => {
      subscriber({ foo: 233 });
    }).toThrow(/state foo.*type "number"/);
  });
});
