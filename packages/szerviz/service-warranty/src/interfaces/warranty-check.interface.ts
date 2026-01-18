/**
 * @kgc/service-warranty - Warranty Check Interfaces
 * Epic 19: Warranty Claims - Story 19.1
 *
 * Garanciális vs Fizetős megkülönböztetés interfészek
 */

import { WarrantySupplier, WarrantyType } from './warranty-claim.interface';

/**
 * Készülék garancia információ
 */
export interface IDeviceWarrantyInfo {
  /** Készülék sorozatszám */
  serialNumber: string;
  /** Készülék megnevezés */
  deviceName: string;
  /** Gyártó/Beszállító */
  supplier: WarrantySupplier;
  /** Vásárlás dátuma */
  purchaseDate: Date;
  /** Standard garancia hossz (hónap) */
  standardWarrantyMonths: number;
  /** Kiterjesztett garancia hossz (hónap) */
  extendedWarrantyMonths?: number | undefined;
  /** Garancia lejárat dátum (számított) */
  warrantyExpiresAt: Date;
  /** Van-e aktív garancia */
  hasActiveWarranty: boolean;
  /** Korábbi garanciális javítások száma */
  previousWarrantyRepairs: number;
}

/**
 * Garancia ellenőrzés input
 */
export interface IWarrantyCheckInput {
  /** Készülék sorozatszám */
  serialNumber: string;
  /** Hiba típus/leírás */
  faultType: string;
  /** Ellenőrzés dátuma (alapértelmezett: most) */
  checkDate?: Date | undefined;
}

/**
 * Garancia elutasítás okok
 */
export enum WarrantyRejectionReason {
  /** Lejárt garancia */
  EXPIRED = 'EXPIRED',
  /** Nem garanciális hiba (felhasználói hiba) */
  USER_DAMAGE = 'USER_DAMAGE',
  /** Nem eredeti alkatrész használata */
  NON_ORIGINAL_PARTS = 'NON_ORIGINAL_PARTS',
  /** Nem regisztrált készülék */
  NOT_REGISTERED = 'NOT_REGISTERED',
  /** Hiányzó vásárlási bizonylat */
  NO_PURCHASE_PROOF = 'NO_PURCHASE_PROOF',
  /** Sorozatszám eltávolítva/olvashatatlan */
  SERIAL_NUMBER_INVALID = 'SERIAL_NUMBER_INVALID',
  /** Korábbi nem hivatalos javítás */
  UNAUTHORIZED_REPAIR = 'UNAUTHORIZED_REPAIR',
  /** Ipari használat (háztartási garanciánál) */
  COMMERCIAL_USE = 'COMMERCIAL_USE',
  /** Ismeretlen készülék */
  UNKNOWN_DEVICE = 'UNKNOWN_DEVICE',
}

/**
 * Garancia figyelmeztetés típusok
 */
export enum WarrantyWarningType {
  /** Garancia hamarosan lejár (30 napon belül) */
  EXPIRING_SOON = 'EXPIRING_SOON',
  /** Több korábbi garanciális javítás */
  MULTIPLE_REPAIRS = 'MULTIPLE_REPAIRS',
  /** Kiterjesztett garancia alatt */
  EXTENDED_WARRANTY = 'EXTENDED_WARRANTY',
  /** Részleges garancia (csak bizonyos alkatrészekre) */
  PARTIAL_WARRANTY = 'PARTIAL_WARRANTY',
}

/**
 * Részletes garancia ellenőrzés eredmény
 */
export interface IDetailedWarrantyCheckResult {
  /** Garanciális-e */
  isWarranty: boolean;
  /** Garancia típusa */
  warrantyType: WarrantyType | null;
  /** Beszállító */
  supplier: WarrantySupplier | null;
  /** Garancia lejárat */
  warrantyExpiresAt: Date | null;
  /** Hátralévő napok (negatív ha lejárt) */
  remainingDays: number;
  /** Elutasítás oka (ha nem garanciális) */
  rejectionReason: WarrantyRejectionReason | null;
  /** Elutasítás részletes magyarázat */
  rejectionDetails: string | null;
  /** Figyelmeztetések */
  warnings: Array<{
    type: WarrantyWarningType;
    message: string;
  }>;
  /** Ajánlott akció */
  recommendedAction: 'WARRANTY_CLAIM' | 'PAID_REPAIR' | 'CUSTOMER_DECISION';
  /** Készülék információ (ha elérhető) */
  deviceInfo: IDeviceWarrantyInfo | null;
}

/**
 * Beszállító garancia szabályok
 */
export interface ISupplierWarrantyRules {
  /** Beszállító */
  supplier: WarrantySupplier;
  /** Standard garancia hossz (hónap) */
  standardWarrantyMonths: number;
  /** Kiterjesztett garancia elérhető-e */
  extendedWarrantyAvailable: boolean;
  /** Kiterjesztett garancia max hossz (hónap) */
  maxExtendedWarrantyMonths?: number | undefined;
  /** Regisztráció szükséges-e */
  registrationRequired: boolean;
  /** Max korábbi garanciális javítás */
  maxWarrantyRepairs?: number | undefined;
  /** Norma alapú elszámolás */
  usesNormaSystem: boolean;
}

/**
 * Warranty Check Service interfész
 */
export interface IWarrantyCheckService {
  /**
   * Ellenőrzi, hogy a készülék garanciális-e
   */
  checkWarranty(tenantId: string, input: IWarrantyCheckInput): Promise<IDetailedWarrantyCheckResult>;

  /**
   * Lekéri a készülék garancia információit
   */
  getDeviceWarrantyInfo(tenantId: string, serialNumber: string): Promise<IDeviceWarrantyInfo | null>;

  /**
   * Lekéri a beszállító garancia szabályait
   */
  getSupplierWarrantyRules(supplier: WarrantySupplier): ISupplierWarrantyRules;

  /**
   * Kiszámolja a garancia lejárati dátumot
   */
  calculateWarrantyExpiration(
    purchaseDate: Date,
    supplier: WarrantySupplier,
    hasExtendedWarranty: boolean
  ): Date;
}
