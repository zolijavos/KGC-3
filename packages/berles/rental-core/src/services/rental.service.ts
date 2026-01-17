import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import {
  Rental,
  RentalStatus,
  PricingTier,
  DiscountType,
  DepositStatus,
  RentalEventType,
  RentalPricing,
  AppliedDiscount,
  LateFeeDetails,
  LateFeeConfig,
  RentalExtension,
  RentalHistoryEntry,
  DiscountRule,
  RentalListResult,
  PriceCalculationResult,
  RentalStatistics,
} from '../interfaces/rental.interface';
import {
  RentalCheckoutDto,
  RentalReturnDto,
  RentalExtensionDto,
  PriceCalculationDto,
  ApplyDiscountDto,
  CreateDiscountRuleDto,
  WaiveLateFeesDto,
  CancelRentalDto,
  RentalFilterDto,
  ConfirmPickupDto,
  AddNoteDto,
  validateRentalCheckout,
  validateRentalReturn,
  validateRentalExtension,
  validatePriceCalculation,
  validateApplyDiscount,
  validateCreateDiscountRule,
  validateWaiveLateFees,
  validateCancelRental,
  validateRentalFilter,
  validateConfirmPickup,
  validateAddNote,
} from '../dto/rental.dto';

/**
 * Permission context for rental operations
 */
export interface RentalPermissionContext {
  userId: string;
  tenantId: string;
  locationId: string;
  userRole: string;
  canApplyDiscount: boolean;
  canWaiveLateFees: boolean;
  maxDiscountPercentage: number;
}

/**
 * Equipment info for pricing - simplified interface for dependency injection
 */
export interface EquipmentPricingInfo {
  id: string;
  name: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  depositAmount: number;
}

/**
 * Customer info for discounts - simplified interface
 */
export interface CustomerInfo {
  id: string;
  name: string;
  loyaltyTier?: string;
  contractDiscountPercentage?: number;
}

/**
 * RentalService - Epic 14: Rental Operations
 * Implements:
 * - Story 14-1: Bérlés kiadás wizard
 * - Story 14-2: Bérlési díj kalkuláció
 * - Story 14-3: Kedvezmény kezelés (role-based)
 * - Story 14-4: Bérlés visszavétel workflow
 * - Story 14-5: Bérlés hosszabbítás
 * - Story 14-6: Késedelmi díj számítás
 * - Story 14-7: Bérlés státuszok és audit
 */
@Injectable()
export class RentalService {
  // In-memory storage for testing
  private rentals: Map<string, Rental> = new Map();
  private discountRules: Map<string, DiscountRule> = new Map();
  private extensions: RentalExtension[] = [];
  private history: RentalHistoryEntry[] = [];
  private rentalCounter = 0;

  // Default late fee config
  private lateFeeConfig: LateFeeConfig = {
    dailyFeePercentage: 150, // 150% of daily rate
    maxFeePercentage: 100, // Max 100% of rental amount
    gracePeriodHours: 2, // 2 hours grace period
    waiverRoles: ['MANAGER', 'ADMIN'],
  };

  // Default VAT rate (Hungary)
  private readonly VAT_RATE = 0.27;

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Generate rental number.
   * WARNING: In-memory counter for testing only. Production MUST use
   * database sequences or atomic counters to prevent race conditions
   * in concurrent environments.
   */
  private generateRentalNumber(tenantId: string): string {
    // TODO: In production, replace with database sequence or atomic counter
    this.rentalCounter++;
    const year = new Date().getFullYear();
    return `R-${tenantId.substring(0, 4).toUpperCase()}-${year}-${String(this.rentalCounter).padStart(5, '0')}`;
  }

  // =====================================================
  // Story 14-2: Bérlési Díj Kalkuláció
  // =====================================================

