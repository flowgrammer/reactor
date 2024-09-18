export const TASK_SYMBOL = Symbol('task');

/**
 * Reactor class to manage the execution of asynchronous tasks with queuing, timeouts, and error handling.
 */
class Reactor {
  constructor() {
    /** @type {Array<Object>} */
    this.queue = [];
    /** @type {Object|null} */
    this.currentExecution = null;
    /** @type {number} */
    this.executionId = 0;
  }

  /**
   * Executes tasks in the queue sequentially.
   * Ensures that each task completes before the next one starts.
   */
  async execute() {
    while (this.queue.length > 0) {
      const execution = this.queue.shift();
      this.currentExecution = execution;

      try {
        const taskPromise = execution.fn();
        let timeoutHandle;

        if (execution.timeout > 0) {
          const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
              reject(new Error('Task timeout'));
            }, execution.timeout);
          });
          await Promise.race([taskPromise, timeoutPromise]);
        } else {
          await taskPromise;
        }

        await Promise.all(execution.waitFor);

        if (timeoutHandle) clearTimeout(timeoutHandle);

        execution.resolve();
      } catch (error) {
        execution.reject(error);
      } finally {
        this.currentExecution = null;
      }
    }
  }

  /**
   * Executes a task immediately, bypassing the queue.
   * @param {Object} execution - The execution object to process.
   */
  async executeTask(execution) {
    try {
      const taskPromise = execution.fn();
      let timeoutHandle;

      if (execution.timeout > 0) {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error('Task timeout'));
          }, execution.timeout);
        });
        await Promise.race([taskPromise, timeoutPromise]);
      } else {
        await taskPromise;
      }

      await Promise.all(execution.waitFor);

      if (timeoutHandle) clearTimeout(timeoutHandle);

      execution.resolve();
    } catch (error) {
      execution.reject(error);
    }
  }

  /**
   * Creates and queues an asynchronous task.
   * @param {Function} fn - The asynchronous function to execute as a task.
   * @param {number} [timeout=0] - The maximum time (in ms) the task is allowed to run.
   * @returns {Object} An execution object containing the task's promise and ID.
   */
  taskAsync(fn, timeout = 0) {
    const id = ++this.executionId;

    let resolve, reject;

    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const execution = {
      id,
      promise,
      resolve,
      reject,
      fn,
      timeout,
      waitFor: new Set(),
    };

    this.queue.push(execution);

    // Start executing the queue if not already running
    if (!this.currentExecution) {
      this.execute().catch((err) => {
        // Handle unexpected errors in the execution loop
      });
    }

    return execution;
  }

  /**
   * Retrieves the currently executing task.
   * @returns {Object|null} The current execution object or null if no task is running.
   */
  getExecution() {
    return this.currentExecution;
  }

  /**
   * Decorator to mark a method as a task managed by the Reactor.
   * @param {number} [timeout=0] - Optional timeout for the task in milliseconds.
   * @returns {Function} The decorator function.
   */
  task(timeout = 0) {
    return (target, propertyKey, descriptor) => {
      const originalMethod = descriptor.value;
      descriptor.value = (...args) => {
        const boundMethod = () => originalMethod.apply(target, args);
        return this.taskAsync(boundMethod, timeout).promise;
      };
      descriptor.value[TASK_SYMBOL] = true;
      return descriptor;
    };
  }

  /**
   * Executes a function directly, handling different types (tasks, async functions, and sync functions).
   * @param {Function} func - The function to execute
   * @param  {...any} args - Arguments to pass to the function
   * @returns {Promise} The promise returned by the function execution
   */
  taskAwait(func, ...args) {
    let promise;

    if (typeof func === 'function') {
      if (func[TASK_SYMBOL]) {
        const execution = func(...args); // Create execution via Reactor
        promise = execution.promise;
        this.executeTask(execution); // Execute immediately
      } else if (func.constructor.name === 'AsyncFunction') {
        promise = func(...args);
      } else {
        try {
          promise = Promise.resolve(func(...args));
        } catch (error) {
          promise = Promise.reject(error);
        }
      }
    }

    const currentExecution = this.getExecution();

    // If there is a current execution, add this promise to its waitFor set
    if (currentExecution && promise instanceof Promise) {
      currentExecution.waitFor.add(promise);

      // Ensure proper restoration of currentExecution after task completes
      promise.then(() => {
        this.currentExecution = currentExecution;
      });
    }

    return promise;
  }
}

export default Reactor;
