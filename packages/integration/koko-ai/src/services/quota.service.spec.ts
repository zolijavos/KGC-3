import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  QuotaService,
  IQuotaUsageRepository,
  ITenantConfigRepository,
  IRateLimitCache,
  IAuditService,
} from './quota.service';
import { IQuotaUsage, QuotaTier } from '../interfaces/koko.interface';

const mockQuotaUsageRepository: IQuotaUsageRepository = {
  findByTenantAndPeriod: vi.fn(),
  upsert: vi.fn(),
  incrementUsage: vi.fn(),
};

const mockTenantConfigRepository: ITenantConfigRepository = {
  getQuotaTier: vi.fn(),
  updateQuotaTier: vi.fn(),
};

const mockRateLimitCache: IRateLimitCache = {
  get: vi.fn(),
  increment: vi.fn(),
};

const mockAuditService: IAuditService = {
  log: vi.fn(),
};

describe('QuotaService', () => {
  let service: QuotaService;

  const mockTenantId = 'tenant-1';
  const mockUserId = 'user-1';
  const mockPeriod = '2026-01';

  const mockQuotaUsage: IQuotaUsage = {
    id: '00000000-0000-0000-0000-000000000001',
    tenantId: mockTenantId,
    period: mockPeriod,
    requestCount: 50,
    tokenCount: 25000,
    tier: QuotaTier.BASIC,
    limitReached: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15'));

    service = new QuotaService(
      mockQuotaUsageRepository,
      mockTenantConfigRepository,
      mockRateLimitCache,
      mockAuditService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkQuota', () => {
    it('should allow request when within limits', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuotaUsage);

      const result = await service.checkQuota(
        { tenantId: mockTenantId, estimatedTokens: 500 },
        mockUserId,
      );

      expect(result.allowed).toBe(true);
      expect(result.remainingRequests).toBe(950); // 1000 - 50
    });

    it('should deny request when rate limited (per minute)', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        count: 20,
        resetAt: new Date('2026-01-15T00:01:00Z'),
      });

      const result = await service.checkQuota(
        { tenantId: mockTenantId, estimatedTokens: 500 },
        mockUserId,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('rate_limited');
    });

    it('should deny request when monthly quota exceeded', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.FREE);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        requestCount: 100, // FREE tier limit
        tier: QuotaTier.FREE,
      });

      const result = await service.checkQuota(
        { tenantId: mockTenantId, estimatedTokens: 500 },
        mockUserId,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('quota_exceeded');
    });

    it('should deny request when token limit exceeded', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.FREE);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        requestCount: 50,
        tokenCount: 49900, // Almost at limit
        tier: QuotaTier.FREE,
      });

      const result = await service.checkQuota(
        { tenantId: mockTenantId, estimatedTokens: 500 }, // Would exceed 50000
        mockUserId,
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('tier_limit');
    });

    it('should allow unlimited tier', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.UNLIMITED);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        requestCount: 100000,
        tier: QuotaTier.UNLIMITED,
      });

      const result = await service.checkQuota(
        { tenantId: mockTenantId, estimatedTokens: 5000 },
        mockUserId,
      );

      expect(result.allowed).toBe(true);
    });
  });

  describe('recordUsage', () => {
    it('should increment usage counters', async () => {
      (mockRateLimitCache.increment as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1, resetAt: new Date() });
      (mockQuotaUsageRepository.incrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        requestCount: 51,
        tokenCount: 25500,
      });
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);

      const result = await service.recordUsage(
        { tenantId: mockTenantId, requestType: 'chat', tokenCount: 500, success: true },
        mockUserId,
      );

      expect(result.requestCount).toBe(51);
      expect(mockRateLimitCache.increment).toHaveBeenCalledTimes(2); // minute + hour
    });

    it('should log when limit reached', async () => {
      (mockRateLimitCache.increment as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1, resetAt: new Date() });
      (mockQuotaUsageRepository.incrementUsage as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        requestCount: 1000, // BASIC limit
        tokenCount: 500000,
        tier: QuotaTier.BASIC,
      });
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockQuotaUsageRepository.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        limitReached: true,
      });

      await service.recordUsage(
        { tenantId: mockTenantId, requestType: 'chat', tokenCount: 500, success: true },
        mockUserId,
      );

      expect(mockQuotaUsageRepository.upsert).toHaveBeenCalledWith(
        mockTenantId,
        mockPeriod,
        { limitReached: true },
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'quota_limit_reached' }),
      );
    });
  });

  describe('getQuotaUsage', () => {
    it('should return usage with percentage', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuotaUsage);

      const result = await service.getQuotaUsage(
        { tenantId: mockTenantId },
        mockUserId,
      );

      expect(result.usage?.requestCount).toBe(50);
      expect(result.percentUsed.requests).toBe(5); // 50/1000 * 100
      expect(result.percentUsed.tokens).toBe(5); // 25000/500000 * 100
    });

    it('should return zero percent when no usage', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getQuotaUsage(
        { tenantId: mockTenantId },
        mockUserId,
      );

      expect(result.usage).toBeNull();
      expect(result.percentUsed.requests).toBe(0);
      expect(result.percentUsed.tokens).toBe(0);
    });
  });

  describe('updateQuotaTier', () => {
    it('should update tier successfully', async () => {
      await service.updateQuotaTier(
        { tenantId: mockTenantId, tier: QuotaTier.PREMIUM },
        mockUserId,
      );

      expect(mockTenantConfigRepository.updateQuotaTier).toHaveBeenCalledWith(
        mockTenantId,
        QuotaTier.PREMIUM,
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'quota_tier_updated' }),
      );
    });

    it('should return new tier config', async () => {
      const result = await service.updateQuotaTier(
        { tenantId: mockTenantId, tier: QuotaTier.PREMIUM },
        mockUserId,
      );

      expect(result.tier).toBe(QuotaTier.PREMIUM);
      expect(result.config.monthlyRequestLimit).toBe(10000);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return rate limit status', async () => {
      (mockTenantConfigRepository.getQuotaTier as ReturnType<typeof vi.fn>).mockResolvedValue(QuotaTier.BASIC);
      (mockRateLimitCache.get as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ count: 5, resetAt: new Date('2026-01-15T00:01:00Z') })
        .mockResolvedValueOnce({ count: 50, resetAt: new Date('2026-01-15T01:00:00Z') });

      const result = await service.getRateLimitStatus(mockTenantId);

      expect(result.minute.remaining).toBe(15); // 20 - 5
      expect(result.hour.remaining).toBe(150); // 200 - 50
    });
  });

  describe('getQuotaConfig', () => {
    it('should return config for tier', async () => {
      const result = await service.getQuotaConfig(QuotaTier.PREMIUM);

      expect(result.monthlyRequestLimit).toBe(10000);
      expect(result.rateLimit.requestsPerMinute).toBe(60);
    });
  });

  describe('isQuotaExceeded', () => {
    it('should return true when limit reached', async () => {
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockQuotaUsage,
        limitReached: true,
      });

      const result = await service.isQuotaExceeded(mockTenantId);

      expect(result).toBe(true);
    });

    it('should return false when within limits', async () => {
      (mockQuotaUsageRepository.findByTenantAndPeriod as ReturnType<typeof vi.fn>).mockResolvedValue(mockQuotaUsage);

      const result = await service.isQuotaExceeded(mockTenantId);

      expect(result).toBe(false);
    });
  });
});
