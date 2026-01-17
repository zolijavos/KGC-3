/**
 * Partner Search Service
 * FR31: Partner merge/duplicate detection
 * FR33: Partner azonosítás scan-nel
 */
import { Injectable, Inject } from '@nestjs/common';
import type {
  PartnerSearchInput,
  PartnerSearchResult,
  SearchResult,
  IdentifyPartnerInput,
  IdentifyPartnerResult,
  IPartnerSearchService,
} from '../interfaces/partner-search.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type { IPartnerRepository, Partner, PartnerQueryOptions } from '../interfaces/partner.interface';
import { BLACKLIST_REPOSITORY } from '../interfaces/blacklist.interface';
import type { IBlacklistRepository } from '../interfaces/blacklist.interface';
import { LOYALTY_CARD_REPOSITORY } from '../interfaces/loyalty-card.interface';
import type { ILoyaltyCardRepository } from '../interfaces/loyalty-card.interface';

@Injectable()
export class PartnerSearchService implements IPartnerSearchService {
  constructor(
    @Inject(PARTNER_REPOSITORY)
    private readonly partnerRepository: IPartnerRepository,
    @Inject(BLACKLIST_REPOSITORY)
    private readonly blacklistRepository: IBlacklistRepository,
    @Inject(LOYALTY_CARD_REPOSITORY)
    private readonly loyaltyCardRepository: ILoyaltyCardRepository
  ) {}

