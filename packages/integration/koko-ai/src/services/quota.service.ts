/**
 * @kgc/koko-ai - QuotaService
 * Epic 31: Story 31-3 - AI Quota és Rate Limiting
 */

import { Injectable } from '@nestjs/common';
import {
  CheckQuotaDto,
  CheckQuotaSchema,
  GetQuotaUsageDto,
  GetQuotaUsageSchema,
  RecordUsageDto,
  RecordUsageSchema,
  UpdateQuotaTierDto,
  UpdateQuotaTierSchema,
} from '../dto/koko.dto';
import {
  IQuotaConfig,
  IQuotaUsage,
  IRateLimitStatus,
  QuotaTier,
} from '../interfaces/koko.interface';

export interface IQuotaUsageRepository {
  findByTenantAndPeriod(tenantId: string, period: string): Promise<IQuotaUsage | null>;
  upsert(tenantId: string, period: string, data: Partial<IQuotaUsage>): Promise<IQuotaUsage>;
  incrementUsage(
    tenantId: string,
    period: string,
    requestCount: number,
    tokenCount: number
  ): Promise<IQuotaUsage>;
}

export interface ITenantConfigRepository {
  getQuotaTier(tenantId: string): Promise<QuotaTier>;
  updateQuotaTier(tenantId: string, tier: QuotaTier): Promise<void>;
}

export interface IRateLimitCache {
  get(key: string): Promise<{ count: number; resetAt: Date } | null>;
  increment(key: string, windowSeconds: number): Promise<{ count: number; resetAt: Date }>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

const QUOTA_CONFIGS: Record<QuotaTier, IQuotaConfig> = {
  [QuotaTier.FREE]: {
    tier: QuotaTier.FREE,
    monthlyRequestLimit: 100,
    monthlyTokenLimit: 50000,
    rateLimit: {
      requestsPerMinute: 5,
      requestsPerHour: 30,
    },
  },
  [QuotaTier.BASIC]: {
    tier: QuotaTier.BASIC,
    monthlyRequestLimit: 1000,
    monthlyTokenLimit: 500000,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerHour: 200,
    },
  },
  [QuotaTier.PREMIUM]: {
    tier: QuotaTier.PREMIUM,
    monthlyRequestLimit: 10000,
    monthlyTokenLimit: 5000000,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  },
  [QuotaTier.UNLIMITED]: {
    tier: QuotaTier.UNLIMITED,
    monthlyRequestLimit: Number.MAX_SAFE_INTEGER,
    monthlyTokenLimit: Number.MAX_SAFE_INTEGER,
    rateLimit: {
      requestsPerMinute: 120,
      requestsPerHour: 5000,
    },
  },
};

@Injectable()
export class QuotaService {
  constructor(
    private readonly quotaUsageRepository: IQuotaUsageRepository,
    private readonly tenantConfigRepository: ITenantConfigRepository,
    private readonly rateLimitCache: IRateLimitCache,
    private readonly auditService: IAuditService
  ) {}

