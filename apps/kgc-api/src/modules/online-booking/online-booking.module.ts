/**
 * Online Booking Module - NestJS Module for Online Booking
 * Epic 26: Online Booking
 *
 * Provides:
 * - Online booking creation - Story 26-1
 * - Booking confirmation and management - Story 26-2
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Package imports
import { BookingConfirmationService, BookingService } from '@kgc/online-booking';

// Controllers
import { OnlineBookingController } from './controllers/online-booking.controller';

// Repositories
import {
  InMemoryBookingItemRepository,
  InMemoryBookingRepository,
} from './repositories/in-memory-booking.repository';
import {
  InMemoryAuditService,
  InMemoryBookingNotificationService,
  InMemoryConfirmationNotificationService,
  InMemoryEquipmentService,
  InMemoryPaymentService,
  InMemoryRentalService,
} from './repositories/in-memory-services';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
export const BOOKING_ITEM_REPOSITORY = Symbol('BOOKING_ITEM_REPOSITORY');
export const EQUIPMENT_SERVICE = Symbol('EQUIPMENT_SERVICE');
export const BOOKING_NOTIFICATION_SERVICE = Symbol('BOOKING_NOTIFICATION_SERVICE');
export const PAYMENT_SERVICE = Symbol('PAYMENT_SERVICE');
export const RENTAL_SERVICE = Symbol('RENTAL_SERVICE');
export const CONFIRMATION_NOTIFICATION_SERVICE = Symbol('CONFIRMATION_NOTIFICATION_SERVICE');
export const AUDIT_SERVICE = Symbol('AUDIT_SERVICE');

export interface OnlineBookingModuleOptions {
  prisma: PrismaClient;
}

@Module({})
export class OnlineBookingModule {
  static forRoot(options: OnlineBookingModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories (InMemory for now, will be replaced with Prisma)
      {
        provide: BOOKING_REPOSITORY,
        useClass: InMemoryBookingRepository,
      },
      {
        provide: BOOKING_ITEM_REPOSITORY,
        useClass: InMemoryBookingItemRepository,
      },
      {
        provide: EQUIPMENT_SERVICE,
        useClass: InMemoryEquipmentService,
      },
      {
        provide: BOOKING_NOTIFICATION_SERVICE,
        useClass: InMemoryBookingNotificationService,
      },
      {
        provide: PAYMENT_SERVICE,
        useClass: InMemoryPaymentService,
      },
      {
        provide: RENTAL_SERVICE,
        useClass: InMemoryRentalService,
      },
      {
        provide: CONFIRMATION_NOTIFICATION_SERVICE,
        useClass: InMemoryConfirmationNotificationService,
      },
      {
        provide: AUDIT_SERVICE,
        useClass: InMemoryAuditService,
      },

      // Services from @kgc/online-booking package
      {
        provide: BookingService,
        useFactory: (
          bookingRepo: InMemoryBookingRepository,
          itemRepo: InMemoryBookingItemRepository,
          equipmentService: InMemoryEquipmentService,
          notificationService: InMemoryBookingNotificationService,
          auditService: InMemoryAuditService
        ) =>
          new BookingService(
            bookingRepo,
            itemRepo,
            equipmentService,
            notificationService,
            auditService
          ),
        inject: [
          BOOKING_REPOSITORY,
          BOOKING_ITEM_REPOSITORY,
          EQUIPMENT_SERVICE,
          BOOKING_NOTIFICATION_SERVICE,
          AUDIT_SERVICE,
        ],
      },
      {
        provide: BookingConfirmationService,
        useFactory: (
          bookingRepo: InMemoryBookingRepository,
          itemRepo: InMemoryBookingItemRepository,
          paymentService: InMemoryPaymentService,
          rentalService: InMemoryRentalService,
          notificationService: InMemoryConfirmationNotificationService,
          auditService: InMemoryAuditService
        ) =>
          new BookingConfirmationService(
            bookingRepo,
            itemRepo,
            paymentService,
            rentalService,
            notificationService,
            auditService
          ),
        inject: [
          BOOKING_REPOSITORY,
          BOOKING_ITEM_REPOSITORY,
          PAYMENT_SERVICE,
          RENTAL_SERVICE,
          CONFIRMATION_NOTIFICATION_SERVICE,
          AUDIT_SERVICE,
        ],
      },

      // Export repository classes for direct injection
      InMemoryBookingRepository,
      InMemoryBookingItemRepository,
      InMemoryEquipmentService,
      InMemoryBookingNotificationService,
      InMemoryPaymentService,
      InMemoryRentalService,
      InMemoryConfirmationNotificationService,
      InMemoryAuditService,
    ];

    return {
      module: OnlineBookingModule,
      controllers: [OnlineBookingController],
      providers,
      exports: [
        BookingService,
        BookingConfirmationService,
        BOOKING_REPOSITORY,
        BOOKING_ITEM_REPOSITORY,
      ],
    };
  }
}
