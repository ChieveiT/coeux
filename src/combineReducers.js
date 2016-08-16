import isPlainObject from 'lodash/isPlainObject';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import forEach from 'lodash/forEach';

export default function combineReducers(reducers, keyStack = []) {
  if (!isPlainObject(reducers)) {
    throw new Error(`Invalid reducer on ${keyStack.join('.')}.`);
  }

  let reducerKeys = Object.keys(reducers);
  let finalReducerKeys = [];
  let finalReducers = {};

  forEach(reducerKeys, (key) => {
    if (typeof reducers[key] === 'function') {
      finalReducerKeys.push(key);
      finalReducers[key] = reducers[key];
    } else if (isPlainObject(reducers[key])) {
      // recursive
      finalReducerKeys.push(key);
      finalReducers[key] = combineReducers(reducers[key], [
        ...keyStack,
        key
      ]);
    }
  });

  if (isEmpty(finalReducerKeys)) {
    throw new Error(`Invalid reducer on ${keyStack.join('.')}.`);
  }

  return function combination(states = {}, action) {
    return new Promise((resolve, reject) => {
      if (!isPlainObject(states)) {
        throw new Error(
          `Expected a plain object on state ${keyStack.join('.')} ` +
          `but receive type "${typeof states}".` +
          'This may happen because of the conflict between two reducer shape.');
      }

      let hasChanged = false;
      let nextStates = {};
      let promises = [];

      if (!isEqual(Object.keys(states), finalReducerKeys)) {
        hasChanged = true;
      }

      forEach(finalReducerKeys, (key) => {
        let reducer = finalReducers[key];
        let previousState = states[key];

        let p = Promise.all([
          reducer(previousState, action)
        ]).then(([ state ]) => {
          if (state === undefined) {
            let keyStackString = [ ...keyStack, key ].join('.');

            throw new Error(
              `Given action "${action.type}", ` +
              `reducer on ${keyStackString} returned undefined.`
            );
          }

          nextStates[key] = state;
          hasChanged = hasChanged || state !== previousState;
        });

        promises.push(p);
      });

      Promise.all(promises).then(
        () => resolve(hasChanged ? nextStates : states),
        (e) => reject(e)
      );
    });
  };
}
