/**
 * @kgc/rental-checkout - CardExpirationService
 * Story 42-3: Kártya lejárat kezelés bérlés közben
 *
 * Service for checking and handling card expirations during active rentals
 */

/**
 * Alert level for card expiration
 */
export type CardAlertLevel = 'INFO' | 'WARNING' | 'URGENT';

/**
 * Deposit with card information
 */
export interface DepositWithCard {
  id: string;
  rentalId: string;
  tenantId: string;
  amount: number;
  cardExpiryDate?: Date | undefined;
  cardLastFour?: string | undefined;
  partnerId: string;
  partnerName: string;
  transactionId?: string | undefined;
}

/**
 * Card expiration alert
 */
export interface CardExpirationAlert {
  depositId: string;
  rentalId: string;
  tenantId: string;
  alertLevel: CardAlertLevel;
  daysUntilExpiry: number;
  isExpired: boolean;
  cardLastFour?: string | undefined;
  partnerName: string;
  depositAmount: number;
  createdAt: Date;
}

/**
 * New card transaction data
 */
export interface NewCardTransaction {
  transactionId: string;
  cardLastFour: string;
  cardExpiryDate: Date;
  amount: number;
}

/**
 * Card replacement result
 */
export interface CardReplacementResult {
  success: boolean;
  depositId: string;
  oldTransactionId?: string | undefined;
  newTransactionId: string;
  newCardLastFour: string;
  requiresRefund: boolean;
  refundAmount?: number | undefined;
}

/** Days threshold for card expiration warning */
const CARD_EXPIRY_WARNING_DAYS = 5;
/** Days threshold for urgent alert */
const CARD_EXPIRY_URGENT_DAYS = 2;

export class CardExpirationService {
  private deposits: Map<string, DepositWithCard> = new Map();

  /**
   * Check deposits for expiring cards
   */
  checkCardExpirations(deposits: DepositWithCard[], now: Date = new Date()): CardExpirationAlert[] {
    const alerts: CardExpirationAlert[] = [];

    for (const deposit of deposits) {
      // Skip deposits without card expiry date (cash deposits)
      if (!deposit.cardExpiryDate) {
        continue;
      }

      const daysUntilExpiry = this.calculateDaysUntilCardExpiry(deposit.cardExpiryDate, now);

      // Only generate alerts for cards expiring within threshold
      if (daysUntilExpiry <= CARD_EXPIRY_WARNING_DAYS) {
        const alertLevel = this.determineAlertLevel(daysUntilExpiry);
        alerts.push({
          depositId: deposit.id,
          rentalId: deposit.rentalId,
          tenantId: deposit.tenantId,
          alertLevel,
          daysUntilExpiry,
          isExpired: daysUntilExpiry < 0,
          cardLastFour: deposit.cardLastFour,
          partnerName: deposit.partnerName,
          depositAmount: deposit.amount,
          createdAt: now,
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate days until card expiry
   */
  calculateDaysUntilCardExpiry(expiryDate: Date, now: Date): number {
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Determine alert level based on days until expiry
   */
  private determineAlertLevel(daysUntilExpiry: number): CardAlertLevel {
    if (daysUntilExpiry <= 0) {
      return 'URGENT';
    }
    if (daysUntilExpiry <= CARD_EXPIRY_URGENT_DAYS) {
      return 'URGENT';
    }
    if (daysUntilExpiry <= CARD_EXPIRY_WARNING_DAYS) {
      return 'WARNING';
    }
    return 'INFO';
  }

  /**
   * Replace card for an existing deposit
   */
  async replaceCard(
    depositId: string,
    newCardTransaction: NewCardTransaction
  ): Promise<CardReplacementResult> {
    const existingDeposit = this.deposits.get(depositId);

    const result: CardReplacementResult = {
      success: true,
      depositId,
      oldTransactionId: existingDeposit?.transactionId,
      newTransactionId: newCardTransaction.transactionId,
      newCardLastFour: newCardTransaction.cardLastFour,
      requiresRefund: !!existingDeposit?.transactionId,
      refundAmount: existingDeposit?.amount,
    };

    // Update deposit with new card info
    if (existingDeposit) {
      existingDeposit.cardExpiryDate = newCardTransaction.cardExpiryDate;
      existingDeposit.cardLastFour = newCardTransaction.cardLastFour;
      existingDeposit.transactionId = newCardTransaction.transactionId;
      this.deposits.set(depositId, existingDeposit);
    }

    return result;
  }

  /**
   * Get deposits with expiring cards for a tenant
   */
  getExpiringDeposits(
    tenantId: string,
    thresholdDays: number,
    now: Date = new Date()
  ): DepositWithCard[] {
    const expiring: DepositWithCard[] = [];

    for (const deposit of this.deposits.values()) {
      if (deposit.tenantId !== tenantId) {
        continue;
      }

      if (!deposit.cardExpiryDate) {
        continue;
      }

      const daysUntilExpiry = this.calculateDaysUntilCardExpiry(deposit.cardExpiryDate, now);
      if (daysUntilExpiry <= thresholdDays) {
        expiring.push(deposit);
      }
    }

    return expiring;
  }

  /**
   * Generate Hungarian alert message
   */
  getAlertMessage(alert: CardExpirationAlert): string {
    const { alertLevel, daysUntilExpiry, partnerName, cardLastFour, depositAmount } = alert;

    const formattedAmount = depositAmount.toLocaleString('hu-HU');
    const cardInfo = cardLastFour ? `(****${cardLastFour})` : '';

    if (alert.isExpired) {
      const overdueDays = Math.abs(daysUntilExpiry);
      return `LEJÁRT KÁRTYA: ${partnerName} ${cardInfo} kártyája ${overdueDays} napja lejárt! Kaució: ${formattedAmount} Ft. Új kártya szükséges.`;
    }

    switch (alertLevel) {
      case 'URGENT':
        return `SÜRGŐS: ${partnerName} ${cardInfo} kártyája ${daysUntilExpiry} napon belül lejár! Kaució: ${formattedAmount} Ft.`;
      case 'WARNING':
        return `Kártya lejárat: ${partnerName} ${cardInfo} kártyája ${daysUntilExpiry} napon belül lejár. Kaució: ${formattedAmount} Ft.`;
      default:
        return `Info: ${partnerName} kártyája hamarosan lejár.`;
    }
  }

  /**
   * Add deposit for testing (in-memory store)
   */
  addDepositForTest(deposit: DepositWithCard): void {
    this.deposits.set(deposit.id, deposit);
  }
}
