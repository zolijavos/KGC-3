/**
 * Blacklist Service
 * FR30: Partner blacklist kezelés (fizetési problémák)
 */
import { Injectable, Inject } from '@nestjs/common';
import {
  BLACKLIST_REPOSITORY,
} from '../interfaces/blacklist.interface';
import type {
  BlacklistEntry,
  CreateBlacklistInput,
  ResolveBlacklistInput,
  PartnerWarnings,
  IBlacklistRepository,
} from '../interfaces/blacklist.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type { IPartnerRepository } from '../interfaces/partner.interface';

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
   */
  async addToBlacklist(input: CreateBlacklistInput): Promise<BlacklistEntry> {
    // Input validation
    if (!input.description || input.description.trim().length < 10) {
      throw new Error('Leírás minimum 10 karakter');
    }

    if (input.description.length > 500) {
      throw new Error('Leírás maximum 500 karakter');
    }

    // Partner ellenőrzés
    const partner = await this.partnerRepository.findById(input.partnerId, input.tenantId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Bejegyzés létrehozása
    const entry = await this.repository.create(input);

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

    // Ellenőrzés, hogy van-e még aktív blokkolás
    const activeEntries = await this.repository.findActiveByPartner(entry.partnerId, tenantId);
    const hasActiveBlocked = activeEntries.some((e) => e.severity === 'BLOCKED');

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
