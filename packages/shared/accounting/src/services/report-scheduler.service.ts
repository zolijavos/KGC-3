/**
 * @kgc/accounting - ReportSchedulerService
 * Story 43-3: Automatikus email riportok
 *
 * Service for scheduling and sending automatic email reports
 */

import { Injectable } from '@nestjs/common';

/** Email report settings */
export interface EmailReportSettings {
  tenantId: string;
  email: string;
  enabled: boolean;
  format: 'csv' | 'xlsx' | 'pdf';
  reportTypes: ('invoices' | 'vat' | 'deposits')[];
  dayOfMonth: number; // 1-28
}

/** Save settings result */
export interface SaveSettingsResult {
  success: boolean;
  settingsId?: string | undefined;
  error?: string | undefined;
}

/** Schedule result */
export interface ReportScheduleResult {
  scheduled: boolean;
  nextRunDate?: Date | undefined;
  reason?: string | undefined;
}

/** Email send result */
export interface EmailSendResult {
  success: boolean;
  messageId?: string | undefined;
  retryCount?: number | undefined;
  error?: string | undefined;
}

/** Email payload */
export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  attachments: { filename: string; content: string }[];
}

/** Admin notification payload */
export interface AdminNotification {
  tenantId: string;
  error: string;
  timestamp: Date;
}

/** Email sender function type */
type EmailSender = (payload: EmailPayload) => Promise<{ success: boolean; messageId: string }>;

/** Admin notifier function type */
type AdminNotifier = (notification: AdminNotification) => Promise<boolean>;

/** Email validation regex */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maximum retry attempts */
const MAX_RETRIES = 3;

@Injectable()
export class ReportSchedulerService {
  private settings: Map<string, EmailReportSettings & { id: string }> = new Map();
  private emailSender?: EmailSender | undefined;
  private adminNotifier?: AdminNotifier | undefined;
  private idCounter = 0;

  /**
   * Save email report settings
   */
  async saveSettings(settings: EmailReportSettings): Promise<SaveSettingsResult> {
    // Validate email format
    if (!EMAIL_REGEX.test(settings.email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate day of month
    if (settings.dayOfMonth < 1 || settings.dayOfMonth > 28) {
      return { success: false, error: 'Day of month must be between 1 and 28' };
    }

    const id = `settings_${++this.idCounter}_${Date.now()}`;
    this.settings.set(settings.tenantId, { ...settings, id });

    return { success: true, settingsId: id };
  }

  /**
   * Get settings for a tenant
   */
  async getSettings(tenantId: string): Promise<EmailReportSettings | null> {
    const settings = this.settings.get(tenantId);
    if (!settings) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = settings;
    return rest;
  }

  /**
   * Schedule monthly report
   */
  async scheduleMonthlyReport(tenantId: string): Promise<ReportScheduleResult> {
    const settings = this.settings.get(tenantId);

    if (!settings) {
      return { scheduled: false, reason: 'No settings found' };
    }

    if (!settings.enabled) {
      return { scheduled: false, reason: 'Report sending is disabled' };
    }

    // Calculate next run date
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, settings.dayOfMonth);

    return {
      scheduled: true,
      nextRunDate: nextMonth,
    };
  }

  /**
   * Send report email
   */
  async sendReport(tenantId: string, month: string): Promise<EmailSendResult> {
    const settings = this.settings.get(tenantId);

    if (!settings) {
      return { success: false, error: 'No settings found' };
    }

    if (!this.emailSender) {
      return { success: false, error: 'Email sender not configured' };
    }

    const payload: EmailPayload = {
      to: settings.email,
      subject: `KGC Havi Riport - ${month}`,
      body: `Tisztelt Partnerünk!\n\nCsatoltan küldjük a(z) ${month} hónap riportjait.\n\nÜdvözlettel,\nKGC Rendszer`,
      attachments: settings.reportTypes.map(type => ({
        filename: `kgc_${type}_${month}.${settings.format}`,
        content: `Mock content for ${type}`,
      })),
    };

    let lastError: Error | undefined;
    let retryCount = 0;

    // Try up to MAX_RETRIES times
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const result = await this.emailSender(payload);
        return {
          success: true,
          messageId: result.messageId,
          retryCount,
        };
      } catch (error) {
        lastError = error as Error;
        retryCount++;
      }
    }

    // All retries failed - notify admin
    if (this.adminNotifier) {
      await this.adminNotifier({
        tenantId,
        error: lastError?.message ?? 'Unknown error',
        timestamp: new Date(),
      });
    }

    return {
      success: false,
      error: `Email sending failed after 3 retries: ${lastError?.message}`,
      retryCount,
    };
  }

  /**
   * Set email sender function (for testing/dependency injection)
   */
  setEmailSender(sender: EmailSender): void {
    this.emailSender = sender;
  }

  /**
   * Set admin notifier function (for testing/dependency injection)
   */
  setAdminNotifier(notifier: AdminNotifier): void {
    this.adminNotifier = notifier;
  }
}
