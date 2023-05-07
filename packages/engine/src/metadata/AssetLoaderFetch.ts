import type { JsonValue } from '@faery/reflex-reflect';
import { decodeAsync } from '@msgpack/msgpack';
import { extensionCodec } from '../lib/msgpackExtension';

export class AssetLoaderFetch {
  constructor(public readonly baseUrl: string) {}

  async json(resourceId: string): Promise<JsonValue> {
    const url = `${this.baseUrl}/${resourceId}`;
    const resp = await globalThis.fetch(url);
    if (!resp.ok) {
      throw new Error(`Asset not found at url: ${url}, error code: ${resp.status}`);
    }
    if (!resp.headers.get('content-type')?.includes('application/json')) {
      console.warn(resp.headers.get('content-type'));
      throw Error(`Invalid asset content type: ${resp.headers.get('content-type')}`);
    }
    return resp.json();
  }

  async msgpack(resourceId: string): Promise<unknown> {
    const url = `${this.baseUrl}/${resourceId}`;
    const resp = await globalThis.fetch(url);
    if (!resp.ok) {
      throw new Error(`Asset not found at url: ${url}, error code: ${resp.status}`);
    }
    return decodeAsync(resp.body!, { extensionCodec });
  }
}
