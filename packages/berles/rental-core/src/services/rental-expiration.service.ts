/**
 * @kgc/rental-core - RentalExpirationService
 * Story 42-2: Automatikus megújulás értesítés
 *
 * Service for checking and notifying about expiring rentals
 */

/**
 * Expiration level for notifications
 */
export enum ExpirationLevel {
  /** 4-7 days before expiry */
  INFO = 'INFO',
  /** 1-3 days before expiry */
  WARNING = 'WARNING',
  /** Expired or expiring today */
  URGENT = 'URGENT',
}

/**
 * Rental data required for expiration check
 */
export interface RentalForExpiration {
  id: string;
  tenantId: string;
  partnerId: string;
  partnerName: string;
  partnerPhone?: string | undefined;
  endDate: Date;
  equipmentName: string;
  assignedUserId?: string | undefined;
}

/**
 * Expiration notification
 */
export interface RentalExpirationNotification {
  rentalId: string;
  tenantId: string;
  level: ExpirationLevel;
  daysUntilExpiry: number;
  isOverdue: boolean;
  partnerName: string;
  partnerPhone?: string | undefined;
  equipmentName: string;
  expiryDate: Date;
  assignedUserId?: string | undefined;
  createdAt: Date;
}

/** Days threshold for INFO level (7 days) */
const INFO_THRESHOLD_DAYS = 7;
/** Days threshold for WARNING level (3 days) */
const WARNING_THRESHOLD_DAYS = 3;

export class RentalExpirationService {
  /**
   * Check rentals for expiration and generate notifications
   */
  checkExpirations(
    rentals: RentalForExpiration[],
    now: Date = new Date()
  ): RentalExpirationNotification[] {
    const notifications: RentalExpirationNotification[] = [];

    for (const rental of rentals) {
      const daysUntilExpiry = this.calculateDaysUntilExpiry(rental.endDate, now);
      const level = this.determineExpirationLevel(daysUntilExpiry);

      if (level !== null) {
        notifications.push({
          rentalId: rental.id,
          tenantId: rental.tenantId,
          level,
          daysUntilExpiry,
          isOverdue: daysUntilExpiry < 0,
          partnerName: rental.partnerName,
          partnerPhone: rental.partnerPhone,
          equipmentName: rental.equipmentName,
          expiryDate: rental.endDate,
          assignedUserId: rental.assignedUserId,
          createdAt: now,
        });
      }
    }

    return notifications;
  }

  /**
   * Calculate days until expiry (negative if overdue)
   */
  calculateDaysUntilExpiry(expiryDate: Date, now: Date): number {
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Determine expiration level based on days until expiry
   * Returns null if no notification needed
   */
  determineExpirationLevel(daysUntilExpiry: number): ExpirationLevel | null {
    if (daysUntilExpiry <= 0) {
      return ExpirationLevel.URGENT;
    }

    if (daysUntilExpiry <= WARNING_THRESHOLD_DAYS) {
      return ExpirationLevel.WARNING;
    }

    if (daysUntilExpiry <= INFO_THRESHOLD_DAYS) {
      return ExpirationLevel.INFO;
    }

    return null;
  }

  /**
   * Generate Hungarian notification message
   */
  getNotificationMessage(notification: RentalExpirationNotification): string {
    const { level, daysUntilExpiry, partnerName, equipmentName } = notification;

    switch (level) {
      case ExpirationLevel.INFO:
        return `Bérlés értesítés: ${partnerName} - ${equipmentName} bérlése lejár ${daysUntilExpiry} nap múlva.`;

      case ExpirationLevel.WARNING:
        return `SÜRGŐS: ${partnerName} - ${equipmentName} bérlése ${daysUntilExpiry} nap múlva lejár! Kérjük egyeztessen az ügyféllel.`;

      case ExpirationLevel.URGENT:
        if (daysUntilExpiry < 0) {
          const overdueDays = Math.abs(daysUntilExpiry);
          return `LEJÁRT BÉRLÉS: ${partnerName} - ${equipmentName} bérlése ${overdueDays} napja lejárt! Azonnali intézkedés szükséges.`;
        }
        return `MA LEJÁR: ${partnerName} - ${equipmentName} bérlése ma lejár! Azonnali intézkedés szükséges.`;

      default:
        return `Bérlés értesítés: ${partnerName} - ${equipmentName}`;
    }
  }

  /**
   * Group notifications by expiration level
   */
  groupByLevel(
    notifications: RentalExpirationNotification[]
  ): Record<ExpirationLevel, RentalExpirationNotification[]> {
    const grouped: Record<ExpirationLevel, RentalExpirationNotification[]> = {
      [ExpirationLevel.INFO]: [],
      [ExpirationLevel.WARNING]: [],
      [ExpirationLevel.URGENT]: [],
    };

    for (const notification of notifications) {
      grouped[notification.level].push(notification);
    }

    return grouped;
  }
}
