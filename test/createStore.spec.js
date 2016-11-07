import expect from 'expect';
import createStore from '../src/createStore';

describe('createStore', () => {
  it('exposes the public API', () => {
    const store = createStore();
    const methods = Object.keys(store);

    expect(methods.length).toBe(5);
    expect(methods).toContain('getState');
    expect(methods).toContain('initState');
    expect(methods).toContain('mountReducer');
    expect(methods).toContain('subscribe');
    expect(methods).toContain('dispatch');
  });

  it('mounts and unmounts reducers', () => {
    const store = createStore();
    let unmount1 = null;
    let unmount2 = null;
    let unmount3 = null;

    unmount1 = store.mountReducer({
      one: {
        two: (state = 2) => state,
        three: (state = 3) => state
      },
      four: (state = 4) => state
    });

    return store.initState().then(() => {
      expect(store.getState()).toEqual({
        one: {
          two: 2,
          three: 3
        },
        four: 4
      });

      unmount2 = store.mountReducer({
        one: {
          five: (state = 5) => state,
          six: (state = 6) => state
        },
        seven: {
          eight: {
            nine: (state = 9) => state
          }
        }
      });

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        one: {
          two: 2,
          three: 3,
          five: 5,
          six: 6
        },
        four: 4,
        seven: {
          eight: {
            nine: 9
          }
        }
      });

      unmount1();

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        one: {
          five: 5,
          six: 6
        },
        seven: {
          eight: {
            nine: 9
          }
        }
      });

      unmount3 = store.mountReducer({
        ten: {
          eleven: (state = 11) => state
        },
        seven: {
          eight: {
            twelve: {
              thirteen: (state = 13) => state
            }
          }
        }
      });

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        one: {
          five: 5,
          six: 6
        },
        seven: {
          eight: {
            nine: 9,
            twelve: {
              thirteen: 13
            }
          }
        },
        ten: {
          eleven: 11
        }
      });

      unmount3();

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        one: {
          five: 5,
          six: 6
        },
        seven: {
          eight: {
            nine: 9
          }
        }
      });

      unmount2();

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual(undefined);

      return store.initState();
    });
  });

  it('prevents interrelate effect between ' +
    'different unmounts from the same reducer', () => {
    const store = createStore();

    const reducer = {
      foo: {
        bar: (state = 0) => state
      }
    };

    store.mountReducer({
      foo: {
        baz: (state = 0) => state
      }
    });

    const unmount1 = store.mountReducer(reducer);
    let unmount2 = null;

    return store.initState().then(() => {
      expect(store.getState()).toEqual({
        foo: {
          bar: 0,
          baz: 0
        }
      });

      unmount1();
      unmount2 = store.mountReducer(reducer);
      unmount1();

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        foo: {
          bar: 0,
          baz: 0
        }
      });

      unmount2();

      return store.initState();
    }).then(() => {
      expect(store.getState()).toEqual({
        foo: {
          baz: 0
        }
      });
    });
  });

  it('subscribes listeners', () => {
    const store = createStore();

    let unmount1 = null;
    let unmount2 = null;
    let unmount3 = null;

    let rootState = null;
    const root = expect.createSpy((state) => {
      rootState = state;
    }).andCallThrough();

    let barState = null;
    const bar = expect.createSpy((state) => {
      barState = state;
    }).andCallThrough();

    let xState = null;
    const x = expect.createSpy((state) => {
      xState = state;
    }).andCallThrough();

    let yState = null;
    const y = expect.createSpy((state) => {
      yState = state;
    }).andCallThrough();

    store.subscribe(root);
    store.subscribe({ bar });
    store.subscribe({ bar: { x } });
    store.subscribe({ bar: { y } });

    unmount1 = store.mountReducer({
      bar: {
        x: (state = 0) => (state + 1)
      }
    });

    return store.initState().then(() => {
      expect(root.calls.length).toEqual(1);
      expect(bar.calls.length).toEqual(1);
      expect(x.calls.length).toEqual(1);
      expect(y.calls.length).toEqual(0);

      expect(rootState).toEqual({ bar: { x: 1 } });
      expect(barState).toEqual({ x: 1 });
      expect(xState).toEqual(1);

      unmount2 = store.mountReducer({
        bar: {
          y: (state = 0) => state
        }
      });

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(2);
      expect(bar.calls.length).toEqual(2);
      expect(x.calls.length).toEqual(2);
      expect(y.calls.length).toEqual(1);

      expect(rootState).toEqual({ bar: { x: 2, y: 0 } });
      expect(barState).toEqual({ x: 2, y: 0 });
      expect(xState).toEqual(2);
      expect(yState).toEqual(0);

      unmount3 = store.mountReducer({
        z: (state = 0) => state
      });

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(3);
      expect(bar.calls.length).toEqual(3);
      expect(x.calls.length).toEqual(3);
      expect(y.calls.length).toEqual(1);

      expect(rootState).toEqual({ bar: { x: 3, y: 0 }, z: 0 });
      expect(barState).toEqual({ x: 3, y: 0 });
      expect(xState).toEqual(3);
      expect(yState).toEqual(0);

      unmount1();

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(4);
      expect(bar.calls.length).toEqual(4);
      expect(x.calls.length).toEqual(4);
      expect(y.calls.length).toEqual(1);

      expect(rootState).toEqual({ bar: { y: 0 }, z: 0 });
      expect(barState).toEqual({ y: 0 });
      expect(xState).toEqual(undefined);
      expect(yState).toEqual(0);

      unmount2();

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(5);
      expect(bar.calls.length).toEqual(5);
      expect(x.calls.length).toEqual(4);
      expect(y.calls.length).toEqual(2);

      expect(rootState).toEqual({ z: 0 });
      expect(barState).toEqual(undefined);
      expect(xState).toEqual(undefined);
      expect(yState).toEqual(undefined);

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(5);
      expect(bar.calls.length).toEqual(5);
      expect(x.calls.length).toEqual(4);
      expect(y.calls.length).toEqual(2);

      expect(rootState).toEqual({ z: 0 });
      expect(barState).toEqual(undefined);
      expect(xState).toEqual(undefined);
      expect(yState).toEqual(undefined);

      // double subscribe
      store.subscribe(root);

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(6);
      expect(bar.calls.length).toEqual(5);
      expect(x.calls.length).toEqual(4);
      expect(y.calls.length).toEqual(2);

      expect(rootState).toEqual({ z: 0 });
      expect(barState).toEqual(undefined);
      expect(xState).toEqual(undefined);
      expect(yState).toEqual(undefined);

      // trible subscribe
      store.subscribe(root);

      unmount3();

      return store.initState();
    }).then(() => {
      expect(root.calls.length).toEqual(8);
      expect(bar.calls.length).toEqual(5);
      expect(x.calls.length).toEqual(4);
      expect(y.calls.length).toEqual(2);

      expect(rootState).toEqual(undefined);
      expect(barState).toEqual(undefined);
      expect(xState).toEqual(undefined);
      expect(yState).toEqual(undefined);
    });
  });

  it('delays unsubscribe until the end of current dispatch', () => {
    const store = createStore();

    store.mountReducer((state = 0) => state);

    let unsubscribe2 = null;
    const subscriber1 = expect.createSpy(() => {
      unsubscribe2();
    }).andCallThrough();

    const subscriber2 = expect.createSpy();

    store.subscribe(subscriber1);
    unsubscribe2 = store.subscribe(subscriber2);

    return store.initState().then(() => {
      expect(subscriber1.calls.length).toEqual(1);
      expect(subscriber1.calls.length).toEqual(1);
    });
  });

  it('prevents interrelate effect between ' +
    'different unsubscribes from the same subscriber', () => {
    const store = createStore();

    store.mountReducer((state = 0) => state + 1);

    const subscriber = expect.createSpy();

    const unsubscribe1 = store.subscribe(subscriber);
    const unsubscribe2 = store.subscribe(subscriber);

    return store.initState().then(() => {
      expect(subscriber.calls.length).toEqual(2);

      unsubscribe1();
      unsubscribe1();

      return store.initState();
    }).then(() => {
      expect(subscriber.calls.length).toEqual(3);

      unsubscribe2();

      return store.initState();
    }).then(() => {
      expect(subscriber.calls.length).toEqual(3);
    });
  });

  it('dispatchs actions', () => {
    const store = createStore();

    store.mountReducer({
      foo: (state = 0, action) => {
        switch (action.type) {
          case 'increment': return state + 1;
          default: return state;
        }
      }
    });

    return store.initState().then(() => {
      expect(store.getState()).toEqual({
        foo: 0
      });

      return store.dispatch({ type: 'increment' });
    }).then(() => {
      expect(store.getState()).toEqual({
        foo: 1
      });
    });
  });

  it('throws error if mountReducer doesn\'t ' +
    'receive a plain object or function', () => {
    const store = createStore();

    expect(() => {
      store.mountReducer(233);
    }).toThrow(/Expected reducer/);

    expect(() => {
      store.mountReducer('233');
    }).toThrow(/Expected reducer/);

    expect(() => {
      store.mountReducer([ 123, '233' ]);
    }).toThrow(/Expected reducer/);
  });

  it('conflicts when mounting different reducers on the same node', () => {
    const store = createStore();

    store.mountReducer({
      foo: (state) => state
    });

    expect(() => {
      store.mountReducer((state) => state);
    }).toThrow(/Conflict.*root/);

    expect(() => {
      store.mountReducer({
        bar: (state) => state,
        foo: {
          baz: (state) => state
        }
      });
    }).toThrow(/Conflict.*root\.foo/);

    expect(() => {
      store.mountReducer({
        bar: (state) => state
      });
    }).toNotThrow();
  });

  it('throws error if subscribe doesn\'t ' +
    'receive a plain object or function', () => {
    const store = createStore();

    expect(() => {
      store.subscribe(233);
    }).toThrow(/Expected listener/);

    expect(() => {
      store.subscribe('233');
    }).toThrow(/Expected listener/);

    expect(() => {
      store.subscribe([ 123, '233' ]);
    }).toThrow(/Expected listener/);
  });

  it('throws error if dispatch receives an invalid action', () => {
    const store = createStore();

    expect(() => {
      store.dispatch(233);
    }).toThrow(/Actions.*plain objects/);

    expect(() => {
      store.dispatch('233');
    }).toThrow(/Actions.*plain objects/);

    expect(() => {
      store.dispatch([ 123, '233' ]);
    }).toThrow(/Actions.*plain objects/);

    expect(() => {
      store.dispatch({ foo: 'bar' });
    }).toThrow(/Actions.*"type"/);
  });

  it('supports middlewares', () => {
    const mid1 = expect.createSpy((action, next) => {
      if (action.type === 'short') {
        return {
          type: 'short_return'
        };
      }

      if (action.type === 'throw') {
        throw new Error('throw in middleware');
      }

      return next(action).then((returnAction) => {
        if (returnAction.type === 'hack') {
          return {
            type: 'hack_return'
          };
        }

        return returnAction;
      });
    }).andCallThrough();

    const mid2 = expect.createSpy((action, next) => {
      return next(action);
    }).andCallThrough();

    const store = createStore([
      mid1, mid2
    ]);

    store.mountReducer({
      foo: (state = 0) => state
    });

    return store.initState().then(() => {
      expect(mid1.calls.length).toEqual(1);
      expect(mid2.calls.length).toEqual(1);

      expect(store.getState()).toEqual({
        foo: 0
      });

      return store.dispatch({
        type: 'short'
      });
    }).then((action) => {
      expect(mid1.calls.length).toEqual(2);
      expect(mid2.calls.length).toEqual(1);

      expect(action).toEqual({
        type: 'short_return'
      });

      return store.dispatch({
        type: 'throw'
      }).catch((e) => {
        expect(() => {throw e;}).toThrow(/throw in middleware/);
      });
    }).then(() => {
      expect(mid1.calls.length).toEqual(3);
      expect(mid2.calls.length).toEqual(1);

      return store.dispatch({
        type: 'hack'
      });
    }).then((action) => {
      expect(mid1.calls.length).toEqual(4);
      expect(mid2.calls.length).toEqual(2);

      expect(action).toEqual({
        type: 'hack_return'
      });
    });
  });

  it('guarantees atomicity and sequence of dispatching', () => {
    const store = createStore();

    let p1, p2;
    store.mountReducer({
      foo: (foo, { type }) => {
        if (foo === undefined) {
          p1 = store.dispatch({ type: 'FOO' });

          return [ 1 ];
        }

        switch(type) {
          case 'FOO':
            return [ ...foo, 2 ];
          default:
            return foo;
        }
      },
      bar: (bar, { type }) => {
        if (bar === undefined) {
          setTimeout(() => {
            p2 = store.dispatch({ type: 'BAR' });
          }, 10);

          return new Promise(function (resolve) {
            setTimeout(() => resolve([ 20 ]), 20);
          });
        }

        switch(type) {
          case 'BAR':
            return [ ...bar, 10 ];
          default:
            return bar;
        }
      }
    });

    return store.initState().then(() => {
      expect(store.getState()).toEqual({ foo: [ 1 ], bar: [ 20 ] });

      return p1;
    }).then(() => {
      expect(store.getState().foo).toEqual([ 1, 2 ]);

      return p2;
    }).then(() => {
      expect(store.getState().bar).toEqual([ 20, 10 ]);
    });
  });
});
