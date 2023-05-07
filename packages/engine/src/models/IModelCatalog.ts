import type { IRefCountable } from '@faery/common';
import type { AnimationClip, Group, InstancedMesh, Material, Matrix4, Object3D } from 'three';
import type { ModelRef } from './ModelRef';

export type ModelMap = { [key: string]: Object3D };
export type AnimationMap = { [key: string]: AnimationClip };
export type LoadResult = [Readonly<ModelMap>, Readonly<AnimationMap>];

export interface IModelCatalog extends IRefCountable {
  /** Load the catalog if not already loaded. Note: Care needs to be taken when using the
      result of this promise - these references may not longer be valid once the catalog
      has been disposed, since any buffers and materials referenced will also be disposed.
      Easiest way to avoid this is to use ModelRef instead of this method.
   */
  load(): Promise<[Readonly<ModelMap>, Readonly<AnimationMap>]>;

  /** Retrieve a model from the catalog and return a reference. Note that the model may
      not be loaded yet, in which case the reference will be filled in when it is.
   */
  get(modelId: string): ModelRef;

  /** Return a list of all the models in this catalog. */
  list(): Promise<Object3D[]>;

  /** Return a list of all the models in this catalog. */
  listAnimations(): Promise<AnimationClip[]>;

  animationMap: AnimationMap;

  /** Create instances of this model using whatever technique is most efficient.
      @param group Instances will be added to this group.
      @param pool Any resources allocated will be added to this pool.
      @param numInstances Number of instances to create.
      @param instanceMeshes Output array for instance meshes created.
  */
  createInstances(
    obj: Object3D,
    group: Group,
    numInstances: number,
    instanceMeshes: InstancedMesh[],
    instanceTransforms: Matrix4[],
    inheritedTransform?: Matrix4
  ): void;

  /** Locate animated meshes within the model hierarchy. */
  createAnimatedModels(
    obj: Object3D,
    numInstances: number,
    animationGroups: Group[],
    context?: any[]
  ): void;

  /** Update uniforms for materials that are animated. */
  animateMaterials(time: number): void;

  getMaterial(key: string, create: () => Material): Material;
}
