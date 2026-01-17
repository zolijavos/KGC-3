/**
 * Credit Limit Service
 * FR28: Partner credit limit kezelés
 */
import { Injectable, Inject } from '@nestjs/common';
import { CREDIT_LIMIT_REPOSITORY } from '../interfaces/credit-limit.interface';
import type {
  CreditLimit,
  SetCreditLimitInput,
  ChargeInput,
  PaymentInput,
  CreditCheckResult,
  CreditWarning,
  CreditTransaction,
  ICreditLimitRepository,
} from '../interfaces/credit-limit.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type { IPartnerRepository } from '../interfaces/partner.interface';

@Injectable()
export class CreditLimitService {
  constructor(
    @Inject(CREDIT_LIMIT_REPOSITORY)
    private readonly repository: ICreditLimitRepository,
    @Inject(PARTNER_REPOSITORY)
    private readonly partnerRepository: IPartnerRepository
  ) {}

  /**
   * Hitelkeret beállítása partnernek
   */
  async setCreditLimit(input: SetCreditLimitInput): Promise<CreditLimit> {
    // Validálás
    if (input.creditLimit < 0) {
      throw new Error('Hitelkeret nem lehet negatív');
    }

    // Partner ellenőrzés
    const partner = await this.partnerRepository.findById(input.partnerId, input.tenantId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    return this.repository.upsert(input);
  }

  /**
   * Hitelkeret ellenőrzés (bérlés előtt)
   */
  async checkCredit(
    partnerId: string,
    tenantId: string,
    amount: number
  ): Promise<CreditCheckResult> {
    // Validate amount is positive
    if (amount <= 0) {
      throw new Error('Összeg pozitív kell legyen');
    }

    const creditLimit = await this.repository.findByPartner(partnerId, tenantId);

    if (!creditLimit) {
      return {
        allowed: false,
        partnerId,
        creditLimit: 0,
        currentBalance: 0,
        availableCredit: 0,
        requestedAmount: amount,
        reason: 'NO_CREDIT_LIMIT',
      };
    }

    // Státusz ellenőrzés
    if (creditLimit.status === 'SUSPENDED') {
      return {
        allowed: false,
        partnerId,
        creditLimit: creditLimit.creditLimit,
        currentBalance: creditLimit.currentBalance,
        availableCredit: creditLimit.availableCredit,
        requestedAmount: amount,
        reason: 'SUSPENDED',
      };
    }

    if (creditLimit.status === 'INACTIVE') {
      return {
        allowed: false,
        partnerId,
        creditLimit: creditLimit.creditLimit,
        currentBalance: creditLimit.currentBalance,
        availableCredit: creditLimit.availableCredit,
        requestedAmount: amount,
        reason: 'INACTIVE',
      };
    }

    // Keret ellenőrzés
    if (amount > creditLimit.availableCredit) {
      return {
        allowed: false,
        partnerId,
        creditLimit: creditLimit.creditLimit,
        currentBalance: creditLimit.currentBalance,
        availableCredit: creditLimit.availableCredit,
        requestedAmount: amount,
        reason: 'INSUFFICIENT',
      };
    }

    // Figyelmeztetés ellenőrzés
    const newBalance = creditLimit.currentBalance + amount;
    const warning = this.getWarningStatusForBalance(creditLimit, newBalance);

    const result: CreditCheckResult = {
      allowed: true,
      partnerId,
      creditLimit: creditLimit.creditLimit,
      currentBalance: creditLimit.currentBalance,
      availableCredit: creditLimit.availableCredit,
      requestedAmount: amount,
      newBalance,
    };
    if (warning !== null && warning !== undefined) {
      result.warning = warning;
    }
    return result;
  }

  /**
   * Hitelből terhelés
   */
  async charge(input: ChargeInput): Promise<CreditLimit> {
    const creditLimit = await this.repository.findByPartner(input.partnerId, input.tenantId);

    if (!creditLimit) {
      throw new Error('Nincs hitelkeret beállítva');
    }

    // Check credit limit status before allowing charge
    if (creditLimit.status === 'SUSPENDED') {
      throw new Error('Hitelkeret felfüggesztve');
    }

    if (creditLimit.status === 'INACTIVE') {
      throw new Error('Hitelkeret inaktív');
    }

    if (input.amount > creditLimit.availableCredit) {
      throw new Error('Nincs elegendő hitelkeret');
    }

    const balanceBefore = creditLimit.currentBalance;
    const balanceAfter = balanceBefore + input.amount;

    // Tranzakció mentése
    const chargeTransaction: Omit<CreditTransaction, 'id'> = {
      creditLimitId: creditLimit.id,
      partnerId: input.partnerId,
      tenantId: input.tenantId,
      type: 'CHARGE',
      amount: input.amount,
      balanceBefore,
      balanceAfter,
      description: input.description,
      createdAt: new Date(),
      createdBy: input.createdBy,
    };
    if (input.referenceType !== undefined) {
      chargeTransaction.referenceType = input.referenceType;
    }
    if (input.referenceId !== undefined) {
      chargeTransaction.referenceId = input.referenceId;
    }
    await this.repository.saveTransaction(chargeTransaction);

    // Egyenleg frissítése
    return this.repository.update(creditLimit.id, input.tenantId, {
      currentBalance: balanceAfter,
      availableCredit: creditLimit.creditLimit - balanceAfter,
    });
  }

  /**
   * Befizetés rögzítése
   */
  async recordPayment(input: PaymentInput): Promise<CreditLimit> {
    const creditLimit = await this.repository.findByPartner(input.partnerId, input.tenantId);

    if (!creditLimit) {
      throw new Error('Nincs hitelkeret beállítva');
    }

    const balanceBefore = creditLimit.currentBalance;
    const balanceAfter = Math.max(0, balanceBefore - input.amount);

    // Tranzakció mentése (negatív összeg = befizetés)
    const paymentTransaction: Omit<CreditTransaction, 'id'> = {
      creditLimitId: creditLimit.id,
      partnerId: input.partnerId,
      tenantId: input.tenantId,
      type: 'PAYMENT',
      amount: -input.amount,
      balanceBefore,
      balanceAfter,
      description: input.description,
      createdAt: new Date(),
      createdBy: input.createdBy,
    };
    if (input.referenceType !== undefined) {
      paymentTransaction.referenceType = input.referenceType;
    }
    if (input.referenceId !== undefined) {
      paymentTransaction.referenceId = input.referenceId;
    }
    await this.repository.saveTransaction(paymentTransaction);

    // Egyenleg frissítése
    return this.repository.update(creditLimit.id, input.tenantId, {
      currentBalance: balanceAfter,
      availableCredit: creditLimit.creditLimit - balanceAfter,
    });
  }

  /**
   * Hitelkeret lekérdezése
   */
  async getCreditLimit(partnerId: string, tenantId: string): Promise<CreditLimit | null> {
    return this.repository.findByPartner(partnerId, tenantId);
  }

  /**
   * Hitelkeret felfüggesztése
   */
  async suspendCredit(partnerId: string, tenantId: string): Promise<CreditLimit> {
    const creditLimit = await this.repository.findByPartner(partnerId, tenantId);

    if (!creditLimit) {
      throw new Error('Nincs hitelkeret beállítva');
    }

    return this.repository.setStatus(partnerId, tenantId, 'SUSPENDED');
  }

  /**
   * Hitelkeret újraaktiválása
   */
  async reactivateCredit(partnerId: string, tenantId: string): Promise<CreditLimit> {
    const creditLimit = await this.repository.findByPartner(partnerId, tenantId);

    if (!creditLimit) {
      throw new Error('Nincs hitelkeret beállítva');
    }

    return this.repository.setStatus(partnerId, tenantId, 'ACTIVE');
  }

  /**
   * Tranzakció történet lekérdezése
   */
  async getTransactionHistory(
    partnerId: string,
    tenantId: string,
    limit?: number
  ): Promise<CreditTransaction[]> {
    return this.repository.getTransactions(partnerId, tenantId, limit);
  }

  /**
   * Figyelmeztetés státusz lekérdezése
   */
  getWarningStatus(creditLimit: CreditLimit): CreditWarning | null {
    return this.getWarningStatusForBalance(creditLimit, creditLimit.currentBalance);
  }

  /**
   * Figyelmeztetés számítása adott egyenleghez
   */
  private getWarningStatusForBalance(
    creditLimit: CreditLimit,
    balance: number
  ): CreditWarning | null {
    // Prevent division by zero
    if (creditLimit.creditLimit <= 0) {
      return null;
    }
    const usagePercent = Math.round((balance / creditLimit.creditLimit) * 100);

    if (usagePercent > 100) {
      return {
        type: 'OVER_LIMIT',
        message: `Túllépte a hitelkeretet! (${usagePercent}%)`,
        currentUsagePercent: usagePercent,
      };
    }

    if (usagePercent === 100) {
      return {
        type: 'AT_LIMIT',
        message: 'Elérte a hitelkeretet!',
        currentUsagePercent: 100,
      };
    }

    if (usagePercent >= creditLimit.warningThreshold) {
      return {
        type: 'NEAR_LIMIT',
        message: `Közeledik a hitelkerethez (${usagePercent}%)`,
        currentUsagePercent: usagePercent,
      };
    }

    return null;
  }
}
