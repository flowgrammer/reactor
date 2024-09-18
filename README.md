# Reactor

The Reactor module manages asynchronous task invocations in highly-reactive environments by isolating chains of related operations with an event loop on top of JS's existing event loop. Unlike simply executing tasks sequentially, Reactor ensures that a single top-level invocation cascading into multiple async operations does not interleave with other tasks and their subtasks. This prevents unintended race conditions and resource corruption when multiple asynchronous processes interact with shared resources or internal state within modules that have multiple async pipelines.

In ordinary JavaScript, while individual event loop invocations are isolated, the interleaving of execution across numerous event loop invocations can lead to unpredictable states because of resource contention over time. Reactor solves this by maintaining a consistent context for each top-level task and its subsequent async operations, preventing them from intermixing with other concurrent processes.

## Features

- **Isolate Asynchronous Chains**: Maintain separate execution contexts for top-level tasks and their async operations.
- **Prevent Race Conditions**: Ensure that async operations within a task do not interfere with other tasks.
- **Controlled Execution Flow**: Manage the order and isolation of async tasks to maintain predictable behavior.
- **Simple API**: Easily integrate Reactor into existing projects with straightforward functions.

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
