/**
 * MyPos Mock Service
 * Sprint 0 Blocker #3: Mock External Services
 *
 * Provides a mock implementation of the MyPos payment gateway for E2E testing.
 * Returns predictable responses without making actual payment API calls.
 *
 * Scenarios supported:
 * - Successful payment capture
 * - Deposit hold/release
 * - Refund processing
 * - Error simulation (card declined, insufficient funds, etc.)
 */

import { Injectable, Logger } from '@nestjs/common';

// Payment types
export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'FAILED';

export type DepositStatus = 'HELD' | 'RELEASED' | 'CAPTURED' | 'EXPIRED';

export interface MockPaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
  customerEmail?: string;
  returnUrl?: string;
}

export interface MockPaymentResult {
  success: boolean;
  transactionId?: string;
  status?: PaymentStatus;
  authorizationCode?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface MockDepositRequest {
  amount: number;
  currency: string;
  rentalId: string;
  customerId: string;
  description?: string;
}

export interface MockDepositResult {
  success: boolean;
  depositId?: string;
  status?: DepositStatus;
  holdAmount?: number;
  expiresAt?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface MockRefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

export interface MockRefundResult {
  success: boolean;
  refundId?: string;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  error?: {
    code: string;
    message: string;
  };
}

export interface MockMyPosConfig {
  /** Force errors for testing */
  forceError?:
    | 'DECLINED'
    | 'INSUFFICIENT_FUNDS'
    | 'EXPIRED_CARD'
    | 'INVALID_CARD'
    | 'NETWORK_ERROR'
    | 'FRAUD_SUSPECTED'
    | null;
  /** Delay response (ms) */
  responseDelay?: number;
  /** Auto-expire deposits after (ms) - 0 to disable */
  depositExpireMs?: number;
}

interface StoredPayment {
  request: MockPaymentRequest;
  result: MockPaymentResult;
  createdAt: Date;
}

interface StoredDeposit {
  request: MockDepositRequest;
  result: MockDepositResult;
  createdAt: Date;
  status: DepositStatus;
}

/**
 * Mock MyPos Payment Gateway Service for testing
 */
@Injectable()
export class MockMyPosService {
  private readonly logger = new Logger(MockMyPosService.name);
  private payments: Map<string, StoredPayment> = new Map();
  private deposits: Map<string, StoredDeposit> = new Map();
  private refunds: Map<string, MockRefundResult> = new Map();
  private config: MockMyPosConfig;
  private transactionCounter = 1;

  constructor(config: MockMyPosConfig = {}) {
    this.config = {
      forceError: null,
      responseDelay: 100,
      depositExpireMs: 0, // Disabled by default for tests
      ...config,
    };
    this.logger.log('MockMyPosService initialized');
  }

  /**
   * Reset mock state (for test isolation)
   */
  reset(): void {
    this.payments.clear();
    this.deposits.clear();
    this.refunds.clear();
    this.transactionCounter = 1;
    this.logger.debug('Mock state reset');
  }

