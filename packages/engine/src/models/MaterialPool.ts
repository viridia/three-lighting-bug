import type { Material } from 'three';
import { getEngine } from '../IEngine';
import { ResourcePool } from '@faery/common';

export interface IAnimatedMaterial extends Material {
  animate: (time: number) => void;
}

function isAnimatedMaterial(a: Material): a is IAnimatedMaterial {
  return typeof (a as unknown as IAnimatedMaterial).animate === 'function';
}

/** A class which de-dups materials that are created for procedurally generated meshes.
    Also handles updating the time-based uniforms of animated materials.
 */
export class MaterialPool {
  private materials = new Map<string, Material>();
  private animatedMaterials: IAnimatedMaterial[] = []; // For things like ocean waves.
  private unsubscribe: () => void;
  private pool = new ResourcePool();

  constructor() {
    this.unsubscribe = getEngine().subscribe('animate', this.onAnimate.bind(this));
  }

  public dispose() {
    this.pool.dispose();
    this.unsubscribe();
  }

  public get size(): number {
    return this.materials.size;
  }

  /** Register a material with this catalog. This does two things:
      * Avoids creation of duplicate materials.
      * Makes sure that the materials are disposed when the catalog is no longer in use.
      @param key A unique key to identify the material. This should contain any salient parameters
        of the material.
      @param create A callback function to create the material, will only be called if there
        is no materials with that key.
   */
  public get(key: string, create: () => Material) {
    const mat = this.materials.get(key);
    if (mat) {
      return mat;
    }
    const newMat = create();
    this.pool.add(newMat);
    this.materials.set(key, newMat);
    if (isAnimatedMaterial(newMat)) {
      this.animatedMaterials.push(newMat);
    }
    return newMat;
  }

  /** Update uniforms for materials that are animated. */
  public onAnimate(elapsedTime: number) {
    this.animatedMaterials.forEach(m => m.animate(elapsedTime));
  }
}
