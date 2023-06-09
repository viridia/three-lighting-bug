export type EaseFunction = 'linear' | 'quad' | 'cubic';

export function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function ease(x: number, f: EaseFunction) {
  switch (f) {
    case 'linear':
      return x;
    case 'quad':
      return easeInOutQuad(x);
    case 'cubic':
      return easeInOutCubic(x);
  }
}
