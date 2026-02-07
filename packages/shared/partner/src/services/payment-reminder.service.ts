/**
 * @kgc/partner - PaymentReminderService
 * Story 44-1: Fizetési emlékeztetők
 *
 * Service for managing payment reminders for overdue invoices
 */

import { Injectable } from '@nestjs/common';

/** Reminder escalation levels */
export type ReminderLevel = 'FIRST' | 'SECOND' | 'FINAL';

/** Payment reminder record */
export interface PaymentReminder {
  id: string;
  invoiceId: string;
  tenantId: string;
  level: ReminderLevel;
  sentAt: Date;
  status: 'SENT' | 'CANCELLED';
  emailMessageId?: string | undefined;
  cancelledAt?: Date | undefined;
  cancelReason?: string | undefined;
}

/** Overdue invoice data */
export interface OverdueInvoice {
  id: string;
  tenantId: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  amount: number;
  dueDate: Date;
  status: string;
}

/** Overdue check result */
export interface OverdueCheckResult {
  invoiceId: string;
  tenantId: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
  suggestedLevel: ReminderLevel | null;
  previousReminders: ReminderLevel[];
}

/** Reminder email result */
export interface ReminderEmailResult {
  success: boolean;
  level: ReminderLevel;
  reminderId?: string | undefined;
  messageId?: string | undefined;
  error?: string | undefined;
}

/** Cancel reminders result */
export interface CancelRemindersResult {
  success: boolean;
  cancelledCount: number;
  error?: string | undefined;
}

/** Email template */
export interface EmailTemplate {
  subject: string;
  body: string;
  tone: 'polite' | 'firm' | 'warning';
}

/** Email payload */
export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

/** Email sender function */
type EmailSender = (payload: EmailPayload) => Promise<{ success: boolean; messageId: string }>;

/** Days thresholds for each reminder level */
const REMINDER_THRESHOLDS = {
  FIRST: 7,
  SECOND: 14,
  FINAL: 30,
};

