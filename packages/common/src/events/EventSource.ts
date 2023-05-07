import { EventSubscriber, IEventSource, UnsubscribeCallback, ArgumentTypes } from './IEventSource';

/** Class that allows subscribing to events of specific types from an event source. */
export class EventSource<EventSourceMap extends {}> implements IEventSource<EventSourceMap> {
  private subscribers?: Map<keyof EventSourceMap, Set<EventSubscriber<any>>>;

  /** Unsubscribe all subscribers. */
  public clear() {
    this.subscribers?.clear();
  }

  /** Add an event subscriber for this instance.
      @param eventName The type of event we want to listen to.
      @param callback Subscriber function to be called when event is broadcast.
      @returns An unsubscribe callback.
  */
  public subscribe<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    callback: EventSubscriber<ArgumentTypes<EventSourceMap[EventName]>>
  ): UnsubscribeCallback {
    if (!this.subscribers) {
      this.subscribers = new Map();
    }
    const callbackSet = this.subscribers.get(eventName);
    if (!callbackSet) {
      this.subscribers.set(eventName, new Set([callback]));
    } else {
      callbackSet.add(callback);
    }
    return () => {
      this.unsubscribe(eventName, callback);
    };
  }

  /** Remove event subscriber.
      @param eventName The type of event we no longer want to listen to.
      @param callback Reference to the callback function that was subscribed.
  */
  public unsubscribe<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    callback: EventSubscriber<ArgumentTypes<EventSourceMap[EventName]>>
  ) {
    if (this.subscribers) {
      const callbackSet = this.subscribers.get(eventName);
      if (callbackSet) {
        callbackSet.delete(callback);
      }
    }
  }

  /** Emit an event of a given type.
      @param eventName The type of event to emit.
      @param event The data payload for that event.
  */
  public emit<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    ...args: ArgumentTypes<EventSourceMap[EventName]>
  ) {
    const callbackSet = this.subscribers?.get(eventName);
    if (callbackSet) {
      callbackSet.forEach(cb => cb(...args));
    }
  }
}
