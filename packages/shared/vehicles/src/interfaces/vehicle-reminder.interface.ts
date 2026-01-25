/**
 * Vehicle Document Reminder Interfaces (ADR-027)
 * Dokumentum lejárat emlékeztetők
 */

/** Dokumentum típus */
export enum VehicleDocumentType {
  REGISTRATION = 'REGISTRATION', // Forgalmi engedély
  TECHNICAL_INSPECTION = 'TECHNICAL_INSPECTION', // Műszaki vizsga
  KGFB_INSURANCE = 'KGFB_INSURANCE', // Kötelező biztosítás
  CASCO_INSURANCE = 'CASCO_INSURANCE', // CASCO biztosítás
  HIGHWAY_STICKER = 'HIGHWAY_STICKER', // Pályamatrica
}

/** Értesítés típus */
export enum NotificationType {
  PUSH = 'push',
  EMAIL = 'email',
  BOTH = 'both',
}

/** Lejáró dokumentum információ */
export interface IExpiringDocument {
  vehicleId: string;
  vehicleType: 'rental' | 'company';
  licensePlate: string;
  documentType: VehicleDocumentType;
  expiryDate: Date;
  daysUntilExpiry: number;
  assignedUserId?: string;
  tenantId?: string;
}

/** Dokumentum emlékeztető interfész */
export interface IVehicleDocumentReminder {
  id: string;
  rentalVehicleId?: string;
  companyVehicleId?: string;
  documentType: VehicleDocumentType;
  expiryDate: Date;
  reminderDaysBefore: number;
  notificationSentAt?: Date;
  notificationType?: NotificationType;
  sentToUserIds: string[];
  createdAt: Date;
}

/** Emlékeztető létrehozás input */
export interface CreateReminderInput {
  rentalVehicleId?: string;
  companyVehicleId?: string;
  documentType: VehicleDocumentType;
  expiryDate: Date;
  reminderDaysBefore: number;
}

/** Emlékeztető küldés log input */
export interface LogReminderSentInput {
  reminderId: string;
  notificationType: NotificationType;
  sentToUserIds: string[];
}

/** Emlékeztető repository token */
export const VEHICLE_REMINDER_REPOSITORY = Symbol('VEHICLE_REMINDER_REPOSITORY');

/** Emlékeztető repository interfész */
export interface IVehicleReminderRepository {
  findByVehicle(
    vehicleType: 'rental' | 'company',
    vehicleId: string
  ): Promise<IVehicleDocumentReminder[]>;
  findPendingReminders(
    documentType: VehicleDocumentType,
    reminderDays: number
  ): Promise<IVehicleDocumentReminder[]>;
  create(data: CreateReminderInput): Promise<IVehicleDocumentReminder>;
  markAsSent(
    id: string,
    notificationType: NotificationType,
    sentToUserIds: string[]
  ): Promise<IVehicleDocumentReminder>;
  wasReminderSent(
    vehicleType: 'rental' | 'company',
    vehicleId: string,
    documentType: VehicleDocumentType,
    reminderDays: number
  ): Promise<boolean>;
}
