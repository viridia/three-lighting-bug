import type { Object3D } from 'three';
import { suggestCorrections } from '../lib/editDistance';
import type { IModelCatalog } from './IModelCatalog';

/** A reference to a model. Clients should call dispose() when finished, so that the model
    catalog can be removed from memory.
 */
export class ModelRef {
  constructor(public readonly catalog: IModelCatalog, public readonly name: string) {
    catalog.acquire();
  }

  public dispose() {
    this.catalog.release();
  }

  /** Return a promise which resolves to the model data. */
  public get(): Promise<Object3D> {
    return this.catalog.load().then(([groups]) => {
      const [name] = this.name.split('#');
      const obj = groups[name];
      if (!obj) {
        const suggest = suggestCorrections(this.name, Object.keys(groups));
        if (suggest) {
          console.error(`Could not find model ${name}, closest match is ${suggest}`);
        }
        throw Error(`Missing model: ${name}`);
      }
      return obj;
    });
  }
}
