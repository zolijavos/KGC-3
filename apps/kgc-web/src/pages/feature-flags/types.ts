// Feature Flags típusok

export type FeatureFlagCategory =
  | 'core'
  | 'rental'
  | 'service'
  | 'sales'
  | 'integration'
  | 'experimental';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  category: FeatureFlagCategory;
  enabled: boolean;
  isNew?: boolean;
  isBeta?: boolean;
  dependencies?: string[]; // Other flag keys this depends on
  updatedAt: string;
  updatedBy?: string;
}

export interface FeatureFlagCategory_Config {
  value: FeatureFlagCategory;
  label: string;
  icon: string;
  color: string;
}
