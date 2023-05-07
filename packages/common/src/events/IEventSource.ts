export type EventSubscriber<Args extends any[]> = (...args: Args) => void;
export type UnsubscribeCallback = () => void;

export type ArgumentTypes<F> = F extends (...args: infer A) => any ? A : never;

/** Class that allows subscribing to events of specific types from an event source. */
export interface IEventSource<EventSourceMap extends {}> {
  /** Add an event subscriber for this instance.
      @param eventName The type of event we want to listen to.
      @param callback Subscriber function to be called when event is broadcast.
      @returns An unsubscribe callback.
  */
  subscribe<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    callback: EventSubscriber<ArgumentTypes<EventSourceMap[EventName]>>
  ): UnsubscribeCallback;

  /** Remove event subscriber.
      @param eventName The type of event we no longer want to listen to.
      @param callback Reference to the callback function that was subscribed.
  */
  unsubscribe<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    callback: EventSubscriber<ArgumentTypes<EventSourceMap[EventName]>>
  ): void;

  /** Emit an event of a given type.
      @param eventName The type of event to emit.
      @param event The data payload for that event.
  */
  emit<EventName extends keyof EventSourceMap>(
    eventName: EventName,
    ...args: ArgumentTypes<EventSourceMap[EventName]>
  ): void;
}
