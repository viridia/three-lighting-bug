import { encode } from '@msgpack/msgpack';
import { invariant } from '@faery/common';
import {
  Box2,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PointLight,
  Scene,
  Vector2,
  Vector3,
} from 'three';
import type { IAssetLoader } from '../metadata';
import { extensionCodec } from '../lib/msgpackExtension';
import { ILightSourcePlacement, MAX_POINT_LIGHTS } from '../lighting/ILightSource';

const PLOT_LENGTH = 16;

const SUNLIGHT_COLOR = new Color('#ffffff');
const AMBIENT_COLOR_SKY = new Color(0xb1e1ff);
const AMBIENT_COLOR_GROUND = new Color(0xb97a20);

const LIGHT_DISTANCE = 20; // Distance from camera target to sunlight.

export interface IRealmData {
  name: string;
  xOffset: number;
  yOffset: number;
  xSize: number;
  ySize: number;

  // Plot: bottom 2 bits are orientation, remaining bits are plot id.
  plots: number[]; // xSize * ySize
  defaultPlot: number;

  /** URL of map to display. */
  mapImage?: string;
  lightingType?: 'exterior' | 'interior';

  /** If this is an underground realm, the id of the corresponding above-ground realm.
      This determines which outdoor map is displayed when there is no underground map.
   */
  parentRealm?: string;
}

const locationKey = (x: number, y: number) => `${x}:${y}`;

/** A game map, representning overland or underground. */
export class Realm {
  public xOffset: number = 0;
  public yOffset: number = 0;
  public xSize: number = 1;
  public ySize: number = 1;
  public loaded = false;
  public bounds = new Box2();

  // Plot: bottom 2 bits are orientation, remaining bits are plot id.
  public plots: Uint16Array; // xSize * ySize
  public biomes: Uint8Array; // xSize * ySize
  public defaultPlot: number = 0;
  public defaultBiome: number = 0;
  public needsUpdateBiomes = true;

  public mapImage?: string;
  public lightingType?: 'exterior' | 'interior';

  public scene = new Scene();
  public actorGroup = new Group();
  public ambientLight: HemisphereLight;
  public directionalLight: DirectionalLight;
  public sunlightDirection = new Vector3();
  public pointLights: PointLight[] = [];

  private promise?: Promise<unknown>;
  private realmOffset = new Vector2(); // For realms whose maps start at somewhere besides 0,0.
  private structureManifest = new Set<string>();

  constructor(public readonly name: string, private loader: IAssetLoader) {
    this.plots = new Uint16Array(1);
    this.biomes = new Uint8Array(1);
    this.ambientLight = this.createAmbientLight();
    this.directionalLight = this.createDirectionalLight();
    this.scene.name = `Scene.${name}`;
    this.scene.add(this.actorGroup);
    this.actorGroup.name = `Actors.${name}`;
    this.sunlightDirection.set(3, 10, 5).normalize();

    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pl = new PointLight();
      pl.intensity = 0;
      this.pointLights.push(pl);
      this.scene.add(pl);
    }
  }

  public createAmbientLight() {
    const light = new HemisphereLight(AMBIENT_COLOR_SKY, AMBIENT_COLOR_GROUND, 0.6);
    this.scene.add(light);
    return light;
  }

  public createDirectionalLight() {
    const light = new DirectionalLight(SUNLIGHT_COLOR, 0.4);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = -20;
    light.shadow.camera.far = 40;
    light.shadow.camera.left = -16.5;
    light.shadow.camera.right = 16.5;
    light.shadow.camera.top = 16.5;
    light.shadow.camera.bottom = -16.5;
    this.scene.add(light);
    this.scene.add(light.target);
    return light;
  }

  public updateLighting(viewPosition: Vector3) {
    const directionalLight = this.directionalLight;

    // Quantize light position so that shadows don't jitter too much.
    const targetPos = directionalLight.target.position;
    targetPos.set(
      Math.round(viewPosition.x),
      Math.round(viewPosition.y),
      Math.round(viewPosition.z)
    );

    directionalLight.position
      .copy(targetPos)
      .addScaledVector(this.sunlightDirection, LIGHT_DISTANCE);

    const lights: ILightSourcePlacement[][] = [];
    const lightsSorted = lights.flat().sort((a, b) => {
      const da = a.position.distanceToSquared(viewPosition);
      const db = b.position.distanceToSquared(viewPosition);
      return da - db;
    });

    for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
      const pl = this.pointLights[i];
      if (i < lightsSorted.length) {
        const lp = lightsSorted[i];
        pl.position.copy(lp.position);
        pl.color.copy(lp.lightColor);
        pl.distance = lp.radius ?? 1;
        pl.visible = true;
        pl.updateMatrix();
        pl.matrixAutoUpdate = false;
        pl.intensity = lp.intensity ?? 1;
      } else {
        pl.intensity = 0;
      }
    }
  }

  public load(): Promise<unknown> {
    if (!this.promise) {
      this.promise = Promise.resolve();
    }
    return this.promise;
  }

  public save() {
    const encoded = encode(this.serialize(), { extensionCodec });
    window.fetch(`${this.loader.baseUrl}/realms/${this.name}.msgpack`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
      },
      body: encoded,
    });
  }

  public serialize() {
    return {
      name: this.name,
      xOffset: this.xOffset,
      yOffset: this.yOffset,
      xSize: this.xSize,
      ySize: this.ySize,

      // Plot: bottom 2 bits are orientation, remaining bits are plot id.
      plots: Array.from(this.plots),
      biomes: Array.from(this.biomes),
      defaultPlot: this.defaultPlot,

      mapImage: this.mapImage,
      lightingType: this.lightingType,
    };
  }

  public deserialize(data: IRealmData) {
    invariant(typeof data.xOffset === 'number');
    this.xOffset = data.xOffset;
    this.yOffset = data.yOffset;
    this.xSize = data.xSize;
    this.ySize = data.ySize;
    this.plots = new Uint16Array(data.plots);
    this.defaultPlot = data.defaultPlot;
    this.updateBounds();
    this.needsUpdateBiomes = true;
    this.mapImage = data.mapImage;
    this.lightingType = data.lightingType;
  }

  public hasStructure(x: number, y: number) {
    return this.structureManifest.has(locationKey(x, y));
  }

  public addStructure(x: number, y: number) {
    this.structureManifest.add(locationKey(x, y));
  }

  public updateBounds() {
    this.bounds.min.set(this.xOffset * PLOT_LENGTH, this.yOffset * PLOT_LENGTH);
    this.bounds.max.set(
      (this.xOffset + this.xSize) * PLOT_LENGTH,
      (this.yOffset + this.ySize) * PLOT_LENGTH
    );
  }
}
