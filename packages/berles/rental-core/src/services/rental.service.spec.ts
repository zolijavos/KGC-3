import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RentalService, RentalPermissionContext, EquipmentPricingInfo, CustomerInfo } from './rental.service';
import {
  RentalStatus,
  PricingTier,
  DiscountType,
  DepositStatus,
  RentalEventType,
} from '../interfaces/rental.interface';

// Test UUIDs
const TEST_USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const TEST_TENANT_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';
const TEST_LOCATION_ID = 'c3d4e5f6-a7b8-4c9d-0e1f-a2b3c4d5e6f7';
const TEST_EQUIPMENT_ID = 'd4e5f6a7-b8c9-4d0e-1f2a-b3c4d5e6f7a8';
const TEST_CUSTOMER_ID = 'e5f6a7b8-c9d0-4e1f-2a3b-c4d5e6f7a8b9';
const TEST_EQUIPMENT_ID_2 = 'f6a7b8c9-d0e1-4f2a-3b4c-d5e6f7a8b9c0';
const TEST_CUSTOMER_ID_2 = 'a7b8c9d0-e1f2-4a3b-4c5d-e6f7a8b9c0d1';

describe('RentalService', () => {
  let service: RentalService;
  let context: RentalPermissionContext;
  let equipment: EquipmentPricingInfo;
  let customer: CustomerInfo;

  beforeEach(() => {
    service = new RentalService();
    context = {
      userId: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      locationId: TEST_LOCATION_ID,
      userRole: 'STAFF',
      canApplyDiscount: true,
      canWaiveLateFees: false,
      maxDiscountPercentage: 20,
    };
    equipment = {
      id: TEST_EQUIPMENT_ID,
      name: 'Makita fúrógép',
      dailyRate: 5000,
      weeklyRate: 25000,
      monthlyRate: 80000,
      depositAmount: 50000,
    };
    customer = {
      id: TEST_CUSTOMER_ID,
      name: 'Teszt Ügyfél',
    };
  });

  // =====================================================
  // Story 14-2: Bérlési Díj Kalkuláció
  // =====================================================
  describe('Story 14-2: Bérlési Díj Kalkuláció', () => {
    describe('calculatePrice()', () => {
      it('should calculate daily tier for 1-6 days', () => {
        const startDate = new Date('2026-01-15');
        const endDate = new Date('2026-01-18'); // 3 days

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        expect(result.pricing.tier).toBe(PricingTier.DAILY);
        expect(result.pricing.durationDays).toBe(3);
        expect(result.pricing.grossAmount).toBe(15000); // 3 * 5000
        expect(result.breakdown.tierExplanation).toContain('3 nap');
      });

      it('should calculate weekly tier for 7-29 days', () => {
        const startDate = new Date('2026-01-15');
        const endDate = new Date('2026-01-25'); // 10 days = 1 week + 3 days

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        expect(result.pricing.tier).toBe(PricingTier.WEEKLY);
        expect(result.pricing.durationDays).toBe(10);
        // 1 week * 25000 + 3 days * 5000 = 40000
        expect(result.pricing.grossAmount).toBe(40000);
      });

      it('should calculate monthly tier for 30+ days', () => {
        const startDate = new Date('2026-01-15');
        const endDate = new Date('2026-02-20'); // 36 days = 1 month + 6 days

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        expect(result.pricing.tier).toBe(PricingTier.MONTHLY);
        expect(result.pricing.durationDays).toBe(36);
        // 1 month * 80000 + 6 days * 5000 = 110000
        expect(result.pricing.grossAmount).toBe(110000);
      });

      it('should calculate VAT correctly (27%)', () => {
        const startDate = new Date('2026-01-15');
        const endDate = new Date('2026-01-17'); // 2 days

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        expect(result.pricing.vatRate).toBe(0.27);
        expect(result.pricing.netAmount).toBe(10000); // 2 * 5000
        expect(result.pricing.vatAmount).toBe(2700); // 10000 * 0.27
        expect(result.pricing.totalAmount).toBe(12700);
      });

      it('should reject end date before start date', () => {
        const startDate = new Date('2026-01-20');
        const endDate = new Date('2026-01-15');

        expect(() =>
          service.calculatePrice({ equipmentId: equipment.id, startDate, endDate }, equipment)
        ).toThrow(BadRequestException);
      });
    });
  });

  // =====================================================
  // Story 14-1: Bérlés Kiadás Wizard
  // =====================================================
  describe('Story 14-1: Bérlés Kiadás Wizard', () => {
    describe('checkout()', () => {
      it('should create rental in DRAFT status', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        expect(rental.id).toBeDefined();
        expect(rental.status).toBe(RentalStatus.DRAFT);
        expect(rental.rentalNumber).toMatch(/^R-[A-Z0-9]{4}-2026-\d{5}$/);
        expect(rental.customerName).toBe('Teszt Ügyfél');
        expect(rental.equipmentName).toBe('Makita fúrógép');
        expect(rental.depositStatus).toBe(DepositStatus.PENDING);
      });

      it('should calculate pricing on checkout', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'), // 5 days
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        expect(rental.pricing.durationDays).toBe(5);
        expect(rental.pricing.grossAmount).toBe(25000); // 5 * 5000
        expect(rental.pricing.tier).toBe(PricingTier.DAILY);
      });

      it('should record creation in history', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const history = await service.getHistory(rental.id, context);
        expect(history).toHaveLength(1);
        expect(history[0]?.eventType).toBe(RentalEventType.CREATED);
      });
    });

    describe('confirmPickup()', () => {
      it('should change status from DRAFT to ACTIVE', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const confirmed = await service.confirmPickup(
          {
            rentalId: rental.id,
            accessoryChecklistVerified: true,
            depositCollected: true,
            depositMethod: 'CASH',
          },
          context
        );

        expect(confirmed.status).toBe(RentalStatus.ACTIVE);
        expect(confirmed.depositStatus).toBe(DepositStatus.COLLECTED);
        expect(confirmed.pickupChecklistVerified).toBe(true);
      });

      it('should require accessory checklist verification', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        await expect(
          service.confirmPickup(
            {
              rentalId: rental.id,
              accessoryChecklistVerified: false,
              depositCollected: true,
            },
            context
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should require deposit collection', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        await expect(
          service.confirmPickup(
            {
              rentalId: rental.id,
              accessoryChecklistVerified: true,
              depositCollected: false,
            },
            context
          )
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  // =====================================================
  // Story 14-4: Bérlés Visszavétel Workflow
  // =====================================================
  describe('Story 14-4: Bérlés Visszavétel Workflow', () => {
    let activeRental: Awaited<ReturnType<typeof service.checkout>>;

    beforeEach(async () => {
      activeRental = await service.checkout(
        {
          customerId: customer.id,
          equipmentId: equipment.id,
          startDate: new Date('2026-01-15'),
          expectedReturnDate: new Date('2026-01-20'),
          depositAmount: 50000,
        },
        equipment,
        customer,
        context
      );
      await service.confirmPickup(
        {
          rentalId: activeRental.id,
          accessoryChecklistVerified: true,
          depositCollected: true,
        },
        context
      );
    });

    describe('processReturn()', () => {
      it('should change status to RETURNED', async () => {
        const returned = await service.processReturn(
          {
            rentalId: activeRental.id,
            returnDate: new Date('2026-01-20'),
            accessoryChecklistVerified: true,
            equipmentCondition: 'GOOD',
            depositAction: 'RETURN',
          },
          context
        );

        expect(returned.status).toBe(RentalStatus.RETURNED);
        expect(returned.actualReturnDate).toBeDefined();
        expect(returned.depositStatus).toBe(DepositStatus.RETURNED);
      });

      it('should handle partial deposit retention', async () => {
        const returned = await service.processReturn(
          {
            rentalId: activeRental.id,
            returnDate: new Date('2026-01-20'),
            accessoryChecklistVerified: true,
            equipmentCondition: 'FAIR',
            depositAction: 'RETAIN_PARTIAL',
            retainedAmount: 10000,
            retentionReason: 'Minor damage',
          },
          context
        );

        expect(returned.depositStatus).toBe(DepositStatus.PARTIALLY_RETAINED);
      });

      it('should require accessory checklist verification', async () => {
        await expect(
          service.processReturn(
            {
              rentalId: activeRental.id,
              returnDate: new Date('2026-01-20'),
              accessoryChecklistVerified: false,
              equipmentCondition: 'GOOD',
              depositAction: 'RETURN',
            },
            context
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should calculate late fee for overdue return', async () => {
        const returned = await service.processReturn(
          {
            rentalId: activeRental.id,
            returnDate: new Date('2026-01-25'), // 5 days late
            accessoryChecklistVerified: true,
            equipmentCondition: 'GOOD',
            depositAction: 'RETURN',
          },
          context
        );

        expect(returned.lateFee).toBeDefined();
        expect(returned.lateFee?.daysOverdue).toBe(5);
        expect(returned.lateFee?.amount).toBeGreaterThan(0);
        expect(returned.pricing.grandTotal).toBeGreaterThan(returned.pricing.totalAmount);
      });
    });
  });

  // =====================================================
  // Story 14-5: Bérlés Hosszabbítás
  // =====================================================
  describe('Story 14-5: Bérlés Hosszabbítás', () => {
    let activeRental: Awaited<ReturnType<typeof service.checkout>>;

    beforeEach(async () => {
      activeRental = await service.checkout(
        {
          customerId: customer.id,
          equipmentId: equipment.id,
          startDate: new Date('2026-01-15'),
          expectedReturnDate: new Date('2026-01-20'),
          depositAmount: 50000,
        },
        equipment,
        customer,
        context
      );
      await service.confirmPickup(
        {
          rentalId: activeRental.id,
          accessoryChecklistVerified: true,
          depositCollected: true,
        },
        context
      );
    });

    describe('extendRental()', () => {
      it('should extend rental and update expected return date', async () => {
        const extended = await service.extendRental(
          {
            rentalId: activeRental.id,
            newReturnDate: new Date('2026-01-25'),
            reason: 'Customer requested',
          },
          equipment,
          context
        );

        expect(extended.expectedReturnDate.getTime()).toBe(new Date('2026-01-25').getTime());
        expect(extended.extensionCount).toBe(1);
      });

      it('should recalculate pricing on extension', async () => {
        const originalDuration = activeRental.pricing.durationDays;
        const originalGrossAmount = activeRental.pricing.grossAmount;

        const extended = await service.extendRental(
          {
            rentalId: activeRental.id,
            newReturnDate: new Date('2026-01-25'), // 5 more days
          },
          equipment,
          context
        );

        expect(extended.pricing.durationDays).toBe(originalDuration + 5);
        expect(extended.pricing.grossAmount).toBeGreaterThan(originalGrossAmount);
      });

      it('should reject new return date before current expected date', async () => {
        await expect(
          service.extendRental(
            {
              rentalId: activeRental.id,
              newReturnDate: new Date('2026-01-18'), // Before current expected (1/20)
            },
            equipment,
            context
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should record extension in history', async () => {
        await service.extendRental(
          {
            rentalId: activeRental.id,
            newReturnDate: new Date('2026-01-25'),
          },
          equipment,
          context
        );

        const history = await service.getHistory(activeRental.id, context);
        const extendEvent = history.find((h) => h.eventType === RentalEventType.EXTENDED);

        expect(extendEvent).toBeDefined();
      });

      it('should clear overdue status when extended', async () => {
        // Manually set to overdue for testing
        const rental = await service.findById(activeRental.id, context);
        rental.status = RentalStatus.OVERDUE;
        rental.lateFee = {
          daysOverdue: 3,
          dailyLateFeeRate: 7500,
          amount: 22500,
          isWaived: false,
          calculatedAt: new Date(),
        };

        const extended = await service.extendRental(
          {
            rentalId: activeRental.id,
            newReturnDate: new Date('2026-01-30'),
          },
          equipment,
          context
        );

        expect(extended.status).toBe(RentalStatus.ACTIVE);
        expect(extended.lateFee).toBeUndefined();
      });
    });
  });

  // =====================================================
  // Story 14-6: Késedelmi Díj Számítás
  // =====================================================
  describe('Story 14-6: Késedelmi Díj Számítás', () => {
    describe('calculateLateFee()', () => {
      it('should calculate late fee based on days overdue', () => {
        const rental = {
          expectedReturnDate: new Date('2026-01-20'),
          pricing: {
            dailyRate: 5000,
            grossAmount: 25000,
          },
        } as any;

        const returnDate = new Date('2026-01-25'); // 5 days late
        const lateFee = service.calculateLateFee(rental, returnDate);

        expect(lateFee.daysOverdue).toBe(5);
        // 150% of daily rate = 7500 per day * 5 days = 37500
        expect(lateFee.dailyLateFeeRate).toBe(7500);
        expect(lateFee.amount).toBeGreaterThan(0);
      });

      it('should apply max fee cap', () => {
        const rental = {
          expectedReturnDate: new Date('2026-01-20'),
          pricing: {
            dailyRate: 5000,
            grossAmount: 10000, // Small rental
          },
        } as any;

        const returnDate = new Date('2026-02-20'); // 31 days late
        const lateFee = service.calculateLateFee(rental, returnDate);

        // Max fee is 100% of gross = 10000
        expect(lateFee.amount).toBeLessThanOrEqual(lateFee.maxLateFee ?? Infinity);
        expect(lateFee.maxLateFee).toBe(10000);
      });

      it('should respect grace period', () => {
        const rental = {
          expectedReturnDate: new Date('2026-01-20T12:00:00'),
          pricing: {
            dailyRate: 5000,
            grossAmount: 25000,
          },
        } as any;

        // Return 1 hour after expected (within 2 hour grace)
        const returnDate = new Date('2026-01-20T13:00:00');
        const lateFee = service.calculateLateFee(rental, returnDate);

        expect(lateFee.daysOverdue).toBe(0);
        expect(lateFee.amount).toBe(0);
      });
    });

    describe('waiveLateFees()', () => {
      it('should waive late fees with manager role', async () => {
        // Create and return an overdue rental
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );
        await service.processReturn(
          {
            rentalId: rental.id,
            returnDate: new Date('2026-01-25'),
            accessoryChecklistVerified: true,
            equipmentCondition: 'GOOD',
            depositAction: 'RETURN',
          },
          context
        );

        const managerContext = { ...context, userRole: 'MANAGER', canWaiveLateFees: true };
        const waived = await service.waiveLateFees(
          { rentalId: rental.id, reason: 'Customer loyalty' },
          managerContext
        );

        expect(waived.lateFee?.isWaived).toBe(true);
        expect(waived.lateFee?.waiverReason).toBe('Customer loyalty');
        expect(waived.pricing.lateFeeAmount).toBe(0);
      });

      it('should reject waiver without permission', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );
        await service.processReturn(
          {
            rentalId: rental.id,
            returnDate: new Date('2026-01-25'),
            accessoryChecklistVerified: true,
            equipmentCondition: 'GOOD',
            depositAction: 'RETURN',
          },
          context
        );

        await expect(
          service.waiveLateFees({ rentalId: rental.id, reason: 'No reason' }, context)
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('checkOverdueRentals()', () => {
      it('should mark active rentals as overdue when past due', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-10'),
            expectedReturnDate: new Date('2026-01-15'), // Already past
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );

        const overdueRentals = await service.checkOverdueRentals(context);

        expect(overdueRentals.length).toBeGreaterThan(0);
        const updatedRental = await service.findById(rental.id, context);
        expect(updatedRental.status).toBe(RentalStatus.OVERDUE);
      });
    });
  });

  // =====================================================
  // Story 14-3: Kedvezmény Kezelés
  // =====================================================
  describe('Story 14-3: Kedvezmény Kezelés', () => {
    describe('createDiscountRule()', () => {
      it('should create percentage discount rule', async () => {
        const rule = await service.createDiscountRule(
          {
            type: DiscountType.PROMO_CODE,
            name: 'Summer Sale',
            percentage: 15,
            promoCode: 'SUMMER15',
            validFrom: new Date('2026-01-01'),
            validUntil: new Date('2026-12-31'),
            stackable: false,
            priority: 10,
          },
          context
        );

        expect(rule.id).toBeDefined();
        expect(rule.percentage).toBe(15);
        expect(rule.promoCode).toBe('SUMMER15');
        expect(rule.isActive).toBe(true);
      });

      it('should create fixed amount discount rule', async () => {
        const rule = await service.createDiscountRule(
          {
            type: DiscountType.LOYALTY,
            name: 'Loyalty Bonus',
            fixedAmount: 5000,
            stackable: true,
            priority: 50,
          },
          context
        );

        expect(rule.fixedAmount).toBe(5000);
      });
    });

    describe('applyDiscount()', () => {
      it('should apply discount to rental', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const discounted = await service.applyDiscount(
          {
            rentalId: rental.id,
            type: DiscountType.MANUAL,
            name: 'Good customer',
            percentage: 10,
            reason: 'Repeat customer',
          },
          equipment,
          context
        );

        expect(discounted.discounts).toHaveLength(1);
        expect(discounted.pricing.discountAmount).toBeGreaterThan(0);
        expect(discounted.pricing.netAmount).toBeLessThan(discounted.pricing.grossAmount);
      });

      it('should reject discount exceeding max percentage', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        await expect(
          service.applyDiscount(
            {
              rentalId: rental.id,
              type: DiscountType.MANUAL,
              name: 'Too much discount',
              percentage: 50, // Max is 20%
            },
            equipment,
            context
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should record discount in history', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        await service.applyDiscount(
          {
            rentalId: rental.id,
            type: DiscountType.MANUAL,
            name: 'Test discount',
            percentage: 10,
          },
          equipment,
          context
        );

        const history = await service.getHistory(rental.id, context);
        const discountEvent = history.find((h) => h.eventType === RentalEventType.DISCOUNT_APPLIED);
        expect(discountEvent).toBeDefined();
      });
    });

    describe('removeDiscount()', () => {
      it('should remove discount and recalculate pricing', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const discounted = await service.applyDiscount(
          {
            rentalId: rental.id,
            type: DiscountType.MANUAL,
            name: 'Test',
            percentage: 10,
          },
          equipment,
          context
        );

        const discountId = discounted.discounts[0]?.id;
        const removed = await service.removeDiscount(rental.id, discountId!, context);

        expect(removed.discounts).toHaveLength(0);
        expect(removed.pricing.discountAmount).toBe(0);
      });
    });
  });

  // =====================================================
  // Story 14-7: Bérlés Státuszok és Audit
  // =====================================================
  describe('Story 14-7: Bérlés Státuszok és Audit', () => {
    describe('cancel()', () => {
      it('should cancel DRAFT rental', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const cancelled = await service.cancel(
          { rentalId: rental.id, reason: 'Customer changed mind' },
          context
        );

        expect(cancelled.status).toBe(RentalStatus.CANCELLED);
      });

      it('should not cancel active rental', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );

        await expect(
          service.cancel({ rentalId: rental.id, reason: 'Test' }, context)
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('addNote()', () => {
      it('should add note to rental', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const updated = await service.addNote(
          { rentalId: rental.id, note: 'Customer prefers morning pickup' },
          context
        );

        expect(updated.notes).toContain('Customer prefers morning pickup');
      });
    });

    describe('getHistory()', () => {
      it('should return history in reverse chronological order', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );
        await service.addNote({ rentalId: rental.id, note: 'Test' }, context);

        const history = await service.getHistory(rental.id, context);

        expect(history.length).toBeGreaterThanOrEqual(3);
        // Most recent first
        expect(history[0]?.performedAt.getTime()).toBeGreaterThanOrEqual(
          history[1]?.performedAt.getTime() ?? 0
        );
      });
    });

    describe('findMany()', () => {
      beforeEach(async () => {
        // Create multiple rentals
        const rental1 = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental1.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );

        await service.checkout(
          {
            customerId: TEST_CUSTOMER_ID_2,
            equipmentId: TEST_EQUIPMENT_ID_2,
            startDate: new Date('2026-01-16'),
            expectedReturnDate: new Date('2026-01-21'),
            depositAmount: 30000,
          },
          { ...equipment, id: TEST_EQUIPMENT_ID_2, name: 'Bosch szúrófűrész' },
          { ...customer, id: TEST_CUSTOMER_ID_2, name: 'Másik Ügyfél' },
          context
        );
      });

      it('should list all rentals for tenant', async () => {
        const result = await service.findMany({}, context);
        expect(result.rentals.length).toBeGreaterThanOrEqual(2);
      });

      it('should filter by status', async () => {
        const result = await service.findMany({ status: RentalStatus.ACTIVE }, context);
        expect(result.rentals.every((r) => r.status === RentalStatus.ACTIVE)).toBe(true);
      });

      it('should filter by customer', async () => {
        const result = await service.findMany({ customerId: customer.id }, context);
        expect(result.rentals.every((r) => r.customerId === customer.id)).toBe(true);
      });

      it('should support text search', async () => {
        const result = await service.findMany({ search: 'Bosch' }, context);
        expect(result.rentals.some((r) => r.equipmentName.includes('Bosch'))).toBe(true);
      });

      it('should paginate results', async () => {
        const result = await service.findMany({ page: 1, pageSize: 1 }, context);
        expect(result.rentals).toHaveLength(1);
        expect(result.hasMore).toBe(true);
      });

      it('should enforce tenant isolation', async () => {
        const otherContext = { ...context, tenantId: 'c8d9e0f1-a2b3-4c4d-5e6f-7a8b9c0d1e2f' };
        const result = await service.findMany({}, otherContext);
        expect(result.rentals).toHaveLength(0);
      });
    });

    describe('getStatistics()', () => {
      it('should return rental statistics', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );
        await service.confirmPickup(
          { rentalId: rental.id, accessoryChecklistVerified: true, depositCollected: true },
          context
        );

        const stats = await service.getStatistics(context);

        expect(stats.totalRentals).toBeGreaterThanOrEqual(1);
        expect(stats.activeRentals).toBeGreaterThanOrEqual(1);
        expect(stats.byStatus[RentalStatus.ACTIVE]).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // =====================================================
  // Utility Tests
  // =====================================================
  describe('Utility Methods', () => {
    describe('clearAll()', () => {
      it('should clear all data', async () => {
        await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        service.clearAll();
        const result = await service.findMany({}, context);
        expect(result.rentals).toHaveLength(0);
      });
    });

    describe('findById()', () => {
      it('should throw NotFoundException for non-existent rental', async () => {
        await expect(service.findById('non-existent-id', context)).rejects.toThrow(NotFoundException);
      });

      it('should enforce tenant isolation', async () => {
        const rental = await service.checkout(
          {
            customerId: customer.id,
            equipmentId: equipment.id,
            startDate: new Date('2026-01-15'),
            expectedReturnDate: new Date('2026-01-20'),
            depositAmount: 50000,
          },
          equipment,
          customer,
          context
        );

        const otherContext = { ...context, tenantId: 'c8d9e0f1-a2b3-4c4d-5e6f-7a8b9c0d1e2f' };
        await expect(service.findById(rental.id, otherContext)).rejects.toThrow(NotFoundException);
      });
    });
  });

  // =====================================================
  // Property-Based Testing - Per KGC Development Principles
  // =====================================================
  describe('Property-Based Tests (Mathematical Properties)', () => {
    describe('calculateLateFee() properties', () => {
      it('should never return negative fee for any input', () => {
        // Property: Late fee is always >= 0
        const testCases = [
          { dailyRate: 0, grossAmount: 0, daysOverdue: 0 },
          { dailyRate: 1000, grossAmount: 5000, daysOverdue: 1 },
          { dailyRate: 10000, grossAmount: 50000, daysOverdue: 10 },
          { dailyRate: 100000, grossAmount: 500000, daysOverdue: 100 },
        ];

        for (const tc of testCases) {
          const rental = {
            expectedReturnDate: new Date('2026-01-20'),
            pricing: { dailyRate: tc.dailyRate, grossAmount: tc.grossAmount },
          } as any;

          const returnDate = new Date('2026-01-20');
          returnDate.setDate(returnDate.getDate() + tc.daysOverdue);

          const lateFee = service.calculateLateFee(rental, returnDate);
          expect(lateFee.amount).toBeGreaterThanOrEqual(0);
        }
      });

      it('should never exceed max fee cap (100% of gross)', () => {
        // Property: Late fee <= maxLateFee
        const testCases = [
          { dailyRate: 5000, grossAmount: 10000, daysOverdue: 50 },
          { dailyRate: 10000, grossAmount: 20000, daysOverdue: 100 },
          { dailyRate: 50000, grossAmount: 100000, daysOverdue: 365 },
        ];

        for (const tc of testCases) {
          const rental = {
            expectedReturnDate: new Date('2026-01-20'),
            pricing: { dailyRate: tc.dailyRate, grossAmount: tc.grossAmount },
          } as any;

          const returnDate = new Date('2026-01-20');
          returnDate.setDate(returnDate.getDate() + tc.daysOverdue);

          const lateFee = service.calculateLateFee(rental, returnDate);
          expect(lateFee.amount).toBeLessThanOrEqual(lateFee.maxLateFee ?? tc.grossAmount);
        }
      });

      it('should be monotonically increasing with late days', () => {
        // Property: More days late => higher or equal fee (until cap)
        const rental = {
          expectedReturnDate: new Date('2026-01-20'),
          pricing: { dailyRate: 5000, grossAmount: 50000 },
        } as any;

        const fees: number[] = [];
        for (let days = 0; days <= 20; days++) {
          const returnDate = new Date('2026-01-20');
          returnDate.setDate(returnDate.getDate() + days);
          const lateFee = service.calculateLateFee(rental, returnDate);
          fees.push(lateFee.amount);
        }

        // Check monotonic (each value >= previous)
        for (let i = 1; i < fees.length; i++) {
          const current = fees[i];
          const previous = fees[i - 1];
          if (current !== undefined && previous !== undefined) {
            expect(current).toBeGreaterThanOrEqual(previous);
          }
        }
      });
    });

    describe('VAT calculation properties', () => {
      it('should always produce integer VAT amounts (no floating point errors)', () => {
        // Property: VAT amount is always an integer (rounded)
        const testCases = [
          { startDate: '2026-01-15', endDate: '2026-01-17' }, // 2 days
          { startDate: '2026-01-15', endDate: '2026-01-22' }, // 7 days
          { startDate: '2026-01-15', endDate: '2026-02-15' }, // 31 days
          { startDate: '2026-01-01', endDate: '2026-03-01' }, // 60 days
        ];

        for (const tc of testCases) {
          const result = service.calculatePrice(
            { equipmentId: equipment.id, startDate: new Date(tc.startDate), endDate: new Date(tc.endDate) },
            equipment
          );

          // VAT should be an integer (no decimal places)
          expect(Number.isInteger(result.pricing.vatAmount)).toBe(true);
          expect(Number.isInteger(result.pricing.totalAmount)).toBe(true);
        }
      });
    });
  });

  // =====================================================
  // Edge Case Tests - Per KGC Development Principles
  // =====================================================
  describe('Edge Case Tests', () => {
    describe('DST (Daylight Saving Time) transitions', () => {
      it('should handle spring DST transition correctly', () => {
        // Hungary DST: last Sunday of March (clocks go forward 1 hour)
        // 2026-03-29 is the last Sunday of March 2026
        const startDate = new Date('2026-03-28');
        const endDate = new Date('2026-03-30'); // Spans DST change

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        // Should still calculate 2 days correctly despite DST
        expect(result.pricing.durationDays).toBe(2);
      });

      it('should handle autumn DST transition correctly', () => {
        // Hungary DST: last Sunday of October (clocks go back 1 hour)
        // 2026-10-25 is the last Sunday of October 2026
        const startDate = new Date('2026-10-24');
        const endDate = new Date('2026-10-26'); // Spans DST change

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        // Should still calculate 2 days correctly despite DST
        expect(result.pricing.durationDays).toBe(2);
      });
    });

    describe('Leap year handling', () => {
      it('should handle February 29 in leap year', () => {
        // 2028 is a leap year
        const startDate = new Date('2028-02-28');
        const endDate = new Date('2028-03-01'); // 2 days including Feb 29

        const result = service.calculatePrice(
          { equipmentId: equipment.id, startDate, endDate },
          equipment
        );

        expect(result.pricing.durationDays).toBe(2);
      });
    });

    describe('Midnight boundary returns', () => {
      it('should handle return exactly at midnight', () => {
        const rental = {
          expectedReturnDate: new Date('2026-01-20T00:00:00'),
          pricing: { dailyRate: 5000, grossAmount: 25000 },
        } as any;

        // Return at exactly midnight of expected date
        const returnDate = new Date('2026-01-20T00:00:00');
        const lateFee = service.calculateLateFee(rental, returnDate);

        expect(lateFee.daysOverdue).toBe(0);
        expect(lateFee.amount).toBe(0);
      });

      it('should handle return 1 second after midnight', () => {
        const rental = {
          expectedReturnDate: new Date('2026-01-20T00:00:00'),
          pricing: { dailyRate: 5000, grossAmount: 25000 },
        } as any;

        // Return 1 second after expected time - within grace period
        const returnDate = new Date('2026-01-20T00:00:01');
        const lateFee = service.calculateLateFee(rental, returnDate);

        // Should be within 2-hour grace period
        expect(lateFee.daysOverdue).toBe(0);
        expect(lateFee.amount).toBe(0);
      });
    });
  });
});
