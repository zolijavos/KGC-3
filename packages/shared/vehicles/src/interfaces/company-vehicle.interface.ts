/**
 * Company Vehicle Interfaces (ADR-027)
 * Céges gépkocsik: személyautók, furgonok
 */

import { VehicleStatus } from './rental-vehicle.interface';

/** Céges jármű típus */
export enum CompanyVehicleType {
  CAR = 'CAR', // Személygépkocsi
  VAN = 'VAN', // Kisteherautó
  TRUCK = 'TRUCK', // Furgon
  MOTORCYCLE = 'MOTORCYCLE', // Motor
}

/** Céges jármű interfész */
export interface ICompanyVehicle {
  id: string;

  // Alapadatok
  licensePlate: string;
  vehicleType: CompanyVehicleType;
  brand?: string | undefined;
  model?: string | undefined;
  yearOfManufacture?: number | undefined;
  vin?: string | undefined;

  // Hozzárendelés
  assignedTenantId?: string | undefined;
  assignedUserId?: string | undefined;

  // Dokumentumok - Forgalmi és műszaki
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;

  // KGFB biztosítás
  kgfbPolicyNumber?: string | undefined;
  kgfbInsurer?: string | undefined;
  kgfbValidUntil?: Date | undefined;

  // CASCO biztosítás
  cascoPolicyNumber?: string | undefined;
  cascoInsurer?: string | undefined;
  cascoValidUntil?: Date | undefined;

  // Pályamatrica
  highwayStickerCategory?: string | undefined;
  highwayStickerUntil?: Date | undefined;

  // Státusz
  status: VehicleStatus;
  notes?: string | undefined;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Céges jármű létrehozás input */
export interface CreateCompanyVehicleInput {
  licensePlate: string;
  vehicleType: CompanyVehicleType;
  brand?: string | undefined;
  model?: string | undefined;
  yearOfManufacture?: number | undefined;
  vin?: string | undefined;
  assignedTenantId?: string | undefined;
  assignedUserId?: string | undefined;
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;
  kgfbPolicyNumber?: string | undefined;
  kgfbInsurer?: string | undefined;
  kgfbValidUntil?: Date | undefined;
  cascoPolicyNumber?: string | undefined;
  cascoInsurer?: string | undefined;
  cascoValidUntil?: Date | undefined;
  highwayStickerCategory?: string | undefined;
  highwayStickerUntil?: Date | undefined;
  notes?: string | undefined;
}

/** Céges jármű frissítés input */
export interface UpdateCompanyVehicleInput {
  licensePlate?: string | undefined;
  vehicleType?: CompanyVehicleType | undefined;
  brand?: string | undefined;
  model?: string | undefined;
  yearOfManufacture?: number | undefined;
  vin?: string | undefined;
  assignedTenantId?: string | undefined;
  assignedUserId?: string | undefined;
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;
  kgfbPolicyNumber?: string | undefined;
  kgfbInsurer?: string | undefined;
  kgfbValidUntil?: Date | undefined;
  cascoPolicyNumber?: string | undefined;
  cascoInsurer?: string | undefined;
  cascoValidUntil?: Date | undefined;
  highwayStickerCategory?: string | undefined;
  highwayStickerUntil?: Date | undefined;
  status?: VehicleStatus | undefined;
  notes?: string | undefined;
}

/** Céges jármű hozzárendelés input */
export interface AssignCompanyVehicleInput {
  assignedTenantId?: string | undefined;
  assignedUserId?: string | undefined;
}

/** Céges jármű szűrő */
export interface CompanyVehicleFilter {
  vehicleType?: CompanyVehicleType | undefined;
  status?: VehicleStatus | undefined;
  assignedTenantId?: string | undefined;
  assignedUserId?: string | undefined;
  expiringWithinDays?: number | undefined;
}

/** Céges jármű repository token */
export const COMPANY_VEHICLE_REPOSITORY = Symbol('COMPANY_VEHICLE_REPOSITORY');

import type { IExpiringDocument } from './vehicle-reminder.interface';

/** Céges jármű repository interfész */
export interface ICompanyVehicleRepository {
  findAll(filter?: CompanyVehicleFilter): Promise<ICompanyVehicle[]>;
  findById(id: string): Promise<ICompanyVehicle | null>;
  findByLicensePlate(licensePlate: string): Promise<ICompanyVehicle | null>;
  create(data: CreateCompanyVehicleInput, createdBy: string): Promise<ICompanyVehicle>;
  update(id: string, data: UpdateCompanyVehicleInput): Promise<ICompanyVehicle>;
  delete(id: string): Promise<void>;
  assign(id: string, data: AssignCompanyVehicleInput): Promise<ICompanyVehicle>;
  findExpiringDocuments(withinDays: number): Promise<ICompanyVehicle[]>;
  /**
   * Részletes lejáró dokumentumok lekérdezése
   * @param withinDays - Napon belül lejáró dokumentumok
   * @returns Strukturált lejáró dokumentum információk (KGFB, CASCO, műszaki vizsga, pályamatrica)
   */
  findExpiringDocumentsDetailed(withinDays: number): Promise<IExpiringDocument[]>;
}
