/**
 * Representative Service
 * FR26: Meghatalmazott kezelés cégek esetén
 */
import { Injectable, Inject } from '@nestjs/common';
import { REPRESENTATIVE_REPOSITORY } from '../interfaces/representative.interface';
import type {
  Representative,
  RepresentativeStatus,
  CreateRepresentativeInput,
  UpdateRepresentativeInput,
  RevokeRepresentativeInput,
  RepresentativeQueryOptions,
  CheckAuthorizationInput,
  AuthorizationCheckResult,
  IRepresentativeRepository,
  AuthorizationType,
} from '../interfaces/representative.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type { IPartnerRepository } from '../interfaces/partner.interface';

@Injectable()
export class RepresentativeService {
  constructor(
    @Inject(REPRESENTATIVE_REPOSITORY)
    private readonly repository: IRepresentativeRepository,
    @Inject(PARTNER_REPOSITORY)
    private readonly partnerRepository: IPartnerRepository
  ) {}

  /**
   * Meghatalmazott létrehozása
   */
  async create(input: CreateRepresentativeInput): Promise<Representative> {
    // Validálás
    this.validateCreateInput(input);

    // Partner ellenőrzés
    const partner = await this.partnerRepository.findById(input.partnerId, input.tenantId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    if (partner.type !== 'COMPANY') {
      throw new Error('Meghatalmazott csak cég típusú partnerhez adható');
    }

    // Ha isPrimary, akkor töröljük a meglévő primary-t
    if (input.isPrimary) {
      const existingPrimary = await this.repository.findPrimary(input.partnerId, input.tenantId);
      if (existingPrimary) {
        await this.repository.clearPrimaryFlag(input.partnerId, input.tenantId);
      }
    }

    // Default validFrom ha nincs megadva
    const createInput = {
      ...input,
      validFrom: input.validFrom ?? new Date(),
    };

    return this.repository.create(createInput);
  }

  /**
   * Meghatalmazott keresése ID alapján
   */
  async findById(
    id: string,
    partnerId: string,
    tenantId: string
  ): Promise<Representative | null> {
    return this.repository.findById(id, partnerId, tenantId);
  }

  /**
   * Meghatalmazott frissítése
   */
  async update(
    id: string,
    partnerId: string,
    tenantId: string,
    input: UpdateRepresentativeInput
  ): Promise<Representative> {
    const existing = await this.repository.findById(id, partnerId, tenantId);

    if (!existing) {
      throw new Error('Representative not found');
    }

    if (existing.status === 'REVOKED') {
      throw new Error('Cannot update revoked representative');
    }

    if (existing.status === 'EXPIRED') {
      throw new Error('Cannot update expired representative');
    }

    // Ha isPrimary-t állítunk, töröljük a többit
    if (input.isPrimary) {
      await this.repository.clearPrimaryFlag(partnerId, tenantId);
    }

    return this.repository.update(id, partnerId, tenantId, input);
  }

  /**
   * Meghatalmazás visszavonása
   */
  async revoke(
    id: string,
    partnerId: string,
    tenantId: string,
    input: RevokeRepresentativeInput
  ): Promise<Representative> {
    const existing = await this.repository.findById(id, partnerId, tenantId);

    if (!existing) {
      throw new Error('Representative not found');
    }

    if (existing.status === 'REVOKED') {
      throw new Error('Representative is already revoked');
    }

    return this.repository.revoke(id, partnerId, tenantId, input);
  }

  /**
   * Meghatalmazottak listázása partner alapján
   */
  async findByPartner(options: RepresentativeQueryOptions): Promise<Representative[]> {
    return this.repository.findByPartner(options);
  }

  /**
   * Meghatalmazott ellenőrzés (tranzakciókhoz)
   */
  async checkAuthorization(input: CheckAuthorizationInput): Promise<AuthorizationCheckResult> {
    const representative = await this.repository.findById(
      input.representativeId,
      input.partnerId,
      input.tenantId
    );

    if (!representative) {
      return { isAuthorized: false, reason: 'NOT_FOUND' };
    }

    const checkDate = input.checkDate ?? new Date();

    // Státusz ellenőrzés
    if (representative.status === 'REVOKED') {
      return { isAuthorized: false, representative, reason: 'REVOKED' };
    }

    if (representative.status === 'EXPIRED') {
      return { isAuthorized: false, representative, reason: 'EXPIRED' };
    }

    // Érvényességi idő ellenőrzés
    if (representative.validFrom > checkDate) {
      return { isAuthorized: false, representative, reason: 'NOT_YET_VALID' };
    }

    if (representative.validTo && representative.validTo < checkDate) {
      return { isAuthorized: false, representative, reason: 'EXPIRED' };
    }

    // Típus ellenőrzés
    if (!this.hasRequiredAuthorization(representative.authorizationType, input.requiredType)) {
      return { isAuthorized: false, representative, reason: 'WRONG_TYPE' };
    }

    return { isAuthorized: true, representative };
  }

  /**
   * Elsődleges meghatalmazott keresése
   */
  async findPrimary(partnerId: string, tenantId: string): Promise<Representative | null> {
    return this.repository.findPrimary(partnerId, tenantId);
  }

  /**
   * Meghatalmazottak száma
   */
  async count(
    partnerId: string,
    tenantId: string,
    options?: { status?: RepresentativeStatus }
  ): Promise<number> {
    return this.repository.count(partnerId, tenantId, options);
  }

  /**
   * Input validálás
   */
  private validateCreateInput(input: CreateRepresentativeInput): void {
    if (!input.name || input.name.length < 2) {
      throw new Error('Név minimum 2 karakter');
    }
  }

  /**
   * Meghatalmazás típus ellenőrzés
   */
  private hasRequiredAuthorization(
    actual: AuthorizationType,
    required: AuthorizationType
  ): boolean {
    // BOTH típus mindkét jogosultsággal rendelkezik
    if (actual === 'BOTH') {
      return true;
    }

    // Egyébként pontos egyezés kell
    return actual === required;
  }
}
