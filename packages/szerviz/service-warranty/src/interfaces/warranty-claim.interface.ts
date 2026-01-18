/**
 * @kgc/service-warranty - Warranty Claim Interfaces
 * Epic 19: Warranty Claims
 *
 * Garanciális igény típusok és interfészek
 */

/**
 * Warranty Claim státuszok - State machine
 *
 * Átmenetek:
 * PENDING → SUBMITTED → APPROVED | REJECTED
 *         ↘ CANCELLED (bármikor PENDING-ből)
 */
export enum WarrantyClaimStatus {
  /** Függőben - Még nem küldték be a beszállítónak */
  PENDING = 'PENDING',
  /** Beküldve - Beszállítónak elküldve */
  SUBMITTED = 'SUBMITTED',
  /** Jóváhagyva - Beszállító elfogadta */
  APPROVED = 'APPROVED',
  /** Elutasítva - Beszállító elutasította */
  REJECTED = 'REJECTED',
  /** Elszámolva - Pénzügyileg rendezve */
  SETTLED = 'SETTLED',
  /** Visszavonva */
  CANCELLED = 'CANCELLED',
}

/**
 * Beszállító típusok (gyártók)
 */
export enum WarrantySupplier {
  MAKITA = 'MAKITA',
  STIHL = 'STIHL',
  HUSQVARNA = 'HUSQVARNA',
  BOSCH = 'BOSCH',
  DEWALT = 'DEWALT',
  MILWAUKEE = 'MILWAUKEE',
  HIKOKI = 'HIKOKI',
  OTHER = 'OTHER',
}

/**
 * Garancia típusok
 */
export enum WarrantyType {
  /** Gyártói garancia (standard) */
  MANUFACTURER = 'MANUFACTURER',
  /** Kiterjesztett garancia */
  EXTENDED = 'EXTENDED',
  /** Bolti garancia (saját) */
  STORE = 'STORE',
}

/**
 * Garancia ellenőrzés eredménye
 */
export interface IWarrantyCheckResult {
  /** Garanciális-e a javítás */
  isWarranty: boolean;
  /** Garancia típusa (ha garanciális) */
  warrantyType?: WarrantyType | undefined;
  /** Beszállító (ha garanciális) */
  supplier?: WarrantySupplier | undefined;
  /** Garancia lejárat dátum */
  warrantyExpiresAt?: Date | undefined;
  /** Hátralévő napok */
  remainingDays?: number | undefined;
  /** Elutasítás oka (ha nem garanciális) */
  rejectionReason?: string | undefined;
  /** Figyelmeztetések */
  warnings: string[];
}

/**
 * Warranty Claim entitás
 */
export interface IWarrantyClaim {
  /** Egyedi azonosító (UUID) */
  id: string;
  /** Tenant azonosító (multi-tenancy) */
  tenantId: string;
  /** Claim szám (WC-YYYY-NNNN) */
  claimNumber: string;
  /** Kapcsolódó munkalap ID */
  worksheetId: string;
  /** Aktuális státusz */
  status: WarrantyClaimStatus;
  /** Beszállító */
  supplier: WarrantySupplier;
  /** Garancia típusa */
  warrantyType: WarrantyType;
  /** Gép sorozatszám */
  deviceSerialNumber: string;
  /** Gép megnevezés */
  deviceName: string;
  /** Vásárlás dátuma */
  purchaseDate: Date;
  /** Garancia lejárat */
  warrantyExpiresAt: Date;
  /** Norma tétel kód (Makita norma) */
  normaCode?: string;
  /** Norma óra */
  normaHours?: number;
  /** Hiba leírás */
  faultDescription: string;
  /** Elvégzett munka */
  workPerformed: string;
  /** Igényelt összeg (nettó, HUF) */
  claimedAmount: number;
  /** Jóváhagyott összeg (nettó, HUF) */
  approvedAmount?: number;
  /** Beszállító válasz */
  supplierResponse?: string;
  /** Beszállító referencia szám */
  supplierReference?: string;
  /** Beküldés dátuma */
  submittedAt?: Date;
  /** Válasz dátuma */
  respondedAt?: Date;
  /** Elszámolás dátuma */
  settledAt?: Date;
  /** Létrehozó user */
  createdBy: string;
  /** Létrehozás dátum */
  createdAt: Date;
  /** Módosítás dátum */
  updatedAt: Date;
}

/**
 * Claim létrehozás input
 */
export interface ICreateWarrantyClaimInput {
  worksheetId: string;
  supplier: WarrantySupplier;
  warrantyType: WarrantyType;
  deviceSerialNumber: string;
  deviceName: string;
  purchaseDate: Date;
  warrantyExpiresAt: Date;
  normaCode?: string;
  normaHours?: number;
  faultDescription: string;
  workPerformed: string;
  claimedAmount: number;
}

/**
 * Claim státusz frissítés input
 */
export interface IUpdateClaimStatusInput {
  claimId: string;
  status: WarrantyClaimStatus;
  supplierResponse?: string;
  supplierReference?: string;
  approvedAmount?: number;
}

/**
 * Claim elszámolás input
 */
export interface ISettleClaimInput {
  claimId: string;
  settledAmount: number;
  settlementNote?: string;
}

/**
 * Claim összesítő (riport)
 */
export interface IWarrantyClaimSummary {
  /** Összes claim szám */
  totalClaims: number;
  /** Pending claim-ek */
  pendingClaims: number;
  /** Submitted claim-ek */
  submittedClaims: number;
  /** Approved claim-ek */
  approvedClaims: number;
  /** Rejected claim-ek */
  rejectedClaims: number;
  /** Settled claim-ek */
  settledClaims: number;
  /** Összes igényelt összeg */
  totalClaimedAmount: number;
  /** Összes jóváhagyott összeg */
  totalApprovedAmount: number;
  /** Beszállító szerinti bontás */
  bySupplier: Record<WarrantySupplier, {
    count: number;
    claimedAmount: number;
    approvedAmount: number;
  }>;
}

/**
 * Repository interfész
 */
export interface IWarrantyClaimRepository {
  create(tenantId: string, input: ICreateWarrantyClaimInput, createdBy: string): Promise<IWarrantyClaim>;
  findById(tenantId: string, id: string): Promise<IWarrantyClaim | null>;
  findByWorksheetId(tenantId: string, worksheetId: string): Promise<IWarrantyClaim[]>;
  findByStatus(tenantId: string, status: WarrantyClaimStatus): Promise<IWarrantyClaim[]>;
  findBySupplier(tenantId: string, supplier: WarrantySupplier): Promise<IWarrantyClaim[]>;
  updateStatus(tenantId: string, input: IUpdateClaimStatusInput): Promise<IWarrantyClaim>;
  settle(tenantId: string, input: ISettleClaimInput): Promise<IWarrantyClaim>;
  getSummary(tenantId: string, dateFrom?: Date, dateTo?: Date): Promise<IWarrantyClaimSummary>;
  generateClaimNumber(tenantId: string): Promise<string>;
}
