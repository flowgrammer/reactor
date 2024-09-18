# Reactor

The Reactor module provides a controlled way to execute asynchronous tasks sequentially, preventing race conditions and ensuring that tasks and subtasks do not interleave with other tasks and their subtasks. This is especially useful when multiple ongoing async processes interact with shared resources, such as internal state in a module with multiple async pipelines.

## Features

- Control the flow of complex asynchronous tasks
- Prevent simultaneous execution of tasks to avoid race conditions
- Maintain a clear execution order for tasks and async methods

## Usage

### Basic Example

In this example, `task1` uses `reactor.taskAwait` to control the timing of its inner async invocation. The key point is that `task2` will not run until `task1` and its awaited task are fully complete, showcasing how `taskAwait` can be used without directly awaiting itself.

```javascript
import Reactor from './index.js';

const reactor = new Reactor();

const task1 = async () => {
  // Perform some asynchronous work
  reactor.taskAwait(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log('Task 1 complete');
  });
};

const task2 = async () => {
  console.log('Task 2 complete');
};

// Enqueue the tasks
reactor.taskAsync(task1);
reactor.taskAsync(task2);

// Expected Output:
// Task 1 complete
// Task 2 complete
```

Tasks added via taskAsync will be executed sequentially.

taskAwait ensures other tasks are blocked until the awaited task and its parent task completes. No other parts of the program are blocked, it only blocks the execution of functions invoked via taskAsync and child tasks attached to that context via taskAwait.

taskAwait doesn't need to be awaited itself. It forwards the return value of the invoked function, which can be awaited using the familiar JS event loop mechanism.

## API Reference
### taskAsync(fn, timeout = 0)

Enqueues a new task to be executed sequentially by the Reactor.

    fn (Function): The asynchronous function to execute.
    timeout (number, optional): The maximum time (in ms) the task is allowed to run.

Returns an execution object containing the task's promise and ID.

### taskAwait(func, ...args)

Executes a function directly, handling different types (tasks, async functions, and sync functions).

    func (Function): The function to execute. This can be an async function, a sync function, or a task.
    ...args (any): Arguments to pass to the function.

Returns a promise representing the outcome of the function execution.
