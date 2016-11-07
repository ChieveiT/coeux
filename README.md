# coeux

[![Build Status](https://travis-ci.org/ChieveiT/coeux.svg?branch=master)](https://travis-ci.org/ChieveiT/coeux)
[![npm version](https://img.shields.io/npm/v/coeux.svg?style=flat-square)](https://www.npmjs.com/package/coeux)
[![npm downloads](https://img.shields.io/npm/dm/coeux.svg?style=flat-square)](https://www.npmjs.com/package/coeux)

Coeux is a state manager to build clean data flow like [redux](http://redux.js.org/index.html). In fact, it is inspired by redux. The biggest difference from redux is that coeux supports Promise in reducers and listeners.

## Install

```shell
npm install coeux
```

## Quick Start

```javascript
import createStore from 'coeux';

let store = createStore();

store.mountReducer({
  foo: function (foo = 0, action) {
    switch (action.type) {
      case 'ADD': return new Promise(function (resolve) {
        resolve(++foo);
      });
      default: return foo;
    }
  }
});

store.subscribe({
  foo: function (foo) {
    return new Promise(function (resolve) {
      console.log(foo);
      resolve();
    });
  }
});

// always remember to call initState() after mountReducer() or subscribe()
// to ensure reducers has initialized state and listeners has catched the
// initializaion of state
store.initState().then(function () {
  // when code reaches here, console has shown 0
});
store.dispatch({ type: 'ADD' }).then(function () {
  // when code reaches here, console has shown 1
});
store.dispatch({ type: 'ADD' }).then(function () {
  // when code reaches here, console has shown 2
});
```

## Sequence

We should care about sequence once async operations is supported in dispatching. Take two points in your mind:

1. No absolute sequence between any two reducers or listeners.
2. `store.dispatch()` runs in an atomic cycle. A `store.dispatch()` in another `store.dispatch()` will never mess the reducing sequence for the state.

```javascript
store.mountReducer({
  foo: (foo, { type }) => {
    if (foo === undefined) {
      store.dispatch({ type: 'FOO' }).then(() => {
        // see foo as [ 1, 2 ] here
      });

      return [ 1 ];
    }

    switch (type) {
      case 'FOO':
        return [ ...foo, 2 ];
      default:
        return foo;
    }
  },
  bar: (bar, { type }) => {
    if (bar === undefined) {
      setTimeout(() => {
        store.dispatch({ type: 'BAR' }).then(() => {
          // see bar as [ 20, 10 ] here
        });
      }, 10);

      return new Promise(function (resolve) {
        setTimeout(() => resolve([ 20 ]), 20);
      });
    }

    switch (type) {
      case 'BAR':
        return [ ...bar, 10 ];
      default:
        return bar;
    }
  }
});

store.initState().then(() => {
  // see the whole state as { foo: [ 1 ], bar: [ 20 ] } here
});
```

## Error Handling

Catch all errors thrown in reducers and listeners with [`Promise.catch()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch).

```javascript
store.mountReducer({
  foo: function (foo = 0, action) {
    return new Promise(function (resolve, reject) {
      reject(new Error('catch me'));
      //or
      throw new Error('catch me');
    });
  }
});

store.subscribe({
  foo: function (foo) {
    throw new Error('catch me');
  }
});

store.initState().catch(function (e) {
  console.log(e); // show error
});
```

## Advanced Usage

### _dynamic reducers_

Use reducers to describe a state tree. Mount or unmount them whenever you want.

```javascript
store.mountReducer({
  foo: (foo = 0, action) => (foo),
  bar: {
    x: (x = 0, action) => (x)
  }
});
unmount2 = store.mountReducer({
  bar: {
    y: (y = 0, action) => (y)
  }
});

store.initState().then(() => {
  console.log(store.getState()); // { foo: 0, bar: { x: 0, y: 0 } }
});

unmount2();
store.initState().then(() => {
  console.log(store.getState()); // { foo: 0, bar: { x: 0 } }
});
```

### _smart notifying_

Only notify listeners when states have been changed.

```javascript
store.mountReducer({
  foo: function (foo = 0, action) {
    switch (action.type) {
      case 'ADD': return ++foo;
      default: return foo;
    }
  }
});

store.subscribe({
  foo: function (foo) {
    console.log(foo);
  }
});

store.initState().then(function () {
  // foo is from undefined to 0, changed, so meet foo's value here
});
store.initState().then(function () {
  // foo is not changed, so won't meet foo's value here
});
store.dispatch({ type: 'ADD' }).then(function () {
  // foo is from 0 to 1, changed, so meet foo's value here
});

// furtherly, listen to state with dynamic reducers
store.subscribe({
  bar: function (bar) {
    console.log(bar);
  }
});
store.initState().then(function () {
  // bar is still undefined, not changed, so won't meet bar's value here
});

unmount = store.mountReducer({
  bar: function (bar = 0, action) {
    return bar;
  }
});
store.initState().then(function () {
  // bar is from undefined to 0, changed, so meet bar's value here
});

unmount();
store.initState().then(function () {
  // bar is from 0 to undefined, changed, so meet bar's value here
});
```

### _hierarchical listeners_

Listen to different layers easily.

```javascript
store.mountReducer({
  foo: function (foo = 0, action) {
    switch (action.type) {
      case 'ADD': return ++foo;
      default: return foo;
    }
  },
  bar: function (bar = 0, action) {
    return bar;
  }
});

store.subscribe({
  bar: function (bar) {
    console.log(bar);
  }
});
store.subscribe(function (state) {
  console.log(state);
});

store.initState().then(() => {
  // show 0 and { foo: 0, bar: 0 }
});
store.dispatch({ type: 'ADD' }).then(() => {
  // only show { foo: 1, bar: 0 }
});
```

## Middlewares

Support middlewares in dispatching. Pass them when you call `createStore()`. Additionally, Promise is supported in middlewares(This should be clear because `next` always return a Promise object as you will see).

```javascript
let middlewares = [
  function (action, next) {
    if (action.type == 'SHORTCUT') {
      return action;
    }
    return next(action);
  },
  function (action, next) {
    console.log('before');
    // next always returns a Promise object
    return next(action).then((action) => {
      console.log('after');
      return action;
    });
  }
];

let store = createStore(middlewares);
store.initState().then(function () {
  // show before and after
});
store.dispatch({ type: 'SHORTCUT' }).then(function () {
  // show nothing
});
```

## Performance

Everything would be OK if you are trying to keep state shape as flat as possible. You might have noticed that `mountReducer()` maintains a tree with reducer functions as its leaves. Internally, it uses a depth-first tree merging algorithm. The deeper reducer tree is, the more overhead it pays. Accordingly, `unmount()` function returned by `mountReducer()` preforms similarly.
