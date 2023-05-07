import { getOwner } from 'solid-js';

/** Set a human-readable name for the current scope (for debugging). */
export function setScopeName(name: string): void {
  const owner = getOwner() as { name: string };
  if (owner) {
    owner.name = name;
  }
}
