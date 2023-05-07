/** An interpolation curve element. */
export interface ICurveElement<T> {
  time: number;
  value: T;
}

/** A 'curve' is really a sequence of piecewise control points. It's called a 'curve'
    for historical reasons.
 */
export type ICurve<T> = ICurveElement<T>[];
export type ScalarCurve = ICurve<number>;

export function scalarCurveValue(cpoints: ScalarCurve, t: number): number {
  const ct = cpoints.length - 1;
  let i = 0;
  while (i < ct && cpoints[i].time <= t) {
    i++;
  }

  if (i > 0) {
    const prev = cpoints[i - 1];
    const next = cpoints[i];
    if (next.time > prev.time + 0.0000001) {
      const t2 = (t - prev.time) / (next.time - prev.time);
      return next.value * t2 + prev.value * (1 - t2);
    }
  }

  return cpoints[0].value;
}
