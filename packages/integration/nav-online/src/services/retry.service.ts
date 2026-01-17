/**
 * Retry Service
 * Story 11-3: Retry Logic és Error Handling
 * ADR-030: Exponential backoff strategy
 * @package @kgc/nav-online
 */

import { Injectable, Logger } from '@nestjs/common';
import type {
  RetryConfig,
  RetryState,
  RetryResult,
  RetryQueueItem,
} from '../interfaces/retry.interface';
import { DEFAULT_RETRY_CONFIG } from '../interfaces/retry.interface';

/**
 * Retry Service
 * Handles exponential backoff and retry queue management
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = {
      ...DEFAULT_RETRY_CONFIG,
      ...config,
    };
  }

  /**
   * Következő retry delay számítása exponenciális backoff-al
   */
  calculateNextDelay(attempt: number): number {
    const delay = Math.min(
      this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt),
      this.config.maxDelayMs,
    );

    // Add jitter (±10%) to prevent thundering herd
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);

    return Math.round(delay + jitter);
  }

  /**
   * Következő retry időpont számítása
   */
  calculateNextRetryAt(attempt: number): Date {
    const delay = this.calculateNextDelay(attempt);
    return new Date(Date.now() + delay);
  }

  /**
   * Ellenőrzi, hogy a hiba újrapróbálható-e
   */
  isRetryable(errorCode: string): boolean {
    if (this.config.permanentCodes.includes(errorCode)) {
      return false;
    }
    return this.config.retryableCodes.includes(errorCode);
  }

  /**
   * Ellenőrzi, hogy folytatható-e a retry
   */
  shouldRetry(state: RetryState): boolean {
    return state.attempt < this.config.maxRetries && this.isRetryable(state.lastErrorCode ?? '');
  }

  /**
   * Retry állapot frissítése hiba után
   */
  updateRetryState(currentState: RetryState, errorCode: string, errorMessage: string): RetryState {
    const newAttempt = currentState.attempt + 1;
    const shouldContinue = newAttempt < this.config.maxRetries && this.isRetryable(errorCode);

    return {
      attempt: newAttempt,
      nextRetryAt: shouldContinue ? this.calculateNextRetryAt(newAttempt) : null,
      lastError: errorMessage,
      lastErrorCode: errorCode,
    };
  }

  /**
   * Retry végrehajtása promise-zal
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number, error: Error) => void,
  ): Promise<RetryResult & { result?: T }> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.config.maxRetries) {
      try {
        const result = await operation();
        return {
          success: true,
          shouldRetry: false,
          result,
        };
      } catch (error) {
        lastError = error as Error;
        const errorCode = this.extractErrorCode(error as Error);

        if (!this.isRetryable(errorCode)) {
          this.logger.warn(`Permanent error on attempt ${attempt + 1}: ${errorCode}`);
          return {
            success: false,
            shouldRetry: false,
            error: {
              code: errorCode,
              message: lastError.message,
              retryable: false,
            },
          };
        }

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateNextDelay(attempt);
          this.logger.debug(`Retry attempt ${attempt + 1} in ${delay}ms`);

          if (onRetry) {
            onRetry(attempt + 1, lastError);
          }

          await this.sleep(delay);
        }

        attempt++;
      }
    }

    return {
      success: false,
      shouldRetry: false,
      error: {
        code: lastError ? this.extractErrorCode(lastError) : 'UNKNOWN_ERROR',
        message: lastError?.message ?? 'Max retries exceeded',
        retryable: false,
      },
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Hibakód kinyerése Error objektumból
   */
  private extractErrorCode(error: Error): string {
    // Check for custom error code property
    if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
      return (error as { code: string }).code;
    }

    // Check for HTTP status in axios errors
    if ('response' in error) {
      const response = (error as { response?: { status?: number } }).response;
      if (response?.status === 429) return 'RATE_LIMIT';
      if (response?.status === 503) return 'SERVICE_UNAVAILABLE';
      if (response?.status === 504) return 'TIMEOUT';
    }

    // Check for network errors
    if (error.message.includes('timeout')) return 'TIMEOUT';
    if (error.message.includes('ECONNREFUSED')) return 'CONNECTION_ERROR';
    if (error.message.includes('ENOTFOUND')) return 'CONNECTION_ERROR';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Queue elem létrehozása
   */
  createQueueItem(
    tenantId: string,
    invoiceId: string,
    priority: number = 0,
    scheduledAt?: Date,
  ): Omit<RetryQueueItem, 'id' | 'createdAt'> {
    return {
      tenantId,
      invoiceId,
      priority,
      scheduledAt: scheduledAt ?? new Date(),
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      isProcessing: false,
      lastError: null,
    };
  }

  /**
   * Queue elem frissítése sikertelen próbálkozás után
   */
  updateQueueItemOnFailure(
    item: RetryQueueItem,
    errorMessage: string,
  ): RetryQueueItem {
    const newAttempts = item.attempts + 1;
    const shouldContinue = newAttempts < item.maxAttempts;

    return {
      ...item,
      attempts: newAttempts,
      scheduledAt: shouldContinue ? this.calculateNextRetryAt(newAttempts) : item.scheduledAt,
      isProcessing: false,
      lastError: errorMessage,
    };
  }

  /**
   * Konfiguráció lekérése
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Maximum retry elérve-e
   */
  isMaxRetriesReached(attempts: number): boolean {
    return attempts >= this.config.maxRetries;
  }
}