  async checkQuota(input: CheckQuotaDto, _userId: string): Promise<IRateLimitStatus> {
    const validationResult = CheckQuotaSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const tenantId = validInput.tenantId;

    // Get tenant's quota tier
    const tier = await this.tenantConfigRepository.getQuotaTier(tenantId);
    const config = QUOTA_CONFIGS[tier];

    // Check rate limit (per minute)
    const minuteKey = `ratelimit:${tenantId}:minute`;
    const minuteLimit = await this.rateLimitCache.get(minuteKey);
    if (minuteLimit && minuteLimit.count >= config.rateLimit.requestsPerMinute) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetAt: minuteLimit.resetAt,
        reason: 'rate_limited',
      };
    }

    // Check rate limit (per hour)
    const hourKey = `ratelimit:${tenantId}:hour`;
    const hourLimit = await this.rateLimitCache.get(hourKey);
    if (hourLimit && hourLimit.count >= config.rateLimit.requestsPerHour) {
      return {
        allowed: false,
        remainingRequests: 0,
        resetAt: hourLimit.resetAt,
        reason: 'rate_limited',
      };
    }

    // Check monthly quota
    const period = this.getCurrentPeriod();
    const usage = await this.quotaUsageRepository.findByTenantAndPeriod(tenantId, period);

    if (usage) {
      if (usage.requestCount >= config.monthlyRequestLimit) {
        return {
          allowed: false,
          remainingRequests: 0,
          resetAt: this.getNextPeriodStart(),
          reason: 'quota_exceeded',
        };
      }

      if (usage.tokenCount + validInput.estimatedTokens > config.monthlyTokenLimit) {
        return {
          allowed: false,
          remainingRequests: config.monthlyRequestLimit - usage.requestCount,
          resetAt: this.getNextPeriodStart(),
          reason: 'tier_limit',
        };
      }
    }

    const remainingRequests = config.monthlyRequestLimit - (usage?.requestCount || 0);

    return {
      allowed: true,
      remainingRequests,
      resetAt: this.getNextPeriodStart(),
    };
  }

  async recordUsage(input: RecordUsageDto, userId: string): Promise<IQuotaUsage> {
    const validationResult = RecordUsageSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const tenantId = validInput.tenantId;
    const period = this.getCurrentPeriod();

    // Increment rate limit counters
    await this.rateLimitCache.increment(`ratelimit:${tenantId}:minute`, 60);
    await this.rateLimitCache.increment(`ratelimit:${tenantId}:hour`, 3600);

    // Increment monthly usage
    const usage = await this.quotaUsageRepository.incrementUsage(
      tenantId,
      period,
      1,
      validInput.tokenCount
    );

    // Check if limit reached
    const tier = await this.tenantConfigRepository.getQuotaTier(tenantId);
    const config = QUOTA_CONFIGS[tier];

    if (
      usage.requestCount >= config.monthlyRequestLimit ||
      usage.tokenCount >= config.monthlyTokenLimit
    ) {
      await this.quotaUsageRepository.upsert(tenantId, period, { limitReached: true });

      await this.auditService.log({
        action: 'quota_limit_reached',
        entityType: 'quota',
        entityId: tenantId,
        userId,
        tenantId,
        metadata: {
          tier,
          requestCount: usage.requestCount,
          tokenCount: usage.tokenCount,
        },
      });
    }

    return usage;
  }

  async getQuotaUsage(
    input: GetQuotaUsageDto,
    _userId: string
  ): Promise<{
    usage: IQuotaUsage | null;
    config: IQuotaConfig;
    percentUsed: { requests: number; tokens: number };
  }> {
    const validationResult = GetQuotaUsageSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const tenantId = validInput.tenantId;
    const period = validInput.period || this.getCurrentPeriod();

    const tier = await this.tenantConfigRepository.getQuotaTier(tenantId);
    const config = QUOTA_CONFIGS[tier];
    const usage = await this.quotaUsageRepository.findByTenantAndPeriod(tenantId, period);

    const percentUsed = {
      requests: usage ? Math.min((usage.requestCount / config.monthlyRequestLimit) * 100, 100) : 0,
      tokens: usage ? Math.min((usage.tokenCount / config.monthlyTokenLimit) * 100, 100) : 0,
    };

    return { usage, config, percentUsed };
  }

  async updateQuotaTier(
    input: UpdateQuotaTierDto,
    userId: string
  ): Promise<{ tier: QuotaTier; config: IQuotaConfig }> {
    const validationResult = UpdateQuotaTierSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Cast Zod enum to TypeScript enum
    const tier = validInput.tier as QuotaTier;

    await this.tenantConfigRepository.updateQuotaTier(validInput.tenantId, tier);

    await this.auditService.log({
      action: 'quota_tier_updated',
      entityType: 'tenant',
      entityId: validInput.tenantId,
      userId,
      tenantId: validInput.tenantId,
      metadata: { newTier: tier },
    });

    return {
      tier,
      config: QUOTA_CONFIGS[tier],
    };
  }

  async getRateLimitStatus(tenantId: string): Promise<{
    minute: { remaining: number; resetAt: Date };
    hour: { remaining: number; resetAt: Date };
  }> {
    const tier = await this.tenantConfigRepository.getQuotaTier(tenantId);
    const config = QUOTA_CONFIGS[tier];

    const minuteLimit = await this.rateLimitCache.get(`ratelimit:${tenantId}:minute`);
    const hourLimit = await this.rateLimitCache.get(`ratelimit:${tenantId}:hour`);

    const now = new Date();

    return {
      minute: {
        remaining: config.rateLimit.requestsPerMinute - (minuteLimit?.count || 0),
        resetAt: minuteLimit?.resetAt || new Date(now.getTime() + 60000),
      },
      hour: {
        remaining: config.rateLimit.requestsPerHour - (hourLimit?.count || 0),
        resetAt: hourLimit?.resetAt || new Date(now.getTime() + 3600000),
      },
    };
  }

  async getQuotaConfig(tier: QuotaTier): Promise<IQuotaConfig> {
    return QUOTA_CONFIGS[tier];
  }

  async isQuotaExceeded(tenantId: string): Promise<boolean> {
    const period = this.getCurrentPeriod();
    const usage = await this.quotaUsageRepository.findByTenantAndPeriod(tenantId, period);
    return usage?.limitReached || false;
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getNextPeriodStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
}
