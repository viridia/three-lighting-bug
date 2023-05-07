import { createWhen } from './createWhen';

/** Returns a promise which resolves when an observable condition becomes true.
    @param condition An observable condition. Promise will resolve when this condition is true.
*/
export function waitFor(condition: () => boolean): Promise<void> {
  return new Promise(resolve => {
    createWhen(condition, resolve);
  });
}