  /**
   * Partner keresés
   */
  async search(input: PartnerSearchInput): Promise<PartnerSearchResult> {
    const startTime = Date.now();

    const queryOptions: PartnerQueryOptions = {
      tenantId: input.tenantId,
      search: input.query,
      limit: input.limit ?? 20,
    };
    const firstType = input.types?.[0];
    if (firstType !== undefined) {
      queryOptions.type = firstType;
    }
    if (input.includeInactive !== undefined) {
      queryOptions.includeDeleted = input.includeInactive;
    }
    const queryResult = await this.partnerRepository.query(queryOptions);

    // Batch fetch blacklist data to avoid N+1 queries
    // Use Promise.all for parallel execution instead of sequential loop
    const blacklistPromises = queryResult.items.map(async (partner) => {
      const [isBlocked, warnings] = await Promise.all([
        this.blacklistRepository.isBlocked(partner.id, input.tenantId),
        this.blacklistRepository.findActiveByPartner(partner.id, input.tenantId),
      ]);
      return { partnerId: partner.id, isBlocked, warnings };
    });

    const blacklistResults = await Promise.all(blacklistPromises);
    const blacklistMap = new Map(
      blacklistResults.map((r) => [r.partnerId, { isBlocked: r.isBlocked, warnings: r.warnings }])
    );

    const results: SearchResult[] = [];

    for (const partner of queryResult.items) {
      const blacklistData = blacklistMap.get(partner.id);
      const matchedFields = this.getMatchedFields(partner, input.query);

      results.push({
        partner,
        score: this.calculateScore(matchedFields, input.query),
        matchedFields,
        hasWarnings: (blacklistData?.warnings.length ?? 0) > 0,
        isBlocked: blacklistData?.isBlocked ?? false,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return {
      results,
      totalCount: queryResult.total,
      searchTime: Date.now() - startTime,
      query: input.query,
    };
  }

  /**
   * Partner azonosítás (gyors lookup)
   */
  async identify(input: IdentifyPartnerInput): Promise<IdentifyPartnerResult> {
    const identifier = input.identifier.trim();

    // 1. Törzsvendég kártya keresés
    const loyaltyCard = await this.loyaltyCardRepository.findByCardNumber(
      identifier,
      input.tenantId
    );

    if (loyaltyCard) {
      const partner = await this.partnerRepository.findById(
        loyaltyCard.partnerId,
        input.tenantId
      );

      if (partner) {
        return this.buildIdentifyResult(partner, input.tenantId, 'LOYALTY_CARD');
      }
    }

    // 2. QR kód keresés
    const qrCard = await this.loyaltyCardRepository.findByQrCode(identifier, input.tenantId);

    if (qrCard) {
      const partner = await this.partnerRepository.findById(qrCard.partnerId, input.tenantId);

      if (partner) {
        return this.buildIdentifyResult(partner, input.tenantId, 'LOYALTY_CARD');
      }
    }

    // 3. Telefon keresés
    if (this.looksLikePhone(identifier)) {
      const phoneResult = await this.partnerRepository.query({
        tenantId: input.tenantId,
        search: identifier,
        limit: 1,
      });

      if (phoneResult.items.length > 0 && phoneResult.items[0]?.phone === identifier) {
        return this.buildIdentifyResult(phoneResult.items[0], input.tenantId, 'PHONE');
      }
    }

    // 4. Email keresés
    if (this.looksLikeEmail(identifier)) {
      const emailResult = await this.partnerRepository.query({
        tenantId: input.tenantId,
        search: identifier,
        limit: 1,
      });

      if (emailResult.items.length > 0 && emailResult.items[0]?.email === identifier) {
        return this.buildIdentifyResult(emailResult.items[0], input.tenantId, 'EMAIL');
      }
    }

    // 5. Adószám keresés
    if (this.looksLikeTaxNumber(identifier)) {
      const taxResult = await this.partnerRepository.query({
        tenantId: input.tenantId,
        search: identifier,
        limit: 1,
      });

      if (taxResult.items.length > 0 && taxResult.items[0]?.taxNumber === identifier) {
        return this.buildIdentifyResult(taxResult.items[0], input.tenantId, 'TAX_NUMBER');
      }
    }

    return { found: false, hasWarnings: false };
  }

  /**
   * Autocomplete keresés
   */
  async autocomplete(tenantId: string, query: string, limit = 5): Promise<SearchResult[]> {
    const result = await this.search({
      tenantId,
      query,
      mode: 'AUTOCOMPLETE',
      limit,
    });

    return result.results;
  }

  /**
   * Azonosítás eredmény építése
   */
  private async buildIdentifyResult(
    partner: Partner,
    tenantId: string,
    identifiedBy: 'PHONE' | 'EMAIL' | 'LOYALTY_CARD' | 'TAX_NUMBER'
  ): Promise<IdentifyPartnerResult> {
    const warnings = await this.blacklistRepository.findActiveByPartner(partner.id, tenantId);

    return {
      found: true,
      partner,
      identifiedBy,
      greeting: this.generateGreeting(partner),
      hasWarnings: warnings.length > 0,
      warnings: warnings.map((w) => w.description),
    };
  }

  /**
   * Egyezési mezők keresése
   */
  private getMatchedFields(partner: Partner, query: string): string[] {
    const matched: string[] = [];
    const queryLower = query.toLowerCase();

    if (partner.name.toLowerCase().includes(queryLower)) {
      matched.push('name');
    }
    if (partner.email?.toLowerCase().includes(queryLower)) {
      matched.push('email');
    }
    if (partner.phone?.includes(query)) {
      matched.push('phone');
    }
    if (partner.taxNumber?.includes(query)) {
      matched.push('taxNumber');
    }

    return matched;
  }

  /**
   * Relevancia pontszám számítás
   */
  private calculateScore(matchedFields: string[], _query: string): number {
    let score = 0;

    // Név egyezés a legfontosabb
    if (matchedFields.includes('name')) {
      score += 100;
    }

    // Telefon és email fontos
    if (matchedFields.includes('phone')) {
      score += 80;
    }
    if (matchedFields.includes('email')) {
      score += 70;
    }

    // Adószám
    if (matchedFields.includes('taxNumber')) {
      score += 60;
    }

    // Több egyezés = magasabb pontszám
    score += matchedFields.length * 10;

    return score;
  }

  /**
   * Személyes üdvözlés generálása
   */
  private generateGreeting(partner: Partner): string {
    if (partner.type === 'COMPANY') {
      return `Üdvözöljük, ${partner.name}!`;
    }

    const nameParts = partner.name.split(' ');
    // Safe access with noUncheckedIndexedAccess: nameParts[0] is string | undefined
    const lastName = nameParts.length > 0 && nameParts[0] !== undefined && nameParts[0] !== ''
      ? nameParts[0]
      : partner.name;

    return `Üdv újra, ${lastName}!`;
  }

  /**
   * Telefonszám-e?
   */
  private looksLikePhone(value: string): boolean {
    return /^[\+]?[0-9\s\-\(\)]{6,}$/.test(value);
  }

  /**
   * Email-e?
   */
  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Magyar adószám-e?
   */
  private looksLikeTaxNumber(value: string): boolean {
    return /^\d{8}-\d{1}-\d{2}$/.test(value);
  }
}
