import type { Pair } from 'polygon-clipping';
import { MathUtils, Vector2, Vector3 } from 'three';

export function distanceSqFromPairToLine(
  p: Pair,
  a: Pair,
  b: Pair,
  clampToSegment = false
): number {
  const px = p[0] - a[0];
  const py = p[1] - a[1];

  const dx = b[0] - a[0];
  const dy = b[1] - a[1];

  let h = (px * dx + py * dy) / (dx * dx + dy * dy);
  if (clampToSegment) {
    h = MathUtils.clamp(h, 0, 1);
  }
  return (px - dx * h) ** 2 + (py - dy * h) ** 2;
}

export function distanceSqFromPoint3ToLine(
  p: Vector3,
  a: Vector3,
  b: Vector3,
  clampToSegment = false
): number {
  const px = p.x - a.x;
  const py = p.y - a.y;
  const pz = p.z - a.z;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;

  let h = (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz);
  if (clampToSegment) {
    h = MathUtils.clamp(h, 0, 1);
  }
  return (px - dx * h) ** 2 + (py - dy * h) ** 2 + (pz - dz * h) ** 2;
}

/** Returns the nearest point from point `p` along the given line from `a` to `b`, as a parameter.
    A point near `a` returns 0, a point near `b` returns 1.
*/
export function parameterAlongLine(p: Vector3, a: Vector3, b: Vector3) {
  const dx0 = b.x - a.x;
  const dy0 = b.y - a.y;
  const dz0 = b.z - a.z;
  const dx1 = p.x - a.x;
  const dy1 = p.y - a.y;
  const dz1 = p.z - a.z;
  const lengthSq = dx0 ** 2 + dy0 ** 2 + dz0 ** 2;
  return (dx0 * dx1 + dy0 * dy1 + dz0 * dz1) / lengthSq;
}

/** Returns the nearest point from point `p` along the given line from `a` to `b`, as a distance.
    A point near `a` returns 0, a point near `b` returns length(b - a).
*/
export function distanceAlongLine(p: Vector3, a: Vector3, b: Vector3) {
  const dx0 = b.x - a.x;
  const dy0 = b.y - a.y;
  const dz0 = b.z - a.z;
  const dx1 = p.x - a.x;
  const dy1 = p.y - a.y;
  const dz1 = p.z - a.z;
  const lengthSq = dx0 ** 2 + dy0 ** 2 + dz0 ** 2;
  return (dx0 * dx1 + dy0 * dy1 + dz0 * dz1) / Math.sqrt(lengthSq);
}

// TODO: Not needed.
export function intersectLines(
  result: Vector2,
  from1: Vector2,
  to1: Vector2,
  from2: Vector2,
  to2: Vector2
): Vector2 | undefined {
  const dX: number = to1.x - from1.x;
  const dY: number = to1.y - from1.y;

  const determinant: number = dX * (to2.y - from2.y) - (to2.x - from2.x) * dY;
  if (determinant === 0) {
    return undefined; // parallel lines
  }

  const lambda: number =
    ((to2.y - from2.y) * (to2.x - from1.x) + (from2.x - to2.x) * (to2.y - from1.y)) / determinant;
  const gamma: number =
    ((from1.y - to1.y) * (to2.x - from1.x) + dX * (to2.y - from1.y)) / determinant;

  // check if there is an intersection
  if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) {
    return undefined;
  }

  result.set(from1.x + lambda * dX, from1.y + lambda * dY);
  return result;
}
