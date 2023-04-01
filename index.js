/**
 * Creates event loop semantics over async pipelines.
 * @class
 */
export default class Reactor {
  constructor() {
    // Internal state to track if the reactor is locked
    this.locked = false;
    // Queue to store events
    this.queue = [];
    // Active event ID
    this.activeEventId;
    // Counter for generating event IDs
    this.lastEventId = 0;

    this.timeoutId;

    this.hasEvent;
  }

  /**
   * Executes the next event in the queue if the Reactor is not locked.
   * @async
   */
  async run() {
    if (this.locked || !this.queue.length) return;

    this.locked = true;
    const event = this.queue.shift();
    this.activeEventId = event.id;

    try {
      this.hasEvent = new Promise((resolve, reject) => {
        // Set a timeout to reject the promise if an event takes too long
        this.timeoutId = event.timeout
          ? setTimeout(() => {
              reject(new Error('Event timeout'));
            }, event.timeout)
          : undefined;

        setTimeout(async () => {
          // Execute the event function with the given context and arguments
          const result = await event.fn.apply(event.thisArg, event.args);
          // Clear the timeout, since the event has finished
          clearTimeout(this.timeoutId);
          resolve(result);
          event.resolve(result);
        }, 0);
      });

      await this.hasEvent;
    } catch (error) {
      if (!/Event timeout/.test(error.message)) {
        console.error(`Reactor run [error]: ${error.message}`);
      }
      event.reject(error);
      this.locked = false;
      this.run();
    }
  }

  /**
   * Creates a function that consumers can send with invocation args,
   * allowing internal code to know it should stop its processing.
   * This enables each event loop to remain isolated in the case of
   * timeouts or other failures to call `done`.
   *
   * @returns {function}
   */
  makeIsEventLocked() {
    const eventId = this.lastEventId;
    return () => this.activeEventId > eventId;
  }

  /**
   * Terminates the existing event, unlocks the Reactor, and runs the next event.
   * Stops any further processing on existing events when gated by isEventLocked.
   */
  done() {
    clearTimeout(this.timeoutId);
    this.locked = false;
    this.run();
  }

  /**
   * Adds an event to the queue and runs the event loop.
   * @param {object} event - An object containing an event function and optional arguments and context.
   * @param {function} event.fn - The function to be executed as an event.
   * @param {*} [event.thisArg] - The context to be used for the function call.
   * @param {Array} [event.args] - An array of arguments to be passed to the function.
   * @param {number} [event.timeout] - The maximum time in milliseconds that the event is allowed to run.
   * @returns {Promise} A promise that resolves when the event has finished executing.
   *   Do not await if you just want to append the event but don't want to wait for it to fully complete.
   */
  async invoke(event) {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...event, id: this.lastEventId, resolve, reject });
      this.lastEventId++;
      this.run();
    });
  }

  /**
   * Checks if the Reactor is currently locked.
   * Can be used to restrict behavior of things outside the reactor while the reactor is running.
   * @returns {boolean}
   */
  isLocked() {
    return this.locked;
  }
}
