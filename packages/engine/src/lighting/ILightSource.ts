import { Color, HexColorString, Vector3 } from 'three';

export const MAX_POINT_LIGHTS = 12;
export const MAX_POINT_LIGHT_DISTANCE = 16;

/** A point light which is attached to the scenery element. */
export interface ILightsource {
  /** Position of the effect relative to the fixture or wall. */
  offset?: Vector3;

  /** Radius of point light. */
  radius?: number;

  /** Color of the light. */
  color?: HexColorString;

  /** Intensity of the light. */
  intensity?: number;

  /** If present, effect is only enabled when this instance property is true. */
  enabled?: string;
}

/** Light source that has been placed in the world. */
export interface ILightSourcePlacement extends ILightsource {
  realm: string;
  position: Vector3;
  lightColor: Color;
}
