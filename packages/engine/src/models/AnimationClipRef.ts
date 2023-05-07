import type { AnimationClip } from 'three';
import type { IModelCatalog } from './IModelCatalog';

/** A reference to an animation clip defined by an imported model. */
export class AnimationClipRef {
  constructor(public readonly catalog: IModelCatalog, public readonly name: string) {
    catalog.acquire();
  }

  public dispose() {
    this.catalog.release();
  }

  /** Return a promise which resolves to the animation clip data. */
  public get(): Promise<AnimationClip | undefined> {
    return this.catalog.load().then(([, animations]) => {
      const clip = animations[this.name];
      if (!clip) {
        this.catalog.listAnimations().then(anims => {
          console.error(`Animation clip ${this.name} not found, available clips are:`);
          anims.forEach(an => {
            console.info(`  * ${an.name}`);
          });
        });
        return;
      }
      return clip;
    });
  }
}