  /**
   * Configure mock behavior
   */
  configure(config: Partial<MockMyPosConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get all payments (for assertions)
   */
  getPayments(): Array<{ transactionId: string; payment: StoredPayment }> {
    return Array.from(this.payments.entries()).map(([transactionId, payment]) => ({
      transactionId,
      payment,
    }));
  }

  /**
   * Get all deposits (for assertions)
   */
  getDeposits(): Array<{ depositId: string; deposit: StoredDeposit }> {
    return Array.from(this.deposits.entries()).map(([depositId, deposit]) => ({
      depositId,
      deposit,
    }));
  }

  // ===========================================
  // Payment Operations
  // ===========================================

  /**
   * Process a payment
   */
  async processPayment(request: MockPaymentRequest): Promise<MockPaymentResult> {
    this.logger.debug(`Mock: Processing payment for order: ${request.orderId}`);

    await this.simulateDelay();

    // Check for forced errors
    if (this.config.forceError) {
      return this.simulatePaymentError(this.config.forceError);
    }

    // Validate amount
    if (request.amount <= 0) {
      return {
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Amount must be positive' },
      };
    }

    const transactionId = this.generateTransactionId('PAY');
    const authCode = this.generateAuthCode();

    const result: MockPaymentResult = {
      success: true,
      transactionId,
      status: 'CAPTURED',
      authorizationCode: authCode,
    };

    this.payments.set(transactionId, {
      request,
      result,
      createdAt: new Date(),
    });

    this.logger.log(`Mock: Payment captured: ${transactionId}`);
    return result;
  }

  /**
   * Authorize payment (hold funds)
   */
  async authorizePayment(request: MockPaymentRequest): Promise<MockPaymentResult> {
    this.logger.debug(`Mock: Authorizing payment for order: ${request.orderId}`);

    await this.simulateDelay();

    if (this.config.forceError) {
      return this.simulatePaymentError(this.config.forceError);
    }

    const transactionId = this.generateTransactionId('AUTH');
    const authCode = this.generateAuthCode();

    const result: MockPaymentResult = {
      success: true,
      transactionId,
      status: 'AUTHORIZED',
      authorizationCode: authCode,
    };

    this.payments.set(transactionId, {
      request,
      result,
      createdAt: new Date(),
    });

    this.logger.log(`Mock: Payment authorized: ${transactionId}`);
    return result;
  }

  /**
   * Capture a previously authorized payment
   */
  async capturePayment(transactionId: string, amount?: number): Promise<MockPaymentResult> {
    this.logger.debug(`Mock: Capturing payment: ${transactionId}`);

    await this.simulateDelay();

    const payment = this.payments.get(transactionId);
    if (!payment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      };
    }

    if (payment.result.status !== 'AUTHORIZED') {
      return {
        success: false,
        error: { code: 'INVALID_STATE', message: 'Transaction is not in AUTHORIZED state' },
      };
    }

    const captureAmount = amount ?? payment.request.amount;
    if (captureAmount > payment.request.amount) {
      return {
        success: false,
        error: { code: 'AMOUNT_EXCEEDED', message: 'Capture amount exceeds authorization' },
      };
    }

    payment.result.status = 'CAPTURED';
    this.logger.log(`Mock: Payment captured: ${transactionId}`);

    return { ...payment.result };
  }

  /**
   * Cancel an authorized payment
   */
  async cancelPayment(transactionId: string): Promise<MockPaymentResult> {
    this.logger.debug(`Mock: Cancelling payment: ${transactionId}`);

    await this.simulateDelay();

    const payment = this.payments.get(transactionId);
    if (!payment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      };
    }

    if (payment.result.status === 'CAPTURED') {
      return {
        success: false,
        error: { code: 'ALREADY_CAPTURED', message: 'Cannot cancel captured payment, use refund' },
      };
    }

    payment.result.status = 'CANCELLED';
    this.logger.log(`Mock: Payment cancelled: ${transactionId}`);

    return { ...payment.result };
  }

  // ===========================================
  // Deposit/Kaució Operations
  // ===========================================

  /**
   * Hold deposit (kaució lefoglalás)
   */
  async holdDeposit(request: MockDepositRequest): Promise<MockDepositResult> {
    this.logger.debug(`Mock: Holding deposit for rental: ${request.rentalId}`);

    await this.simulateDelay();

    if (this.config.forceError) {
      const paymentError = this.simulatePaymentError(this.config.forceError);
      if (paymentError.error) {
        return {
          success: false,
          error: paymentError.error,
        };
      }
    }

    const depositId = this.generateTransactionId('DEP');
    const expiresAt = this.config.depositExpireMs
      ? new Date(Date.now() + this.config.depositExpireMs).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days default

    const result: MockDepositResult = {
      success: true,
      depositId,
      status: 'HELD',
      holdAmount: request.amount,
      expiresAt,
    };

    this.deposits.set(depositId, {
      request,
      result,
      createdAt: new Date(),
      status: 'HELD',
    });

    this.logger.log(`Mock: Deposit held: ${depositId} (${request.amount} ${request.currency})`);
    return result;
  }

  /**
   * Release deposit (kaució visszaadás)
   */
  async releaseDeposit(depositId: string): Promise<MockDepositResult> {
    this.logger.debug(`Mock: Releasing deposit: ${depositId}`);

    await this.simulateDelay();

    const deposit = this.deposits.get(depositId);
    if (!deposit) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deposit not found' },
      };
    }

