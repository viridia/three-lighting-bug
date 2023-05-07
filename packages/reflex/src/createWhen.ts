import { createEffect, createRoot, untrack } from 'solid-js';

/** Runs an action function once a condition becomes true.

    @param condition A reactive expression which returns a boolean.
    @param action An action which will get executed when the condition function returns true.
      The action will be performed in an untracked context.
    @returns A callback which can be used to cancel the condition.
 */
export function createWhen(condition: () => boolean, action: () => void): () => void {
  return createRoot(disposer => {
    createEffect(() => {
      let test = false;
      if (test || (test = condition())) {
        untrack(action);
        disposer();
      }
    });
    return disposer;
  });
}
