import { createSignal } from 'solid-js';

export interface Atom {
  onObserved(): void;
  onChanged(msg?: string): void;
}

/** Creates a pair of functions for recording access to a dependency and signalling dependants. */
export function createAtom(): Atom {
  const [onObserved, setSignal] = createSignal<void>(undefined, { equals: false });
  const onChanged = (msg: string) => {
    setSignal();
  };

  return { onObserved, onChanged };
}