/** MS per day */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class PaymentReminderService {
  private invoices: Map<string, OverdueInvoice> = new Map();
  private reminders: Map<string, PaymentReminder> = new Map();
  private emailSender?: EmailSender | undefined;
  private reminderIdCounter = 0;

  /**
   * Check overdue invoices for a tenant
   */
  async checkOverdueInvoices(tenantId: string, now: Date): Promise<OverdueCheckResult[]> {
    const overdueInvoices = Array.from(this.invoices.values()).filter(
      inv => inv.tenantId === tenantId && inv.status === 'OVERDUE'
    );

    return overdueInvoices.map(inv => {
      const daysOverdue = this.getDaysOverdue(inv.dueDate, now);
      const previousReminders = this.getPreviousReminders(inv.id);
      const suggestedLevel = this.determineSuggestedLevel(daysOverdue, previousReminders);

      return {
        invoiceId: inv.id,
        tenantId: inv.tenantId,
        partnerId: inv.partnerId,
        partnerName: inv.partnerName,
        amount: inv.amount,
        dueDate: inv.dueDate,
        daysOverdue,
        suggestedLevel,
        previousReminders,
      };
    });
  }

  /**
   * Send a reminder for an invoice at specified level
   */
  async sendReminder(invoiceId: string, level: ReminderLevel): Promise<ReminderEmailResult> {
    const invoice = this.invoices.get(invoiceId);

    if (!invoice) {
      return { success: false, level, error: 'Invoice not found' };
    }

    // Check if reminder already sent at this level
    const existingReminder = Array.from(this.reminders.values()).find(
      r => r.invoiceId === invoiceId && r.level === level && r.status === 'SENT'
    );

    if (existingReminder) {
      return { success: false, level, error: `Reminder at level ${level} already sent` };
    }

    if (!this.emailSender) {
      return { success: false, level, error: 'Email sender not configured' };
    }

    const template = this.getEmailTemplate(level);
    const emailBody = this.renderEmailBody(template.body, invoice);

    try {
      const emailResult = await this.emailSender({
        to: invoice.partnerEmail,
        subject: template.subject,
        body: emailBody,
      });

      const reminderId = `reminder_${++this.reminderIdCounter}_${Date.now()}`;
      const reminder: PaymentReminder = {
        id: reminderId,
        invoiceId,
        tenantId: invoice.tenantId,
        level,
        sentAt: new Date(),
        status: 'SENT',
        emailMessageId: emailResult.messageId,
      };

      this.reminders.set(reminderId, reminder);

      return {
        success: true,
        level,
        reminderId,
        messageId: emailResult.messageId,
      };
    } catch (error) {
      return {
        success: false,
        level,
        error: `Failed to send email: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Cancel all reminders for an invoice
   */
  async cancelReminders(invoiceId: string, reason: string): Promise<CancelRemindersResult> {
    const now = new Date();
    let cancelledCount = 0;

    for (const reminder of this.reminders.values()) {
      if (reminder.invoiceId === invoiceId && reminder.status === 'SENT') {
        reminder.status = 'CANCELLED';
        reminder.cancelledAt = now;
        reminder.cancelReason = reason;
        cancelledCount++;
      }
    }

    return { success: true, cancelledCount };
  }

  /**
   * Get reminder history for an invoice
   */
  async getReminderHistory(invoiceId: string): Promise<PaymentReminder[]> {
    return Array.from(this.reminders.values())
      .filter(r => r.invoiceId === invoiceId)
      .sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  }

  /**
   * Get email template for a reminder level
   */
  getEmailTemplate(level: ReminderLevel): EmailTemplate {
    switch (level) {
      case 'FIRST':
        return {
          subject: 'Fizetési emlékeztető - Lejárt számla',
          body: `Tisztelt Partnerünk!

Ezúton szeretnénk emlékeztetni, hogy az alábbi számla fizetési határideje lejárt.

Számla összege: {{amount}} Ft
Lejárat dátuma: {{dueDate}}

Kérjük, szíveskedjen mielőbb rendezni a tartozást.

Üdvözlettel,
KGC Kisgépcentrum`,
          tone: 'polite',
        };

      case 'SECOND':
        return {
          subject: 'Fizetési felszólítás - Lejárt számla',
          body: `Tisztelt Partnerünk!

Korábbi emlékeztetőnk ellenére az alábbi számla tartozás továbbra is rendezetlen.

Számla összege: {{amount}} Ft
Lejárat dátuma: {{dueDate}}
Késedelem: {{daysOverdue}} nap

Nyomatékosan kérjük a tartozás mielőbbi rendezését.

Üdvözlettel,
KGC Kisgépcentrum`,
          tone: 'firm',
        };

      case 'FINAL':
        return {
          subject: 'Végleges fizetési felszólítás - Azonnali intézkedés szükséges',
          body: `Tisztelt Partnerünk!

Sajnálattal értesítjük, hogy az alábbi számla tartozás továbbra is rendezetlen.

Számla összege: {{amount}} Ft
Lejárat dátuma: {{dueDate}}
Késedelem: {{daysOverdue}} nap

FIGYELMEZTETÉS: Amennyiben a tartozás 15 napon belül nem kerül rendezésre,
kénytelenek leszünk a partnerfiókot felfüggesztésre helyezni,
amely a bérlési és vásárlási lehetőségek korlátozásával jár.

Kérjük, haladéktalanul vegye fel velünk a kapcsolatot a tartozás rendezése érdekében.

Üdvözlettel,
KGC Kisgépcentrum`,
          tone: 'warning',
        };
    }
  }

  /**
   * Calculate days overdue
   */
  getDaysOverdue(dueDate: Date, now: Date): number {
    const diff = now.getTime() - dueDate.getTime();
    if (diff <= 0) return 0;
    return Math.floor(diff / MS_PER_DAY);
  }

  /**
   * Determine suggested reminder level based on days overdue and previous reminders
   */
  determineSuggestedLevel(
    daysOverdue: number,
    previousReminders: ReminderLevel[]
  ): ReminderLevel | null {
    // Not overdue enough for first reminder
    if (daysOverdue < REMINDER_THRESHOLDS.FIRST) {
      return null;
    }

    // Determine which level we should be at
    let targetLevel: ReminderLevel;
    if (daysOverdue >= REMINDER_THRESHOLDS.FINAL) {
      targetLevel = 'FINAL';
    } else if (daysOverdue >= REMINDER_THRESHOLDS.SECOND) {
      targetLevel = 'SECOND';
    } else {
      targetLevel = 'FIRST';
    }

    // Check if we can send this level
    if (targetLevel === 'FIRST') {
      return previousReminders.includes('FIRST') ? null : 'FIRST';
    }

    if (targetLevel === 'SECOND') {
      if (!previousReminders.includes('FIRST')) return 'FIRST';
      return previousReminders.includes('SECOND') ? null : 'SECOND';
    }

    if (targetLevel === 'FINAL') {
      if (!previousReminders.includes('FIRST')) return 'FIRST';
      if (!previousReminders.includes('SECOND')) return 'SECOND';
      return previousReminders.includes('FINAL') ? null : 'FINAL';
    }

    return null;
  }

  /**
   * Get previous reminders sent for an invoice
   */
  private getPreviousReminders(invoiceId: string): ReminderLevel[] {
    return Array.from(this.reminders.values())
      .filter(r => r.invoiceId === invoiceId && r.status === 'SENT')
      .map(r => r.level);
  }

  /**
   * Render email body with invoice data
   */
  private renderEmailBody(template: string, invoice: OverdueInvoice): string {
    const now = new Date();
    const daysOverdue = this.getDaysOverdue(invoice.dueDate, now);

    return template
      .replace('{{amount}}', invoice.amount.toLocaleString('hu-HU'))
      .replace('{{dueDate}}', invoice.dueDate.toISOString().split('T')[0] ?? '')
      .replace('{{daysOverdue}}', daysOverdue.toString());
  }

  /**
   * Set email sender function (for testing/dependency injection)
   */
  setEmailSender(sender: EmailSender): void {
    this.emailSender = sender;
  }

  /**
   * Add invoice (for testing)
   */
  addInvoiceForTest(invoice: OverdueInvoice): void {
    this.invoices.set(invoice.id, invoice);
  }
}
