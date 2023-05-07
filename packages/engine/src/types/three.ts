import { Box3, Vector3 } from 'three';
import {
  floatType,
  IClassTypeDescriptor,
  IFieldDescriptor,
  registry,
  DeserializationError,
} from '@faery/reflex';
import type { JsonValue } from '@faery/reflex-reflect';

// Editable schemas for common three.js types.

const mediumFloatField: IFieldDescriptor<number> = { type: floatType({ precision: 3 }) };

// Serialized forms
type Vector3Ser = [number, number, number];
type Box3Ser = [number, number, number, number, number, number];

const isVector3Ser = (value: JsonValue): value is Vector3Ser => {
  return Array.isArray(value) && value.length === 3;
};

const isBox3Ser = (value: JsonValue): value is Box3Ser => {
  return Array.isArray(value) && value.length === 6;
};

// serialization funcs
const vector3Marshal = (value: Vector3): Vector3Ser => value.toArray();
const vector3Unmarshal = (value: JsonValue | any): Vector3 => {
  if (isVector3Ser(value)) {
    return new Vector3(...value);
  }
  throw new DeserializationError(`Expected 3-tuple, got ${typeof value}`);
};

const box3Unmarshal = (value: JsonValue | any): Box3 => {
  if (isBox3Ser(value)) {
    return new Box3(
      new Vector3(value[0], value[1], value[2]),
      new Vector3(value[3], value[4], value[5])
    );
  }
  throw new DeserializationError(`Expected 6-tuple, got ${typeof value}`);
};

export const vector3Type: IClassTypeDescriptor<Vector3, Vector3Ser> = {
  kind: 'class',
  name: 'Vector3',
  properties: {
    x: mediumFloatField,
    y: mediumFloatField,
    z: mediumFloatField,
  },
  clone: value => value.clone(),
  create: () => new Vector3(),
  equal: (a, b) => a instanceof Vector3 && a.equals(b),
  marshal: vector3Marshal,
  unmarshal: vector3Unmarshal,
};

export const box3Type: IClassTypeDescriptor<Box3, Box3Ser> = {
  kind: 'class',
  name: 'Box3',
  properties: {
    min: { type: vector3Type },
    max: { type: vector3Type },
  },
  clone: value => value.clone(),
  create: () => new Box3(),
  equal: (a, b) => a instanceof Vector3 && a.equals(b),
  marshal: box => [box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z],
  unmarshal: box3Unmarshal,
};

registry.registerAll([vector3Type, box3Type]);
