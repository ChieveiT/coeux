# coeux

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

store.dispatch({ type: 'ADD' }).then(function () {
  // when code reaches here, console has shown 1
});
store.dispatch({ type: 'ADD' }).then(function () {
  // when code reaches here, console has shown 1 and 2
});
```

## Sequence

We should care about sequence once async operations is supported in dispatching. Take two points in your mind:

1. In internals, `store.dispatch()` has two periods. First it reduces state, then it notifies listeners. Both two periods use [`Promise.all()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all) to wrap returned values. _So there is no constant sequence within reducers and listeners_. However, reducing and notifying is chained with [`Promise.then()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then). _So listeners always get state after state has been changed by actions_.
2. `store.dispatch()` chains itself automatically. Don't worry.

```javascript
store.dispatch({ type: 'action1' });
store.dispatch({ type: 'action2' });
// is equal to
store.dispatch({ type: 'action1' }).then(() => {
  store.dispatch({ type: 'action1' });
});

// furtherly
store.dispatch({ type: 'action1' }).then(() => {
  store.dispatch({ type: 'action3' });
});
store.dispatch({ type: 'action2' });
// is equal to
let p = store.dispatch({ type: 'action1' });
p.then(() => {
  store.dispatch({ type: 'action3' });
});
p.then(() => {
  store.dispatch({ type: 'action2' });
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

store.dispatch({ type: 'SEE_ERROR' }).catch(function (e) {
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

store.dispatch({ type: 'INIT' }).then(() => {
  console.log(store.getState()); // { foo: 0, bar: { x: 0, y: 0 } }
});

unmount2();
store.dispatch({ type: 'INIT' }).then(() => {
  console.log(store.getState()); // { foo: 0, bar: { x: 0 } }
});
```

### _smart notifying_

Only notify listeners when states to which they are listening have changed.

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

store.dispatch({ type: 'INIT' }).then(function () {
  // foo is from undefined to 0, changed, so meet foo's value here
});
store.dispatch({ type: 'INIT' }).then(function () {
  // foo is not changed, so won't meet foo's value here
});
store.dispatch({ type: 'ADD' }).then(function () {
  // foo is from 0 to 1, changed, so meet foo's value here
});

// furtherly, listen to state with dynamic reducers

```
