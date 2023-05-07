import { Vector2, Vector3 } from 'three';

export function isVector2(obj: unknown): obj is Vector2 {
  return (obj as Vector2).isVector2;
}

export function isVector3(obj: unknown): obj is Vector3 {
  return (obj as Vector3).isVector3;
}
