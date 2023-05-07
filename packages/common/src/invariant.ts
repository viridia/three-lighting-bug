class InvariantError extends Error {
  constructor(message?: string) {
    super(message || 'Invariant Error');
  }
}

export function invariant(condition: any, message?: string | (() => string)): asserts condition {
  if (!condition) {
    throw new InvariantError(typeof message === 'function' ? message() : message);
  }
}
