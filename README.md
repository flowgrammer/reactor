# Reactor

The Reactor module implements an event loop spanning multiple iterations of the JS event loop. It allows you to sequentially execute async functions in a queue, as well as any async code called by those functions.

## Features

- Control the flow of complex asynchronous tasks
- Prevent simultaneous execution of tasks
- Sequentialize execution of modules with internal async behavior

## Usage

Import the Reactor class and create a new instance:

```javascript
import Reactor from './Reactor';

const reactor = new Reactor();
```

To add a task to the queue, use the `invoke` method:

```javascript
reactor.invoke({
  fn: async () => {
    // Your async function
  },
  timeout: 1000, // Optional: Maximum time in milliseconds that the event is allowed to run
});
```

If you want to check if a task is locked, use the makeIsEventLocked method.
This handles the scenario where you've completed an iteration of the event
loop and you wish to prevent other asynchronous execution in your code.

```javascript
const isEventLocked = reactor.makeIsEventLocked();

// Deep inside a module
if (isEventLocked()) {
  // Code with resource contentions or race conditions
}
```

To unlock the reactor and run the next task in the queue, use the done method:

```javascript
reactor.done();
```

To check if the reactor is locked, use the `isLocked` method:
```javascript:
if (reactor.isLocked()) {
  // The reactor is locked
}
```
