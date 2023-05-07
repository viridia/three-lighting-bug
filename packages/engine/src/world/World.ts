import { Realm } from './Realm';
import { createAtom } from '@faery/reflex';
import type { IAssetLoader } from '../metadata';

/** Serializable world data. */
export interface IWorldData {
  realms: string[];
}

/** Game world containing maps and biomes. */
export class World {
  public realms: { [name: string]: Realm } = {};
  public loaded = false;
  public playTime = 0;
  private realmsAtom = createAtom();
  private loadPromise: Promise<unknown> | null = null;

  constructor(public readonly loader: IAssetLoader) {}

  public getRealm(name: string): Realm | undefined {
    this.realmsAtom.onObserved();
    return this.realms[name];
  }

  /** Load the world. */
  public load() {
    this.loadPromise = this.loader.json('world.json').then(async data => {
      await this.deserialize(data as unknown as IWorldData);
      this.loaded = true;
    });
    return this.loadPromise;
  }

  public ready() {
    return this.loadPromise;
  }

  private async deserialize(data: IWorldData) {
    this.realms = {};
    await Promise.all(
      data.realms.map(r => {
        let realmName: string;
        if (typeof r === 'string') {
          realmName = r;
        } else {
          console.log(r);
          realmName = (r as any).name;
        }
        const realm = (this.realms[realmName] = new Realm(realmName, this.loader));
        return realm.load();
      })
    );
    this.realmsAtom.onChanged();
  }
}