  /**
   * Calculate rental price based on duration and rates
   * Tier logic:
   * - 1-6 days: daily rate × days
   * - 7-29 days: weekly rate × weeks + daily rate × remaining days
   * - 30+ days: monthly rate × months + weekly/daily for remainder
   */
  calculatePrice(
    input: PriceCalculationDto,
    equipment: EquipmentPricingInfo,
    customer?: CustomerInfo,
    context?: RentalPermissionContext
  ): PriceCalculationResult {
    const validated = validatePriceCalculation(input);

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

    // Determine pricing tier and calculate base amount
    const { tier, grossAmount, tierExplanation } = this.calculateTierPrice(
      durationDays,
      equipment.dailyRate,
      equipment.weeklyRate,
      equipment.monthlyRate
    );

    // Collect applicable discounts
    const applicableDiscounts = this.findApplicableDiscounts(
      validated,
      customer,
      context,
      durationDays
    );

    // Calculate discount amount
    let discountAmount = 0;
    const appliedDiscounts: Array<{ name: string; type: DiscountType; amount: number }> = [];

    for (const discount of applicableDiscounts) {
      let amount = 0;
      if (discount.percentage) {
        amount = (grossAmount - discountAmount) * (discount.percentage / 100);
      } else if (discount.fixedAmount) {
        amount = discount.fixedAmount;
      }

      // Apply max cap if specified
      if (discount.maxDiscountAmount && amount > discount.maxDiscountAmount) {
        amount = discount.maxDiscountAmount;
      }

      discountAmount += amount;
      appliedDiscounts.push({
        name: discount.name,
        type: discount.type,
        amount,
      });

      // Stop if not stackable
      if (!discount.stackable) break;
    }

    // Calculate net and VAT (round VAT to avoid floating point precision issues)
    const netAmount = Math.max(0, grossAmount - discountAmount);
    const vatAmount = Math.round(netAmount * this.VAT_RATE);
    const totalAmount = netAmount + vatAmount;

    const pricing: RentalPricing = {
      tier,
      dailyRate: equipment.dailyRate,
      weeklyRate: equipment.weeklyRate,
      monthlyRate: equipment.monthlyRate,
      durationDays,
      grossAmount,
      discountAmount,
      netAmount,
      vatRate: this.VAT_RATE,
      vatAmount,
      totalAmount,
      lateFeeAmount: 0,
      grandTotal: totalAmount,
    };

    return {
      pricing,
      appliedDiscounts,
      breakdown: {
        baseDays: durationDays,
        baseRate: equipment.dailyRate,
        tier,
        tierExplanation,
      },
    };
  }

  private calculateTierPrice(
    days: number,
    dailyRate: number,
    weeklyRate: number,
    monthlyRate: number
  ): { tier: PricingTier; grossAmount: number; tierExplanation: string } {
    if (days < 7) {
      return {
        tier: PricingTier.DAILY,
        grossAmount: dailyRate * days,
        tierExplanation: `${days} nap × ${dailyRate} Ft/nap = ${dailyRate * days} Ft`,
      };
    }

    if (days < 30) {
      const weeks = Math.floor(days / 7);
      const remainingDays = days % 7;
      const weekAmount = weeklyRate * weeks;
      const dayAmount = dailyRate * remainingDays;
      const total = weekAmount + dayAmount;

      return {
        tier: PricingTier.WEEKLY,
        grossAmount: total,
        tierExplanation: `${weeks} hét × ${weeklyRate} Ft + ${remainingDays} nap × ${dailyRate} Ft = ${total} Ft`,
      };
    }

    // 30+ days - monthly tier
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    const monthAmount = monthlyRate * months;

    let remainderAmount = 0;
    let remainderExplanation = '';

    if (remainingDays >= 7) {
      const weeks = Math.floor(remainingDays / 7);
      const extraDays = remainingDays % 7;
      remainderAmount = weeklyRate * weeks + dailyRate * extraDays;
      remainderExplanation = `${weeks} hét × ${weeklyRate} Ft + ${extraDays} nap × ${dailyRate} Ft`;
    } else if (remainingDays > 0) {
      remainderAmount = dailyRate * remainingDays;
      remainderExplanation = `${remainingDays} nap × ${dailyRate} Ft`;
    }

    const total = monthAmount + remainderAmount;

    return {
      tier: PricingTier.MONTHLY,
      grossAmount: total,
      tierExplanation: `${months} hónap × ${monthlyRate} Ft${remainderExplanation ? ` + ${remainderExplanation}` : ''} = ${total} Ft`,
    };
  }

