import { Engine, SkinnedModel } from '@faery/engine';
import clsx from 'clsx';
import { Vector3 } from 'three';
import { centerCss, gameHUDCss, sideCss, middleCss, sceneViewCss } from './SceneView.css';
import { ActorPortrait } from './components/ActorPortrait';
import { Component, createEffect, createSignal, Show, untrack } from 'solid-js';

interface Props {
  class?: string;
  engine: Engine;
}

export const SceneView: Component<Props> = props => {
  const engine = props.engine;
  const [elt, setElt] = createSignal<HTMLElement | null>(null);
  let timer: number = -1;
  const [showPortrait, setShowPortrait] = createSignal(false);

  createEffect(() => {
    const viewElt = elt();
    if (viewElt) {
      engine.attach(viewElt).then(() => {
        // engine.terrain.update();
        engine.start();
        engine.viewpoint.setRealm('holm-overland');
      });
      return () => {
        globalThis.clearTimeout(timer);
        engine.detach();
      };
    }
  }, [elt, engine]);

  createEffect(() => {
    const realm = engine.viewpoint.maybeGetActiveRealm();

    if (realm) {
      untrack(() => {
        const scene = realm.scene;

        const model = new SkinnedModel(
          'characters/humanoid-female:WithTunic',
          'characters/humanoid-female:HumanoidArmature',
          'characters/humanoid-armature:HumanoidArmature'
        );

        model.load().then(() => {
          model.acquire();
          const modelInstance = model.createInstance({
            featureSelection: { HairPonyTail: true },
          });
          modelInstance.position.set(0, 0, 0);
          modelInstance.visible = true;
          scene.add(modelInstance);

          const vp = engine.viewpoint;
          vp.moveTo(new Vector3(0, 0, 0), 'holm-overland');
          vp.azimuth = 2.8;

          setTimeout(() => {
            setShowPortrait(true);
          }, 1000);
        });
      });
    }
  });

  return (
    <section ref={setElt} class={clsx(sceneViewCss, props.class)}>
      <div class={gameHUDCss}>
        <div class={centerCss}>
          <div class={sideCss}>
            <Show when={showPortrait()}>
              <ActorPortrait />
            </Show>
          </div>
          <div class={middleCss} />
        </div>
      </div>
    </section>
  );
};
