/**
 * Loyalty Card Service
 * FR27: Törzsvendég kártya rendszer (loyalty)
 * FR33: Partner azonosítás scan-nel
 */
import { Injectable, Inject } from '@nestjs/common';
import { LOYALTY_CARD_REPOSITORY } from '../interfaces/loyalty-card.interface';
import type {
  LoyaltyCard,
  IssueLoyaltyCardInput,
  AdjustPointsInput,
  ReplaceCardInput,
  CardLookupResult,
  CardUsageLog,
  PointTransaction,
  ILoyaltyCardRepository,
} from '../interfaces/loyalty-card.interface';
import { PARTNER_REPOSITORY } from '../interfaces/partner.interface';
import type { Partner, IPartnerRepository } from '../interfaces/partner.interface';

interface ScanCardInput {
  code: string;
  tenantId: string;
  operatorId: string;
  locationId?: string;
}

@Injectable()
export class LoyaltyCardService {
  constructor(
    @Inject(LOYALTY_CARD_REPOSITORY)
    private readonly repository: ILoyaltyCardRepository,
    @Inject(PARTNER_REPOSITORY)
    private readonly partnerRepository: IPartnerRepository
  ) {}

  /**
   * Törzsvendég kártya kiállítása
   */
  async issueCard(input: IssueLoyaltyCardInput): Promise<LoyaltyCard> {
    // Partner ellenőrzés
    const partner = await this.partnerRepository.findById(input.partnerId, input.tenantId);

    if (!partner) {
      throw new Error('Partner not found');
    }

    // Ellenőrzés, hogy van-e már aktív kártya
    const existingCard = await this.repository.findActiveByPartner(
      input.partnerId,
      input.tenantId
    );

    if (existingCard) {
      throw new Error('Partner már rendelkezik aktív törzsvendég kártyával');
    }

    // Egyedi kártyaszám generálás
    const cardNumber = await this.generateUniqueCardNumber(input.tenantId);
    const qrCode = this.generateQrCode(input.partnerId);

    return this.repository.issue(input, cardNumber, qrCode);
  }

  /**
   * Kártya scan (vonalkód vagy QR)
   */
  async scanCard(input: ScanCardInput): Promise<CardLookupResult> {
    // Keresés kártyaszám alapján
    let card = await this.repository.findByCardNumber(input.code, input.tenantId);

    // Ha nem találtuk, keresés QR kód alapján
    if (!card) {
      card = await this.repository.findByQrCode(input.code, input.tenantId);
    }

    if (!card) {
      return { found: false };
    }

    // Partner lekérése
    const partner = await this.partnerRepository.findById(card.partnerId, input.tenantId);

    // Használat logolása
    const isSuccessful = card.status === 'ACTIVE';
    const usageLog: Omit<CardUsageLog, 'id'> = {
      cardId: card.id,
      tenantId: input.tenantId,
      usedAt: new Date(),
      action: 'SCAN',
      operatorId: input.operatorId,
      successful: isSuccessful,
    };
    if (input.locationId !== undefined) {
      usageLog.locationId = input.locationId;
    }
    if (!isSuccessful) {
      usageLog.failureReason = card.status;
    }
    await this.repository.logUsage(usageLog);

    // Figyelmeztetések
    const warnings: string[] = [];

    if (card.status === 'BLOCKED') {
      warnings.push('Kártya blokkolva');
    }

    if (card.status === 'EXPIRED') {
      warnings.push('Kártya lejárt');
    }

    if (card.expiresAt && card.expiresAt < new Date()) {
      warnings.push('Kártya lejárt');
    }

    const result: CardLookupResult = {
      found: true,
      card,
    };
    if (partner) {
      result.partner = {
        id: partner.id,
        name: partner.name,
        type: partner.type,
      };
      result.greeting = this.generateGreeting(partner);
    }
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    return result;
  }

