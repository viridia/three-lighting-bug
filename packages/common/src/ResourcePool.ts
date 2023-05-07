/** Abstract interface for disposable objects. */
export interface IDisposable {
  dispose(): void;
}

/** Collection of disposeable objects. */
export class ResourcePool implements IDisposable {
  private contents: Set<IDisposable> | null = null;

  /** Dispose all objects in the pool, and then clear the pool. */
  public dispose() {
    if (this.contents) {
      this.contents.forEach(disposable => disposable.dispose());
      this.contents.clear();
    }
  }

  /** Add an object to the pool. Returns the object after adding it. */
  public add<T extends IDisposable>(disposable: T): T {
    if (!this.contents) {
      this.contents = new Set();
    }
    this.contents.add(disposable);
    return disposable;
  }

  /** Remove an object from the pool. */
  public remove<T extends IDisposable>(disposable: T): T {
    if (this.contents) {
      this.contents.delete(disposable);
    }
    return disposable;
  }
}
