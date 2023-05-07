export interface IRefCountable {
  acquire(): void;
  release(): void;
}

/** Because many Three.js objects require explicit disposal, and because we can't predict
    the lifetimes of objects that are widely shared, a reference-counting system is used.

    The initial refCount is 1, as the creator of the object is presumed to be an owner.
 */
export abstract class RefCountable implements IRefCountable {
  // Starts at one because creator implicitly owns.
  private refCount = 1;

  public acquire() {
    if (this.refCount < 1) {
      throw Error('Attempting to acquire an object that has already been disposed');
    }
    this.refCount += 1;
  }

  public release() {
    if (this.refCount < 1) {
      throw Error('Attempting to release an object that has already been disposed');
    }
    this.refCount -= 1;
    if (this.refCount === 0) {
      this.disposeInternal();
    }
  }

  /** Dispose simply calls release, so it can be added to resource pools. */
  public dispose() {
    this.release();
  }

  protected abstract disposeInternal(): void;
}
