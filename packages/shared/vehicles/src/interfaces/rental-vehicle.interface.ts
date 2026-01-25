/**
 * Rental Vehicle Interfaces (ADR-027)
 * Bérgép járművek: utánfutók, aggregátorok
 */

/** Bérgép jármű típus */
export enum RentalVehicleType {
  TRAILER = 'TRAILER', // Utánfutó
  AGGREGATOR = 'AGGREGATOR', // Aggregátor
  PLATFORM = 'PLATFORM', // Emelő platform
  EQUIPMENT = 'EQUIPMENT', // Egyéb bérelhető jármű/eszköz
}

/** Jármű státusz */
export enum VehicleStatus {
  ACTIVE = 'ACTIVE', // Aktív, használatban
  INACTIVE = 'INACTIVE', // Inaktív
  IN_SERVICE = 'IN_SERVICE', // Szervizben
  SOLD = 'SOLD', // Eladva
  SCRAPPED = 'SCRAPPED', // Selejtezve
}

/** Bérgép jármű interfész */
export interface IRentalVehicle {
  id: string;
  tenantId: string;

  // Alapadatok
  licensePlate: string;
  vehicleType: RentalVehicleType;
  brand?: string | undefined;
  model?: string | undefined;
  description?: string | undefined;

  // Kapcsolat bérgép modulhoz
  rentalEquipmentId?: string | undefined;

  // Dokumentumok
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;

  // Státusz
  status: VehicleStatus;
  notes?: string | undefined;

  // Audit
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Bérgép jármű létrehozás input */
export interface CreateRentalVehicleInput {
  licensePlate: string;
  vehicleType: RentalVehicleType;
  brand?: string | undefined;
  model?: string | undefined;
  description?: string | undefined;
  rentalEquipmentId?: string | undefined;
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;
  notes?: string | undefined;
}

/** Bérgép jármű frissítés input */
export interface UpdateRentalVehicleInput {
  licensePlate?: string | undefined;
  vehicleType?: RentalVehicleType | undefined;
  brand?: string | undefined;
  model?: string | undefined;
  description?: string | undefined;
  rentalEquipmentId?: string | undefined;
  registrationDocNumber?: string | undefined;
  registrationValidUntil?: Date | undefined;
  technicalInspectionUntil?: Date | undefined;
  status?: VehicleStatus | undefined;
  notes?: string | undefined;
}

/** Bérgép jármű szűrő */
export interface RentalVehicleFilter {
  vehicleType?: RentalVehicleType | undefined;
  status?: VehicleStatus | undefined;
  expiringWithinDays?: number | undefined;
}

/** Bérgép jármű repository token */
export const RENTAL_VEHICLE_REPOSITORY = Symbol('RENTAL_VEHICLE_REPOSITORY');

import type { IExpiringDocument } from './vehicle-reminder.interface';

/** Bérgép jármű repository interfész */
export interface IRentalVehicleRepository {
  findAll(tenantId: string, filter?: RentalVehicleFilter): Promise<IRentalVehicle[]>;
  findById(id: string, tenantId: string): Promise<IRentalVehicle | null>;
  findByLicensePlate(licensePlate: string, tenantId: string): Promise<IRentalVehicle | null>;
  create(
    tenantId: string,
    data: CreateRentalVehicleInput,
    createdBy: string
  ): Promise<IRentalVehicle>;
  update(id: string, tenantId: string, data: UpdateRentalVehicleInput): Promise<IRentalVehicle>;
  delete(id: string, tenantId: string): Promise<void>;
  linkToRentalEquipment(
    id: string,
    tenantId: string,
    rentalEquipmentId: string
  ): Promise<IRentalVehicle>;
  findExpiringDocuments(tenantId: string, withinDays: number): Promise<IRentalVehicle[]>;
  /**
   * Részletes lejáró dokumentumok lekérdezése
   * @param tenantId - Tenant azonosító
   * @param withinDays - Napon belül lejáró dokumentumok
   * @returns Strukturált lejáró dokumentum információk
   */
  findExpiringDocumentsDetailed(tenantId: string, withinDays: number): Promise<IExpiringDocument[]>;
}
