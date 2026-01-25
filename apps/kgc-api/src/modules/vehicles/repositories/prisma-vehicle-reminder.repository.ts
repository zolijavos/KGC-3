/**
 * Prisma Vehicle Reminder Repository
 * Epic 34: Járműnyilvántartás (ADR-027)
 * Dokumentum lejárat emlékeztetők kezelése
 */

import {
  CreateReminderInput,
  IVehicleDocumentReminder,
  IVehicleReminderRepository,
  NotificationType,
  VehicleDocumentType,
} from '@kgc/vehicles';
import { Inject, Injectable } from '@nestjs/common';
import {
  PrismaClient,
  VehicleDocumentType as PrismaDocType,
  VehicleDocumentReminder as PrismaReminder,
} from '@prisma/client';

@Injectable()
export class PrismaVehicleReminderRepository implements IVehicleReminderRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  /**
   * Prisma model → Domain interface mapping
   */
  private toDomain(reminder: PrismaReminder): IVehicleDocumentReminder {
    return {
      id: reminder.id,
      rentalVehicleId: reminder.rentalVehicleId ?? undefined,
      companyVehicleId: reminder.companyVehicleId ?? undefined,
      documentType: reminder.documentType as VehicleDocumentType,
      expiryDate: reminder.expiryDate,
      reminderDaysBefore: reminder.reminderDaysBefore,
      notificationSentAt: reminder.notificationSentAt ?? undefined,
      notificationType: reminder.notificationType as NotificationType | undefined,
      sentToUserIds: Array.isArray(reminder.sentToUserIds)
        ? (reminder.sentToUserIds as string[])
        : [],
      createdAt: reminder.createdAt,
    };
  }

  /**
   * Emlékeztetők lekérdezése járműhöz
   */
  async findByVehicle(
    vehicleType: 'rental' | 'company',
    vehicleId: string
  ): Promise<IVehicleDocumentReminder[]> {
    const where =
      vehicleType === 'rental' ? { rentalVehicleId: vehicleId } : { companyVehicleId: vehicleId };

    const reminders = await this.prisma.vehicleDocumentReminder.findMany({
      where,
      orderBy: { expiryDate: 'asc' },
    });

    return reminders.map(r => this.toDomain(r));
  }

  /**
   * Küldésre váró emlékeztetők keresése
   * @param documentType - Dokumentum típus szűrő
   * @param reminderDays - Hány nappal korábban küldendő
   */
  async findPendingReminders(
    documentType: VehicleDocumentType,
    reminderDays: number
  ): Promise<IVehicleDocumentReminder[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Keresés: lejárat dátum - reminderDays = mai nap, ÉS még nem lett elküldve
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + reminderDays);
    targetDate.setHours(23, 59, 59, 999);

    const reminders = await this.prisma.vehicleDocumentReminder.findMany({
      where: {
        documentType: documentType as PrismaDocType,
        reminderDaysBefore: reminderDays,
        notificationSentAt: null,
        expiryDate: {
          gte: today,
          lte: targetDate,
        },
      },
      orderBy: { expiryDate: 'asc' },
    });

    return reminders.map(r => this.toDomain(r));
  }

  /**
   * Új emlékeztető létrehozása
   */
  async create(data: CreateReminderInput): Promise<IVehicleDocumentReminder> {
    // Validáció: pontosan egy járműhöz kell kapcsolódnia
    if (!data.rentalVehicleId && !data.companyVehicleId) {
      throw new Error('Emlékeztetőhöz jármű megadása kötelező');
    }
    if (data.rentalVehicleId && data.companyVehicleId) {
      throw new Error('Emlékeztető csak egy járműhöz tartozhat');
    }

    const reminder = await this.prisma.vehicleDocumentReminder.create({
      data: {
        rentalVehicleId: data.rentalVehicleId ?? null,
        companyVehicleId: data.companyVehicleId ?? null,
        documentType: data.documentType as PrismaDocType,
        expiryDate: data.expiryDate,
        reminderDaysBefore: data.reminderDaysBefore,
        sentToUserIds: [],
      },
    });

    return this.toDomain(reminder);
  }

  /**
   * Emlékeztető megjelölése elküldöttként
   */
  async markAsSent(
    id: string,
    notificationType: NotificationType,
    sentToUserIds: string[]
  ): Promise<IVehicleDocumentReminder> {
    const reminder = await this.prisma.vehicleDocumentReminder.update({
      where: { id },
      data: {
        notificationSentAt: new Date(),
        notificationType,
        sentToUserIds,
      },
    });

    return this.toDomain(reminder);
  }

  /**
   * Ellenőrzés: lett-e már emlékeztető küldve adott járműhöz/dokumentumhoz
   */
  async wasReminderSent(
    vehicleType: 'rental' | 'company',
    vehicleId: string,
    documentType: VehicleDocumentType,
    reminderDays: number
  ): Promise<boolean> {
    const where =
      vehicleType === 'rental' ? { rentalVehicleId: vehicleId } : { companyVehicleId: vehicleId };

    const reminder = await this.prisma.vehicleDocumentReminder.findFirst({
      where: {
        ...where,
        documentType: documentType as PrismaDocType,
        reminderDaysBefore: reminderDays,
        notificationSentAt: { not: null },
      },
    });

    return reminder !== null;
  }

  /**
   * Emlékeztetők tömeges létrehozása lejáró dokumentumokhoz
   * @param documents - Lejáró dokumentumok listája
   * @param reminderDays - Emlékeztető napok (pl. [30, 14, 7])
   */
  async createBulkReminders(
    documents: Array<{
      vehicleType: 'rental' | 'company';
      vehicleId: string;
      documentType: VehicleDocumentType;
      expiryDate: Date;
    }>,
    reminderDays: number[]
  ): Promise<number> {
    const remindersToCreate: Array<{
      rentalVehicleId: string | null;
      companyVehicleId: string | null;
      documentType: PrismaDocType;
      expiryDate: Date;
      reminderDaysBefore: number;
      sentToUserIds: string[];
    }> = [];

    for (const doc of documents) {
      for (const days of reminderDays) {
        // Ellenőrzés: létezik-e már ilyen emlékeztető
        const exists = await this.wasReminderSent(
          doc.vehicleType,
          doc.vehicleId,
          doc.documentType,
          days
        );

        if (!exists) {
          remindersToCreate.push({
            rentalVehicleId: doc.vehicleType === 'rental' ? doc.vehicleId : null,
            companyVehicleId: doc.vehicleType === 'company' ? doc.vehicleId : null,
            documentType: doc.documentType as PrismaDocType,
            expiryDate: doc.expiryDate,
            reminderDaysBefore: days,
            sentToUserIds: [],
          });
        }
      }
    }

    if (remindersToCreate.length === 0) {
      return 0;
    }

    const result = await this.prisma.vehicleDocumentReminder.createMany({
      data: remindersToCreate,
      skipDuplicates: true,
    });

    return result.count;
  }

  /**
   * Régi (feldolgozott) emlékeztetők törlése
   * @param olderThanDays - Ennyi napnál régebbi emlékeztetők törlése
   */
  async deleteOldReminders(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.vehicleDocumentReminder.deleteMany({
      where: {
        notificationSentAt: { not: null },
        expiryDate: { lt: cutoffDate },
      },
    });

    return result.count;
  }
}
