import { IPropertyDescriptors, ITypeDescriptor } from '@faery/reflex-reflect';
import { Accessor, createSignal, Setter } from 'solid-js';

export type CellGetterTyped<T> = (() => T) & { descriptor: ITypeDescriptor<T> };

/** Make specified properties of an object observable and reflectable.
    @param obj The object whose properties we want to make observable.
    @param props A map of property descriptors. An observable property will be created
      for each entry in the map.
*/
export function makeCells<Cls extends {}>(obj: Cls, props: IPropertyDescriptors<Cls>) {
  Reflect.ownKeys(props).forEach(k => {
    const prop = props[k as keyof Cls];
    if (prop) {
      let value = prop.default;
      if (value === undefined) {
        const desc = Reflect.getOwnPropertyDescriptor(obj, k);
        if (desc && desc.value !== undefined) {
          value = desc.value;
        } else if (desc && desc.get) {
          value = desc.get();
        }
      }
      const [get, set] = createSignal(value);
      Reflect.defineProperty(obj, k, {
        get,
        set,
        enumerable: prop.enumerable ?? true,
        configurable: true,
      });
    }
  });
}

/** Make specified properties of an object observable. This version does not create reflection
    metadata.
    @param obj The object whose properties we want to make observable.
    @param propKeys A list of property keys.
*/
export function makeObservable<Cls extends {}>(obj: Cls, propKeys: (keyof Cls)[]) {
  propKeys.forEach(k => {
    const desc = Reflect.getOwnPropertyDescriptor(obj, k);
    let value;
    if (desc && desc.value !== undefined) {
      value = desc.value;
    } else if (desc && desc.get) {
      value = desc.get();
    }
    const [get, set] = createSignal(value);
    Reflect.defineProperty(obj, k, {
      get,
      set,
      enumerable: true,
      configurable: true,
    });
  });
}

/** Create an observable object property which is computed from a function.
    @param obj The object upon which to define the property.
    @param key The name of the property to define.
    @param type The type descriptor for the property.
    @param getter The function which computes the value of the cell.
    @param enumerable Whether this property should be enumerable.
*/
export function makeFormulaCell<Cls extends {}, Key extends keyof Cls>(
  obj: Cls,
  key: Key,
  getter: () => Cls[Key],
  enumerable?: boolean
): void {
  Reflect.defineProperty(obj, key, {
    get: getter,
    set: undefined,
    enumerable: enumerable ?? true,
    configurable: true,
  });
}

/** Similar to makeCell, but works with private fields - doesn't check that the field name
    is a visible member of the object type.
    @param obj The object upon which to define the property.
    @param key The name of the property to define.
    @param value The initial value of the property
    @param enumerable Whether this property should be enumerable.
*/
export function makePrivateCell(obj: {}, key: string, value?: unknown, enumerable?: boolean): void {
  if (value === undefined) {
    const prop = Reflect.getOwnPropertyDescriptor(obj, key);
    if (prop && prop.value) {
      value = prop.value;
    }
  }
  const [get, set] = createSignal(value);
  Reflect.defineProperty(obj, key, {
    get,
    set,
    enumerable: enumerable ?? true,
    configurable: true,
  });
}

/** Return the getter and setter function for a cell.
    @param obj The object that contains the cell.
    @param key The name of the property.
    @returns A 2-tuple containing the getter and setter function for the cell.
    @throws Error if the getter or setter does not exist.
*/
export function cellAccessors<Cls extends {}, Key extends keyof Cls>(
  obj: Cls,
  key: Key
): [Accessor<Cls[Key]>, Setter<Cls[Key]>] {
  const prop = Reflect.getOwnPropertyDescriptor(obj, key);
  if (prop && prop.set && prop.get) {
    return [prop.get, prop.set as Setter<Cls[Key]>];
  }
  throw new Error(`Cell getter/setter not found for ${obj.constructor.name}:${String(key)}`);
}