  /**
   * Pont módosítás (jóváírás vagy beváltás)
   */
  async adjustPoints(input: AdjustPointsInput): Promise<LoyaltyCard> {
    const card = await this.repository.findById(input.cardId, input.tenantId);

    if (!card) {
      throw new Error('Card not found');
    }

    if (card.status !== 'ACTIVE') {
      throw new Error('Kártya nem aktív');
    }

    // Beváltás esetén ellenőrzés
    if (input.points < 0 && card.points + input.points < 0) {
      throw new Error('Nincs elegendő pont a beváltáshoz');
    }

    const balanceBefore = card.points;
    const balanceAfter = card.points + input.points;

    // Pont tranzakció mentése
    const pointTransaction: Omit<PointTransaction, 'id'> = {
      cardId: input.cardId,
      tenantId: input.tenantId,
      type: input.type,
      points: input.points,
      balanceBefore,
      balanceAfter,
      description: input.description,
      createdAt: new Date(),
      createdBy: input.createdBy,
    };
    if (input.referenceType !== undefined) {
      pointTransaction.referenceType = input.referenceType;
    }
    if (input.referenceId !== undefined) {
      pointTransaction.referenceId = input.referenceId;
    }
    await this.repository.savePointTransaction(pointTransaction);

    // Kártya frissítése
    const updateData: Partial<LoyaltyCard> = {
      points: balanceAfter,
    };

    // Pozitív pont esetén lifetimePoints is nő
    if (input.points > 0) {
      updateData.lifetimePoints = card.lifetimePoints + input.points;
    }

    return this.repository.update(input.cardId, input.tenantId, updateData);
  }

  /**
   * Kártya csere (elveszett, sérült, upgrade)
   */
  async replaceCard(input: ReplaceCardInput): Promise<LoyaltyCard> {
    const oldCard = await this.repository.findById(input.oldCardId, input.tenantId);

    if (!oldCard) {
      throw new Error('Card not found');
    }

    // Régi kártya státusza REPLACED lesz
    await this.repository.setStatus(input.oldCardId, input.tenantId, 'REPLACED');

    // Új kártya generálás
    const cardNumber = await this.generateUniqueCardNumber(input.tenantId);
    const qrCode = this.generateQrCode(oldCard.partnerId);

    const newCardInput: IssueLoyaltyCardInput = {
      partnerId: oldCard.partnerId,
      tenantId: input.tenantId,
      type: input.newType ?? oldCard.type,
      initialPoints: input.transferPoints ? oldCard.points : 0,
      createdBy: input.createdBy,
    };

    // Új kártya létrehozása replacesId-vel
    const newCard = await this.repository.issue(newCardInput, cardNumber, qrCode);

    // Visszaadjuk a cserét jelző adatokkal
    return {
      ...newCard,
      replacesId: input.oldCardId,
      points: input.transferPoints ? oldCard.points : 0,
      lifetimePoints: oldCard.lifetimePoints,
    };
  }

  /**
   * Kártya blokkolása
   */
  async blockCard(cardId: string, tenantId: string): Promise<LoyaltyCard> {
    const card = await this.repository.findById(cardId, tenantId);

    if (!card) {
      throw new Error('Card not found');
    }

    return this.repository.setStatus(cardId, tenantId, 'BLOCKED');
  }

  /**
   * Kártya feloldása
   */
  async unblockCard(cardId: string, tenantId: string): Promise<LoyaltyCard> {
    const card = await this.repository.findById(cardId, tenantId);

    if (!card) {
      throw new Error('Card not found');
    }

    return this.repository.setStatus(cardId, tenantId, 'ACTIVE');
  }

  /**
   * Pont történet lekérése
   */
  async getPointHistory(cardId: string, tenantId: string, limit?: number): Promise<PointTransaction[]> {
    const card = await this.repository.findById(cardId, tenantId);

    if (!card) {
      throw new Error('Card not found');
    }

    return this.repository.getPointTransactions(cardId, tenantId, limit);
  }

  /**
   * Személyes üdvözlés generálása
   */
  generateGreeting(partner: Partner): string {
    if (partner.type === 'COMPANY') {
      return `Üdvözöljük, ${partner.name}!`;
    }

    // Magánszemély esetén vezetéknév kiemelése
    const nameParts = partner.name.split(' ');
    // Safe access with noUncheckedIndexedAccess: nameParts[0] is string | undefined
    const lastName = nameParts.length > 0 && nameParts[0] !== undefined && nameParts[0] !== ''
      ? nameParts[0]
      : partner.name;

    return `Üdv újra, ${lastName}!`;
  }

  /**
   * Egyedi kártyaszám generálása
   */
  private async generateUniqueCardNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomPart = Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, '0');
      const cardNumber = `KGC-${year}-${randomPart}`;

      const exists = await this.repository.cardNumberExists(cardNumber, tenantId);

      if (!exists) {
        return cardNumber;
      }

      attempts++;
    }

    throw new Error('Nem sikerült egyedi kártyaszámot generálni');
  }

  /**
   * QR kód tartalom generálása
   */
  private generateQrCode(partnerId: string): string {
    return `kgc:loyalty:${partnerId}:${Date.now()}`;
  }
}
