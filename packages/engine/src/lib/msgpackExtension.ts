import { encode, decode, ExtensionCodec, Encoder, Decoder } from '@msgpack/msgpack';
import { Box2, Box3, Vector2, Vector3 } from 'three';
import { isVector2, isVector3 } from './threetypes';

export const extensionCodec = new ExtensionCodec();

const VECTOR2_EXT_TYPE = 10; // Any in 0-127
const VECTOR3_EXT_TYPE = 11;
const BOX2_EXT_TYPE = 14;
const BOX3_EXT_TYPE = 15;

extensionCodec.register({
  type: VECTOR2_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (isVector2(object)) {
      return encode([object.x, object.y]);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const array = decode(data) as Array<number>;
    return new Vector2(...array);
  },
});

extensionCodec.register({
  type: VECTOR3_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (isVector3(object)) {
      return encode([object.x, object.y, object.z]);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const array = decode(data) as Array<number>;
    return new Vector3(...array);
  },
});

extensionCodec.register({
  type: BOX2_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof Box2) {
      return encode([object.min.x, object.min.y, object.max.x, object.max.y]);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const array = decode(data) as Array<number>;
    return new Box2(new Vector2(array[0], array[1]), new Vector2(array[2], array[3]));
  },
});

extensionCodec.register({
  type: BOX3_EXT_TYPE,
  encode: (object: unknown): Uint8Array | null => {
    if (object instanceof Box3) {
      return encode([
        object.min.x,
        object.min.y,
        object.min.z,
        object.max.x,
        object.max.y,
        object.max.z,
      ]);
    } else {
      return null;
    }
  },
  decode: (data: Uint8Array) => {
    const array = decode(data) as Array<number>;
    return new Box3(
      new Vector3(array[0], array[1], array[2]),
      new Vector3(array[3], array[4], array[5])
    );
  },
});

export const encoder = new Encoder(extensionCodec);
export const decoder = new Decoder(extensionCodec);
