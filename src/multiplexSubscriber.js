import isPlainObject from 'lodash/isPlainObject';
import forEach from 'lodash/forEach';

export default function multiplexSubscriber(target, subscriber) {
  if (!isPlainObject(target)) {
    throw new Error('Unexpected type of target.');
  }

  if (typeof subscriber !== 'function') {
    throw new Error('Unexpected type of subscriber.');
  }

  // record keys of tags to avoid duplicate tags
  let checkTags = {};

  let tracer = (function createTracer(node, keyStack = []) {
    let keys = Object.keys(node);
    let keyTracers = {};

    forEach(keys, (key) => {
      let nextKeyStack = [ ...keyStack, key ];

      if (typeof node[key] === 'string') {
        let tag = node[key];

        // check duplicate tag
        if (checkTags[tag] === true) {
          throw new Error(`Duplicate tag of target on ${nextKeyStack.join('.')}.`);
        } else {
          checkTags[tag] = true;
        }

        // create a leaf tracer
        keyTracers[key] = function(tags, value) {
          return { ...tags, [tag]: value };
        };
      } else if (isPlainObject(node[key])) {
        // recursive
        keyTracers[key] = createTracer(node[key], nextKeyStack);
      } else {
        throw new Error(`Unexpected type of target on ${nextKeyStack.join('.')}.`);
      }
    });

    // to store the previous state
    let previousStates = {};

    return function Tracer(tags, states = {}) {
      if (!isPlainObject(states)) {
        throw new Error(
          `Expected a plain object on state ${keyStack.join('.')} ` +
          `but receive type "${typeof states}".` +
          'Try to change subscriber shape to match state shape.');
      }

      let resultTags = tags;

      forEach(keys, (key) => {
        let keyTracer = keyTracers[key];

        if (previousStates[key] === states[key]) {
          return;
        }

        if (states[key] === undefined) {
          delete previousStates[key];
        } else {
          previousStates[key] = states[key];
        }

        resultTags = keyTracer(resultTags, states[key]);
      });

      return resultTags;
    };
  })(target);

  // presistent tags as a flatten internal state
  // listened by multiplex subscriber
  let tags = {};

  return function resultSubscriber(state) {
    let resultTags = tracer(tags, state);

    if (resultTags !== tags) {
      tags = resultTags;

      subscriber(tags);
    }
  };
}
