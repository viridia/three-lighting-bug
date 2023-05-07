import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import {
  AnimationClip,
  BackSide,
  BufferGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshDepthMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  RGBADepthPacking,
  sRGBEncoding,
  Texture,
  Vector3,
} from 'three';
import { RefCountable } from '@faery/common';
import { ModelRef } from './ModelRef';
import { ResourcePool } from '@faery/common';
import type { AnimationMap, IModelCatalog, LoadResult, ModelMap } from './IModelCatalog';
import { AnimationClipRef } from './AnimationClipRef';
import { MaterialPool } from './MaterialPool';

const DEFAULT_TRANSFORM = new Matrix4().identity();
const DEFAULT_POSITION = new Vector3();

interface IAnimatedMaterial extends Material {
  animate: (time: number) => void;
}

/** A collection of models which have been grouped together for minimizing network transfers. */
export class ModelCatalog extends RefCountable implements IModelCatalog {
  private pool = new ResourcePool();
  private gltf: GLTF | null = null;
  private groups: ModelMap = {};
  private animations: AnimationMap = {};
  private materials = new MaterialPool(); // TODO: Replace with MaterialPool
  private animationTargets = new Set<string>();
  private animatedMaterials: IAnimatedMaterial[] = []; // For things like ocean waves.
  private nextMatName = 0;
  private _promise: Promise<LoadResult>;
  private stale = false;

  constructor(private catalogUrl: string, private loader: GLTFLoader) {
    super();
    this._promise = this.loadCatalog();
  }

  /** Indicates that the version in memory is older than the version on disk, which means
      we want to reload the catalog. This only happens during editing.
   */
  public setStale() {
    this.stale = true;
    this._promise = this.loadCatalog();
  }

  /** Retrieve a model from the catalog and return a reference. Note that the model may
      not be loaded yet, in which case the reference will be filled in when it is.
   */
  public get(modelId: string): ModelRef {
    this.acquire();
    return new ModelRef(this, modelId);
  }

  /** Retrieve an animation from the catalog. */
  public getAnimation(animationName: string): AnimationClipRef {
    this.acquire();
    return new AnimationClipRef(this, animationName);
  }

  /** Return a list of all the models in this catalog. */
  public list(): Promise<Object3D[]> {
    return this.load().then(() => {
      const result: Object3D[] = [];
      const keys = Object.getOwnPropertyNames(this.groups);
      keys.sort();
      keys.forEach(name => result.push(this.groups[name]));
      return result;
    });
  }

  /** Return a list of all the models in this catalog. */
  public listAnimations(): Promise<AnimationClip[]> {
    return this.load().then(() => {
      return this.gltf!.animations.slice();
    });
  }

  public get animationMap(): AnimationMap {
    return this.animations;
  }

  /** Return a promise which resolves when the catalog is loaded. If the catalog is known
      to be out of date, this triggers a reload which returns a fresh promise.
   */
  public load(): Promise<LoadResult> {
    if (this.stale) {
      this._promise = this.loadCatalog();
      this.stale = false;
    }
    return this._promise;
  }

  /** Update uniforms for materials that are animated. */
  public animateMaterials(time: number) {
    this.animatedMaterials.forEach(m => m.animate(time));
  }

  /** Traverse the entire scene graph and dispose all resources. */
  protected disposeInternal() {
    this.gltf?.scene.traverse(obj => {
      if (obj instanceof Mesh) {
        if (obj.geometry instanceof BufferGeometry) {
          obj.geometry.dispose();
        }
        if (obj.material instanceof Material) {
          obj.material.dispose();
        }
      }
    });
    this.animatedMaterials = [];
    this.pool.dispose();
  }

  /** Register a material with this catalog. This does two things:
      * Avoids creation of duplicate materials.
      * Makes sure that the materials are disposed when the catalog is no longer in use.
      @param key A unique key to identify the material. This should contain any salient parameters
        of the material.
      @param create A callback function to create the material, will only be called if there
        is no mteraisl with that key.
   */
  public getMaterial(key: string, create: () => Material) {
    return this.materials.get(key, create);
  }

