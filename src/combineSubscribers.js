import isPlainObject from 'lodash/isPlainObject';
import forEach from 'lodash/forEach';
import isEmpty from 'lodash/isEmpty';

export default function combineSubscribers(subscribers, keyStack = []) {
  if (!isPlainObject(subscribers)) {
    throw new Error(`Unexpected type of subscriber on ${keyStack.join('.')}.`);
  }

  let subscriberKeys = Object.keys(subscribers);
  let finalSubscriberKeys = [];
  let finalSubscribers = {};

  forEach(subscriberKeys, (key) => {
    if (typeof subscribers[key] === 'function') {
      finalSubscriberKeys.push(key);
      finalSubscribers[key] = subscribers[key];
    } else if (isPlainObject(subscribers[key])) {
      // support recursive
      finalSubscriberKeys.push(key);
      finalSubscribers[key] = combineSubscribers(subscribers[key], [
        ...keyStack,
        key
      ]);
    }
  });

  if (isEmpty(finalSubscriberKeys)) {
    throw new Error(`Unexpected type of subscriber on ${keyStack.join('.')}.`);
  }

  // to store the previous state
  let previousStates = {};

  return function combination(states = {}) {
    if (!isPlainObject(states)) {
      throw new Error(
        `Expected a plain object on state ${keyStack.join('.')} ` +
        `but receive type "${typeof states}".` +
        'Try to change subscriber shape to match state shape.');
    }

    forEach(finalSubscriberKeys, (key) => {
      let subscriber = finalSubscribers[key];

      // only has the sub-state been changed
      // we notify the sub-subscriber
      if (previousStates[key] === states[key]) {
        return;
      }

      if (states[key] === undefined) {
        delete previousStates[key];
      } else {
        previousStates[key] = states[key];
      }

      subscriber(states[key]);
    });
  };
}
