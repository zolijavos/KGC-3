/**
 * Email Service Interface
 * Story 2.1: User CRUD Operations - AC1 Requirement
 *
 * Stub interface for email sending. Will be implemented later.
 * Allows sending welcome emails with temporary passwords per AC1.
 */

/**
 * Email template types
 */
export enum EmailTemplate {
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

/**
 * Welcome email data
 */
export interface WelcomeEmailData {
  recipientEmail: string;
  recipientName: string;
  temporaryPassword: string;
  loginUrl?: string;
}

/**
 * Email Service Interface
 */
export interface IEmailService {
  /**
   * Send welcome email with temporary password
   * @param data - Welcome email data
   * @returns Promise resolving to true if sent successfully
   */
  sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean>;
}

/**
 * Injection token for EmailService
 */
export const EMAIL_SERVICE = 'EMAIL_SERVICE';

/**
 * Mock Email Service for testing
 * Returns true and logs to console in development
 */
export class MockEmailService implements IEmailService {
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    // In development/test, just log and return success
    console.log('[MockEmailService] Would send welcome email to:', data.recipientEmail);
    console.log('[MockEmailService] Temporary password:', data.temporaryPassword);
    return true;
  }
}
