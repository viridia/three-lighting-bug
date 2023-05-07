import { BackSide, Color, FrontSide, Material, Mesh, Object3D } from 'three';
import { getEngine } from '../../IEngine';
import { HairMaterial } from '../../materials';
import { AnimationMap, ModelRef } from '../../models';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RefCountable } from '@faery/common';
import { ColorMap, FeatureSelection } from '../../types';

export type SkinMaterialsMap = Map<string, Material & { color: Color }>;

interface IColorScheme {
  colorSlots?: string[];
  colors?: ColorMap;
  featureSelection?: FeatureSelection;
  scale?: number;
}

/** An skinned character mesh loaded from a .glb file. */
export class SkinnedModel extends RefCountable {
  private skinRef: ModelRef;
  private armatureRef: ModelRef;
  private armature?: Object3D;
  private animationsRoot?: ModelRef;
  private skins: Record<string, Object3D> = {};
  private animations: AnimationMap = {};
  private animationErrors?: Set<string>;
  private promise?: Promise<unknown>;

  constructor(public readonly skinName: string, armatureName: string, animations?: string) {
    super();
    this.skinRef = getEngine().models.get(skinName);
    this.armatureRef = getEngine().models.get(armatureName);
    this.animationsRoot = animations ? getEngine().models.get(animations) : undefined;
  }

  public disposeInternal() {
    this.skinRef.dispose();
    this.armatureRef.dispose();
    this.animationsRoot?.dispose();
  }

  public async load(): Promise<unknown> {
    if (this.promise) {
      return this.promise;
    }

    this.promise = this.armatureRef.get().then(armature => {
      this.armature = armature;
      this.animations = this.armatureRef.catalog.animationMap;

      return this.skinRef.catalog.list().then(skins => {
        // Add outlines
        for (const skin of skins) {
          this.skins[skin.name] = skin;
        }
      });
    });

    // Load animations from a different .glb file
    const animations = this.animationsRoot;
    if (animations) {
      this.promise = this.promise
        .then(() => animations.get())
        .then(() => {
          this.animations = animations.catalog.animationMap;
        });
    }

    return this.promise;
  }

  /** Return a new instance of this character. */
  public createInstance({
    colors = {},
    featureSelection = {},
    scale = 1,
  }: IColorScheme) {
    if (!this.armature) {
      throw new Error('Wait for promise before using');
    }
    const [, skinName] = this.skinName.split(':');
    const components: Object3D[] = [];
    const skin = this.skins[skinName];
    if (skin) {
      components.push(skin);
    } else {
      console.error('Skin not found:', this.skinName);
    }

    if (featureSelection) {
      for (const slot of Object.keys(featureSelection)) {
        if (featureSelection[slot]) {
          const featureSkin = this.skins[slot];
          if (featureSkin) {
            components.push(featureSkin);
          }
        }
      }
    }

    this.armature.add(...components);
    const armatureInstance = (SkeletonUtils as any).clone(this.armature) as Object3D;
    armatureInstance.scale.set(scale, scale, scale);
    this.armature.remove(...components);

    armatureInstance.traverse(child => {
      if (child instanceof Mesh) {
        const material = child.material;
        const slotName = material.name || 'Default';
        const color = colors[slotName];

        // Share material with instances of the same archetype.
        // const sharedMaterial = materials.get(slotName);
        // if (sharedMaterial) {
        //   child.material = sharedMaterial;
        //   return;
        // }

        if (material.userData.material === 'hair') {
          const hairColor = color ? new Color(color) : material.color;
          const newMaterial = new HairMaterial({
            color: hairColor,
          });
          newMaterial.side = FrontSide;
          newMaterial.shadowSide = BackSide;
          child.material = newMaterial;
        }
      }
    });
    return armatureInstance;
  }

  public getAnimation(clipName: string) {
    const clip = this.animations[clipName];
    if (!clip) {
      if (!this.animationErrors) {
        this.animationErrors = new Set();
      }
      if (!this.animationErrors.has(clipName)) {
        this.animationErrors.add(clipName);
        console.error(`Missing animation track for ${this.skinName}:`, clipName);
        console.warn('Valid track names are:', Reflect.ownKeys(this.animations).sort());
      }
    }
    return clip;
  }

  public maybeGetAnimation(clipName: string) {
    return this.animations[clipName];
  }

  public listAnimations(): string[] {
    return Object.keys(this.animations).sort();
  }
}
