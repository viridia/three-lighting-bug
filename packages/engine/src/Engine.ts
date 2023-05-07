import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Vector2,
  Vector3,
  sRGBEncoding,
  Vector4,
  Plane,
  Frustum,
  Object3D,
  Sphere,
  Box3,
} from 'three';
import { World } from './world';
import type { ModelCache } from './models';
import type { IEngine } from './IEngine';
import type { ActivePortal } from './world/structures/ActivePortal';
import type { CullableObject } from './render/CullableObject';
import { ResourcePool } from '@faery/common';
import { setEngine } from './IEngine';
import { IAssetLoader } from './metadata';
import { createAtom, makeObservable } from '@faery/reflex';
import { EventSource, invariant } from '@faery/common';
import type { IEventTypeMap } from './IEventTypes';
import type { ISystem, ISystemKey } from './ISystem';
import { Viewpoint } from './render';

export type UpdateListener = (renderer: IEngine) => void;

const DEFAULT_FOV = 40;

// Patch Frustum to allow culling at object level.
const prevImpl = Frustum.prototype.intersectsObject;
const _sphere = new Sphere();
const _box = new Box3();
Frustum.prototype.intersectsObject = function (object: Object3D) {
  const cullable = object as unknown as CullableObject;
  if (cullable.boundingSphere) {
    _sphere.copy(cullable.boundingSphere).applyMatrix4(object.matrixWorld);
    return this.intersectsSphere(_sphere);
  }
  if (cullable.boundingBox) {
    _box.copy(cullable.boundingBox).applyMatrix4(object.matrixWorld);
    return this.intersectsBox(_box);
  }
  return prevImpl.call(this, object);
};

/** Game engine class, contains animation loop and references to engine resources. */
export class Engine extends EventSource<IEventTypeMap> implements IEngine {
  public scene = new Scene();
  public readonly camera: PerspectiveCamera;
  public readonly viewpoint: Viewpoint;
  public readonly renderer: WebGLRenderer;
  public readonly screenSize = new Vector2();
  public fixLightsHack = false;

  private pool = new ResourcePool();
  private mount: HTMLElement | undefined;
  private frameId: number | null = null;

  private deltaTime = 0;

  private saveViewport = new Vector4();
  private savedPlane = new Plane();
  private extensions: ISystem[] = [];
  private extensionsAtom = createAtom();

  constructor(
    public readonly world: World,
    public readonly assetLoader: IAssetLoader,
    public readonly models: ModelCache
  ) {
    super();
    setEngine(this);
    makeObservable(this, ['scene']);
    this.animate = this.animate.bind(this);
    this.onResize = this.onResize.bind(this);
    this.viewpoint = new Viewpoint(this);
    invariant(assetLoader.json);

    this.camera = new PerspectiveCamera(DEFAULT_FOV, 1, 0.1, 100);
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.autoClear = false;
    this.renderer.autoClearColor = false;
    this.renderer.autoClearDepth = false;
    this.renderer.autoClearStencil = false;
    this.renderer.outputEncoding = sRGBEncoding;
    this.renderer.clippingPlanes = [new Plane(new Vector3(0, -1, 0), 20)];
  }

  public dispose() {
    Object.values(this.extensions).forEach(ext => ext.dispose());
    this.pool.dispose();
    setEngine(null);
  }

  /** Register an extension object with the engine. */
  public addSystem<T extends ISystem>(key: ISystemKey<T>, extension: T) {
    if (this.extensions[key.key] !== extension) {
      const prev = this.extensions[key.key] as T;
      if (prev) {
        this.pool.remove(prev);
        prev.dispose();
      }
      this.pool.add(extension);
      this.extensions[key.key] = extension;
      console.log(`Extension Added: [${key.name}]`);
      this.extensionsAtom.onChanged();
    }
  }

  public async attach(mount: HTMLElement) {
    this.mount = mount;
    if (globalThis.addEventListener) {
      globalThis.addEventListener('resize', this.onResize);
    }

    mount.appendChild(this.renderer.domElement);
    this.onResize();
  }

  public start() {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  public detach() {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    globalThis.removeEventListener('resize', this.onResize);
    if (this.mount && this.renderer.domElement.parentNode === this.mount) {
      this.mount?.removeChild(this.renderer.domElement);
      this.mount = undefined;
    }
  }

  /** Return the time, in seconds, since the previous animation frame. */
  public get delta(): number {
    return this.deltaTime;
  }

  /** Indicates a user interaction - wakes up the rendering loop.

      This method exists because my 2015 MacBook air can't handle running the engine and
      editing in VSCode at the same time, so I have things set to stop the rendering loop
      after a few seconds of inactivity.

      @param once If set, it means we just want to schedule a single animation frame.
  */
  public interact(once = false) {
    if (!this.frameId) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  private updateCameraPosition() {
    const viewpoint = this.viewpoint;
    const far = 80 + (viewpoint.cameraDistance * 5) / 11;
    if (this.camera.far !== far) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
    this.camera.position.setFromSphericalCoords(
      viewpoint.cameraDistance,
      viewpoint.elevation,
      viewpoint.azimuth
    );
    this.camera.position.addVectors(this.camera.position, viewpoint.position);
    this.camera.lookAt(viewpoint.position);
    this.camera.updateMatrixWorld();
    this.renderer.getSize(this.screenSize);
    // this.terrain.visiblePortals().forEach(portal => {
    //   portal.update(this.camera, this.screenSize, viewpoint.position);
    // });
  }

  private animate(now: number) {
    // If FPS drops to lower than 10, don't animate big jumps.
    this.emit('beforeAnimate', 0);
    this.emit('animate', now / 1000);
    this.models.animateMaterials(now / 1000);
    // this.terrain.update();
    this.emit('update', 0);
    this.updateCameraPosition();
    this.render();

    // Don't keep rendering if there have been no interactions recently. This keeps the
    // game engine from melting my laptop during development.
    this.frameId = window.requestAnimationFrame(this.animate);
  }

  public render() {
    const portals: ActivePortal[] = [];
    // this.terrain.visiblePortals().forEach(portal => {
    //   if (portal.isOnscreen) {
    //     portals.push(portal);
    //   }
    // });

    // Evil hack to work around three.js problems with the lights getting messed up after
    // we render to an off-screen canvas. This forces the lights to recalculate.
    const r = this.viewpoint.maybeGetActiveRealm();
    // if (r && this.fixLightsHack) {
    //   this.fixLightsHack = false;
    //   r.directionalLight.castShadow = false;
    //   this.renderer.render(this.scene, this.camera);
    //   r.directionalLight.castShadow = true;
    // }

    this.savedPlane.copy(this.renderer.clippingPlanes[0]);
    this.renderer.getViewport(this.saveViewport);

    // Don't draw portals within portals.
    portals.forEach(portal => portal.setVisible(false));
    portals.forEach(portal => portal.render(this.renderer));
    portals.forEach(portal => portal.setVisible(true));

    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(this.saveViewport);
    this.renderer.clippingPlanes[0].copy(this.savedPlane);

    if (r) {
      this.scene = r.scene;
      this.emit('beforeRenderRealm', r, this.viewpoint.position);
      r.updateLighting(this.viewpoint.position);
    }

    this.renderer.clear(true, true, false);
    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    if (this.mount) {
      const width = this.mount.clientWidth;
      const height = this.mount.clientHeight;
      this.camera.aspect = width / height;
      this.camera.fov = Math.min(DEFAULT_FOV, (DEFAULT_FOV * 2) / this.camera.aspect);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.renderer.render(this.scene, this.camera);
    }
  }
}
