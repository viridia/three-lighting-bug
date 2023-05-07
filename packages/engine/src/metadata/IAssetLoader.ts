import type { JsonValue } from '@faery/reflex-reflect';

/** Interface that defines a mechanism for loading assets from either the web or a file. */
export interface IAssetLoader {
  baseUrl: string;

  json(resourceId: string): Promise<JsonValue>;
  msgpack(resourceId: string): Promise<unknown>;
}
