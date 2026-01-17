/**
 * @kgc/rental-checkout - DepositService
 * Story 16-1: Kaució felvétel (készpénz/kártya)
 *
 * TDD GREEN PHASE - Implementáció a tesztek alapján
 */

import { Injectable } from '@nestjs/common';
import {
  DepositStatus,
  DepositRetentionReason,
  IDeposit,
  IDepositCalculationResult,
} from '../interfaces/deposit.interface';
import { CreateDepositDto, CreateDepositSchema } from '../dto/deposit.dto';

// Constants
const DEPOSIT_PERCENTAGE = 0.1; // 10% of equipment value
const MIN_DEPOSIT = 5000; // 5.000 Ft minimum
const MAX_DEPOSIT = 500000; // 500.000 Ft maximum
const MAX_ALLOWED_DEPOSIT = 1000000; // 1.000.000 Ft validation max
const ROUNDING_UNIT = 1000; // Round to nearest 1.000 Ft

/**
 * Repository interface for Deposit entity
 */
export interface IDepositRepository {
  create(data: Partial<IDeposit>): Promise<IDeposit>;
  findById(id: string): Promise<IDeposit | null>;
  findByRentalId(rentalId: string, tenantId: string): Promise<IDeposit | null>;
  update(id: string, data: Partial<IDeposit>): Promise<IDeposit>;
}

/**
 * Rental service interface (from @kgc/rental-core)
 */
export interface IRentalService {
  findById(id: string): Promise<{ id: string; tenantId: string; status: string; equipmentValue: number } | null>;
  isActive(id: string): Promise<boolean>;
}

/**
 * Partner service interface
 */
export interface IPartnerService {
  findById(id: string): Promise<{ id: string; tenantId: string; name: string } | null>;
  isRegularCustomer(partnerId: string, tenantId: string): Promise<boolean>;
}

/**
 * Audit service interface (from @kgc/audit)
 */
export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

/**
 * Deposit Service - Kaució kezelés
 *
 * Felelős a kaució felvételéért, kalkulációért és validációért.
 */
@Injectable()
export class DepositService {
  constructor(
    private readonly depositRepository: IDepositRepository,
    private readonly rentalService: IRentalService,
    private readonly partnerService: IPartnerService,
    private readonly auditService: IAuditService,
  ) {}