  private findApplicableDiscounts(
    input: PriceCalculationDto,
    customer?: CustomerInfo,
    context?: RentalPermissionContext,
    durationDays?: number
  ): DiscountRule[] {
    const now = new Date();
    const applicable: DiscountRule[] = [];

    // Get all active discount rules for tenant
    const rules = Array.from(this.discountRules.values())
      .filter((r) => r.isActive)
      .sort((a, b) => a.priority - b.priority);

    for (const rule of rules) {
      // Check minimum days
      if (rule.minDays && durationDays && durationDays < rule.minDays) continue;

      // Check validity period
      if (rule.validFrom && now < rule.validFrom) continue;
      if (rule.validUntil && now > rule.validUntil) continue;

      // Check promo code
      if (rule.type === DiscountType.PROMO_CODE) {
        if (!input.promoCode || input.promoCode !== rule.promoCode) continue;
      }

      // Check role-based discount
      if (rule.type === DiscountType.ROLE_BASED) {
        if (!context || context.userRole !== rule.requiredRole) continue;
      }

      // Check contract discount
      if (rule.type === DiscountType.CONTRACT) {
        if (!customer?.contractDiscountPercentage) continue;
      }

      // Check loyalty
      if (rule.type === DiscountType.LOYALTY) {
        if (!customer?.loyaltyTier) continue;
      }

      applicable.push(rule);
    }

    // Add manual discounts from input
    if (input.manualDiscounts && context?.canApplyDiscount) {
      for (const manual of input.manualDiscounts) {
        // Check max discount allowed
        if (manual.percentage && manual.percentage > context.maxDiscountPercentage) {
          continue;
        }

        applicable.push({
          id: this.generateId(),
          tenantId: context.tenantId,
          type: manual.type,
          name: `Manual: ${manual.reason}`,
          percentage: manual.percentage,
          fixedAmount: manual.fixedAmount,
          isActive: true,
          stackable: true,
          priority: 999,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return applicable;
  }

  // =====================================================
  // Story 14-1: Bérlés Kiadás Wizard
  // =====================================================

  /**
   * Create rental (checkout) - Story 14-1
   */
  async checkout(
    input: RentalCheckoutDto,
    equipment: EquipmentPricingInfo,
    customer: CustomerInfo,
    context: RentalPermissionContext
  ): Promise<Rental> {
    const validated = validateRentalCheckout(input);

    const startDate = new Date(validated.startDate);
    const expectedReturnDate = new Date(validated.expectedReturnDate);

    if (expectedReturnDate <= startDate) {
      throw new BadRequestException('Expected return date must be after start date');
    }

    // Calculate pricing
    const priceResult = this.calculatePrice(
      {
        equipmentId: validated.equipmentId,
        startDate: validated.startDate,
        endDate: validated.expectedReturnDate,
        customerId: validated.customerId,
      },
      equipment,
      customer,
      context
    );

    const now = new Date();
    const rental: Rental = {
      id: this.generateId(),
      tenantId: context.tenantId,
      locationId: context.locationId,
      rentalNumber: this.generateRentalNumber(context.tenantId),
      customerId: validated.customerId,
      customerName: customer.name,
      equipmentId: validated.equipmentId,
      equipmentName: equipment.name,
      status: RentalStatus.DRAFT,
      startDate,
      expectedReturnDate,
      originalReturnDate: expectedReturnDate,
      extensionCount: 0,
      pricing: priceResult.pricing,
      discounts: priceResult.appliedDiscounts.map((d) => ({
        id: this.generateId(),
        type: d.type,
        name: d.name,
        calculatedAmount: d.amount,
        appliedBy: context.userId,
        appliedAt: now,
      })),
      depositAmount: validated.depositAmount,
      depositStatus: DepositStatus.PENDING,
      pickupChecklistVerified: false,
      returnChecklistVerified: false,
      notes: validated.notes,
      createdBy: context.userId,
      createdAt: now,
      updatedAt: now,
    };

    this.rentals.set(rental.id, rental);
    this.recordHistory(rental.id, RentalEventType.CREATED, undefined, undefined, context.userId, 'Rental created');

    return rental;
  }

  /**
   * Confirm pickup - Story 14-1
   */
  async confirmPickup(input: ConfirmPickupDto, context: RentalPermissionContext): Promise<Rental> {
    const validated = validateConfirmPickup(input);
    const rental = await this.findById(validated.rentalId, context);

    if (rental.status !== RentalStatus.DRAFT) {
      throw new ConflictException('Can only confirm pickup for DRAFT rentals');
    }

    if (!validated.accessoryChecklistVerified) {
      throw new BadRequestException('Accessory checklist must be verified before pickup');
    }

    if (!validated.depositCollected) {
      throw new BadRequestException('Deposit must be collected before pickup');
    }

    rental.status = RentalStatus.ACTIVE;
    rental.pickupChecklistVerified = true;
    rental.depositStatus = DepositStatus.COLLECTED;
    rental.pickedUpBy = context.userId;
    rental.updatedAt = new Date();

    this.rentals.set(rental.id, rental);
    this.recordHistory(
      rental.id,
      RentalEventType.PICKED_UP,
      RentalStatus.DRAFT,
      RentalStatus.ACTIVE,
      context.userId,
      `Equipment picked up. Deposit: ${validated.depositMethod || 'N/A'}`
    );

    return rental;
  }

  // =====================================================
  // Story 14-4: Bérlés Visszavétel Workflow
  // =====================================================

  /**
   * Process rental return - Story 14-4
   */
  async processReturn(input: RentalReturnDto, context: RentalPermissionContext): Promise<Rental> {
    const validated = validateRentalReturn(input);
    const rental = await this.findById(validated.rentalId, context);

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new ConflictException('Can only return ACTIVE or OVERDUE rentals');
    }

    if (!validated.accessoryChecklistVerified) {
      throw new BadRequestException('Accessory checklist must be verified');
    }

    const returnDate = new Date(validated.returnDate);

    // Calculate late fee if overdue
    let lateFeeDetails: LateFeeDetails | undefined;
    if (returnDate > rental.expectedReturnDate) {
      lateFeeDetails = this.calculateLateFee(rental, returnDate);
      rental.lateFee = lateFeeDetails;
      rental.pricing.lateFeeAmount = lateFeeDetails.amount;
      rental.pricing.grandTotal = rental.pricing.totalAmount + lateFeeDetails.amount;
    }

    // Handle deposit
    switch (validated.depositAction) {
      case 'RETURN':
        rental.depositStatus = DepositStatus.RETURNED;
        break;
      case 'RETAIN_PARTIAL':
        rental.depositStatus = DepositStatus.PARTIALLY_RETAINED;
        break;
      case 'RETAIN_FULL':
        rental.depositStatus = DepositStatus.FULLY_RETAINED;
        break;
    }

    rental.status = RentalStatus.RETURNED;
    rental.actualReturnDate = returnDate;
    rental.returnChecklistVerified = true;
    rental.returnedBy = context.userId;
    rental.updatedAt = new Date();

    if (validated.damageNotes) {
      rental.notes = rental.notes
        ? `${rental.notes}\n\nReturn notes: ${validated.damageNotes}`
        : `Return notes: ${validated.damageNotes}`;
    }

    this.rentals.set(rental.id, rental);

    const previousStatus = rental.lateFee ? RentalStatus.OVERDUE : RentalStatus.ACTIVE;
    this.recordHistory(
      rental.id,
      RentalEventType.RETURNED,
      previousStatus,
      RentalStatus.RETURNED,
      context.userId,
      `Equipment returned. Condition: ${validated.equipmentCondition}. Deposit: ${validated.depositAction}`
    );

    if (lateFeeDetails && lateFeeDetails.amount > 0) {
      this.recordHistory(
        rental.id,
        RentalEventType.LATE_FEE_APPLIED,
        undefined,
        undefined,
        context.userId,
        `Late fee applied: ${lateFeeDetails.amount} Ft (${lateFeeDetails.daysOverdue} days overdue)`
      );
    }

    return rental;
  }

  // =====================================================
  // Story 14-5: Bérlés Hosszabbítás
  // =====================================================

  /**
   * Extend rental - Story 14-5
   */
  async extendRental(
    input: RentalExtensionDto,
    equipment: EquipmentPricingInfo,
    context: RentalPermissionContext
  ): Promise<Rental> {
    const validated = validateRentalExtension(input);
    const rental = await this.findById(validated.rentalId, context);

    if (rental.status !== RentalStatus.ACTIVE && rental.status !== RentalStatus.OVERDUE) {
      throw new ConflictException('Can only extend ACTIVE or OVERDUE rentals');
    }

    const newReturnDate = new Date(validated.newReturnDate);
    if (newReturnDate <= rental.expectedReturnDate) {
      throw new BadRequestException('New return date must be after current expected return date');
    }

    const previousReturnDate = rental.expectedReturnDate;
    const additionalDays = Math.ceil(
      (newReturnDate.getTime() - previousReturnDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate additional amount
    const additionalPricing = this.calculatePrice(
      {
        equipmentId: rental.equipmentId,
        startDate: previousReturnDate,
        endDate: newReturnDate,
      },
      equipment,
      undefined,
      context
    );

    const extension: RentalExtension = {
      id: this.generateId(),
      rentalId: rental.id,
      previousReturnDate,
      newReturnDate,
      additionalDays,
      additionalAmount: additionalPricing.pricing.totalAmount,
      reason: validated.reason,
      selfService: validated.selfService,
      paymentStatus: 'PENDING',
      createdAt: new Date(),
    };

    this.extensions.push(extension);

    // Update rental
    rental.expectedReturnDate = newReturnDate;
    rental.extensionCount++;

    // Recalculate full pricing
    const fullPricing = this.calculatePrice(
      {
        equipmentId: rental.equipmentId,
        startDate: rental.startDate,
        endDate: newReturnDate,
      },
      equipment,
      undefined,
      context
    );

    rental.pricing = fullPricing.pricing;

    // Clear overdue status if was overdue
    if (rental.status === RentalStatus.OVERDUE) {
      rental.status = RentalStatus.ACTIVE;
      rental.lateFee = undefined;
      rental.pricing.lateFeeAmount = 0;
      rental.pricing.grandTotal = rental.pricing.totalAmount;
    }

    rental.updatedAt = new Date();
    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.EXTENDED,
      undefined,
      undefined,
      context.userId,
      `Rental extended by ${additionalDays} days. New return date: ${newReturnDate.toISOString().split('T')[0]}. Additional: ${additionalPricing.pricing.totalAmount} Ft`
    );

    return rental;
  }

  // =====================================================
  // Story 14-6: Késedelmi Díj Számítás
  // =====================================================

  /**
   * Calculate late fee - Story 14-6
   */
  calculateLateFee(rental: Rental, returnDate: Date): LateFeeDetails {
    const expectedReturn = new Date(rental.expectedReturnDate);
    const gracePeriodMs = this.lateFeeConfig.gracePeriodHours * 60 * 60 * 1000;
    const effectiveReturnDate = new Date(returnDate.getTime() - gracePeriodMs);

    if (effectiveReturnDate <= expectedReturn) {
      return {
        daysOverdue: 0,
        dailyLateFeeRate: 0,
        amount: 0,
        isWaived: false,
        calculatedAt: new Date(),
      };
    }

    const overdueMs = effectiveReturnDate.getTime() - expectedReturn.getTime();
    const daysOverdue = Math.ceil(overdueMs / (1000 * 60 * 60 * 24));

    const dailyLateFeeRate = Math.round(
      rental.pricing.dailyRate * (this.lateFeeConfig.dailyFeePercentage / 100)
    );

    let amount = dailyLateFeeRate * daysOverdue;

    // Apply max cap
    const maxFee = Math.round(
      rental.pricing.grossAmount * (this.lateFeeConfig.maxFeePercentage / 100)
    );

    if (amount > maxFee) {
      amount = maxFee;
    }

    return {
      daysOverdue,
      dailyLateFeeRate,
      amount,
      maxLateFee: maxFee,
      isWaived: false,
      calculatedAt: new Date(),
    };
  }

  /**
   * Waive late fees - Story 14-6
   */
  async waiveLateFees(input: WaiveLateFeesDto, context: RentalPermissionContext): Promise<Rental> {
    const validated = validateWaiveLateFees(input);

    if (!context.canWaiveLateFees && !this.lateFeeConfig.waiverRoles.includes(context.userRole)) {
      throw new BadRequestException('You do not have permission to waive late fees');
    }

    const rental = await this.findById(validated.rentalId, context);

    if (!rental.lateFee || rental.lateFee.amount === 0) {
      throw new BadRequestException('No late fees to waive');
    }

    rental.lateFee.isWaived = true;
    rental.lateFee.waiverReason = validated.reason;
    rental.lateFee.waivedBy = context.userId;
    rental.pricing.lateFeeAmount = 0;
    rental.pricing.grandTotal = rental.pricing.totalAmount;
    rental.updatedAt = new Date();

    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.LATE_FEE_WAIVED,
      undefined,
      undefined,
      context.userId,
      `Late fee waived: ${rental.lateFee.amount} Ft. Reason: ${validated.reason}`
    );

    return rental;
  }

  /**
   * Check and update overdue rentals - Story 14-6
   */
  async checkOverdueRentals(context: RentalPermissionContext): Promise<Rental[]> {
    const now = new Date();
    const gracePeriodMs = this.lateFeeConfig.gracePeriodHours * 60 * 60 * 1000;
    const nowWithGrace = new Date(now.getTime() - gracePeriodMs);

    const overdueRentals: Rental[] = [];

    for (const rental of this.rentals.values()) {
      if (rental.tenantId !== context.tenantId) continue;
      if (rental.status !== RentalStatus.ACTIVE) continue;

      if (nowWithGrace > rental.expectedReturnDate) {
        rental.status = RentalStatus.OVERDUE;
        rental.lateFee = this.calculateLateFee(rental, now);
        rental.pricing.lateFeeAmount = rental.lateFee.amount;
        rental.pricing.grandTotal = rental.pricing.totalAmount + rental.lateFee.amount;
        rental.updatedAt = now;

        this.rentals.set(rental.id, rental);

        this.recordHistory(
          rental.id,
          RentalEventType.BECAME_OVERDUE,
          RentalStatus.ACTIVE,
          RentalStatus.OVERDUE,
          'SYSTEM',
          `Rental became overdue. Days overdue: ${rental.lateFee.daysOverdue}`
        );

        overdueRentals.push(rental);
      }
    }

    return overdueRentals;
  }

  // =====================================================
  // Story 14-3: Kedvezmény Kezelés
  // =====================================================

  /**
   * Create discount rule - Story 14-3
   */
  async createDiscountRule(
    input: CreateDiscountRuleDto,
    context: RentalPermissionContext
  ): Promise<DiscountRule> {
    const validated = validateCreateDiscountRule(input);

    const now = new Date();
    const rule: DiscountRule = {
      id: this.generateId(),
      tenantId: context.tenantId,
      ...validated,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    this.discountRules.set(rule.id, rule);
    return rule;
  }

  /**
   * Apply discount to rental - Story 14-3
   */
  async applyDiscount(
    input: ApplyDiscountDto,
    _equipment: EquipmentPricingInfo,
    context: RentalPermissionContext
  ): Promise<Rental> {
    const validated = validateApplyDiscount(input);

    if (!context.canApplyDiscount) {
      throw new BadRequestException('You do not have permission to apply discounts');
    }

    // Check max discount percentage
    if (validated.percentage && validated.percentage > context.maxDiscountPercentage) {
      throw new BadRequestException(
        `Discount percentage exceeds your maximum allowed (${context.maxDiscountPercentage}%)`
      );
    }

    const rental = await this.findById(validated.rentalId, context);

    if (rental.status === RentalStatus.RETURNED || rental.status === RentalStatus.CANCELLED) {
      throw new ConflictException('Cannot apply discount to completed rentals');
    }

    // Calculate discount amount
    let calculatedAmount = 0;
    if (validated.percentage) {
      calculatedAmount = Math.round(rental.pricing.grossAmount * (validated.percentage / 100));
    } else if (validated.fixedAmount) {
      calculatedAmount = validated.fixedAmount;
    }

    const now = new Date();
    const discount: AppliedDiscount = {
      id: this.generateId(),
      type: validated.type,
      name: validated.name,
      percentage: validated.percentage,
      fixedAmount: validated.fixedAmount,
      calculatedAmount,
      appliedBy: context.userId,
      reason: validated.reason,
      appliedAt: now,
    };

    rental.discounts.push(discount);

    // Recalculate pricing (round VAT to avoid floating point precision issues)
    const totalDiscount = rental.discounts.reduce((sum, d) => sum + d.calculatedAmount, 0);
    rental.pricing.discountAmount = totalDiscount;
    rental.pricing.netAmount = Math.max(0, rental.pricing.grossAmount - totalDiscount);
    rental.pricing.vatAmount = Math.round(rental.pricing.netAmount * this.VAT_RATE);
    rental.pricing.totalAmount = rental.pricing.netAmount + rental.pricing.vatAmount;
    rental.pricing.grandTotal = rental.pricing.totalAmount + rental.pricing.lateFeeAmount;

    rental.updatedAt = now;
    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.DISCOUNT_APPLIED,
      undefined,
      undefined,
      context.userId,
      `Discount applied: ${validated.name} (${calculatedAmount} Ft)`
    );

    return rental;
  }

  /**
   * Remove discount from rental - Story 14-3
   */
  async removeDiscount(
    rentalId: string,
    discountId: string,
    context: RentalPermissionContext
  ): Promise<Rental> {
    const rental = await this.findById(rentalId, context);

    const discountIndex = rental.discounts.findIndex((d) => d.id === discountId);
    if (discountIndex === -1) {
      throw new NotFoundException('Discount not found');
    }

    const removedArray = rental.discounts.splice(discountIndex, 1);
    const removed = removedArray[0];
    if (!removed) {
      // This should never happen since we verified discountIndex !== -1
      throw new Error('Unexpected error: removed discount was undefined');
    }

    // Recalculate pricing (round VAT to avoid floating point precision issues)
    const totalDiscount = rental.discounts.reduce((sum, d) => sum + d.calculatedAmount, 0);
    rental.pricing.discountAmount = totalDiscount;
    rental.pricing.netAmount = Math.max(0, rental.pricing.grossAmount - totalDiscount);
    rental.pricing.vatAmount = Math.round(rental.pricing.netAmount * this.VAT_RATE);
    rental.pricing.totalAmount = rental.pricing.netAmount + rental.pricing.vatAmount;
    rental.pricing.grandTotal = rental.pricing.totalAmount + rental.pricing.lateFeeAmount;

    rental.updatedAt = new Date();
    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.DISCOUNT_REMOVED,
      undefined,
      undefined,
      context.userId,
      `Discount removed: ${removed.name} (${removed.calculatedAmount} Ft)`
    );

    return rental;
  }

  // =====================================================
  // Story 14-7: Bérlés Státuszok és Audit
  // =====================================================

  /**
   * Cancel rental - Story 14-7
   */
  async cancel(input: CancelRentalDto, context: RentalPermissionContext): Promise<Rental> {
    const validated = validateCancelRental(input);
    const rental = await this.findById(validated.rentalId, context);

    if (rental.status !== RentalStatus.DRAFT) {
      throw new ConflictException('Can only cancel DRAFT rentals. Use return for active rentals.');
    }

    rental.status = RentalStatus.CANCELLED;
    rental.notes = rental.notes
      ? `${rental.notes}\n\nCancellation: ${validated.reason}`
      : `Cancellation: ${validated.reason}`;
    rental.updatedAt = new Date();

    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.CANCELLED,
      RentalStatus.DRAFT,
      RentalStatus.CANCELLED,
      context.userId,
      `Rental cancelled. Reason: ${validated.reason}`
    );

    return rental;
  }

  /**
   * Add note to rental - Story 14-7
   */
  async addNote(input: AddNoteDto, context: RentalPermissionContext): Promise<Rental> {
    const validated = validateAddNote(input);
    const rental = await this.findById(validated.rentalId, context);

    rental.notes = rental.notes
      ? `${rental.notes}\n\n[${new Date().toISOString()}] ${validated.note}`
      : `[${new Date().toISOString()}] ${validated.note}`;
    rental.updatedAt = new Date();

    this.rentals.set(rental.id, rental);

    this.recordHistory(
      rental.id,
      RentalEventType.NOTE_ADDED,
      undefined,
      undefined,
      context.userId,
      'Note added'
    );

    return rental;
  }

  /**
   * Get rental history - Story 14-7
   */
  async getHistory(rentalId: string, context: RentalPermissionContext): Promise<RentalHistoryEntry[]> {
    await this.findById(rentalId, context);

    return this.history
      .filter((h) => h.rentalId === rentalId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  // =====================================================
  // Common Operations
  // =====================================================

  /**
   * Find rental by ID
   */
  async findById(rentalId: string, context: RentalPermissionContext): Promise<Rental> {
    const rental = this.rentals.get(rentalId);

    if (!rental || rental.tenantId !== context.tenantId) {
      throw new NotFoundException(`Rental ${rentalId} not found`);
    }

    return rental;
  }

  /**
   * List rentals with filters
   */
  async findMany(filter: RentalFilterDto, context: RentalPermissionContext): Promise<RentalListResult> {
    const validated = validateRentalFilter(filter);
    let items = Array.from(this.rentals.values());

    // Tenant isolation
    items = items.filter((r) => r.tenantId === context.tenantId);

    // Apply filters
    if (validated.status) {
      items = items.filter((r) => r.status === validated.status);
    }
    if (validated.customerId) {
      items = items.filter((r) => r.customerId === validated.customerId);
    }
    if (validated.equipmentId) {
      items = items.filter((r) => r.equipmentId === validated.equipmentId);
    }
    if (validated.startDateFrom) {
      items = items.filter((r) => r.startDate >= validated.startDateFrom!);
    }
    if (validated.startDateTo) {
      items = items.filter((r) => r.startDate <= validated.startDateTo!);
    }
    if (validated.overdueOnly) {
      items = items.filter((r) => r.status === RentalStatus.OVERDUE);
    }
    if (validated.search) {
      const searchLower = validated.search.toLowerCase();
      items = items.filter(
        (r) =>
          r.rentalNumber.toLowerCase().includes(searchLower) ||
          r.customerName.toLowerCase().includes(searchLower) ||
          r.equipmentName.toLowerCase().includes(searchLower)
      );
    }

    // Sort by start date descending
    items.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    // Pagination
    const total = items.length;
    const page = validated.page;
    const pageSize = validated.pageSize;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      rentals: paginatedItems,
      total,
      page,
      pageSize,
      hasMore: startIndex + pageSize < total,
    };
  }

  /**
   * Get rental statistics
   */
  async getStatistics(context: RentalPermissionContext): Promise<RentalStatistics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const tenantRentals = Array.from(this.rentals.values()).filter(
      (r) => r.tenantId === context.tenantId
    );

    const stats: RentalStatistics = {
      totalRentals: tenantRentals.length,
      activeRentals: tenantRentals.filter((r) => r.status === RentalStatus.ACTIVE).length,
      overdueRentals: tenantRentals.filter((r) => r.status === RentalStatus.OVERDUE).length,
      returnedToday: tenantRentals.filter(
        (r) => r.status === RentalStatus.RETURNED && r.actualReturnDate && r.actualReturnDate >= today && r.actualReturnDate < tomorrow
      ).length,
      dueTodayCount: tenantRentals.filter(
        (r) =>
          (r.status === RentalStatus.ACTIVE || r.status === RentalStatus.OVERDUE) &&
          r.expectedReturnDate >= today &&
          r.expectedReturnDate < tomorrow
      ).length,
      totalRevenue: tenantRentals
        .filter((r) => r.status === RentalStatus.RETURNED)
        .reduce((sum, r) => sum + r.pricing.grandTotal, 0),
      averageRentalDays: 0,
      averageRentalValue: 0,
      topEquipment: [],
      byStatus: {
        [RentalStatus.DRAFT]: 0,
        [RentalStatus.ACTIVE]: 0,
        [RentalStatus.EXTENDED]: 0,
        [RentalStatus.OVERDUE]: 0,
        [RentalStatus.RETURNED]: 0,
        [RentalStatus.CANCELLED]: 0,
        [RentalStatus.DISPUTED]: 0,
      },
    };

    // Count by status
    for (const rental of tenantRentals) {
      stats.byStatus[rental.status]++;
    }

    // Calculate averages
    const completedRentals = tenantRentals.filter((r) => r.status === RentalStatus.RETURNED);
    if (completedRentals.length > 0) {
      const totalDays = completedRentals.reduce((sum, r) => sum + r.pricing.durationDays, 0);
      const totalValue = completedRentals.reduce((sum, r) => sum + r.pricing.grandTotal, 0);
      stats.averageRentalDays = Math.round(totalDays / completedRentals.length);
      stats.averageRentalValue = Math.round(totalValue / completedRentals.length);
    }

    // Top equipment
    const equipmentCounts = new Map<string, { name: string; count: number }>();
    for (const rental of tenantRentals) {
      const existing = equipmentCounts.get(rental.equipmentId);
      if (existing) {
        existing.count++;
      } else {
        equipmentCounts.set(rental.equipmentId, { name: rental.equipmentName, count: 1 });
      }
    }

    stats.topEquipment = Array.from(equipmentCounts.entries())
      .map(([id, data]) => ({ equipmentId: id, equipmentName: data.name, rentalCount: data.count }))
      .sort((a, b) => b.rentalCount - a.rentalCount)
      .slice(0, 5);

    return stats;
  }

  /**
   * Record history entry
   */
  private recordHistory(
    rentalId: string,
    eventType: RentalEventType,
    previousStatus: RentalStatus | undefined,
    newStatus: RentalStatus | undefined,
    performedBy: string,
    description: string
  ): void {
    this.history.push({
      id: this.generateId(),
      rentalId,
      eventType,
      previousStatus,
      newStatus,
      performedBy,
      description,
      performedAt: new Date(),
    });
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.rentals.clear();
    this.discountRules.clear();
    this.extensions = [];
    this.history = [];
    this.rentalCounter = 0;
  }

  /**
   * Get discount rules (for testing)
   */
  getDiscountRules(context: RentalPermissionContext): DiscountRule[] {
    return Array.from(this.discountRules.values()).filter((r) => r.tenantId === context.tenantId);
  }
}
