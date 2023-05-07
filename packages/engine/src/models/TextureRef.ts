import { RefCountable } from '@faery/common';
import { sRGBEncoding, Texture, TextureLoader } from 'three';

/** A reference to a texture. Clients should call release() when finished, so that texture
    resources can be freed from memory.
 */
export class TextureRef extends RefCountable {
  private texture!: Texture;
  private promise: Promise<Texture>;
  private canceled = false;

  constructor(public readonly url: string, private loader: TextureLoader) {
    super();
    this.promise = new Promise<Texture>((resolve, reject) => {
      this.texture = this.loader.load(
        this.url,
        texture => {
          // Release the texture if it is no longer needed. This can happen if the reference
          // was disposed before the load finished.
          if (this.canceled) {
            texture.dispose();
          }
          resolve(texture);
        },
        undefined,
        error => {
          reject(error);
        }
      );
      this.texture.encoding = sRGBEncoding;
    });
  }

  /** Deletes the texture. */
  protected disposeInternal() {
    this.texture.dispose();
    this.canceled = true; // Don't create texture if refcount falls to zero before load completes.
  }

  /** Return a promise which resolves to the model data. */
  public get(): Texture {
    return this.texture;
  }

  public ready() {
    return this.promise;
  }
}
