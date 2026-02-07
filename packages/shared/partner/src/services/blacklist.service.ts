/**
 * Blacklist Service
 * FR30: Partner blacklist kezelés (fizetési problémák)
 */
import { Inject, Injectable } from '@nestjs/common';
import type {
  BlacklistEntry,
  CreateBlacklistInput,
  IBlacklistRepository,
  PartnerWarnings,
  ResolveBlacklistInput,
} from '../interfaces/blacklist.interface';
import { BLACKLIST_REPOSITORY } from '../interfaces/blacklist.interface';
import type { IPartnerRepository } from '../interfaces/partner.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';

// L1 fix: Extract magic numbers to constants
const DESCRIPTION_MIN_LENGTH = 10;
const DESCRIPTION_MAX_LENGTH = 500;

@Injectable()
export class BlacklistService {
  constructor(
    @Inject(BLACKLIST_REPOSITORY)
    private readonly repository: IBlacklistRepository,
    @Inject(PARTNER_REPOSITORY)
    private readonly partnerRepository: IPartnerRepository
  ) {}

  /**
   * Partner hozzáadása a tiltólistához
   * M5 fix: Added input sanitization for XSS prevention
   * L1 fix: Use constants for validation limits
   */
  async addToBlacklist(input: CreateBlacklistInput): Promise<BlacklistEntry> {
    // Input validation with constants (L1 fix)
    if (!input.description || input.description.trim().length < DESCRIPTION_MIN_LENGTH) {
      throw new Error(`Leírás minimum ${DESCRIPTION_MIN_LENGTH} karakter`);
    }

    if (input.description.length > DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Leírás maximum ${DESCRIPTION_MAX_LENGTH} karakter`);
    }

    // M5 fix: Sanitize description - strip HTML tags to prevent XSS
    const sanitizedDescription = input.description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();

    // Partner ellenőrzés
    const partner = await this.partnerRepository.findById(input.partnerId, input.tenantId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Bejegyzés létrehozása (M5 fix: use sanitized description)
    const entry = await this.repository.create({
      ...input,
      description: sanitizedDescription,
    });

    // Ha BLOCKED, partner státusz frissítése
    if (input.severity === 'BLOCKED') {
      await this.partnerRepository.update(input.partnerId, input.tenantId, {
        status: 'BLACKLISTED',
        updatedBy: input.createdBy,
      });
    }

    return entry;
  }

  /**
   * Blacklist bejegyzés feloldása
   * H3 note: Race condition between findActiveByPartner and update could cause
   * incorrect ACTIVE status if another BLOCKED entry is added concurrently.
   * Mitigation: Repository implementation should use database transaction with
   * SELECT FOR UPDATE lock on partner row. This is documented for Prisma impl.
   */
  async resolveEntry(
    entryId: string,
    tenantId: string,
    input: ResolveBlacklistInput
  ): Promise<BlacklistEntry> {
    const entry = await this.repository.findById(entryId, tenantId);

    if (!entry) {
      throw new Error('Blacklist entry not found');
    }

    // Bejegyzés feloldása
    const resolvedEntry = await this.repository.resolve(entryId, tenantId, input);

    // H3 fix: Re-check active entries AFTER resolve to minimize race window
    // Full fix requires transaction at repository level
    const activeEntries = await this.repository.findActiveByPartner(entry.partnerId, tenantId);
    const hasActiveBlocked = activeEntries.some(e => e.severity === 'BLOCKED' && e.id !== entryId);

    // Ha nincs több aktív blokkolás, partner státusz visszaállítása
    if (!hasActiveBlocked) {
      const partner = await this.partnerRepository.findById(entry.partnerId, tenantId);
      if (partner?.status === 'BLACKLISTED') {
        await this.partnerRepository.update(entry.partnerId, tenantId, {
          status: 'ACTIVE',
          updatedBy: input.resolvedBy,
        });
      }
    }

    return resolvedEntry;
  }

  /**
   * Partner figyelmeztetések lekérdezése
   */
  async getWarnings(partnerId: string, tenantId: string): Promise<PartnerWarnings> {
    const activeEntries = await this.repository.findActiveByPartner(partnerId, tenantId);
    const isBlocked = await this.repository.isBlocked(partnerId, tenantId);

    const totalDebt = activeEntries.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);

    return {
      partnerId,
      hasActiveWarnings: activeEntries.length > 0,
      isBlocked,
      warnings: activeEntries,
      totalDebt,
    };
  }

  /**
   * Partner blokkolva van-e
   */
  async isBlocked(partnerId: string, tenantId: string): Promise<boolean> {
    return this.repository.isBlocked(partnerId, tenantId);
  }

  /**
   * Blacklist történet lekérdezése
   */
  async getHistory(partnerId: string, tenantId: string): Promise<BlacklistEntry[]> {
    return this.repository.findByPartner(partnerId, tenantId);
  }
}
