/**
 * @kgc/partner - PartnerSuspensionService
 * Story 44-2: Partner felfüggesztés
 *
 * Service for managing partner suspension due to payment issues
 */

import { Injectable } from '@nestjs/common';
import type { PartnerStatus } from '../interfaces/partner.interface';

/** Partner category */
export type PartnerCategory = 'RETAIL' | 'B2B' | 'VIP';

/** Partner with status info */
export interface PartnerWithStatus {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  status: PartnerStatus;
  category: PartnerCategory;
  totalOutstanding: number;
  suspendedAt?: Date | undefined;
  suspensionReason?: string | undefined;
  oldestOverdueDays?: number | undefined;
  remindersSent?: number | undefined;
}

/** Suspension options */
export interface SuspendOptions {
  autoSuspend?: boolean | undefined;
}

/** Suspension result */
export interface SuspensionResult {
  success: boolean;
  suspendedAt?: Date | undefined;
  requiresManualReview?: boolean | undefined;
  error?: string | undefined;
}

/** Unsuspension result */
export interface UnsuspensionResult {
  success: boolean;
  unsuspendedAt?: Date | undefined;
  error?: string | undefined;
}

/** Rental start check result */
export interface SuspensionCheckResult {
  canStart: boolean;
  reason?: string | undefined;
  message?: string | undefined;
  outstandingAmount?: number | undefined;
}

/** Suspension eligibility result */
export interface SuspensionEligibilityResult {
  eligible: boolean;
  daysOverdue?: number | undefined;
  remindersSent?: number | undefined;
  requiresManualReview?: boolean | undefined;
  reason?: string | undefined;
}

/** Manager notification result */
export interface ManagerNotificationResult {
  success: boolean;
  error?: string | undefined;
}

/** Audit log entry */
export interface AuditLogEntry {
  action: string;
  partnerId: string;
  performedBy: string;
  timestamp: Date;
  details?: Record<string, unknown> | undefined;
}

/** Manager notification payload */
export interface ManagerNotification {
  partnerId: string;
  partnerName: string;
  category: PartnerCategory;
  outstandingAmount: number;
  daysOverdue: number;
  message: string;
}

/** Audit logger function type */
type AuditLogger = (entry: AuditLogEntry) => void;

/** Manager notifier function type */
type ManagerNotifier = (notification: ManagerNotification) => Promise<{ success: boolean }>;

/** Minimum days overdue for suspension */
const SUSPENSION_THRESHOLD_DAYS = 45;

@Injectable()
export class PartnerSuspensionService {
  private partners: Map<string, PartnerWithStatus> = new Map();
  private auditLogger?: AuditLogger | undefined;
  private managerNotifier?: ManagerNotifier | undefined;

  /**
   * Suspend a partner
   */
  async suspend(
    partnerId: string,
    reason: string,
    options?: SuspendOptions
  ): Promise<SuspensionResult> {
    const partner = this.partners.get(partnerId);

    if (!partner) {
      return { success: false, error: 'Partner not found' };
    }

    if (partner.status === 'SUSPENDED') {
      return { success: false, error: 'Partner is already suspended' };
    }

    // VIP partners cannot be auto-suspended
    if (partner.category === 'VIP' && options?.autoSuspend) {
      return {
        success: false,
        requiresManualReview: true,
        error: 'VIP partner cannot be auto-suspended. Manual review required.',
      };
    }

    const now = new Date();
    partner.status = 'SUSPENDED';
    partner.suspendedAt = now;
    partner.suspensionReason = reason;

    this.partners.set(partnerId, partner);

    return { success: true, suspendedAt: now };
  }

  /**
   * Unsuspend a partner
   */
  async unsuspend(partnerId: string, performedBy: string): Promise<UnsuspensionResult> {
    const partner = this.partners.get(partnerId);

    if (!partner) {
      return { success: false, error: 'Partner not found' };
    }

    if (partner.status !== 'SUSPENDED') {
      return { success: false, error: 'Partner is not suspended' };
    }

    const now = new Date();
    partner.status = 'ACTIVE';
    partner.suspendedAt = undefined;
    partner.suspensionReason = undefined;

    this.partners.set(partnerId, partner);

    // Log audit entry
    if (this.auditLogger) {
      this.auditLogger({
        action: 'PARTNER_UNSUSPENDED',
        partnerId,
        performedBy,
        timestamp: now,
        details: { previousReason: partner.suspensionReason },
      });
    }

    return { success: true, unsuspendedAt: now };
  }

  /**
   * Check if partner can start a rental
   */
  async checkCanStartRental(partnerId: string): Promise<SuspensionCheckResult> {
    const partner = this.partners.get(partnerId);

    if (!partner) {
      return { canStart: false, reason: 'Partner not found' };
    }

    if (partner.status === 'SUSPENDED') {
      const amount = partner.totalOutstanding;
      return {
        canStart: false,
        reason: 'Partner felfüggesztve - tartozás rendezése szükséges',
        message: `Partner felfüggesztve. Tartozás összege: ${amount} Ft. Rendezés után a felfüggesztés feloldható.`,
        outstandingAmount: amount,
      };
    }

    return { canStart: true };
  }

  /**
   * Check if partner is eligible for suspension
   */
  async checkSuspensionEligibility(partnerId: string): Promise<SuspensionEligibilityResult> {
    const partner = this.partners.get(partnerId);

    if (!partner) {
      return { eligible: false, reason: 'Partner not found' };
    }

    const daysOverdue = partner.oldestOverdueDays ?? 0;
    const remindersSent = partner.remindersSent ?? 0;

    // VIP partners need manual review
    if (partner.category === 'VIP') {
      return {
        eligible: false,
        daysOverdue,
        remindersSent,
        requiresManualReview: true,
        reason: 'VIP partner - manuális döntés szükséges',
      };
    }

    // Check threshold
    if (daysOverdue < SUSPENSION_THRESHOLD_DAYS) {
      return {
        eligible: false,
        daysOverdue,
        remindersSent,
        reason: `Csak 45 nap késés felett felfüggeszthető. Jelenlegi késés: ${daysOverdue} nap.`,
      };
    }

    return {
      eligible: true,
      daysOverdue,
      remindersSent,
    };
  }

  /**
   * Notify manager about partner issue
   */
  async notifyManager(partnerId: string, message: string): Promise<ManagerNotificationResult> {
    const partner = this.partners.get(partnerId);

    if (!partner) {
      return { success: false, error: 'Partner not found' };
    }

    if (!this.managerNotifier) {
      return { success: false, error: 'Manager notifier not configured' };
    }

    try {
      const result = await this.managerNotifier({
        partnerId,
        partnerName: partner.name,
        category: partner.category,
        outstandingAmount: partner.totalOutstanding,
        daysOverdue: partner.oldestOverdueDays ?? 0,
        message,
      });

      return { success: result.success };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get partner by ID
   */
  async getPartner(partnerId: string): Promise<PartnerWithStatus | undefined> {
    return this.partners.get(partnerId);
  }

  /**
   * Set audit logger function (for testing/dependency injection)
   */
  setAuditLogger(logger: AuditLogger): void {
    this.auditLogger = logger;
  }

  /**
   * Set manager notifier function (for testing/dependency injection)
   */
  setManagerNotifier(notifier: ManagerNotifier): void {
    this.managerNotifier = notifier;
  }

  /**
   * Add partner (for testing)
   */
  addPartnerForTest(partner: PartnerWithStatus): void {
    this.partners.set(partner.id, partner);
  }
}
