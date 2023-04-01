import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import Reactor from './index.js';

const nextTick = () => {
  return new Promise((resolve) => setTimeout(resolve, 3));
};

describe('Reactor', () => {
  let reactor;

  beforeEach(() => {
    reactor = new Reactor();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Run', () => {
    it('Executes if not locked', async () => {
      const event = { fn: vi.fn() };
      await reactor.invoke(event);
      expect(event.fn).toHaveBeenCalled();
    });

    it(`Won't execute if locked`, async () => {
      const event1 = { fn: vi.fn() };
      const event2 = { fn: vi.fn() };

      reactor.invoke(event1);

      await nextTick();

      // The reactor should now be locked
      reactor.invoke(event2);

      await nextTick();

      expect(event1.fn).toHaveBeenCalled();
      expect(event2.fn).not.toHaveBeenCalled();

      reactor.done();

      await nextTick();

      expect(event2.fn).toHaveBeenCalled();
    });

    it('Executes in FIFO order', async () => {
      const events = [
        { fn: vi.fn() },
        { fn: vi.fn() },
        { fn: vi.fn() },
      ];
      events.forEach((event) => reactor.invoke(event));
      await nextTick();

      expect(events[0].fn).toHaveBeenCalled();
      expect(events[1].fn).not.toHaveBeenCalled();
      expect(events[2].fn).not.toHaveBeenCalled();

      reactor.done();

      await nextTick();

      expect(events[0].fn).toHaveBeenCalled();
      expect(events[1].fn).toHaveBeenCalled();
      expect(events[2].fn).not.toHaveBeenCalled();

      reactor.done();

      await nextTick();

      expect(events[0].fn).toHaveBeenCalled();
      expect(events[1].fn).toHaveBeenCalled();
      expect(events[2].fn).toHaveBeenCalled();
    });

    it('Rejects if event times out', async () => {
      const event = { fn: vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000))), timeout: 10 };
      await expect(reactor.invoke(event)).rejects.toThrow('Event timeout');
    });
  });

  describe('makeIsEventLocked', () => {
    it('Guards when an event loop locks', async () => {
      const isEvent1Locked = reactor.makeIsEventLocked();
      const event1 = { fn: vi.fn() };
      reactor.invoke(event1);

      const isEvent2Locked = reactor.makeIsEventLocked();
      const event2 = { fn: vi.fn() };
      reactor.invoke(event2);

      expect(isEvent1Locked()).toBe(false);
      expect(isEvent2Locked()).toBe(false);

      reactor.done();

      expect(isEvent1Locked()).toBe(true);
      expect(isEvent2Locked()).toBe(false);
    });
  });

  describe('done', () => {
    it('Done unlocks the queue', async () => {
      const event1 = { fn: vi.fn() };
      reactor.invoke(event1);

      await nextTick();
      expect(event1.fn).toHaveBeenCalled();

      const event2 = { fn: vi.fn() };
      reactor.invoke(event2);

      await nextTick();
      expect(event2.fn).not.toHaveBeenCalled();

      reactor.done();
      await nextTick();

      expect(event2.fn).toHaveBeenCalled();
    });
  });
});
