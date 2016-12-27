import expect from 'expect';
import multiplexSubscriber from '../src/multiplexSubscriber';

describe('multiplexSubscriber', () => {
  it('returns a multiplex subscriber that ' +
    'will be notified once a tag of target has been changed', () => {
    let traceState = [];
    const tracer = expect.createSpy((state) => {
      traceState.push(state);
    }).andCallThrough();

    const subscriber = multiplexSubscriber({
      foo: 'fooTag',
      bar: {
        bar: {
          bar: 'barTag'
        }
      }
    }, tracer);

    subscriber({ foo: 4 });

    expect(tracer.calls.length).toEqual(1);
    expect(traceState).toEqual([{ fooTag: 4 }]);

    subscriber({ foo: 4, bar: { bar: { bar: 6 } } });

    expect(tracer.calls.length).toEqual(2);
    expect(traceState).toEqual([
      { fooTag: 4 },
      { fooTag: 4, barTag: 6 }
    ]);

    subscriber({ bar: { bar: { bar: 6 } } });

    expect(tracer.calls.length).toEqual(3);
    expect(traceState).toEqual([
      { fooTag: 4},
      { fooTag: 4, barTag: 6 },
      { barTag: 6 }
    ]);
  });

  it('will not be notified ' +
    'if target has not been changed', () => {
    let traceState = [];
    const tracer = expect.createSpy(({ fooTag, barTag }) => {
      traceState.push({ fooTag, barTag });
    }).andCallThrough();

    const subscriber = multiplexSubscriber({
      foo: 'fooTag',
      bar: 'barTag'
    }, tracer);

    subscriber({ foo: 4, bar: 5 });

    expect(tracer.calls.length).toEqual(1);
    expect(traceState).toEqual([{ fooTag: 4, barTag: 5 }]);

    subscriber({ foo: 4, bar: 5 });

    expect(tracer.calls.length).toEqual(1);
    expect(traceState).toEqual([{ fooTag: 4, barTag: 5 }]);

    subscriber({ foo: 4, bar: 5 });

    expect(tracer.calls.length).toEqual(1);
    expect(traceState).toEqual([{ fooTag: 4, barTag: 5 }]);
  });

  it('throws error if subscriber is not function', () => {
    expect(() => {
      multiplexSubscriber({
        foo: 'fooTag'
      }, 'bar');
    }).toThrow(/Expected subscriber/);

    expect(() => {
      multiplexSubscriber({
        foo: 'fooTag'
      }, 233);
    }).toThrow(/Expected subscriber/);

    expect(() => {
      multiplexSubscriber({
        foo: 'fooTag'
      }, {});
    }).toThrow(/Expected subscriber/);
  });

  it('throws error if target is not a tree with string type leaves', () => {
    expect(() => {
      multiplexSubscriber(233, function() {});
    }).toThrow(/Expected target/);

    expect(() => {
      multiplexSubscriber([], function() {});
    }).toThrow(/Expected target/);

    expect(() => {
      multiplexSubscriber(function() {}, function() {});
    }).toThrow(/Expected target/);

    expect(() => {
      multiplexSubscriber({
        foo: 233
      }, function() {});
    }).toThrow(/Expected target.*foo/);

    expect(() => {
      multiplexSubscriber({
        foo: [ '233' ]
      }, function() {});
    }).toThrow(/Expected target.*foo/);

    expect(() => {
      multiplexSubscriber({
        foo: function() {}
      }, function() {});
    }).toThrow(/Expected target.*foo/);
  });

  it('throws error when checking duplicate tag', () => {
    expect(() => {
      multiplexSubscriber({
        foo: 'fooTag',
        bar: {
          foo: 'fooTag'
        }
      }, function() {});
    }).toThrow(/Duplicate tag/);
  });

  it('throws error if subscriber shape does not match state shape', () => {
    const subscriber = multiplexSubscriber({
      foo: {
        bar: 'fooTag'
      }
    }, function() {});

    expect(() => {
      subscriber({ foo: 233 });
    }).toThrow(/state foo.*type "number"/);
  });
});
