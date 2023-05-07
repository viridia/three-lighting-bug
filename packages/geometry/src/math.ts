import { MathUtils, Sphere, Vector3 } from 'three';

const TWO_PI = Math.PI * 2;

export function wrapAngle(angle: number): number {
  return MathUtils.euclideanModulo(angle, TWO_PI);
}

export function relativeAngle(from: number, to: number) {
  return MathUtils.euclideanModulo(to - from + Math.PI, TWO_PI) - Math.PI;
}

export function clampRotation(current: number, desired: number, maxChange: number) {
  const diff = relativeAngle(current, desired);
  return current + MathUtils.clamp(diff, -maxChange, maxChange);
}

/** Ritter's algorithm for computing a bounding sphere. */
export function computeBoundingSphere(sphere: Sphere, points: Vector3[]) {
  if (points.length === 0) {
    sphere.radius = 0;
    sphere.center.set(0, 0, 0);
  }
  // Start with a sphere that surrounds just one point.
  sphere.radius = 0;
  sphere.center.copy(points[0]);

  for (;;) {
    // Find the farthest point outside the sphere.
    let farthestDistSq = sphere.radius * sphere.radius;
    let farthest: Vector3 | undefined = undefined;
    points.forEach(pt => {
      const distSq = sphere.center.distanceToSquared(pt);
      if (distSq > farthestDistSq) {
        farthestDistSq = distSq;
        farthest = pt;
      }
    });

    // If all points in the sphere we are done.
    if (!farthest) {
      break;
    }

    // Construct a new sphere which contains the old sphere and the farthest point.
    // New diameter of the sphere is distance + old radius.
    const farthestDist = Math.sqrt(farthestDistSq);
    const newRadius = (farthestDist + sphere.radius) * 0.5;

    // Prevents infinite loop caused by precision loss when taking the root.
    if (newRadius <= sphere.radius) {
      break;
    }
    sphere.radius = newRadius;

    // New center is half-way between the farthest point and the opposite side of the old sphere.
    sphere.center.lerpVectors(farthest, sphere.center, sphere.radius / farthestDist);
  }
}

/** Returns distance squared between a point and a rect.
    @param px X-coordinate of point.
    @param py Y-coordinate of point
    @param rcx Center of rect (X).
    @param rcy Center of rect (Y).
    @param rsx One half size of rect in x-dimension.
    @param rsy One half size of rect in y-dimension.
 */
export function distToRectSquared(
  px: number,
  py: number,
  rcx: number,
  rcy: number,
  rsx: number,
  rsy: number
): number {
  // Point relative to rect
  const dx = Math.max(0, Math.abs(px - rcx) - rsx);
  const dy = Math.max(0, Math.abs(py - rcy) - rsy);
  return dx ** 2 + dy ** 2;
}

/** Computes a random vector, uniformly distributed within a unit sphere. */
export function randomVectorInUnitSphere(position: Vector3) {
  do {
    position.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
  } while (position.lengthSq() > 1);
}

/** Computes a random vector, uniformly distributed within a unit half sphere, where
    the sphere is facing upwards along the Y axis (in other words, vectors will never
    have a negative Y component). */
export function randomVectorInUnitHalfSphere(position: Vector3) {
  do {
    position.set(Math.random() * 2 - 1, Math.random(), Math.random() * 2 - 1);
  } while (position.lengthSq() > 1);
}
