import { ease, EaseFunction, invariant } from '@faery/common';
import { createAtom } from '@faery/reflex';
import { Accessor, createSignal, Setter } from 'solid-js';
import { Box3, Vector3 } from 'three';
import type { IEngine } from '../IEngine';
import { createSystemKey } from '../ISystem';
import type { Realm } from '../world';

/** Used for views through portals. */
export interface ISecondaryViewLocation {
  realm: string;
  center: Vector3;
}

/** A class which tracks where the camera is looking at, and what objects are visible. */
export class Viewpoint {
  #getRealmId: Accessor<string>;
  #setRealmId: Setter<string>;
  #position = new Vector3();
  #positionAtom = createAtom();
  #positionEaseStart = new Vector3();
  #positionEaseEnd = new Vector3();
  #positionEaseFunction: EaseFunction = 'linear';
  #positionEaseDuration: number = 0;
  #positionEaseParam: number | null = null;
  #getAzimuth: Accessor<number>;
  #setAzimuth: Setter<number>;
  #getElevation: Accessor<number>;
  #setElevation: Setter<number>;
  #getCameraDistance: Accessor<number>;
  #setCameraDistance: Setter<number>;
  #secondaryViewLocations: ISecondaryViewLocation[] = [];
  #secondaryViewLocationsAtom = createAtom();
  #cutaways: Box3[] = [];
  #cutawaysAtom = createAtom();

  constructor(private engine: IEngine) {
    this.beforeAnimate = this.beforeAnimate.bind(this);
    [this.#getRealmId, this.#setRealmId] = createSignal('default');
    [this.#getAzimuth, this.#setAzimuth] = createSignal(0);
    [this.#getElevation, this.#setElevation] = createSignal(Math.PI * .25);
    [this.#getCameraDistance, this.#setCameraDistance] = createSignal(11);
    this.engine.subscribe('beforeAnimate', this.beforeAnimate);
    engine.addSystem(VIEWPOINT_KEY, this);
  }

  dispose() {
    this.engine.unsubscribe('beforeAnimate', this.beforeAnimate);
  }

  /** The current realm name (reactive). */
  public get realm(): string {
    return this.#getRealmId();
  }

  /** Set the current realm. */
  public setRealm(realm: string): void {
    this.#setRealmId(realm);
  }

  /** Returns true if the parameter `realm` is the current realm (reactive). */
  public isActiveRealm(realm: string) {
    return realm === this.#getRealmId();
  }

  /** Get the current realm object. Throw if not a valid realm object. */
  public getActiveRealm(): Realm {
    const realmName = this.#getRealmId();
    const realm = this.engine.world.getRealm(realmName);
    invariant(realm, `Invalid realm name: ${realmName}`);
    return realm;
  }

  /** Get the current realm object, or undefined if current realm does not exist. */
  public maybeGetActiveRealm(): Realm | undefined {
    const realmName = this.#getRealmId();
    const world = this.engine.world;
    return world.getRealm(realmName);
  }

  /** The current view position (where the camera is looking at). */
  public get position(): Readonly<Vector3> {
    this.#positionAtom.onObserved();
    return this.#position;
  }

  /** Move the camera to a new position, and possibly a different realm. */
  public moveTo(position: Vector3, realm?: string): void {
    if (realm) {
      this.#setRealmId(realm);
    }
    if (!this.#position.equals(position)) {
      this.#positionEaseParam = null;
      this.#position.copy(position);
      this.#positionAtom.onChanged();
    }
  }

  /** Add a displacement vector to the viewpoint. */
  public moveRelative(v: Vector3): void {
    this.#positionEaseParam = null;
    this.#position.add(v);
    this.#positionAtom.onChanged();
  }

  /** Move the camera to a new position, given by coordinates. */
  public setPosition(x: number, y: number, z: number): void {
    this.#positionEaseParam = null;
    this.#position.set(x, y, z);
    this.#positionAtom.onChanged();
  }

  /** Move the camera to a new position, and possibly a different realm. */
  public easeTo(position: Vector3, duration: number, fn: EaseFunction): void {
    this.#positionEaseStart.copy(this.#position);
    this.#positionEaseEnd.copy(position);
    this.#positionEaseParam = 0;
    this.#positionEaseDuration = duration;
    this.#positionEaseFunction = fn;
  }

  /** The current camera view angle (rotation around Y-axis). */
  public get azimuth(): number {
    return this.#getAzimuth();
  }

  public set azimuth(angle: number) {
    this.#setAzimuth(angle);
  }

  /** The current camera view angle (angle from horizon). */
  public get elevation(): number {
    return this.#getElevation();
  }

  public set elevation(angle: number) {
    this.#setElevation(angle);
  }

  /** Distance from viewpoint to camera. */
  public get cameraDistance(): number {
    return this.#getCameraDistance();
  }

  public set cameraDistance(k: number) {
    this.#setCameraDistance(k);
  }

  /** The list of locations visible through portals. */
  public get secondaryViewLocations(): ISecondaryViewLocation[] {
    this.#secondaryViewLocationsAtom.onObserved();
    return this.#secondaryViewLocations;
  }

  public set secondaryViewLocations(locations: ISecondaryViewLocation[]) {
    this.#secondaryViewLocations = locations;
    this.#secondaryViewLocationsAtom.onChanged();
  }

  /** The list of cutaway volumes, which exclude scenery from being rendered.. */
  public get cutaways(): Box3[] {
    this.#cutawaysAtom.onObserved();
    return this.#cutaways;
  }

  public set cutaways(locations: Box3[]) {
    this.#cutaways = locations;
    this.#cutawaysAtom.onChanged();
  }

  private beforeAnimate(delta: number) {
    // Do position easing
    if (typeof this.#positionEaseParam === 'number') {
      const amount = delta / this.#positionEaseDuration;
      this.#positionEaseParam = Math.min(1, this.#positionEaseParam + amount);
      this.#position.lerpVectors(
        this.#positionEaseStart,
        this.#positionEaseEnd,
        ease(this.#positionEaseParam, this.#positionEaseFunction)
      );

      if (this.#positionEaseParam >= 1) {
        this.#positionEaseParam = null;
      }

      this.#positionAtom.onChanged();
    }
  }
}

export const VIEWPOINT_KEY = createSystemKey<Viewpoint>('Viewpoint');
