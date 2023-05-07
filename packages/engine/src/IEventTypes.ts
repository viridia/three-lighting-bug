import type { Vector3 } from 'three';
import type { Realm } from './world';

/** Events emitted by the engine. */
export interface IEventTypeMap {
  beforeAnimate(deltaTime: number): void;
  animate(deltaTime: number): void;
  update(deltaTime: number): void;
  beforeRenderRealm(realm: Realm, viewCenter: Vector3): void;
}
