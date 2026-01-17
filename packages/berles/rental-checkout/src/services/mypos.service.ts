/**
 * @kgc/rental-checkout - MyPosService
 * Story 16-2: MyPOS Pre-Authorization
 *
 * MyPOS API integration for card pre-authorization (deposit holds)
 */

import { Injectable } from '@nestjs/common';
import {
  IMyPosService,
  IMyPosPreAuthRequest,
  IMyPosPreAuthResponse,
  IMyPosCaptureRequest,
  IMyPosCaptureResponse,
  IMyPosReleaseRequest,
  IMyPosReleaseResponse,
  IMyPosTransactionInfo,
  MyPosTransactionStatus,
  MyPosErrorCode,
} from '../interfaces/mypos.interface';

/**
 * MyPOS configuration
 */
export interface IMyPosConfig {
  /** API Key */
  apiKey: string;
  /** Merchant ID */
  merchantId: string;
  /** Base URL (sandbox or production) */
  baseUrl: string;
  /** Request timeout in ms */
  timeout: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Is sandbox environment */
  isSandbox: boolean;
}

/**
 * HTTP Client interface for dependency injection
 */
export interface IHttpClient {
  post<T>(url: string, data: unknown, options?: { headers?: Record<string, string>; timeout?: number }): Promise<T>;
  get<T>(url: string, options?: { headers?: Record<string, string>; timeout?: number }): Promise<T>;
}

/**
 * Sleep helper for exponential backoff
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * MyPOS Service Implementation
 *
 * Handles card pre-authorization for deposit management
 */
@Injectable()
export class MyPosService implements IMyPosService {
  constructor(
    private readonly config: IMyPosConfig,
    private readonly httpClient: IHttpClient,
  ) {}

  /**
   * Get common headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
      'X-Merchant-ID': this.config.merchantId,
    };
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Exponential backoff: 1s, 2s, 4s...
        if (attempt < maxRetries - 1) {
          await sleep(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError;
  }

  /**
   * Map API status to internal enum
   */
  private mapStatus(apiStatus: string): MyPosTransactionStatus {
    const statusMap: Record<string, MyPosTransactionStatus> = {
      pending: MyPosTransactionStatus.PENDING,
      authorized: MyPosTransactionStatus.AUTHORIZED,
      released: MyPosTransactionStatus.RELEASED,
      captured: MyPosTransactionStatus.CAPTURED,
      declined: MyPosTransactionStatus.DECLINED,
      error: MyPosTransactionStatus.ERROR,
      expired: MyPosTransactionStatus.EXPIRED,
    };
    return statusMap[apiStatus] || MyPosTransactionStatus.ERROR;
  }

  /**
   * Map API error code to internal enum
   */
  private mapErrorCode(apiErrorCode: string): MyPosErrorCode {
    const errorMap: Record<string, MyPosErrorCode> = {
      insufficient_funds: MyPosErrorCode.INSUFFICIENT_FUNDS,
      card_declined: MyPosErrorCode.CARD_DECLINED,
      invalid_card: MyPosErrorCode.INVALID_CARD,
      expired_card: MyPosErrorCode.EXPIRED_CARD,
      network_error: MyPosErrorCode.NETWORK_ERROR,
      timeout: MyPosErrorCode.TIMEOUT,
      transaction_not_found: MyPosErrorCode.TRANSACTION_NOT_FOUND,
      invalid_amount: MyPosErrorCode.INVALID_AMOUNT,
      general_error: MyPosErrorCode.GENERAL_ERROR,
    };
    return errorMap[apiErrorCode] || MyPosErrorCode.GENERAL_ERROR;
  }

