import isArray from 'lodash/isArray';
import reduceRight from 'lodash/reduceRight';
import isPlainObject from 'lodash/isPlainObject';
import isEmpty from 'lodash/isEmpty';
import forEach from 'lodash/forEach';
import intersection from 'lodash/intersection';
import difference from 'lodash/difference';
import combineReducers from './combineReducers';
import combineSubscribers from './combineSubscribers';
import multiplexSubscriber from './multiplexSubscriber';

// Hack an additional "root" node to make some convience.
//
// combineReducers() and combineSubscribers() only accept
// a plain object, which causes extra handling if we pass
// a top reducer or a top subscriber for the whole state
// without hacking the reducer or subscriber to an object.
//
// What's more, mergeTree() and separateTree() in mount-
// Reducer() only accept plain objects as their (x, y)
// arguments.
//
function hack(e) {
  return {
    root: e
  };
}

export default function createStore(middlewares) {
  const initReducer = () => ({/* root: undefined*/});

  let currentState = {/* root: undefined*/};
  let currentReducer = initReducer;
  let currentReducerTree = {};
  let currentSubscribers = [];
  let previousDispatch = Promise.resolve();

  function getState() {
    // extract the actual state from hacking
    let { root } = currentState;
    return root;
  }

  function mountReducer(reducer) {
    if (typeof reducer !== 'function' && !isPlainObject(reducer)) {
      throw new Error(
        'Expected reducer to be a function or a plain object.'
      );
    }

    reducer = hack(reducer);

    currentReducerTree = (function mergeTree(x, y, keyStack = []) {
      let node = Object.assign({}, x);

      let xKeys = Object.keys(x);
      let yKeys = Object.keys(y);

      let sameKeys = intersection(xKeys, yKeys);
      forEach(sameKeys, (key) => {
        let childKeyStack = [ ...keyStack, key ];

        if (typeof x[key] === 'function' || typeof y[key] === 'function') {
          throw new Error(
            'Conflict when mounting difference reducers on the ' +
            `same node ${childKeyStack.join('.')}.`
          );
        }

        node[key] = mergeTree(x[key], y[key], childKeyStack);
      });

      let diffKeys = difference(yKeys, xKeys);
      forEach(diffKeys, (key) => {
        node[key] = y[key];
      });

      return node;
    })(currentReducerTree, reducer);

    currentReducer = combineReducers(currentReducerTree);

    let unmounted = false;
    return function unmountReducer() {
      if (unmounted) {
        return;
      }

      currentReducerTree = (function separateTree(x, y) {
        let node = {};

        forEach(x, (value, key) => {
          if (value === y[key]) {
            return;
          }

          if (y[key]) {
            value = separateTree(value, y[key]);

            if (isEmpty(value)) {
              return;
            }
          }

          node[key] = value;
        });

        return node;
      })(currentReducerTree, reducer);

      if (isEmpty(currentReducerTree)) {
        currentReducer = initReducer;
      } else {
        currentReducer = combineReducers(currentReducerTree);
      }

      unmounted = true;
    };
  }

  function subscribe(...listener) {
    let resultSubscriber = null;

    if (listener.length === 1) {
      // combineSubscribers
      let [ subscriber ] = listener;

      subscriber = hack(subscriber);
      resultSubscriber = combineSubscribers(subscriber);
    } else if (listener.length === 2) {
      // multiplexSubscriber
      let [ target, subscriber ] = listener;

      target = hack(target);
      resultSubscriber = multiplexSubscriber(target, subscriber);
    } else {
      throw new Error(
        'Unexpected arguments.'
      );
    }

    currentSubscribers.push(resultSubscriber);

    let unsubscribed = false;
    return function unsubscribe() {
      if (unsubscribed) {
        return;
      }

      let index = currentSubscribers.indexOf(resultSubscriber);
      currentSubscribers.splice(index, 1);

      unsubscribed = true;
    };
  }

  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects.'
      );
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property.'
      );
    }

    // to make sure all dispatching run in the sequence
    // they emitted
    previousDispatch = previousDispatch.then(() => {
      return Promise.resolve().then(() => {
        return Promise.all([
          currentReducer(currentState, action)
        ]).then(([ state ]) => {
          currentState = state;

          // copy a listeners list to avoid the effect of
          // unsubscribing in listeners
          let listeners = currentSubscribers.slice();
          let promises = [];

          forEach(listeners, (listener) => {
            promises.push(
              listener(currentState)
            );
          });

          return Promise.all(promises);
        }).then(() => action);
      });
    });

    return previousDispatch;
  }

  // support middlewares
  let pipeline = dispatch;
  if (isArray(middlewares) && !isEmpty(middlewares)) {
    pipeline = reduceRight(
      middlewares,
      function wrapMiddlewares(next, middleware) {
        return action => Promise.resolve().then(() => {
          return Promise.all([
            middleware(action, next)
          ]).then(([ returnAction ]) => returnAction);
        });
      },
      (action) => dispatch(action)
    );
  }

  function initState() {
    return pipeline({ type: '@@coeus/INIT' });
  }

  return {
    getState,
    mountReducer,
    subscribe,
    dispatch: pipeline,
    initState
  };
}
