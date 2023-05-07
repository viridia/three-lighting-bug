import { Engine } from './Engine';
import { maybeGetEngine, setEngine } from './IEngine';
import { IAssetLoader } from './metadata/IAssetLoader';
import { ModelCache } from './models/ModelCache';
import type { World } from './world/World';

export function createEngine(
  world: World,
  loader: IAssetLoader,
  models: ModelCache,
): Engine {
  const engine = (maybeGetEngine() as Engine) || new Engine(world, loader, models);
  setEngine(engine);
  return engine;
}

// if (import.meta.hot) {
//   import.meta.hot.accept('./Engine', newEngine => {
//     const { Engine } = newEngine;
//     const oldEngine = engineInstance.get();
//     if (oldEngine) {
//       const { world, models, textures } = oldEngine;
//       oldEngine?.dispose();
//       console.debug('Constructing new Engine');
//       engineInstance.set(new Engine(world, models, textures));
//     }
//   });
// }
