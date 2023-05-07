import {
  BackSide,
  Box2,
  BoxGeometry,
  ClampToEdgeWrapping,
  FrontSide,
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  Plane,
  Scene,
  Side,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { getEngine } from '../../IEngine';
import { Realm } from '../Realm';
import { ActivePortalMaterial } from './ActivePortalMaterial';

const tmpVector3 = new Vector3();

// const debugStencilRect = false;
// const debugStencilColor = true;

export class ActivePortal {
  public readonly portalCamera: PerspectiveCamera;
  public isOnscreen = false;

  /** Location of source end. */
  public readonly sourcePosition = new Vector3();
  public sourceRealm: Realm | null = null;

  /** Location of destination end. */
  public readonly destinationPosition = new Vector3();
  public destinationRealm: string = '';

  /** Depth of the nearest point of the portal. */
  public nearDepth = Infinity;

  /** Size of the hole. */
  private apertureSize = new Vector3();
  private aperturePlane = new Plane();

  /** Direction the hole is facing */
  private apertureFacing = new Vector4();
  private apertureSide: Side = FrontSide;

  /** Difference between near and far end. Used to calculate relative camera position. */
  private differential = new Vector3();
  private displacement = 0;

  // The geometric appearance of the portal.
  private geometry = new BoxGeometry(1, 2, 0);
  private material = new ActivePortalMaterial();
  private mesh = new Mesh(this.geometry, this.material);

  private renderTarget: WebGLRenderTarget | null = null;

  /** Rectangular bounds of portal on screen. */
  private mainScreenRect = new Box2();
  private portalScreenRect = new Box2();

  /** Same as screenRect, but in a form acceptable to scissor/viewport calls. */
  private portalViewport = new Vector4();
  private portalSize = new Vector2();
  private portalBufferSize = new Vector2();

  // Used in calculations
  private lookAtPt = new Vector3();
  private worldPt = new Vector3();
  private screenPt = new Vector2();
  private cameraFacing = new Vector3();
  private sourceScene?: Scene;
  private destinationScene?: Scene;
  private clippingPlane = new Plane();

  private needsUpdate = false;

  constructor() {
    this.portalCamera = new PerspectiveCamera(40, 1, 0.1, 25);
    this.mesh.matrixAutoUpdate = false;
    this.mesh.visible = true;
    this.mesh.name = 'Portal';
    this.mesh.renderOrder = 20;
  }

  public dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.parent?.remove(this.mesh);
    this.renderTarget?.dispose();
  }

  public setSource(position: Vector3, realm: Realm) {
    this.sourcePosition.copy(position);
    this.sourceRealm = realm;
    this.mesh.position.copy(this.sourcePosition);
    this.mesh.updateMatrix();
    this.needsUpdate = true;
  }

  public setDestination(position: Vector3, realm: string) {
    this.destinationPosition.copy(position);
    this.destinationRealm = realm;
    // this.material.colorWrite = !realm; // If no realm set, draw magenta
  }

  public setAperture(size: Vector3, facing: Vector4, side: Side) {
    this.apertureSize.copy(size).multiplyScalar(0.5);
    this.apertureFacing.copy(facing);
    this.apertureSide = side;
    this.needsUpdate = true;
  }

  /** Additional distance to travel when moving through the portal. */
  public setDisplacement(displacement = 0) {
    this.displacement = displacement;
  }

  public update(camera: PerspectiveCamera, screenSize: Vector2, viewCenter: Vector3) {
    this.differential.copy(this.destinationPosition).sub(this.sourcePosition);

    if (this.needsUpdate) {
      this.needsUpdate = false;

      // Update aperature rendering
      this.geometry?.dispose();
      this.geometry = new BoxGeometry(
        this.apertureSize.x * 2,
        this.apertureSize.y * 2,
        this.apertureSize.z * 2
      );
      this.mesh.geometry = this.geometry;
      this.mesh.geometry.computeBoundingSphere();
      this.mesh.frustumCulled = true;

      if (this.apertureSize.x === 0) {
        tmpVector3.set(1, 0, 0);
        this.aperturePlane.setFromNormalAndCoplanarPoint(tmpVector3, this.sourcePosition);
      } else if (this.apertureSize.y === 0) {
        tmpVector3.set(0, 1, 0);
        this.aperturePlane.setFromNormalAndCoplanarPoint(tmpVector3, this.sourcePosition);
      } else if (this.apertureSize.z === 0) {
        tmpVector3.set(0, 0, 1);
        this.aperturePlane.setFromNormalAndCoplanarPoint(tmpVector3, this.sourcePosition);
      } else {
        console.error('portal not flat');
      }
    }

    this.mainScreenRect.min.set(0, 0);
    this.mainScreenRect.max.copy(screenSize);
    const widthHalf = screenSize.width / 2;
    const heightHalf = screenSize.height / 2;
    this.nearDepth = Infinity;

    const addPortalPoint = (x: number, y: number, z: number) => {
      this.worldPt.set(x, y, z);
      this.worldPt.applyMatrix4(this.mesh.matrixWorld);
      this.worldPt.project(camera);

      this.screenPt.x = Math.round(this.worldPt.x * widthHalf + widthHalf);
      this.screenPt.y = Math.round(-(this.worldPt.y * heightHalf) + heightHalf);
      this.portalScreenRect.expandByPoint(this.screenPt);

      this.worldPt.applyMatrix4(camera.projectionMatrixInverse);
      this.nearDepth = Math.min(this.nearDepth, -this.worldPt.z);
    };

    this.portalScreenRect.makeEmpty();

    // Compute all 8 points of the aperture box.
    addPortalPoint(-this.apertureSize.x, -this.apertureSize.y, -this.apertureSize.z);
    addPortalPoint(this.apertureSize.x, -this.apertureSize.y, -this.apertureSize.z);
    addPortalPoint(-this.apertureSize.x, this.apertureSize.y, -this.apertureSize.z);
    addPortalPoint(this.apertureSize.x, this.apertureSize.y, -this.apertureSize.z);
    addPortalPoint(-this.apertureSize.x, -this.apertureSize.y, this.apertureSize.z);
    addPortalPoint(this.apertureSize.x, -this.apertureSize.y, this.apertureSize.z);
    addPortalPoint(-this.apertureSize.x, this.apertureSize.y, this.apertureSize.z);
    addPortalPoint(this.apertureSize.x, this.apertureSize.y, this.apertureSize.z);

    // Set a flag indicating whether the portal screen rect overlaps the main viewport.
    this.cameraFacing.copy(this.sourcePosition).sub(camera.position);
    tmpVector3.set(this.apertureFacing.x, this.apertureFacing.y, this.apertureFacing.z);
    this.clippingPlane.normal.copy(tmpVector3);
    this.clippingPlane.constant = -this.destinationPosition.dot(tmpVector3);
    if (this.cameraFacing.dot(tmpVector3) < 0) {
      this.clippingPlane.normal.multiplyScalar(-1);
      this.clippingPlane.constant = -this.clippingPlane.constant;
    }
    this.isOnscreen =
      this.mainScreenRect.intersectsBox(this.portalScreenRect) && this.nearDepth > 0;
    if (this.apertureSide === FrontSide) {
      this.isOnscreen &&= this.cameraFacing.dot(tmpVector3) > 0;
    } else if (this.apertureSide === BackSide) {
      this.isOnscreen &&= this.cameraFacing.dot(tmpVector3) < 0;
    }

    this.lookAtPt.copy(viewCenter).add(this.differential);

    // private renderTarget: WebGLRenderTarget | null = null;
    // Get size of render target and round up.
    this.portalScreenRect.getSize(this.portalSize);
    this.portalBufferSize.x = nextPowerOfTwo(this.portalSize.x);
    this.portalBufferSize.y = nextPowerOfTwo(this.portalSize.y);

    if (
      this.isOnscreen &&
      (this.renderTarget === null ||
        this.renderTarget.width < this.portalBufferSize.x ||
        this.renderTarget.height < this.portalBufferSize.y)
    ) {
      if (this.renderTarget) {
        this.renderTarget.dispose();
      }
      this.renderTarget = new WebGLRenderTarget(this.portalBufferSize.x, this.portalBufferSize.y, {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        wrapS: ClampToEdgeWrapping,
        wrapT: ClampToEdgeWrapping,
      });

      this.material.uniforms.portalTexture = { value: this.renderTarget.texture };
      this.material.uniforms.textureSize = { value: this.portalSize };
      this.material.uniforms.viewportRect = { value: this.portalViewport };
    }

    // Compute viewport coordinates.
    this.portalViewport.x = this.portalScreenRect.min.x;
    this.portalViewport.y = screenSize.height - this.portalScreenRect.max.y;
    this.portalViewport.z = this.portalScreenRect.max.x - this.portalScreenRect.min.x;
    this.portalViewport.w = this.portalScreenRect.max.y - this.portalScreenRect.min.y;

    this.material.needsUpdate = true;

    // Place the portal camera in the same relative position to the far end as the camera
    // is to the near end.
    this.portalCamera.position.copy(camera.position).add(this.differential);
    this.portalCamera.fov = camera.fov;
    this.portalCamera.lookAt(this.lookAtPt);
    this.portalCamera.setViewOffset(
      screenSize.width,
      screenSize.height,
      this.portalScreenRect.min.x,
      this.portalScreenRect.min.y,
      this.portalScreenRect.max.x - this.portalScreenRect.min.x,
      this.portalScreenRect.max.y - this.portalScreenRect.min.y
    );

    this.mesh.visible = this.isOnscreen;
  }

  public addToScene(sourceScene: Scene, destinationScene: Scene) {
    if (this.sourceScene !== sourceScene) {
      this.sourceScene = sourceScene;
      sourceScene.add(this.mesh);
    }
    this.destinationScene = destinationScene;
  }

  public removeFromScene() {
    this.sourceScene = undefined;
    this.mesh.parent?.remove(this.mesh);
  }

  public isInScene() {
    return !!this.sourceScene;
  }

  public setVisible(visible: boolean) {
    this.mesh.visible = visible && this.isOnscreen;
  }

  public render(renderer: WebGLRenderer) {
    if (this.destinationScene && this.isOnscreen && this.sourceRealm) {
      getEngine().emit('beforeRenderRealm', this.sourceRealm, this.lookAtPt);
      renderer.setRenderTarget(this.renderTarget);
      renderer.setViewport(this.portalViewport);
      renderer.clippingPlanes[0].copy(this.clippingPlane);
      // this.mesh.visible = false;
      this.sourceRealm.updateLighting(this.lookAtPt);
      renderer.clear(true, true, true);
      renderer.render(this.destinationScene, this.portalCamera);
      // this.mesh.visible = this.isOnscreen;
    }
  }

  /** Return 'true' if a motion path passes through the portal aperture.
      @param p0 start point of the motion.
      @param p1 end point of the motion.
      @param yOffset Since actors often have their origin at their feet, move the points upward
          slightly so we are testing whether their midpoint traverses the portal.
  */
  public isTraversal(p0: Vector3, p1: Vector3, yOffset: number): boolean {
    let d0: number;
    let d1: number;
    // TODO: Generalize this to portals that can face in any direction.
    // Assume thast portal is zero-size in one dimension.
    if (this.apertureSize.x === 0) {
      d0 = p0.x - this.sourcePosition.x;
      d1 = p1.x - this.sourcePosition.x;
    } else if (this.apertureSize.y === 0) {
      d0 = p0.y - this.sourcePosition.y;
      d1 = p1.y - this.sourcePosition.y;
    } else if (this.apertureSize.z === 0) {
      d0 = p0.z - this.sourcePosition.z;
      d1 = p1.z - this.sourcePosition.z;
    } else {
      console.error('non-planar portal');
      return false;
    }

    // If p0 and p1 both on the same side of the portal, then false.
    if (d0 < 0 === d1 < 0) {
      return false;
    }

    // Vector is zero-length or co-planar with portal.
    if (d1 - d0 === 0) {
      return false;
    }

    // Vector ends short of portal, or begins after.
    const t = d0 / (d0 - d1);
    if (t < 0 || t > 1) {
      return false;
    }

    tmpVector3.copy(p0).lerp(p1, t).sub(this.sourcePosition);
    if (this.apertureSize.x > 0 && Math.abs(tmpVector3.x) >= this.apertureSize.x) {
      return false;
    }
    if (this.apertureSize.y > 0 && Math.abs(tmpVector3.y + yOffset) >= this.apertureSize.y) {
      return false;
    }
    if (this.apertureSize.z > 0 && Math.abs(tmpVector3.z) >= this.apertureSize.z) {
      return false;
    }

    return true;
  }

  public applyDisplacement(position: Vector3, velocity: Vector3) {
    tmpVector3.set(this.apertureFacing.x, this.apertureFacing.y, this.apertureFacing.z);
    let direction = 0;
    if (this.apertureSide === FrontSide) {
      direction = 1;
    } else if (this.apertureSide === BackSide) {
      direction = -1;
    }
    // const direction = tmpVector3.dot(velocity);
    // console.log(tmpVector3, direction);
    position.addScaledVector(tmpVector3, this.displacement * direction);
  }
}

function nextPowerOfTwo(sz: number) {
  for (let n = 32; n <= 256; n = n * 2) {
    if (n >= sz) {
      return n;
    }
  }
  return sz;
}
