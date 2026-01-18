/**
 * @kgc/service-warranty - Warranty Check Service
 * Epic 19: Warranty Claims - Story 19.1
 *
 * Garanciális vs Fizetős megkülönböztetés szolgáltatás
 * TDD: Red-Green-Refactor cycle szerint implementálva
 */

import { Injectable, Inject } from '@nestjs/common';
import type { IWarrantyCheckResult } from '../interfaces/warranty-claim.interface';
import {
  WarrantySupplier,
  WarrantyType,
} from '../interfaces/warranty-claim.interface';
import type {
  IWarrantyCheckInput,
  IDetailedWarrantyCheckResult,
  IDeviceWarrantyInfo,
  ISupplierWarrantyRules,
} from '../interfaces/warranty-check.interface';
import {
  WarrantyRejectionReason,
  WarrantyWarningType,
} from '../interfaces/warranty-check.interface';

/**
 * Device Registry interfész - külső szolgáltatás
 */
export interface IDeviceRegistryService {
  getDeviceInfo(tenantId: string, serialNumber: string): Promise<IDeviceWarrantyInfo | null>;
  getPurchaseInfo(tenantId: string, serialNumber: string): Promise<{
    purchaseDate: Date;
    hasProof: boolean;
    isRegistered: boolean;
  } | null>;
}

/**
 * Warranty History interfész - korábbi javítások
 */
export interface IWarrantyHistoryService {
  getPreviousRepairCount(tenantId: string, serialNumber: string): Promise<number>;
  hasUnauthorizedRepair(tenantId: string, serialNumber: string): Promise<boolean>;
}

export const DEVICE_REGISTRY_SERVICE = 'DEVICE_REGISTRY_SERVICE';
export const WARRANTY_HISTORY_SERVICE = 'WARRANTY_HISTORY_SERVICE';

/**
 * Beszállító garancia szabályok (statikus konfiguráció)
 */
