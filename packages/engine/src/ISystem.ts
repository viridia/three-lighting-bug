import type { IDisposable } from '@faery/common';

export type ISystem = IDisposable;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface ISystemKey<T extends ISystem> {
  key: number;
  name: string;
}

let nextId = 0;

/** Create a typed key which can be used to register or access a system. */
export function createSystemKey<T extends ISystem>(name: string): ISystemKey<T> {
  return {
    key: ++nextId,
    name,
  };
}
