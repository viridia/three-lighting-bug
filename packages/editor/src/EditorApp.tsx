import { ASSETS_URL, ModelCache, World, createEngine, Engine } from '@faery/engine';
import { AssetLoaderFetch } from '@faery/engine';
import { SceneView } from '@faery/game-ui';
import { MathUtils } from 'three';
import clsx from 'clsx';
import { appLayoutCss, sceneContainerCss, sceneViewCss } from './EditorApp.css';
import { createEffect, createSignal, Show } from 'solid-js';

export function EditorApp() {
  const world = new World(new AssetLoaderFetch(`${ASSETS_URL}`));

  const models = new ModelCache(ASSETS_URL);
  const [engine, setEngine] = createSignal<Engine | null>(null);

  createEffect(() => {
    const create = async () => {
      const loader = new AssetLoaderFetch(`${ASSETS_URL}`);
      const engine = createEngine(world, loader, models);
      setEngine(engine);
    };
    create();
  });

  createEffect(() => {
    const eng = engine();
    if (eng) {
      eng.viewpoint.azimuth = MathUtils.degToRad(210);
      eng.world.load();
    }
  });

  return (
    <Show when={engine()}>
        <main class={clsx('App', appLayoutCss)}>
          <section class={sceneContainerCss}>
            <SceneView class={sceneViewCss} engine={engine()!} />
          </section>
        </main>
    </Show>
  );
}

export default EditorApp;
