import { IEventSource, invariant } from '@faery/common';
import type { PerspectiveCamera, Scene, Vector2, WebGLRenderer } from 'three';
import type { ModelCache } from './models';
import type { World } from './world';
import type { IEventTypeMap } from './IEventTypes';
import type { ISystem, ISystemKey } from './ISystem';
import type { Viewpoint } from './render';

export interface IEngine extends IEventSource<IEventTypeMap> {
  readonly camera: PerspectiveCamera;
  readonly models: ModelCache;
  readonly scene: Scene;
  readonly renderer: WebGLRenderer;
  readonly viewpoint: Viewpoint;
  readonly world: World;
  readonly delta: number;
  readonly screenSize: Readonly<Vector2>;

  fixLightsHack: boolean;

  /** Manage system add-ons */
  addSystem<T extends ISystem>(context: ISystemKey<T>, addon: T): void;
}

let engine: IEngine | null;

export function setEngine(eng: IEngine | null) {
  engine = eng;
}

/** Allow global access to engine object. */
export function getEngine(): IEngine {
  invariant(engine);
  return engine;
}

/** Allow global access to engine object. */
export function maybeGetEngine(): IEngine | null {
  return engine;
}
