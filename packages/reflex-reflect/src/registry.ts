import {
  IClassTypeDescriptor,
  ICustomTypeDescriptor,
  INamedTypeDescriptor,
  IOpaqueTypeDescriptor,
  IStructTypeDescriptor,
} from './descriptors';

type RegisteredType =
  | IClassTypeDescriptor<any, any>
  | ICustomTypeDescriptor<any, any>
  | IOpaqueTypeDescriptor<any>
  | IStructTypeDescriptor<any, any>;

interface RegisteredTypes {
  class: IClassTypeDescriptor<any, any>;
  custom: ICustomTypeDescriptor<any>;
  opaque: IOpaqueTypeDescriptor<any>;
  struct: IStructTypeDescriptor<any>;
}

export class TypeRegistry {
  private types = new Map<string, RegisteredType>();

  public find<K extends keyof RegisteredTypes>(kind: K, name: string): RegisteredTypes[K] | null {
    const result = this.types.get(name) as RegisteredTypes[K];
    return result && result.kind === kind ? result : null;
  }

  public get<K extends keyof RegisteredTypes>(kind: K, name: string): RegisteredTypes[K] {
    const result = this.types.get(name) as RegisteredTypes[K];
    if (!result) {
      throw new Error(`Type ${name} not found in registry.`);
    } else if (result.kind !== kind) {
      throw new Error(`Type ${name} is not a ${kind} type.`);
    }
    return result;
  }

  public getType(name: string): INamedTypeDescriptor<any> {
    const result = this.types.get(name) as INamedTypeDescriptor<any>;
    if (!result) {
      throw new Error(`Type ${name} not found in registry.`);
    }
    return result;
  }

  public register(type: RegisteredType) {
    if (!type.name) {
      throw Error(`Cannot register unnamed type.`);
    }
    this.types.set(type.name, type);
  }

  public registerAs(type: RegisteredType, typeName: string) {
    if (!type.name) {
      throw Error(`Cannot register unnamed type.`);
    }
    this.types.set(typeName, type);
  }

  public registerAll(types: Array<RegisteredType>) {
    types.forEach(this.register.bind(this));
  }
}

export const registry = new TypeRegistry();
