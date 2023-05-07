import { DeserializationError, ICustomTypeDescriptor, registry } from '@faery/reflex';
import equal from 'fast-deep-equal';

export type FeatureSelection = { [slot: string]: boolean };

/** Custom type definition for actor features */
export const featureSelectionType: ICustomTypeDescriptor<FeatureSelection> = {
  kind: 'custom',
  name: 'FeatureSelection',
  create: () => ({}),
  clone: cm => ({ ...cm }),
  equal,
  marshal: value => {
    // Filter out 'false' entries.
    const result: FeatureSelection = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry) {
        result[key] = true;
      }
    }
    return result;
  },
  unmarshal: value => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as FeatureSelection;
    }
    throw new DeserializationError('Invalid color map format');
  },
};

registry.register(featureSelectionType);
