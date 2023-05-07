/** @fileoverview Methods for manipulating structs, given a property descriptor map.
    These do not require a complete type descriptor, just the properties.
 */
import { clone } from './clone';
import { create } from './create';
import { IPropertyDescriptors } from './descriptors';
import { IFieldDescriptor } from './field';
import { JsonObject } from './json';
import { marshal } from './marshal';
import { DeserializationError, unmarshal } from './unmarshal';

function propertiesOf<T extends { [name: string]: unknown }>(
  properties: IPropertyDescriptors<T>
): [keyof T & string, IFieldDescriptor<unknown>][] {
  return Object.entries(properties);
}

export function createStruct<T extends { [name: string]: unknown }>(
  properties: IPropertyDescriptors<T>
): T {
  const result: any = {};
  for (const [k, f] of propertiesOf(properties)) {
    if (f && (f.enumerable ?? true)) {
      if (f.type.kind === 'optional') {
        continue;
      } else if (f.type.kind === 'nullable') {
        result[k] = null;
      } else {
        result[k] = create(f.type);
      }
    }
  }
  return result;
}

export function cloneStruct<T extends { [name: string]: unknown }>(
  properties: IPropertyDescriptors<T>,
  src: T
) {
  const result: any = {};
  for (const [k, f] of propertiesOf(properties)) {
    if (f && (f.enumerable ?? true)) {
      result[k] = clone(f.type, src[k]);
    }
  }
  return result;
}

export function marshallStruct<T extends { [name: string]: unknown }>(
  properties: IPropertyDescriptors<T>,
  src: T
): JsonObject {
  const result: JsonObject = {};
  for (const [k, f] of propertiesOf(properties)) {
    if (f && (f.enumerable ?? true)) {
      // Need to check for undefined because msgpack turns it into null, which we don't want.
      const serializedValue = marshal(f.type, src[k]);
      if (serializedValue !== undefined) {
        result[k] = serializedValue;
      }
    }
  }
  return result;
}

export function unmarshallStruct<T extends { [name: string]: unknown }>(
  properties: IPropertyDescriptors<T>,
  src: JsonObject
): T {
  const result: any = {};
  for (const [k, f] of propertiesOf(properties)) {
    if (f && (f.enumerable ?? true)) {
      const v = src[k];
      if (v === undefined) {
        if (f.type.kind !== 'optional') {
          throw new DeserializationError(`Missing key: ${k}`);
        }
      } else {
        result[k] = unmarshal(f.type, src[k]);
      }
    }
  }
  return result;
}
