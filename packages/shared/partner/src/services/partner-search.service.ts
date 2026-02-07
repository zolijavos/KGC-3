/**
 * Partner Search Service
 * FR31: Partner merge/duplicate detection
 * FR33: Partner azonosítás scan-nel
 */
import { Inject, Injectable } from '@nestjs/common';
import type { IBlacklistRepository } from '../interfaces/blacklist.interface';
import { BLACKLIST_REPOSITORY } from '../interfaces/blacklist.interface';
import type { ILoyaltyCardRepository } from '../interfaces/loyalty-card.interface';
import { LOYALTY_CARD_REPOSITORY } from '../interfaces/loyalty-card.interface';
import type {
  IdentifyPartnerInput,
  IdentifyPartnerResult,
  IPartnerSearchService,
  PartnerSearchInput,
  PartnerSearchResult,
  SearchResult,
} from '../interfaces/partner-search.interface';
import type {
  IPartnerRepository,
  Partner,
  PartnerQueryOptions,
} from '../interfaces/partner.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';

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
    const blacklistPromises = queryResult.items.map(async partner => {
      const [isBlocked, warnings] = await Promise.all([
        this.blacklistRepository.isBlocked(partner.id, input.tenantId),
        this.blacklistRepository.findActiveByPartner(partner.id, input.tenantId),
      ]);
      return { partnerId: partner.id, isBlocked, warnings };
    });

    const blacklistResults = await Promise.all(blacklistPromises);
    const blacklistMap = new Map(
      blacklistResults.map(r => [r.partnerId, { isBlocked: r.isBlocked, warnings: r.warnings }])
    );

    const results: SearchResult[] = [];

    for (const partner of queryResult.items) {
      const blacklistData = blacklistMap.get(partner.id);
      const matchedFields = this.getMatchedFields(partner, input.query);

      results.push({
        partner,
        score: this.calculateScore(matchedFields),
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
      const partner = await this.partnerRepository.findById(loyaltyCard.partnerId, input.tenantId);

      if (partner) {
        // H4 fix: Log loyalty card usage for analytics
        await this.loyaltyCardRepository.logUsage({
          cardId: loyaltyCard.id,
          tenantId: input.tenantId,
          usedAt: new Date(),
          action: 'SCAN',
          operatorId: input.operatorId,
          successful: true,
        });
        return this.buildIdentifyResult(partner, input.tenantId, 'LOYALTY_CARD');
      }
    }

    // 2. QR kód keresés
    const qrCard = await this.loyaltyCardRepository.findByQrCode(identifier, input.tenantId);

    if (qrCard) {
      const partner = await this.partnerRepository.findById(qrCard.partnerId, input.tenantId);

      if (partner) {
        // H4 fix: Log QR code usage for analytics
        await this.loyaltyCardRepository.logUsage({
          cardId: qrCard.id,
          tenantId: input.tenantId,
          usedAt: new Date(),
          action: 'SCAN',
          operatorId: input.operatorId,
          successful: true,
        });
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
      warnings: warnings.map(w => w.description),
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
   * M4 fix: Remove unused parameter (position-based scoring not needed)
   */
  private calculateScore(matchedFields: string[]): number {
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
   * H1 fix: i18n támogatás locale paraméterrel (ADR-050)
   */
  private generateGreeting(partner: Partner, locale: 'hu' | 'en' | 'uk' = 'hu'): string {
    const greetings: Record<'hu' | 'en' | 'uk', { company: string; individual: string }> = {
      hu: { company: 'Üdvözöljük', individual: 'Üdv újra' },
      en: { company: 'Welcome', individual: 'Welcome back' },
      uk: { company: 'Ласкаво просимо', individual: 'З поверненням' },
    };

    const greeting = greetings[locale];

    if (partner.type === 'COMPANY') {
      return `${greeting.company}, ${partner.name}!`;
    }

    const nameParts = partner.name.split(' ');
    // Safe access with noUncheckedIndexedAccess: nameParts[0] is string | undefined
    const lastName =
      nameParts.length > 0 && nameParts[0] !== undefined && nameParts[0] !== ''
        ? nameParts[0]
        : partner.name;

    return `${greeting.individual}, ${lastName}!`;
  }

  /**
   * Telefonszám-e?
   * M2 fix: Require at least one digit, not just special chars
   */
  private looksLikePhone(value: string): boolean {
    // Must have at least 6 digits (not just special chars)
    const hasEnoughDigits = (value.match(/\d/g) ?? []).length >= 6;
    // Overall format check
    const formatOk = /^[+]?[0-9\s\-()]{6,}$/.test(value);
    return hasEnoughDigits && formatOk;
  }

  /**
   * Email-e?
   * M1 fix: Require minimum 2-char TLD
   */
  private looksLikeEmail(value: string): boolean {
    // Require at least 2-character TLD (.hu, .com, .ua, etc.)
    return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value);
  }

  /**
   * Adószám-e? (Magyar vagy Ukrán)
   * H2 fix: Multi-country tax number support (ADR-050)
   * Magyar: 12345678-1-42 (8-1-2 digits)
   * Ukrán: 1234567890 (10 digits) or 12345678 (8 digits for companies)
   */
  private looksLikeTaxNumber(value: string): boolean {
    // Hungarian tax number: 8 digits - 1 digit - 2 digits
    const hungarianPattern = /^\d{8}-\d{1}-\d{2}$/;
    // Ukrainian EDRPOU (company): 8 digits
    const ukrainianCompanyPattern = /^\d{8}$/;
    // Ukrainian IPN (individual): 10 digits
    const ukrainianIndividualPattern = /^\d{10}$/;

    return (
      hungarianPattern.test(value) ||
      ukrainianCompanyPattern.test(value) ||
      ukrainianIndividualPattern.test(value)
    );
  }
}
