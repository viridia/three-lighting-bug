import type { Owner, Context } from 'solid-js';
import { useContext } from 'solid-js';

export { createContext } from 'solid-js';
export type IContext<T> = Context<T>;

interface OwnerInternal {
  context: { [key: symbol]: any };
}

/** Bind a context value directly to a scope, permanently. */
export function setContext<T>(owner: Owner, context: IContext<T>, value: T): void {
  const internal = owner as unknown as OwnerInternal;
  if (!internal.context) {
    internal.context = {};
  }
  internal.context[context.id] = value;
}

export const withContext = useContext;
