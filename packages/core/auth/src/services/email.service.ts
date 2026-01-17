/**
 * Email Service Interface and Mock Implementation
 * Story 1.5: Password Reset Flow
 * AC1: Email küldés a reset linkkel
 *
 * This file defines the interface for email sending and provides a mock
 * implementation for testing. Production implementation should inject
 * a real email service (e.g., SendGrid, AWS SES, Nodemailer).
 */

import { Injectable } from '@nestjs/common';

/**
 * Email message structure for password reset
 */
export interface PasswordResetEmailData {
  to: string;
  resetToken: string;
  resetUrl: string;
  expiresInHours: number;
  userName?: string;
}

/**
 * Email service interface - implement this for production email sending
 */
export interface IEmailService {
  sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean>;
}

/**
 * Mock email service for testing
 * In production, replace with actual email implementation
 */
@Injectable()
export class MockEmailService implements IEmailService {
  private sentEmails: PasswordResetEmailData[] = [];

  /**
   * Mock send password reset email - stores for testing verification
   * @param data - Email data
   * @returns Promise<boolean> - Always returns true in mock
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
    this.sentEmails.push(data);
    return true;
  }

  /**
   * Get all sent emails (for testing)
   */
  getSentEmails(): PasswordResetEmailData[] {
    return [...this.sentEmails];
  }

  /**
   * Clear sent emails (for testing cleanup)
   */
  clearSentEmails(): void {
    this.sentEmails = [];
  }

  /**
   * Get last sent email (for testing)
   */
  getLastSentEmail(): PasswordResetEmailData | undefined {
    return this.sentEmails[this.sentEmails.length - 1];
  }
}

/**
 * Injection token for EmailService
 */
export const EMAIL_SERVICE = 'EMAIL_SERVICE';