  /**
   * Javasolt kaució összeg kalkulálása
   *
   * Szabályok:
   * - Alap: bérgép érték 10%-a
   * - Minimum: 5.000 Ft
   * - Maximum: 500.000 Ft
   * - Törzsvevő: 0 Ft
   * - Kerekítés: 1.000 Ft-ra
   */
  async calculateSuggestedAmount(
    rentalId: string,
    partnerId: string,
    tenantId: string,
  ): Promise<IDepositCalculationResult> {
    // Get rental details
    const rental = await this.rentalService.findById(rentalId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    // Check regular customer status
    const isRegular = await this.partnerService.isRegularCustomer(partnerId, tenantId);
    if (isRegular) {
      return {
        suggestedAmount: 0,
        depositRequired: false,
        regularCustomerDiscount: true,
        reason: 'Törzsvevő - kaució nem szükséges',
      };
    }

    // Calculate deposit (10% of equipment value)
    let suggested = Math.round(rental.equipmentValue * DEPOSIT_PERCENTAGE);

    // Round to nearest 1.000 Ft
    suggested = Math.floor(suggested / ROUNDING_UNIT) * ROUNDING_UNIT;

    // Apply minimum
    if (suggested < MIN_DEPOSIT && rental.equipmentValue > 0) {
      suggested = MIN_DEPOSIT;
    }

    // Apply maximum
    if (suggested > MAX_DEPOSIT) {
      suggested = MAX_DEPOSIT;
    }

    return {
      suggestedAmount: suggested,
      depositRequired: true,
      regularCustomerDiscount: false,
      reason: `Kaució: ${suggested.toLocaleString('hu-HU')} Ft (bérgép érték ${DEPOSIT_PERCENTAGE * 100}%-a)`,
    };
  }

  /**
   * Kaució felvétel (készpénz vagy bankkártya)
   *
   * @param input - CreateDepositDto validált input
   * @param tenantId - Tenant azonosító
   * @param userId - Felvevő user azonosító
   * @returns Létrehozott kaució rekord
   */
  async collect(
    input: CreateDepositDto,
    tenantId: string,
    userId: string,
  ): Promise<IDeposit> {
    // Validate input with Zod
    const validationResult = CreateDepositSchema.safeParse(input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new Error(firstError?.message ?? 'Érvénytelen input');
    }

    const { rentalId, partnerId, amount, paymentMethod, notes } = validationResult.data;

    // Additional validation for amount
    if (amount < 0) {
      throw new Error('Kaució összeg nem lehet negatív');
    }
    if (amount > MAX_ALLOWED_DEPOSIT) {
      throw new Error('Kaució összeg maximum 1.000.000 Ft');
    }

    // Check rental exists and is active
    const rental = await this.rentalService.findById(rentalId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    // Tenant isolation check
    if (rental.tenantId !== tenantId) {
      throw new Error('Hozzáférés megtagadva');
    }

    // Check rental is active
    const isActive = await this.rentalService.isActive(rentalId);
    if (!isActive) {
      throw new Error('Bérlés nem aktív');
    }

    // Check partner exists
    const partner = await this.partnerService.findById(partnerId);
    if (!partner) {
      throw new Error('Partner nem található');
    }

    // Check if deposit already exists for this rental
    const existingDeposit = await this.depositRepository.findByRentalId(rentalId, tenantId);
    if (existingDeposit) {
      throw new Error('Már létezik kaució ehhez a bérléshez');
    }

    // Create deposit record
    const deposit = await this.depositRepository.create({
      tenantId,
      rentalId,
      partnerId,
      amount,
      status: DepositStatus.COLLECTED,
      paymentMethod,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'deposit_collected',
      entityType: 'deposit',
      entityId: deposit.id,
      userId,
      tenantId,
      metadata: {
        amount,
        paymentMethod,
        rentalId,
        partnerId,
        notes,
      },
    });

    return deposit;
  }

  /**
   * Kaució lekérdezés ID alapján
   */
  async findById(depositId: string, tenantId: string): Promise<IDeposit | null> {
    const deposit = await this.depositRepository.findById(depositId);
    if (!deposit || deposit.tenantId !== tenantId) {
      return null;
    }
    return deposit;
  }

  /**
   * Kaució lekérdezés bérlés alapján
   */
  async findByRentalId(rentalId: string, tenantId: string): Promise<IDeposit | null> {
    return this.depositRepository.findByRentalId(rentalId, tenantId);
  }

  /**
   * Kaució visszaadás (teljes összeg)
   *
   * Story 16-3: Kaució visszaadás
   *
   * @param depositId - Kaució azonosító
   * @param tenantId - Tenant azonosító
   * @param userId - Végrehajtó user azonosító
   * @returns Frissített kaució rekord
   */
  async release(depositId: string, tenantId: string, userId: string): Promise<IDeposit> {
    // Find deposit with tenant isolation
    const deposit = await this.findById(depositId, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    // Check valid status for release
    const releasableStatuses = [DepositStatus.COLLECTED, DepositStatus.HELD];
    if (!releasableStatuses.includes(deposit.status)) {
      throw new Error('Kaució nem adható vissza');
    }

    const previousStatus = deposit.status;

    // Update deposit status
    const updatedDeposit = await this.depositRepository.update(depositId, {
      status: DepositStatus.RELEASED,
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'deposit_released',
      entityType: 'deposit',
      entityId: depositId,
      userId,
      tenantId,
      metadata: {
        releasedAmount: deposit.amount,
        previousStatus,
        paymentMethod: deposit.paymentMethod,
        myposTransactionId: deposit.myposTransactionId,
      },
    });

    return updatedDeposit;
  }

  /**
   * Kaució részleges visszaadás (visszatartással)
   *
   * Story 16-3: Kaució visszaadás
   *
   * @param depositId - Kaució azonosító
   * @param retainedAmount - Visszatartott összeg
   * @param description - Visszatartás indoklása (kötelező)
   * @param tenantId - Tenant azonosító
   * @param userId - Végrehajtó user azonosító
   * @returns Frissített kaució rekord
   */
  async releasePartial(
    depositId: string,
    retainedAmount: number,
    description: string,
    tenantId: string,
    userId: string,
  ): Promise<IDeposit> {
    // Validate description
    if (!description || description.trim().length === 0) {
      throw new Error('Indoklás kötelező részleges visszatartás esetén');
    }

    // Find deposit with tenant isolation
    const deposit = await this.findById(depositId, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    // Check valid status for release
    const releasableStatuses = [DepositStatus.COLLECTED, DepositStatus.HELD];
    if (!releasableStatuses.includes(deposit.status)) {
      throw new Error('Kaució nem adható vissza');
    }

    // Validate retained amount
    if (retainedAmount > deposit.amount) {
      throw new Error('Visszatartott összeg nem lehet nagyobb mint a kaució');
    }

    if (retainedAmount < 0) {
      throw new Error('Visszatartott összeg nem lehet negatív');
    }

    const previousStatus = deposit.status;
    const releasedAmount = deposit.amount - retainedAmount;

    // Update deposit status
    const updatedDeposit = await this.depositRepository.update(depositId, {
      status: DepositStatus.PARTIALLY_RETAINED,
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'deposit_partially_retained',
      entityType: 'deposit',
      entityId: depositId,
      userId,
      tenantId,
      metadata: {
        originalAmount: deposit.amount,
        retainedAmount,
        releasedAmount,
        previousStatus,
        description,
        paymentMethod: deposit.paymentMethod,
        myposTransactionId: deposit.myposTransactionId,
      },
    });

    return updatedDeposit;
  }

  /**
   * Kaució teljes visszatartása (sérülés, elvesztés)
   *
   * Story 16-4: Kaució visszatartás sérülés
   *
   * @param depositId - Kaució azonosító
   * @param reason - Visszatartás oka
   * @param description - Részletes leírás (kötelező)
   * @param tenantId - Tenant azonosító
   * @param userId - Végrehajtó user azonosító
   * @returns Frissített kaució rekord
   */
  async retain(
    depositId: string,
    reason: DepositRetentionReason,
    description: string,
    tenantId: string,
    userId: string,
  ): Promise<IDeposit> {
    // Validate description
    if (!description || description.trim().length === 0) {
      throw new Error('Leírás kötelező');
    }

    // Find deposit with tenant isolation
    const deposit = await this.findById(depositId, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    // Check valid status for retention
    const retainableStatuses = [DepositStatus.COLLECTED, DepositStatus.HELD];
    if (!retainableStatuses.includes(deposit.status)) {
      throw new Error('Kaució nem tartható vissza');
    }

    const previousStatus = deposit.status;

    // Update deposit status
    const updatedDeposit = await this.depositRepository.update(depositId, {
      status: DepositStatus.RETAINED,
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'deposit_retained',
      entityType: 'deposit',
      entityId: depositId,
      userId,
      tenantId,
      metadata: {
        retainedAmount: deposit.amount,
        reason,
        description,
        previousStatus,
        paymentMethod: deposit.paymentMethod,
        myposTransactionId: deposit.myposTransactionId,
      },
    });

    return updatedDeposit;
  }

  /**
   * Kaució részleges visszatartása (kisebb sérülés, díjak)
   *
   * Story 16-4: Kaució visszatartás sérülés
   *
   * @param depositId - Kaució azonosító
   * @param retainedAmount - Visszatartott összeg
   * @param reason - Visszatartás oka
   * @param description - Részletes leírás (kötelező)
   * @param tenantId - Tenant azonosító
   * @param userId - Végrehajtó user azonosító
   * @returns Frissített kaució rekord
   */
  async retainPartial(
    depositId: string,
    retainedAmount: number,
    reason: DepositRetentionReason,
    description: string,
    tenantId: string,
    userId: string,
  ): Promise<IDeposit> {
    // Validate description
    if (!description || description.trim().length === 0) {
      throw new Error('Leírás kötelező');
    }

    // Find deposit with tenant isolation
    const deposit = await this.findById(depositId, tenantId);
    if (!deposit) {
      throw new Error('Kaució nem található');
    }

    // Check valid status for retention
    const retainableStatuses = [DepositStatus.COLLECTED, DepositStatus.HELD];
    if (!retainableStatuses.includes(deposit.status)) {
      throw new Error('Kaució nem tartható vissza');
    }

    // Validate retained amount
    if (retainedAmount > deposit.amount) {
      throw new Error('Visszatartott összeg nem lehet nagyobb mint a kaució');
    }

    if (retainedAmount < 0) {
      throw new Error('Visszatartott összeg nem lehet negatív');
    }

    const previousStatus = deposit.status;
    const releasedAmount = deposit.amount - retainedAmount;

    // Update deposit status
    const updatedDeposit = await this.depositRepository.update(depositId, {
      status: DepositStatus.PARTIALLY_RETAINED,
      updatedAt: new Date(),
    });

    // Audit log
    await this.auditService.log({
      action: 'deposit_partially_retained',
      entityType: 'deposit',
      entityId: depositId,
      userId,
      tenantId,
      metadata: {
        originalAmount: deposit.amount,
        retainedAmount,
        releasedAmount,
        reason,
        description,
        previousStatus,
        paymentMethod: deposit.paymentMethod,
        myposTransactionId: deposit.myposTransactionId,
      },
    });

    return updatedDeposit;
  }
}
