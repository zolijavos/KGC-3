import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import { RequireFeatureGuard, FEATURE_FLAG_KEY } from '../guards/require-feature.guard';
import { FeatureFlag } from '../interfaces/feature-flag.interface';

/**
 * @RequireFeature decorator - Requires a feature flag to be enabled
 * @kgc/tenant - Feature flag access control decorator
 *
 * Usage:
 *
 * // Controller level
 * @RequireFeature(FeatureFlag.BERLES)
 * @Controller('berles')
 * export class BerlesController { ... }
 *
 * // Method level
 * @Get('kaució')
 * @RequireFeature(FeatureFlag.BERLES_KAUCIO)
 * async getKaucio() { ... }
 *
 * @param feature - The feature flag that must be enabled
 */
export function RequireFeature(feature: FeatureFlag) {
  return applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, feature),
    UseGuards(RequireFeatureGuard)
  );
}

/**
 * @RequireAnyFeature decorator - Requires any of the given features
 * At least one feature must be enabled for access
 */
export const FEATURE_FLAGS_ANY_KEY = 'required_features_any';

export function RequireAnyFeature(...features: FeatureFlag[]) {
  return SetMetadata(FEATURE_FLAGS_ANY_KEY, features);
}

/**
 * @RequireAllFeatures decorator - Requires all given features
 * All features must be enabled for access
 */
export const FEATURE_FLAGS_ALL_KEY = 'required_features_all';

export function RequireAllFeatures(...features: FeatureFlag[]) {
  return SetMetadata(FEATURE_FLAGS_ALL_KEY, features);
}