  /** Create instances of this model using whatever technique is most efficient.
      @param obj The model we are creating instances of.
      @param group Instances will be added to this group.
      @param numInstances The number of instances to create.
      @param instanceMeshes Output array of instanced meshes.
  */
  public createInstances(
    obj: Object3D,
    group: Group,
    numInstances: number,
    instanceMeshes: InstancedMesh[],
    instanceTransforms: Matrix4[],
    parentTransform = DEFAULT_TRANSFORM
  ) {
    // If the obj is animated, then we can't use InstancedMesh to render it.
    // Instead, make N clones of the object (one for each instance) and add them
    // to an animation group. There will be one animation group per instance.
    // This animation group will get the transform that would normally be applied
    // to the instance.
    if (this.animationTargets.has(obj.name)) {
      return;
    }

    let transform = parentTransform;
    if (obj instanceof Group) {
      // TODO: Handle rotations / scaling as well.
      if (obj.children.length > 0 && !obj.position.equals(DEFAULT_POSITION)) {
        transform = new Matrix4().makeTranslation(obj.position.x, obj.position.y, obj.position.z);
      }
      obj.children.forEach(child => {
        this.createInstances(
          child,
          group,
          numInstances,
          instanceMeshes,
          instanceTransforms,
          transform
        );
      });
    } else if (obj instanceof Mesh) {
      if (obj.geometry instanceof BufferGeometry) {
        obj.geometry.computeBoundingBox();
        obj.geometry.computeBoundingSphere();
      }
      this.pool.add(obj.geometry);

      // TODO: Handle rotations / scaling as well.
      if (obj.children.length > 0 && !obj.position.equals(DEFAULT_POSITION)) {
        transform = new Matrix4().makeTranslation(obj.position.x, obj.position.y, obj.position.z);
      }
      obj.children.forEach(child => {
        this.createInstances(
          child,
          group,
          numInstances,
          instanceMeshes,
          instanceTransforms,
          transform
        );
      });

      let im: InstancedMesh;
      if (obj.userData.billboard) {
        const map: Texture = obj.material.map;
        // Might need to fix sapling textures before enabling this.
        map.encoding = sRGBEncoding;
        this.ensureName(map);

        const mat = this.getMaterial(
          `billboard_${map.name}`,
          () =>
            new MeshLambertMaterial({
              name: 'billboard',
              side: DoubleSide,
              transparent: true,
              alphaTest: 0.2,
              map,
            })
        );

        im = new InstancedMesh(obj.geometry, mat, numInstances);
        const customDepthMaterial = this.getMaterial(
          `depth_${map.name}`,
          () =>
            new MeshDepthMaterial({
              depthPacking: RGBADepthPacking,
              map,
              alphaTest: 0.5,
            })
        );

        im.customDepthMaterial = customDepthMaterial;
        im.castShadow = true;
        im.receiveShadow = true;
        im.matrixAutoUpdate = false;
        instanceMeshes.push(im);
        instanceTransforms.push(parentTransform);
        group.add(im);
      } else {
        const map = obj.material.map;
        this.ensureName(map);

        if (map instanceof Texture) {
          map.encoding = sRGBEncoding;
        }

        // We need to clone the material because we can't share mats between instanced
        // and non-instanced meshes.
        const material = obj.material;
        let mat: Material;
        if (
          material instanceof MeshPhysicalMaterial ||
          material instanceof MeshStandardMaterial
        ) {
          mat = this.getMaterial(`pbr_${material.uuid}`, () => material.clone());
          mat.shadowSide = BackSide;
        } else {
          mat = this.getMaterial(
            `color_${obj.material.color}_${map ? map.name : 'solid'}`,
            () =>
              new MeshLambertMaterial({
                color: obj.material.color,
                map,
              })
          );
        }

        im = new InstancedMesh(obj.geometry, mat, numInstances);
        im.castShadow = true;
        im.receiveShadow = true;
        im.matrixAutoUpdate = false;
        instanceMeshes.push(im);
        instanceTransforms.push(parentTransform);
        group.add(im);

        if (material.userData.portalglow || material.userData.flame) {
          im.castShadow = false;
          im.receiveShadow = false;
          return; // No outline
        }
      }
    }
  }

  /** Locate animated meshes within the model hierarchy. */
  public createAnimatedModels(
    obj: Object3D,
    numInstances: number,
    animationGroups: Group[],
    context: any[]
  ): void {
    // If the obj is animated, then we can't use InstancedMesh to render it.
    // Instead, make N clones of the object (one for each instance) and add them
    // to an animation group. There will be one animation group per instance.
    // This animation group will get the transform that would normally be applied
    // to the instance.
    for (let i = 0; i < numInstances; i += 1) {
      const sceneryContext = context?.[i];
      const copy = obj.clone();
      copy.traverse(child => {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child instanceof Mesh) {
          child.material.shadowSide = BackSide;
          if (child.material.map instanceof Texture) {
            child.material.encoding = sRGBEncoding;
          }
        }

        child.userData.sceneryContext = sceneryContext;
      });
      if (!animationGroups[i]) {
        console.error(
          `Missing animation group for: ${obj.name} [${i}] length=${animationGroups.length}`
        );
        this.gltf?.animations.forEach(anim => {
          console.info(`  - ${anim.name}`);
        });
      } else {
        animationGroups[i].add(copy);
      }
    }
  }

  public getNumMaterials() {
    return this.materials.size;
  }

  private loadCatalog() {
    return new Promise<LoadResult>((resolve, reject) => {
      this.loader.load(
        this.catalogUrl,
        gltf => {
          this.gltf = gltf;
          // console.log(gltf);

          // Keep track of all the models and groups that have animation tracks.
          // This builds a map of all the animations available for a given animation target.
          gltf.animations.forEach(animation => {
            this.animations[animation.name] = animation;
            // console.log('animation', animation.name);
            animation.tracks.forEach(track => {
              const targetName = track.name.slice(0, track.name.lastIndexOf('.'));
              // console.log(animation.name, track.name);
              this.animationTargets.add(targetName);
            });
          });

          gltf.scenes.forEach(scene => {
            if (scene.name) {
              if (scene.name === 'Scene') {
                // It's a blender file, split into separate objects.
                scene.children.forEach(child => {
                  if (child.name && child.name !== 'Camera') {
                    this.groups[child.name] = child;
                  }
                });
              } else if (scene instanceof Mesh || scene instanceof Group) {
                this.groups[scene.name] = scene;
              }
            }
          });
          resolve([this.groups, this.animations]);
        },
        undefined,
        error => {
          console.log(error);
          reject(error);
        }
      );
    });
  }

  private ensureName(texture: Texture) {
    if (texture && !texture.name) {
      texture.name = `texture-${++this.nextMatName}`;
    }
  }
}
