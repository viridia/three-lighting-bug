import { Accessor, createSignal, Setter, SignalOptions } from 'solid-js';

/** A version of createSignal that returns an object with 'get' and 'set' methods rather than
    an array. */
export function createSignalObject<T>(
  init: T,
  options?: SignalOptions<T>
): { get: Accessor<T>; set: Setter<T> } {
  const [get, set] = createSignal(init, options);
  return { get, set };
}
