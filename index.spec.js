import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Reactor, { TASK_SYMBOL } from './index.js'; // Ensure correct path

describe('Reactor', () => {
  let reactor;

  beforeEach(() => {
    reactor = new Reactor();
    vi.useFakeTimers(); // Enable fake timers for precise control
  });

  afterEach(() => {
    vi.useRealTimers(); // Restore real timers after each test
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  /**
   * Helper function to create a task function that can be executed using Reactor
   * @param {Function} fn - The async function to be executed as a task
   * @param {number} timeout - The timeout for the task
   * @returns {Function} A function that creates a Reactor-managed task
   */
  function createTask(fn, timeout = 0) {
    fn[TASK_SYMBOL] = true; // Tag the original function as a task
    const task = () => reactor.taskAsync(fn, timeout);
    task[TASK_SYMBOL] = true; // Tag the wrapper function as a task
    return task;
  }

  describe('Run', () => {
    it('Executes if not locked', async () => {
      const mockFn = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      const task = createTask(mockFn);

      const execution = task();

      // Fast-forward time to allow the task to complete
      vi.advanceTimersByTime(50);

      await execution.promise;

      expect(mockFn).toHaveBeenCalledOnce();
    });

    it("Won't execute if locked", async () => {
      const mockFn1 = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      const mockFn2 = vi.fn(async () => {});

      // Create and start the first task
      const task1 = createTask(mockFn1);
      const task2 = createTask(mockFn2);

      task1(); // This will lock the reactor
      task2(); // This should not execute until task1 completes

      // Task2 should not have been called yet since task1 is not completed
      expect(mockFn2).not.toHaveBeenCalled();

      // Fast-forward time to complete task1
      vi.advanceTimersByTime(100);
      await reactor.getExecution().promise;

      // Fast-forward time to allow task2 to execute
      vi.advanceTimersByTime(0); // Immediate execution
      await reactor.getExecution().promise;

      expect(mockFn2).toHaveBeenCalledOnce();
    });

    it('Executes in FIFO order', async () => {
      const callOrder = [];
      const taskA = createTask(async () => {
        callOrder.push('A');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      const taskB = createTask(async () => {
        callOrder.push('B');
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Add tasks to the reactor and capture their execution
      const executionA = taskA();
      const executionB = taskB();

      // Fast-forward timers to execute taskA
      vi.advanceTimersByTime(50);
      await executionA.promise;

      // Fast-forward timers to execute taskB
      vi.advanceTimersByTime(50);
      await executionB.promise;

      // Verify the order of execution
      expect(callOrder).toEqual(['A', 'B']);
    });

    it('Rejects if event times out', async () => {
      const taskWithTimeout = createTask(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }, 50); // Set timeout less than the task duration

      const execution = taskWithTimeout();

      // Fast-forward time to trigger the timeout
      vi.advanceTimersByTime(100);

      // Await and expect a rejection due to timeout
      await expect(execution.promise).rejects.toThrow('Task timeout');
    });

    it('Task A and Task B run sequentially', async () => {
      let taskACompleted = false;

      // Define the original task function for taskA
      const taskAFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        taskACompleted = true;
      };

      // Wrap the task function using createTask
      const taskA = createTask(taskAFn);

      const taskB = createTask(async () => {
        expect(taskACompleted).toBe(true);
      });

      // Add tasks to the reactor and capture their executions
      const executionA = taskA();
      const executionB = taskB();

      // Fast-forward timers to execute taskA
      vi.advanceTimersByTime(50);
      await executionA.promise;

      // Fast-forward timers to execute taskB
      vi.advanceTimersByTime(0); // Immediate execution
      await executionB.promise;
    });

    it('Task B calls Task A directly using taskAwait', async () => {
      let taskACompleted = false;

      // Define the original task function for taskA
      const taskAFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        taskACompleted = true;
      };

      // Wrap the task function using createTask
      const taskA = createTask(taskAFn);

      const taskB = createTask(async () => {
        // Directly await taskA via taskAwait
        await reactor.taskAwait(taskA);
        expect(taskACompleted).toBe(true);
      });

      // Start taskB
      const executionB = taskB();

      // Fast-forward time to execute taskA
      vi.advanceTimersByTime(50);

      // Flush all pending timers and microtasks
      await vi.runAllTimersAsync();

      // Await executionB to ensure completion
      await executionB.promise;

      // Verify that taskA was completed
      expect(taskACompleted).toBe(true);
    }, 15000);
  });

  describe('Run > Forked function runs independently', () => {
    it('Forked function runs independently', async () => {
      let forkedCompleted = false;

      const taskA = createTask(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Fork function (runs independently, does not await)
      const forkFunction = () => {
        setTimeout(() => {
          forkedCompleted = true;
        }, 50);
      };

      // Start taskA
      taskA();

      // Fork the function (independent)
      forkFunction();

      // Fast-forward time to execute taskA
      vi.advanceTimersByTime(50);
      await reactor.getExecution().promise;

      // Fast-forward time to allow forked function to complete
      vi.advanceTimersByTime(50);
      expect(forkedCompleted).toBe(true);
    });
  });
});
