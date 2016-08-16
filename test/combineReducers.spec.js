import expect from 'expect';
import combineReducers from '../src/combineReducers';

describe('combineReducers', () => {
  it('returns a composite reducer that maps ' +
    'the state keys to given reducers', () => {
    const reducer = combineReducers({
      counter: (state = 0, action) =>
      action.type === 'increment' ? state + 1 : state,
      stack: (state = [], action) =>
      action.type === 'push' ? [ ...state, action.value ] : state
    });

    return reducer({}, { type: 'increment' }).then((s1) => {
      expect(s1).toEqual({ counter: 1, stack: [] });

      return reducer(s1, { type: 'push', value: 'a' });
    }).then((s2) => {
      expect(s2).toEqual({ counter: 1, stack: [ 'a' ] });
    });
  });

  it('supports promise in reducers', () => {
    const reducer = combineReducers({
      counter: (state = 0, action) => new Promise(function(resolve) {
        setTimeout(function() {
          resolve(action.type === 'increment' ? state + 1 : state);
        });
      }),
      stack: (state = [], action) => new Promise(function(resolve) {
        setTimeout(function() {
          resolve(
            action.type === 'push' ? [ ...state, action.value ] : state
          );
        });
      })
    });

    return reducer({}, { type: 'increment' }).then((s1) => {
      expect(s1).toEqual({ counter: 1, stack: [] });

      return reducer(s1, { type: 'push', value: 'a' });
    }).then((s2) => {
      expect(s2).toEqual({ counter: 1, stack: [ 'a' ] });
    });
  });

  it('supports recursive combination', () => {
    const reducer = combineReducers({
      tree: {
        nodeOne: (state = 'one') => state,
        children: {
          nodeTwo: (state = 'two') => state,
          nodeThree: (state = 'three') => state
        }
      }
    });

    return reducer().then((state) => {
      expect(state).toEqual({
        tree: {
          nodeOne: 'one',
          children: {
            nodeTwo: 'two',
            nodeThree: 'three'
          }
        }
      });
    });
  });

  it('ignores all props which are not a function or a plain object', () => {
    const reducer = combineReducers({
      fake: true,
      broken: 'string',
      stack: (state = []) => state
    });

    return reducer({ }).then((state) => {
      expect(
        Object.keys(state)
      ).toEqual([ 'stack' ]);
    });
  });

  it('throws error if invalid reducers are passed to combineReducers', () => {
    expect(() => {
      combineReducers(233);
    }).toThrow(/Invalid reducer/);

    expect(() => {
      combineReducers('233');
    }).toThrow(/Invalid reducer/);

    expect(() => {
      combineReducers(() => {});
    }).toThrow(/Invalid reducer/);

    expect(() => {
      combineReducers({ bar: 233 });
    }).toThrow(/Invalid reducer/);

    expect(() => {
      combineReducers({ root: { foo: { bar: 233 } } });
    }).toThrow(/Invalid reducer.*on root\.foo/);
  });

  it('throws an error if a reducer returns ' +
    'undefined when handling an action', () => {
    const reducer = combineReducers({
      wrap: {
        counter(state = 0, action) {
          switch (action.type) {
            case 'whatever':
              return undefined;
            default:
              return state;
          }
        }
      }
    });

    return Promise.all([
      reducer({}, { type: 'whatever' }).catch((e) => {
        expect(() => {throw e;}).toThrow(
          /action "whatever".*reducer on wrap\.counter/
        );
      })
    ]);
  });

  it('catches error thrown in reducer when initializing and re-throw', () => {
    const reducer = combineReducers({
      throwingReducer() {
        throw new Error('Error thrown in reducer');
      }
    });
    return reducer({ }).catch((e) => {
      expect(() => {throw e;}).toThrow(/Error thrown in reducer/);
    });
  });

  it('maintains referential equality if ' +
    'the reducers it is combining do', () => {
    const reducer = combineReducers({
      child1(state = { a: 1 }) {
        return state;
      },
      child2(state = { b: 2 }) {
        return state;
      },
      child3(state = { c: 3 }) {
        return state;
      }
    });

    let initialState = null;
    return reducer(undefined, '@@INIT').then((state) => {
      initialState = state;
      return reducer(initialState, { type: 'FOO' });
    }).then((state) => {
      expect(state).toBe(initialState);
    });
  });

  it('does not have referential equality ' +
    'if one of the reducers changes something', () => {
    const reducer = combineReducers({
      child1(state = { }) {
        return state;
      },
      child2(state = { count: 0 }, action) {
        switch (action.type) {
          case 'increment':
            return { count: state.count + 1 };
          default:
            return state;
        }
      },
      child3(state = { }) {
        return state;
      }
    });

    let initialState = null;
    return reducer(undefined, '@@INIT').then((state) => {
      initialState = state;
      return reducer(initialState, { type: 'increment' });
    }).then((state) => {
      expect(state).toNotBe(initialState);
    });
  });

  it('changes state on different reducer ' +
    'shapes to support dynamic reducers', () => {
    const reducer1 = combineReducers({
      foo(state = { foo: 1 }) {
        return state;
      },
      baz(state = { baz: 3 }) {
        return state;
      }
    });

    const reducer2 = combineReducers({
      foo(state = { foo: 1 }) {
        return state;
      },
      baz: {
        qux(state = { qux: 3 }) {
          return state;
        }
      }
    });

    const reducer3 = combineReducers({
      foo(state = { foo: 1 }) {
        return state;
      }
    });

    return reducer1().then((state) => {
      expect(state).toEqual({
        foo: { foo: 1 },
        baz: { baz: 3 }
      });

      return reducer2(state);
    }).then((state) => {
      expect(state).toEqual({
        foo: { foo: 1 },
        baz: {
          qux: { qux: 3 }
        }
      });

      return reducer3(state);
    }).then((state) => {
      expect(state).toEqual({
        foo: { foo: 1 }
      });
    });
  });

  it('throws error if state shape does not match reducer shape', () => {
    const reducer1 = combineReducers({
      foo(state = { foo: 1 }) {
        return state;
      },
      baz(state = 3) {
        return state;
      }
    });

    const reducer2 = combineReducers({
      foo(state = { foo: 1 }) {
        return state;
      },
      baz: {
        qux(state = { qux: 3 }) {
          return state;
        }
      }
    });

    return reducer1().then((state) => {
      expect(state).toEqual({
        foo: { foo: 1 },
        baz: 3
      });

      return reducer2(state).catch((e) => {
        expect(() => {throw e;}).toThrow(
          /state baz.*type "number"/
        );
      });
    });
  });
});
