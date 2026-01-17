/**
 * Feature Flag Interface Types
 * @kgc/tenant - Tenant-level feature flag management
 */

/**
 * Available feature flags
 * Hierarchical naming: layer:domain:feature
 */
export enum FeatureFlag {
  // Core features (always enabled)
  CORE_AUTH = 'core:auth',
  CORE_TENANT = 'core:tenant',
  CORE_AUDIT = 'core:audit',

  // Bérlés domain
  BERLES = 'domain:berles',
  BERLES_KAUCIO = 'domain:berles:kaucio',
  BERLES_HOSSZABBITAS = 'domain:berles:hosszabbitas',
  BERLES_SZERZODES = 'domain:berles:szerzodes',

  // Szerviz domain
  SZERVIZ = 'domain:szerviz',
  SZERVIZ_GARANCIA = 'domain:szerviz:garancia',
  SZERVIZ_NORMA = 'domain:szerviz:norma',
  SZERVIZ_MUNKALAP = 'domain:szerviz:munkalap',

  // Áruház domain
  ARUHAZ = 'domain:aruhaz',
  ARUHAZ_LELTAR = 'domain:aruhaz:leltar',
  ARUHAZ_POS = 'domain:aruhaz:pos',

  // Integrációk
  INTEGRATION_NAV = 'integration:nav',
  INTEGRATION_CRM = 'integration:crm',
  INTEGRATION_CHATWOOT = 'integration:chatwoot',
  INTEGRATION_MYPOS = 'integration:mypos',

  // Premium features
  PREMIUM_REPORTING = 'premium:reporting',
  PREMIUM_AI = 'premium:ai',
  PREMIUM_OFFLINE = 'premium:offline',
}

/**
 * Plan types for default feature assignment
 */
export type PlanType = 'basic' | 'standard' | 'premium';

/**
 * Feature flag configuration
 */
export interface FeatureFlagConfig {
  flag: FeatureFlag;
  name: string;
  description: string;
  defaultEnabled: boolean;
  requiresPlan?: PlanType;
  dependencies?: FeatureFlag[];
}

/**
 * Tenant feature status
 */
export interface TenantFeatureStatus {
  tenantId: string;
  features: FeatureFlag[];
  plan: PlanType;
  customFeatures: FeatureFlag[];
  disabledFeatures: FeatureFlag[];
}

/**
 * Feature check result
 */
export interface FeatureCheckResult {
  feature: FeatureFlag;
  enabled: boolean;
  reason?: 'plan' | 'custom' | 'disabled' | 'dependency';
}

/**
 * Update features DTO
 */
export interface UpdateTenantFeaturesDto {
  enableFeatures?: FeatureFlag[];
  disableFeatures?: FeatureFlag[];
}

/**
 * Default features by plan
 */
export const PLAN_DEFAULT_FEATURES: Record<PlanType, FeatureFlag[]> = {
  basic: [
    FeatureFlag.CORE_AUTH,
    FeatureFlag.CORE_TENANT,
    FeatureFlag.BERLES,
  ],
  standard: [
    FeatureFlag.CORE_AUTH,
    FeatureFlag.CORE_TENANT,
    FeatureFlag.CORE_AUDIT,
    FeatureFlag.BERLES,
    FeatureFlag.BERLES_KAUCIO,
    FeatureFlag.SZERVIZ,
    FeatureFlag.ARUHAZ,
  ],
  premium: [
    FeatureFlag.CORE_AUTH,
    FeatureFlag.CORE_TENANT,
    FeatureFlag.CORE_AUDIT,
    FeatureFlag.BERLES,
    FeatureFlag.BERLES_KAUCIO,
    FeatureFlag.BERLES_HOSSZABBITAS,
    FeatureFlag.BERLES_SZERZODES,
    FeatureFlag.SZERVIZ,
    FeatureFlag.SZERVIZ_GARANCIA,
    FeatureFlag.SZERVIZ_MUNKALAP,
    FeatureFlag.ARUHAZ,
    FeatureFlag.ARUHAZ_POS,
    FeatureFlag.INTEGRATION_NAV,
    FeatureFlag.PREMIUM_REPORTING,
    FeatureFlag.PREMIUM_OFFLINE,
  ],
};

/**
 * Feature flag configuration registry
 */
export const FEATURE_FLAG_CONFIG: FeatureFlagConfig[] = [
  {
    flag: FeatureFlag.CORE_AUTH,
    name: 'Hitelesítés',
    description: 'Felhasználó azonosítás és jogosultság kezelés',
    defaultEnabled: true,
  },
  {
    flag: FeatureFlag.CORE_TENANT,
    name: 'Tenant kezelés',
    description: 'Multi-tenant infrastruktúra',
    defaultEnabled: true,
  },
  {
    flag: FeatureFlag.CORE_AUDIT,
    name: 'Audit trail',
    description: 'Műveletek naplózása',
    defaultEnabled: false,
    requiresPlan: 'standard',
  },
  {
    flag: FeatureFlag.BERLES,
    name: 'Bérlés modul',
    description: 'Bérgép kiadás és visszavétel',
    defaultEnabled: true,
  },
  {
    flag: FeatureFlag.BERLES_KAUCIO,
    name: 'Kaució kezelés',
    description: 'Kaució felvétel és visszaadás',
    defaultEnabled: false,
    requiresPlan: 'standard',
    dependencies: [FeatureFlag.BERLES],
  },
  {
    flag: FeatureFlag.BERLES_HOSSZABBITAS,
    name: 'Bérlés hosszabbítás',
    description: 'Aktív bérlés meghosszabbítása',
    defaultEnabled: false,
    requiresPlan: 'premium',
    dependencies: [FeatureFlag.BERLES],
  },
  {
    flag: FeatureFlag.SZERVIZ,
    name: 'Szerviz modul',
    description: 'Szerviz munkalap kezelés',
    defaultEnabled: false,
    requiresPlan: 'standard',
  },
  {
    flag: FeatureFlag.SZERVIZ_GARANCIA,
    name: 'Garancia kezelés',
    description: 'Garanciális javítások',
    defaultEnabled: false,
    requiresPlan: 'premium',
    dependencies: [FeatureFlag.SZERVIZ],
  },
  {
    flag: FeatureFlag.ARUHAZ,
    name: 'Áruház modul',
    description: 'Termék értékesítés',
    defaultEnabled: false,
    requiresPlan: 'standard',
  },
  {
    flag: FeatureFlag.INTEGRATION_NAV,
    name: 'NAV Online Számla',
    description: 'NAV adatszolgáltatás Számlázz.hu-n keresztül',
    defaultEnabled: false,
    requiresPlan: 'premium',
  },
  {
    flag: FeatureFlag.PREMIUM_REPORTING,
    name: 'Haladó riportok',
    description: 'Részletes analitika és riportok',
    defaultEnabled: false,
    requiresPlan: 'premium',
  },
  {
    flag: FeatureFlag.PREMIUM_AI,
    name: 'AI asszisztens',
    description: 'Koko AI chatbot támogatás',
    defaultEnabled: false,
    requiresPlan: 'premium',
  },
];

/**
 * Get all available feature flags
 */
export function getAllFeatureFlags(): FeatureFlag[] {
  return Object.values(FeatureFlag);
}

/**
 * Check if a value is a valid feature flag
 */
export function isValidFeatureFlag(value: string): value is FeatureFlag {
  return Object.values(FeatureFlag).includes(value as FeatureFlag);
}