const SUPPLIER_WARRANTY_RULES: Record<WarrantySupplier, ISupplierWarrantyRules> = {
  [WarrantySupplier.MAKITA]: {
    supplier: WarrantySupplier.MAKITA,
    standardWarrantyMonths: 24,
    extendedWarrantyAvailable: true,
    maxExtendedWarrantyMonths: 36,
    registrationRequired: true,
    maxWarrantyRepairs: 3,
    usesNormaSystem: true,
  },
  [WarrantySupplier.STIHL]: {
    supplier: WarrantySupplier.STIHL,
    standardWarrantyMonths: 24,
    extendedWarrantyAvailable: false,
    registrationRequired: false,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
  [WarrantySupplier.HUSQVARNA]: {
    supplier: WarrantySupplier.HUSQVARNA,
    standardWarrantyMonths: 24,
    extendedWarrantyAvailable: true,
    maxExtendedWarrantyMonths: 48,
    registrationRequired: true,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
  [WarrantySupplier.BOSCH]: {
    supplier: WarrantySupplier.BOSCH,
    standardWarrantyMonths: 24,
    extendedWarrantyAvailable: true,
    maxExtendedWarrantyMonths: 36,
    registrationRequired: false,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
  [WarrantySupplier.DEWALT]: {
    supplier: WarrantySupplier.DEWALT,
    standardWarrantyMonths: 12,
    extendedWarrantyAvailable: true,
    maxExtendedWarrantyMonths: 36,
    registrationRequired: true,
    maxWarrantyRepairs: 2,
    usesNormaSystem: false,
  },
  [WarrantySupplier.MILWAUKEE]: {
    supplier: WarrantySupplier.MILWAUKEE,
    standardWarrantyMonths: 60, // 5 év!
    extendedWarrantyAvailable: false,
    registrationRequired: false,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
  [WarrantySupplier.HIKOKI]: {
    supplier: WarrantySupplier.HIKOKI,
    standardWarrantyMonths: 24,
    extendedWarrantyAvailable: true,
    maxExtendedWarrantyMonths: 36,
    registrationRequired: true,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
  [WarrantySupplier.OTHER]: {
    supplier: WarrantySupplier.OTHER,
    standardWarrantyMonths: 12,
    extendedWarrantyAvailable: false,
    registrationRequired: false,
    maxWarrantyRepairs: undefined,
    usesNormaSystem: false,
  },
};

/**
 * Garancia ellenőrzés szolgáltatás
 */
@Injectable()
export class WarrantyCheckService {
  constructor(
    @Inject(DEVICE_REGISTRY_SERVICE)
    private readonly deviceRegistry: IDeviceRegistryService,
    @Inject(WARRANTY_HISTORY_SERVICE)
    private readonly warrantyHistory: IWarrantyHistoryService,
  ) {}

  /**
   * Teljes garancia ellenőrzés
   *
   * @param tenantId - Tenant azonosító
   * @param input - Ellenőrzés input (sorozatszám, hiba típus)
   * @returns Részletes garancia ellenőrzés eredmény
   */
  async checkWarranty(
    tenantId: string,
    input: IWarrantyCheckInput,
  ): Promise<IDetailedWarrantyCheckResult> {
    const checkDate = input.checkDate ?? new Date();
    const warnings: Array<{ type: WarrantyWarningType; message: string }> = [];

    // 1. Készülék információ lekérése
    const deviceInfo = await this.deviceRegistry.getDeviceInfo(tenantId, input.serialNumber);

    if (!deviceInfo) {
      return this.createRejectionResult(
        WarrantyRejectionReason.UNKNOWN_DEVICE,
        'A készülék nem található a nyilvántartásban',
        null,
      );
    }

    // 2. Vásárlási információ ellenőrzés
    const purchaseInfo = await this.deviceRegistry.getPurchaseInfo(tenantId, input.serialNumber);

    if (!purchaseInfo) {
      return this.createRejectionResult(
        WarrantyRejectionReason.NO_PURCHASE_PROOF,
        'Nincs vásárlási bizonylat a készülékhez',
        deviceInfo,
      );
    }

    // 3. Regisztráció ellenőrzés (ha szükséges)
    const rules = this.getSupplierWarrantyRules(deviceInfo.supplier);
    if (rules.registrationRequired && !purchaseInfo.isRegistered) {
      return this.createRejectionResult(
        WarrantyRejectionReason.NOT_REGISTERED,
        `A ${deviceInfo.supplier} készülékek regisztrációja kötelező a garanciális javításhoz`,
        deviceInfo,
      );
    }

    // 4. Garancia lejárat ellenőrzés
    const remainingDays = this.calculateRemainingDays(deviceInfo.warrantyExpiresAt, checkDate);

    if (remainingDays < 0) {
      return this.createRejectionResult(
        WarrantyRejectionReason.EXPIRED,
        `A garancia ${Math.abs(remainingDays)} napja lejárt`,
        deviceInfo,
      );
    }

    // 5. Korábbi javítások ellenőrzése
    const previousRepairs = await this.warrantyHistory.getPreviousRepairCount(
      tenantId,
      input.serialNumber,
    );

    if (rules.maxWarrantyRepairs !== undefined && previousRepairs >= rules.maxWarrantyRepairs) {
      return this.createRejectionResult(
        WarrantyRejectionReason.USER_DAMAGE,
        `Maximum garanciális javítások száma (${rules.maxWarrantyRepairs}) elérve`,
        deviceInfo,
      );
    }

    // 6. Nem hivatalos javítás ellenőrzése
    const hasUnauthorizedRepair = await this.warrantyHistory.hasUnauthorizedRepair(
      tenantId,
      input.serialNumber,
    );

    if (hasUnauthorizedRepair) {
      return this.createRejectionResult(
        WarrantyRejectionReason.UNAUTHORIZED_REPAIR,
        'Korábbi nem hivatalos javítás miatt a garancia érvénytelen',
        deviceInfo,
      );
    }

    // 7. Figyelmeztetések generálása
    if (remainingDays <= 30) {
      warnings.push({
        type: WarrantyWarningType.EXPIRING_SOON,
        message: `A garancia ${remainingDays} napon belül lejár`,
      });
    }

    if (previousRepairs >= 2) {
      warnings.push({
        type: WarrantyWarningType.MULTIPLE_REPAIRS,
        message: `Már ${previousRepairs} korábbi garanciális javítás történt`,
      });
    }

    if (deviceInfo.extendedWarrantyMonths && deviceInfo.extendedWarrantyMonths > 0) {
      warnings.push({
        type: WarrantyWarningType.EXTENDED_WARRANTY,
        message: 'Kiterjesztett garancia alatt',
      });
    }

    // 8. Garancia típus meghatározása
    const warrantyType = this.determineWarrantyType(deviceInfo);

    return {
      isWarranty: true,
      warrantyType,
      supplier: deviceInfo.supplier,
      warrantyExpiresAt: deviceInfo.warrantyExpiresAt,
      remainingDays,
      rejectionReason: null,
      rejectionDetails: null,
      warnings,
      recommendedAction: 'WARRANTY_CLAIM',
      deviceInfo,
    };
  }

  /**
   * Készülék garancia információ lekérése
   */
  async getDeviceWarrantyInfo(
    tenantId: string,
    serialNumber: string,
  ): Promise<IDeviceWarrantyInfo | null> {
    return this.deviceRegistry.getDeviceInfo(tenantId, serialNumber);
  }

  /**
   * Beszállító garancia szabályok lekérése
   */
  getSupplierWarrantyRules(supplier: WarrantySupplier): ISupplierWarrantyRules {
    return SUPPLIER_WARRANTY_RULES[supplier];
  }

  /**
   * Garancia lejárat számítás
   */
  calculateWarrantyExpiration(
    purchaseDate: Date,
    supplier: WarrantySupplier,
    hasExtendedWarranty: boolean,
  ): Date {
    const rules = this.getSupplierWarrantyRules(supplier);
    let warrantyMonths = rules.standardWarrantyMonths;

    if (hasExtendedWarranty && rules.extendedWarrantyAvailable && rules.maxExtendedWarrantyMonths) {
      warrantyMonths = rules.maxExtendedWarrantyMonths;
    }

    const expirationDate = new Date(purchaseDate);
    expirationDate.setMonth(expirationDate.getMonth() + warrantyMonths);

    return expirationDate;
  }

  /**
   * Egyszerűsített garancia ellenőrzés (munkalap számára)
   */
  async checkWarrantySimple(
    tenantId: string,
    serialNumber: string,
  ): Promise<IWarrantyCheckResult> {
    const result = await this.checkWarranty(tenantId, {
      serialNumber,
      faultType: 'general',
    });

    return {
      isWarranty: result.isWarranty,
      warrantyType: result.warrantyType ?? undefined,
      supplier: result.supplier ?? undefined,
      warrantyExpiresAt: result.warrantyExpiresAt ?? undefined,
      remainingDays: result.remainingDays > 0 ? result.remainingDays : undefined,
      rejectionReason: result.rejectionDetails ?? undefined,
      warnings: result.warnings.map(w => w.message),
    };
  }

  /**
   * Elutasítás eredmény létrehozása
   */
  private createRejectionResult(
    reason: WarrantyRejectionReason,
    details: string,
    deviceInfo: IDeviceWarrantyInfo | null,
  ): IDetailedWarrantyCheckResult {
    return {
      isWarranty: false,
      warrantyType: null,
      supplier: deviceInfo?.supplier ?? null,
      warrantyExpiresAt: deviceInfo?.warrantyExpiresAt ?? null,
      remainingDays: deviceInfo
        ? this.calculateRemainingDays(deviceInfo.warrantyExpiresAt, new Date())
        : -1,
      rejectionReason: reason,
      rejectionDetails: details,
      warnings: [],
      recommendedAction: 'PAID_REPAIR',
      deviceInfo,
    };
  }

  /**
   * Hátralévő napok számítása
   */
  private calculateRemainingDays(expirationDate: Date, checkDate: Date): number {
    const diffTime = expirationDate.getTime() - checkDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Garancia típus meghatározása
   */
  private determineWarrantyType(deviceInfo: IDeviceWarrantyInfo): WarrantyType {
    if (deviceInfo.extendedWarrantyMonths && deviceInfo.extendedWarrantyMonths > 0) {
      return WarrantyType.EXTENDED;
    }
    return WarrantyType.MANUFACTURER;
  }
}