  /**
   * Pre-authorize amount on card (create hold)
   */
  async preAuthorize(request: IMyPosPreAuthRequest): Promise<IMyPosPreAuthResponse> {
    // Validate amount
    if (request.amount <= 0) {
      return {
        success: false,
        status: MyPosTransactionStatus.ERROR,
        errorCode: MyPosErrorCode.INVALID_AMOUNT,
        errorMessage: 'Összeg pozitív egész szám kell legyen',
        timestamp: new Date(),
      };
    }

    try {
      const response = await this.executeWithRetry(async () => {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout);
        });

        const requestPromise = this.httpClient.post<{
          success: boolean;
          transactionId?: string;
          authCode?: string;
          status: string;
          errorCode?: string;
          errorMessage?: string;
        }>(
          `${this.config.baseUrl}/preauth`,
          {
            amount: request.amount,
            currency: request.currency || 'HUF',
            description: request.description,
            referenceId: request.referenceId,
            customerEmail: request.customerEmail,
          },
          {
            headers: this.getHeaders(),
            timeout: this.config.timeout,
          },
        );

        return Promise.race([requestPromise, timeoutPromise]);
      });

      const result: IMyPosPreAuthResponse = {
        success: response.success,
        status: this.mapStatus(response.status),
        timestamp: new Date(),
      };
      if (response.transactionId !== undefined) {
        result.transactionId = response.transactionId;
      }
      if (response.authCode !== undefined) {
        result.authCode = response.authCode;
      }
      if (response.errorCode) {
        result.errorCode = this.mapErrorCode(response.errorCode);
      }
      if (response.errorMessage !== undefined) {
        result.errorMessage = response.errorMessage;
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Timeout')) {
        return {
          success: false,
          status: MyPosTransactionStatus.ERROR,
          errorCode: MyPosErrorCode.TIMEOUT,
          errorMessage: 'Kérés időtúllépés',
          timestamp: new Date(),
        };
      }

      return {
        success: false,
        status: MyPosTransactionStatus.ERROR,
        errorCode: MyPosErrorCode.NETWORK_ERROR,
        errorMessage: `Hálózati hiba: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Capture (charge) a pre-authorized amount
   */
  async capture(request: IMyPosCaptureRequest): Promise<IMyPosCaptureResponse> {
    try {
      const response = await this.executeWithRetry(async () => {
        return this.httpClient.post<{
          success: boolean;
          captureTransactionId?: string;
          capturedAmount?: number;
          status: string;
          errorCode?: string;
          errorMessage?: string;
        }>(
          `${this.config.baseUrl}/capture`,
          {
            transactionId: request.transactionId,
            amount: request.amount,
            description: request.description,
          },
          {
            headers: this.getHeaders(),
            timeout: this.config.timeout,
          },
        );
      });

      const result: IMyPosCaptureResponse = {
        success: response.success,
        status: this.mapStatus(response.status),
        timestamp: new Date(),
      };
      if (response.captureTransactionId !== undefined) {
        result.captureTransactionId = response.captureTransactionId;
      }
      if (response.capturedAmount !== undefined) {
        result.capturedAmount = response.capturedAmount;
      }
      if (response.errorCode) {
        result.errorCode = this.mapErrorCode(response.errorCode);
      }
      if (response.errorMessage !== undefined) {
        result.errorMessage = response.errorMessage;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        status: MyPosTransactionStatus.ERROR,
        errorCode: MyPosErrorCode.NETWORK_ERROR,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Release (void) a pre-authorized hold
   */
  async release(request: IMyPosReleaseRequest): Promise<IMyPosReleaseResponse> {
    try {
      const response = await this.executeWithRetry(async () => {
        return this.httpClient.post<{
          success: boolean;
          status: string;
          releasedAmount?: number;
          errorCode?: string;
          errorMessage?: string;
        }>(
          `${this.config.baseUrl}/release`,
          {
            transactionId: request.transactionId,
            description: request.description,
          },
          {
            headers: this.getHeaders(),
            timeout: this.config.timeout,
          },
        );
      });

      const result: IMyPosReleaseResponse = {
        success: response.success,
        status: this.mapStatus(response.status),
        timestamp: new Date(),
      };
      if (response.releasedAmount !== undefined) {
        result.releasedAmount = response.releasedAmount;
      }
      if (response.errorCode) {
        result.errorCode = this.mapErrorCode(response.errorCode);
      }
      if (response.errorMessage !== undefined) {
        result.errorMessage = response.errorMessage;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        status: MyPosTransactionStatus.ERROR,
        errorCode: MyPosErrorCode.NETWORK_ERROR,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get transaction status/info
   */
  async getTransaction(transactionId: string): Promise<IMyPosTransactionInfo | null> {
    try {
      const response = await this.httpClient.get<{
        transactionId: string;
        status: string;
        originalAmount: number;
        capturedAmount?: number;
        referenceId: string;
        createdAt: string;
        updatedAt: string;
        expiresAt?: string;
      } | null>(
        `${this.config.baseUrl}/transactions/${transactionId}`,
        {
          headers: this.getHeaders(),
          timeout: this.config.timeout,
        },
      );

      if (!response) {
        return null;
      }

      const result: IMyPosTransactionInfo = {
        transactionId: response.transactionId,
        status: this.mapStatus(response.status),
        originalAmount: response.originalAmount,
        referenceId: response.referenceId,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
      };
      if (response.capturedAmount !== undefined) {
        result.capturedAmount = response.capturedAmount;
      }
      if (response.expiresAt) {
        result.expiresAt = new Date(response.expiresAt);
      }
      return result;
    } catch {
      return null;
    }
  }

  /**
   * Health check - verify API connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get<{ status: string }>(
        `${this.config.baseUrl}/health`,
        {
          headers: this.getHeaders(),
          timeout: 5000,
        },
      );
      return response?.status === 'ok';
    } catch {
      return false;
    }
  }
}
