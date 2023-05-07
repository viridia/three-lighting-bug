import { CanvasRenderer, getEngine } from '@faery/engine';
import { Vector3 } from 'three';
import { createEffect, createSignal, VoidComponent } from 'solid-js';
import { SkinnedModel } from '@faery/engine';

const cameraPosition = new Vector3();
const cameraTarget = new Vector3();
const defaultCameraOffset = new Vector3(0, 0.2, -2.2);
const cameraAngle = -Math.PI * 0.15;
const UP = new Vector3(0, 1, 0);

interface Props {
  side?: 'left' | 'right';
  class?: string;
}

export const ActorCloseUp: VoidComponent<Props> = props => {
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null);
  const engine = getEngine();

  createEffect(() => {
    const canvasElt = canvas();
    if (canvasElt) {
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

        const callback = () => {
          const renderer = new CanvasRenderer(canvasElt);
          renderer.scene.add(modelInstance);

          cameraTarget.set(0, 1.5, 0);
          cameraPosition.copy(cameraTarget).add(defaultCameraOffset);
          cameraPosition.applyAxisAngle(UP, props.side === 'right' ? -cameraAngle : cameraAngle);
          renderer.camera.position.copy(cameraPosition);
          renderer.camera.lookAt(new Vector3(0, 1.5, 0));

          renderer.render();
          modelInstance.parent?.remove(modelInstance);

          // mixer.stopAllAction();
          // mixer.uncacheRoot(mixer.getRoot());
          model.release();
          renderer.dispose();

          engine.fixLightsHack = true;
          engine.unsubscribe('update', callback);
        };

        engine.subscribe('update', callback);
      });
    }
  });

  return <canvas class={props.class} ref={setCanvas} />;
};
