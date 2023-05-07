import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import LRU from 'lru-cache';
import { ModelCatalog } from './ModelCatalog';
import type { ModelRef } from './ModelRef';
import type { AnimationClipRef } from './AnimationClipRef';

/** To minimize the number of individual loads, models are arranged in model catalog files.
    A catalog file consists of a scene containing a number of groups. Each group represents
    a single model, which may have subgroups, materials, etc.

    The qualified name of a model is of the form `catalogPath:modelName`.
 */
export class ModelCache {
  private loader = new GLTFLoader();
  private catalogs = new LRU<string, ModelCatalog>({
    max: 100,
    dispose: this.releaseFile.bind(this),
  });
  private indices = new Map<string, string[]>();

  constructor(private baseUrl: string) {}

  /** Get a model by qualified name. If the model is already loaded, it will return
      the cached entry; otherwise it will begin loading the model data.
   */
  public get(qualifiedModelName: string): ModelRef {
    const [catalogName, entryName] = qualifiedModelName.split(':');
    return this.getCatalog(catalogName, true).get(entryName);
  }

  /** Get an animation by qualified name. If the animation is already loaded, it will return
      the cached entry; otherwise it will begin loading the animation data.
   */
  public getAnimation(qualifiedAnimationName: string): AnimationClipRef {
    const [catalogName, entryName] = qualifiedAnimationName.split(':');
    return this.getCatalog(catalogName, true).getAnimation(entryName);
  }

  /** Get a catalog of models. This is a single GLTF file that contains multiple models. */
  public getCatalog(catalogName: string, borrow = false) {
    const catalog = this.catalogs.get(catalogName);
    if (catalog) {
      if (!borrow) {
        catalog.acquire();
      }
      return catalog;
    }

    const url = this.baseUrl + `/${catalogName}.glb`;
    const newCatalog = new ModelCatalog(url, this.loader);
    if (!borrow) {
      newCatalog.acquire(); // Cache counts as 1
    }
    this.catalogs.set(catalogName, newCatalog);
    return newCatalog;
  }

  /** Get a catalog if it exists, otherwise null. */
  public getExistingCatalog(catalogName: string) {
    const catalog = this.catalogs.get(catalogName);
    if (catalog) {
      catalog.acquire();
      return catalog;
    }
    return null;
  }

  /** Return an array of all the model catalogs in a directory. */
  public getCatalogIndex(dirName: string): Promise<Array<string>> {
    const cat = this.indices.get(dirName);
    if (cat) {
      return Promise.resolve(cat);
    }
    const url = this.baseUrl + `/${dirName}/index.json`;
    return window.fetch(url).then(async resp => {
      const c = await resp.json();
      this.indices.set(dirName, c);
      return c;
    });
  }

  /** Update uniforms for materials that are animated. */
  public animateMaterials(time: number) {
    this.catalogs.forEach(c => c.animateMaterials(time));
  }

  // Called when a model file is removed from the cache. This decrements the reference count.
  private releaseFile(mf: ModelCatalog) {
    mf.release();
  }
}
