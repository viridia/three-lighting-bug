import { Box3, Sphere } from 'three';

export interface CullableObject {
  boundingSphere?: Sphere;
  boundingBox?: Box3;
  cullable?: boolean;
}