    if (deposit.status !== 'HELD') {
      return {
        success: false,
        error: { code: 'INVALID_STATE', message: `Deposit is in ${deposit.status} state` },
      };
    }

    deposit.status = 'RELEASED';
    deposit.result.status = 'RELEASED';

    this.logger.log(`Mock: Deposit released: ${depositId}`);
    return { ...deposit.result };
  }

  /**
   * Capture deposit (kaució levonás - pl. kártérítés)
   */
  async captureDeposit(
    depositId: string,
    amount?: number,
    reason?: string
  ): Promise<MockDepositResult> {
    this.logger.debug(`Mock: Capturing deposit: ${depositId}`);

    await this.simulateDelay();

    const deposit = this.deposits.get(depositId);
    if (!deposit) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Deposit not found' },
      };
    }

    if (deposit.status !== 'HELD') {
      return {
        success: false,
        error: { code: 'INVALID_STATE', message: `Deposit is in ${deposit.status} state` },
      };
    }

    const captureAmount = amount ?? deposit.request.amount;
    if (captureAmount > deposit.request.amount) {
      return {
        success: false,
        error: { code: 'AMOUNT_EXCEEDED', message: 'Capture amount exceeds held amount' },
      };
    }

    deposit.status = 'CAPTURED';
    deposit.result.status = 'CAPTURED';

    this.logger.log(
      `Mock: Deposit captured: ${depositId} (${captureAmount}), reason: ${reason ?? 'N/A'}`
    );
    return { ...deposit.result };
  }

  // ===========================================
  // Refund Operations
  // ===========================================

  /**
   * Process refund
   */
  async processRefund(request: MockRefundRequest): Promise<MockRefundResult> {
    this.logger.debug(`Mock: Processing refund for: ${request.transactionId}`);

    await this.simulateDelay();

    const payment = this.payments.get(request.transactionId);
    if (!payment) {
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Original transaction not found' },
      };
    }

    if (payment.result.status !== 'CAPTURED') {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Can only refund captured payments',
        },
      };
    }

    if (request.amount > payment.request.amount) {
      return {
        success: false,
        error: { code: 'AMOUNT_EXCEEDED', message: 'Refund amount exceeds original payment' },
      };
    }

    const refundId = this.generateTransactionId('REF');

    const result: MockRefundResult = {
      success: true,
      refundId,
      status: 'COMPLETED',
    };

    this.refunds.set(refundId, result);
    payment.result.status = 'REFUNDED';

    this.logger.log(`Mock: Refund completed: ${refundId}`);
    return result;
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private generateTransactionId(prefix: string): string {
    const counter = String(this.transactionCounter++).padStart(8, '0');
    return `MOCK-${prefix}-${Date.now()}-${counter}`;
  }

  private generateAuthCode(): string {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
  }

  private simulatePaymentError(
    errorType:
      | 'DECLINED'
      | 'INSUFFICIENT_FUNDS'
      | 'EXPIRED_CARD'
      | 'INVALID_CARD'
      | 'NETWORK_ERROR'
      | 'FRAUD_SUSPECTED'
  ): MockPaymentResult {
    const errors: Record<string, { code: string; message: string }> = {
      DECLINED: { code: 'DECLINED', message: 'Transaction declined by issuer' },
      INSUFFICIENT_FUNDS: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds on card' },
      EXPIRED_CARD: { code: 'EXPIRED_CARD', message: 'Card has expired' },
      INVALID_CARD: { code: 'INVALID_CARD', message: 'Invalid card number' },
      NETWORK_ERROR: { code: 'NETWORK_ERROR', message: 'Network communication error' },
      FRAUD_SUSPECTED: { code: 'FRAUD_SUSPECTED', message: 'Transaction flagged for fraud review' },
    };

    const error = errors[errorType];
    this.logger.warn(`Mock: Simulating payment error: ${errorType}`);

    return {
      success: false,
      status: 'FAILED',
      error: error ?? { code: 'UNKNOWN', message: 'Unknown error' },
    };
  }
}
