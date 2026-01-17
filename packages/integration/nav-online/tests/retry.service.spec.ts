/**
 * Retry Service Tests
 * Story 11-3: Retry Logic és Error Handling
 * @package @kgc/nav-online
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RetryService } from '../src/services/retry.service';
import { DEFAULT_RETRY_CONFIG } from '../src/interfaces/retry.interface';

describe('RetryService', () => {
  let retryService: RetryService;

  beforeEach(() => {
    retryService = new RetryService();
  });

  describe('calculateNextDelay', () => {
    it('should calculate exponential backoff delay', () => {
      const delay0 = retryService.calculateNextDelay(0);
      const delay1 = retryService.calculateNextDelay(1);
      const delay2 = retryService.calculateNextDelay(2);

      // Base delay is 1000ms, multiplier is 2
      // Allow for jitter (±10%)
      expect(delay0).toBeGreaterThanOrEqual(900);
      expect(delay0).toBeLessThanOrEqual(1100);

      expect(delay1).toBeGreaterThanOrEqual(1800);
      expect(delay1).toBeLessThanOrEqual(2200);

      expect(delay2).toBeGreaterThanOrEqual(3600);
      expect(delay2).toBeLessThanOrEqual(4400);
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = retryService.calculateNextDelay(10); // Would be 1024000ms without cap

      expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs * 1.1);
    });
  });

  describe('calculateNextRetryAt', () => {
    it('should return future date', () => {
      const now = new Date();
      const nextRetry = retryService.calculateNextRetryAt(0);

      expect(nextRetry.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable error codes', () => {
      expect(retryService.isRetryable('TIMEOUT')).toBe(true);
      expect(retryService.isRetryable('CONNECTION_ERROR')).toBe(true);
      expect(retryService.isRetryable('RATE_LIMIT')).toBe(true);
      expect(retryService.isRetryable('SERVICE_UNAVAILABLE')).toBe(true);
      expect(retryService.isRetryable('NAV_TEMPORARY_ERROR')).toBe(true);
    });

    it('should return false for permanent error codes', () => {
      expect(retryService.isRetryable('INVALID_TAX_NUMBER')).toBe(false);
      expect(retryService.isRetryable('INVALID_INVOICE_DATA')).toBe(false);
      expect(retryService.isRetryable('DUPLICATE_INVOICE')).toBe(false);
      expect(retryService.isRetryable('AUTH_ERROR')).toBe(false);
    });

    it('should return false for unknown error codes', () => {
      expect(retryService.isRetryable('UNKNOWN_ERROR')).toBe(false);
    });
  });

  describe('shouldRetry', () => {
    it('should return true when attempts < maxRetries and error is retryable', () => {
      const state = {
        attempt: 2,
        nextRetryAt: new Date(),
        lastError: 'Connection timeout',
        lastErrorCode: 'TIMEOUT',
      };

      expect(retryService.shouldRetry(state)).toBe(true);
    });

    it('should return false when max retries reached', () => {
      const state = {
        attempt: 5,
        nextRetryAt: null,
        lastError: 'Connection timeout',
        lastErrorCode: 'TIMEOUT',
      };

      expect(retryService.shouldRetry(state)).toBe(false);
    });

    it('should return false when error is not retryable', () => {
      const state = {
        attempt: 1,
        nextRetryAt: new Date(),
        lastError: 'Invalid tax number',
        lastErrorCode: 'INVALID_TAX_NUMBER',
      };

      expect(retryService.shouldRetry(state)).toBe(false);
    });
  });

  describe('updateRetryState', () => {
    it('should increment attempt and calculate next retry for retryable errors', () => {
      const currentState = {
        attempt: 0,
        nextRetryAt: null,
        lastError: null,
        lastErrorCode: null,
      };

      const newState = retryService.updateRetryState(
        currentState,
        'TIMEOUT',
        'Connection timeout',
      );

      expect(newState.attempt).toBe(1);
      expect(newState.nextRetryAt).not.toBeNull();
      expect(newState.lastError).toBe('Connection timeout');
      expect(newState.lastErrorCode).toBe('TIMEOUT');
    });

    it('should not set nextRetryAt when max retries reached', () => {
      const currentState = {
        attempt: 4,
        nextRetryAt: new Date(),
        lastError: null,
        lastErrorCode: null,
      };

      const newState = retryService.updateRetryState(
        currentState,
        'TIMEOUT',
        'Connection timeout',
      );

      expect(newState.attempt).toBe(5);
      expect(newState.nextRetryAt).toBeNull();
    });

    it('should not set nextRetryAt for permanent errors', () => {
      const currentState = {
        attempt: 0,
        nextRetryAt: null,
        lastError: null,
        lastErrorCode: null,
      };

      const newState = retryService.updateRetryState(
        currentState,
        'INVALID_TAX_NUMBER',
        'Invalid tax number format',
      );

      expect(newState.attempt).toBe(1);
      expect(newState.nextRetryAt).toBeNull();
    });
  });

  describe('executeWithRetry', () => {
    it('should return success on first attempt if operation succeeds', async () => {
      const operation = vi.fn().mockResolvedValue({ data: 'success' });

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: 'success' });
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Connection timeout');
      (error as Error & { code: string }).code = 'TIMEOUT';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: 'success' });

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(true);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on permanent errors', async () => {
      const error = new Error('Invalid tax number');
      (error as Error & { code: string }).code = 'INVALID_TAX_NUMBER';

      const operation = vi.fn().mockRejectedValue(error);

      const result = await retryService.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.error?.retryable).toBe(false);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback on each retry', async () => {
      const error = new Error('Connection timeout');
      (error as Error & { code: string }).code = 'TIMEOUT';

      const operation = vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: 'success' });

      const onRetry = vi.fn();

      await retryService.executeWithRetry(operation, onRetry);

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenCalledWith(1, error);
      expect(onRetry).toHaveBeenCalledWith(2, error);
    });

    it('should return failure after max retries exceeded', async () => {
      const error = new Error('Connection timeout');
      (error as Error & { code: string }).code = 'TIMEOUT';

      const operation = vi.fn().mockRejectedValue(error);

      // Use a service with only 2 max retries
      const limitedRetryService = new RetryService({ maxRetries: 2 });
      const result = await limitedRetryService.executeWithRetry(operation);

      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(false);
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('createQueueItem', () => {
    it('should create queue item with default values', () => {
      const item = retryService.createQueueItem('tenant-1', 'invoice-1');

      expect(item.tenantId).toBe('tenant-1');
      expect(item.invoiceId).toBe('invoice-1');
      expect(item.priority).toBe(0);
      expect(item.attempts).toBe(0);
      expect(item.maxAttempts).toBe(5);
      expect(item.isProcessing).toBe(false);
      expect(item.lastError).toBeNull();
    });

    it('should accept custom priority and scheduled time', () => {
      const scheduledAt = new Date('2026-01-20');
      const item = retryService.createQueueItem('tenant-1', 'invoice-1', 5, scheduledAt);

      expect(item.priority).toBe(5);
      expect(item.scheduledAt).toEqual(scheduledAt);
    });
  });

  describe('isMaxRetriesReached', () => {
    it('should return true when attempts >= maxRetries', () => {
      expect(retryService.isMaxRetriesReached(5)).toBe(true);
      expect(retryService.isMaxRetriesReached(6)).toBe(true);
    });

    it('should return false when attempts < maxRetries', () => {
      expect(retryService.isMaxRetriesReached(0)).toBe(false);
      expect(retryService.isMaxRetriesReached(4)).toBe(false);
    });
  });

  describe('custom configuration', () => {
    it('should use custom retry configuration', () => {
      const customService = new RetryService({
        maxRetries: 3,
        baseDelayMs: 500,
        backoffMultiplier: 3,
      });

      const config = customService.getConfig();

      expect(config.maxRetries).toBe(3);
      expect(config.baseDelayMs).toBe(500);
      expect(config.backoffMultiplier).toBe(3);
    });
  });
});
