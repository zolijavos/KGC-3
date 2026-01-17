/**
 * @kgc/rental-checkout - MyPosService Unit Tests
 * Story 16-2: MyPOS Pre-Authorization
 *
 * TDD - Tests for MyPOS integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MyPosService, IMyPosConfig } from './mypos.service';
import {
  MyPosTransactionStatus,
  MyPosErrorCode,
  IMyPosPreAuthRequest,
  IMyPosCaptureRequest,
  IMyPosReleaseRequest,
} from '../interfaces/mypos.interface';

// Mock HTTP client
const mockHttpClient = {
  post: vi.fn(),
  get: vi.fn(),
};

describe('MyPosService', () => {
  let service: MyPosService;

  const mockConfig: IMyPosConfig = {
    apiKey: 'test-api-key',
    merchantId: 'test-merchant-id',
    baseUrl: 'https://sandbox.mypos.eu/api',
    timeout: 30000,
    maxRetries: 3,
    isSandbox: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    service = new MyPosService(mockConfig, mockHttpClient as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================
  // AC1: Pre-Authorization indítás
  // ============================================
  describe('preAuthorize()', () => {
    const validRequest: IMyPosPreAuthRequest = {
      amount: 50000,
      currency: 'HUF',
      description: 'Kaució - Makita HR2470',
      referenceId: 'rental-123',
    };

    describe('happy path', () => {
      it('should successfully authorize amount', async () => {
        // Arrange
        mockHttpClient.post.mockResolvedValue({
          success: true,
          transactionId: 'mypos-txn-12345',
          authCode: 'AUTH123',
          status: 'authorized',
        });

        // Act
        const result = await service.preAuthorize(validRequest);

        // Assert
        expect(result.success).toBe(true);
        expect(result.transactionId).toBe('mypos-txn-12345');
        expect(result.status).toBe(MyPosTransactionStatus.AUTHORIZED);
        expect(result.authCode).toBe('AUTH123');
      });

      it('should send correct request payload', async () => {
        // Arrange
        mockHttpClient.post.mockResolvedValue({
          success: true,
          transactionId: 'mypos-txn-12345',
          status: 'authorized',
        });

        // Act
        await service.preAuthorize(validRequest);

        // Assert
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          expect.stringContaining('/preauth'),
          expect.objectContaining({
            amount: 50000,
            currency: 'HUF',
            description: 'Kaució - Makita HR2470',
            referenceId: 'rental-123',
          }),
          expect.any(Object),
        );
      });

      it('should include authentication headers', async () => {
        // Arrange
        mockHttpClient.post.mockResolvedValue({
          success: true,
          transactionId: 'mypos-txn-12345',
          status: 'authorized',
        });

        // Act
        await service.preAuthorize(validRequest);

        // Assert
        expect(mockHttpClient.post).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(Object),
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-API-Key': 'test-api-key',
              'X-Merchant-ID': 'test-merchant-id',
            }),
          }),
        );
      });
    });

    // ============================================
    // AC2: Pre-Auth sikertelen kezelés
    // ============================================
    describe('error handling', () => {
      it('should handle insufficient funds', async () => {
        // Arrange
        mockHttpClient.post.mockResolvedValue({
          success: false,
          status: 'declined',
          errorCode: 'insufficient_funds',
          errorMessage: 'Nincs elegendő fedezet',
        });

        // Act
        const result = await service.preAuthorize(validRequest);

        // Assert
        expect(result.success).toBe(false);
        expect(result.status).toBe(MyPosTransactionStatus.DECLINED);
        expect(result.errorCode).toBe(MyPosErrorCode.INSUFFICIENT_FUNDS);
        expect(result.errorMessage).toContain('fedezet');
      });

      it('should handle card declined', async () => {
        // Arrange
        mockHttpClient.post.mockResolvedValue({
          success: false,
          status: 'declined',
          errorCode: 'card_declined',
          errorMessage: 'Kártya elutasítva',
        });

        // Act
        const result = await service.preAuthorize(validRequest);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MyPosErrorCode.CARD_DECLINED);
      });

      it('should handle network timeout with retry', async () => {
        // Arrange
        mockHttpClient.post
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockRejectedValueOnce(new Error('Timeout'))
          .mockResolvedValueOnce({
            success: true,
            transactionId: 'mypos-txn-12345',
            status: 'authorized',
          });

        // Act - need to advance timers for retry backoff (1s + 2s)
        const resultPromise = service.preAuthorize(validRequest);
        await vi.advanceTimersByTimeAsync(3100); // 1000ms + 2000ms + buffer
        const result = await resultPromise;

        // Assert
        expect(result.success).toBe(true);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(3);
      });

      it('should fail after max retries', async () => {
        // Arrange
        mockHttpClient.post.mockRejectedValue(new Error('Network error'));

        // Act - need to advance timers for retry backoff (1s + 2s)
        const resultPromise = service.preAuthorize(validRequest);
        await vi.advanceTimersByTimeAsync(3100); // 1000ms + 2000ms + buffer
        const result = await resultPromise;

        // Assert
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MyPosErrorCode.NETWORK_ERROR);
        expect(mockHttpClient.post).toHaveBeenCalledTimes(3); // maxRetries
      });

      it('should handle timeout (30 sec)', async () => {
        // Arrange - mock that takes longer than timeout
        mockHttpClient.post.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 35000)),
        );

        // Act - advance time for all 3 retry attempts:
        // - 3x 30sec timeout = 90000ms
        // - 2x backoff (1000ms + 2000ms) = 3000ms
        // Total: 93000ms
        const resultPromise = service.preAuthorize(validRequest);
        await vi.advanceTimersByTimeAsync(95000);
        const result = await resultPromise;

        // Assert
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MyPosErrorCode.TIMEOUT);
      });
    });

    describe('validation', () => {
      it('should reject negative amount', async () => {
        // Arrange
        const invalidRequest = { ...validRequest, amount: -1000 };

        // Act
        const result = await service.preAuthorize(invalidRequest);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MyPosErrorCode.INVALID_AMOUNT);
      });

      it('should reject zero amount', async () => {
        // Arrange
        const invalidRequest = { ...validRequest, amount: 0 };

        // Act
        const result = await service.preAuthorize(invalidRequest);

        // Assert
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe(MyPosErrorCode.INVALID_AMOUNT);
      });
    });
  });

  // ============================================
  // AC3: Pre-Auth feloldás (release)
  // ============================================
  describe('release()', () => {
    const validRequest: IMyPosReleaseRequest = {
      transactionId: 'mypos-txn-12345',
      description: 'Bérlés sikeres lezárás - kaució visszaadva',
    };

    it('should successfully release hold', async () => {
      // Arrange
      mockHttpClient.post.mockResolvedValue({
        success: true,
        status: 'released',
        releasedAmount: 50000,
      });

      // Act
      const result = await service.release(validRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(MyPosTransactionStatus.RELEASED);
      expect(result.releasedAmount).toBe(50000);
    });

    it('should handle transaction not found', async () => {
      // Arrange
      mockHttpClient.post.mockResolvedValue({
        success: false,
        status: 'error',
        errorCode: 'transaction_not_found',
        errorMessage: 'Tranzakció nem található',
      });

      // Act
      const result = await service.release(validRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(MyPosErrorCode.TRANSACTION_NOT_FOUND);
    });
  });

  // ============================================
  // AC4: Pre-Auth capture (levonás)
  // ============================================
  describe('capture()', () => {
    const validRequest: IMyPosCaptureRequest = {
      transactionId: 'mypos-txn-12345',
      amount: 50000,
      description: 'Sérülés miatti levonás',
    };

    it('should successfully capture full amount', async () => {
      // Arrange
      mockHttpClient.post.mockResolvedValue({
        success: true,
        captureTransactionId: 'capture-txn-67890',
        capturedAmount: 50000,
        status: 'captured',
      });

      // Act
      const result = await service.capture(validRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe(MyPosTransactionStatus.CAPTURED);
      expect(result.capturedAmount).toBe(50000);
      expect(result.captureTransactionId).toBe('capture-txn-67890');
    });

    it('should capture partial amount', async () => {
      // Arrange
      const partialRequest = { ...validRequest, amount: 20000 };
      mockHttpClient.post.mockResolvedValue({
        success: true,
        captureTransactionId: 'capture-txn-67890',
        capturedAmount: 20000,
        status: 'captured',
      });

      // Act
      const result = await service.capture(partialRequest);

      // Assert
      expect(result.success).toBe(true);
      expect(result.capturedAmount).toBe(20000);
    });

    it('should handle capture failure', async () => {
      // Arrange
      mockHttpClient.post.mockResolvedValue({
        success: false,
        status: 'error',
        errorCode: 'general_error',
        errorMessage: 'Capture failed',
      });

      // Act
      const result = await service.capture(validRequest);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(MyPosErrorCode.GENERAL_ERROR);
    });
  });

  // ============================================
  // AC5: Utility methods
  // ============================================
  describe('getTransaction()', () => {
    it('should return transaction info', async () => {
      // Arrange
      mockHttpClient.get.mockResolvedValue({
        transactionId: 'mypos-txn-12345',
        status: 'authorized',
        originalAmount: 50000,
        referenceId: 'rental-123',
        createdAt: '2026-01-17T10:00:00Z',
        updatedAt: '2026-01-17T10:00:00Z',
        expiresAt: '2026-01-24T10:00:00Z',
      });

      // Act
      const result = await service.getTransaction('mypos-txn-12345');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.transactionId).toBe('mypos-txn-12345');
      expect(result?.status).toBe(MyPosTransactionStatus.AUTHORIZED);
      expect(result?.originalAmount).toBe(50000);
    });

    it('should return null for non-existent transaction', async () => {
      // Arrange
      mockHttpClient.get.mockResolvedValue(null);

      // Act
      const result = await service.getTransaction('non-existent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('healthCheck()', () => {
    it('should return true when API is available', async () => {
      // Arrange
      mockHttpClient.get.mockResolvedValue({ status: 'ok' });

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when API is unavailable', async () => {
      // Arrange
      mockHttpClient.get.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result).toBe(false);
    });
  });
});
