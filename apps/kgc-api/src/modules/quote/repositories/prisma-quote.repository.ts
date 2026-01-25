/**
 * Prisma Quote Repository
 * Implements IQuoteRepository and IQuoteItemRepository for PostgreSQL persistence
 * Epic 18: Árajánlat CRUD
 */

import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Quote as PrismaQuote,
  QuoteItem as PrismaQuoteItem,
  QuoteStatus as PrismaQuoteStatus,
} from '@prisma/client';

// ============================================
// LOCAL INTERFACE DEFINITIONS
// (Aligned with @kgc/sales-quote interfaces when package is ready)
// ============================================

/**
 * Quote status enum
 */
export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
}

/**
 * Quote entity interface
 */
export interface IQuote {
  id: string;
  tenantId: string;
  quoteNumber: string;
  partnerId: string;
  worksheetId?: string;
  status: QuoteStatus;
  validUntil: Date;
  sentAt?: Date;
  viewedAt?: Date;
  respondedAt?: Date;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  totalAmount: number;
  introduction?: string;
  terms?: string;
  notes?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
  convertedToWorksheetId?: string;
  convertedAt?: Date;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Quote item interface
 */
export interface IQuoteItem {
  id: string;
  quoteId: string;
  itemType: 'PART' | 'LABOR' | 'OTHER';
  productId?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  explodedPartNumber?: string;
  notes?: string;
  createdAt: Date;
}

/**
 * Quote filter DTO
 */
export interface QuoteFilterDto {
  status?: QuoteStatus;
  partnerId?: string;
  worksheetId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  validOnly?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Quote repository interface
 */
export interface IQuoteRepository {
  create(data: Partial<IQuote>): Promise<IQuote>;
  findById(id: string, tenantId: string): Promise<IQuote | null>;
  findByNumber(tenantId: string, quoteNumber: string): Promise<IQuote | null>;
  findAll(tenantId: string, filter: Partial<QuoteFilterDto>): Promise<IQuote[]>;
  findByWorksheetId(worksheetId: string, tenantId: string): Promise<IQuote[]>;
  findByPartnerId(partnerId: string, tenantId: string): Promise<IQuote[]>;
  update(id: string, tenantId: string, data: Partial<IQuote>): Promise<IQuote>;
  changeStatus(
    id: string,
    tenantId: string,
    newStatus: QuoteStatus,
    changedBy: string
  ): Promise<IQuote>;
  getNextSequence(tenantId: string, year: number): Promise<number>;
  countByTenant(tenantId: string, filter?: Partial<QuoteFilterDto>): Promise<number>;
}

/**
 * Quote item repository interface
 */
export interface IQuoteItemRepository {
  create(data: Partial<IQuoteItem>): Promise<IQuoteItem>;
  findById(id: string): Promise<IQuoteItem | null>;
  findByQuoteId(quoteId: string): Promise<IQuoteItem[]>;
  update(id: string, data: Partial<IQuoteItem>): Promise<IQuoteItem>;
  delete(id: string): Promise<void>;
}

// ============================================
// TYPE DEFINITIONS
// ============================================

type PrismaQuoteWithItems = PrismaQuote & {
  items?: PrismaQuoteItem[];
  partner?: { id: string; name: string } | null;
  worksheet?: { id: string; worksheetNumber: string } | null;
};

// ============================================
// PRISMA QUOTE REPOSITORY
// ============================================

@Injectable()
export class PrismaQuoteRepository implements IQuoteRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // STATUS MAPPING FUNCTIONS
  // ============================================

  private toDomainStatus(prismaStatus: PrismaQuoteStatus): QuoteStatus {
    const statusMap: Record<PrismaQuoteStatus, QuoteStatus> = {
      DRAFT: QuoteStatus.DRAFT,
      SENT: QuoteStatus.SENT,
      VIEWED: QuoteStatus.VIEWED,
      ACCEPTED: QuoteStatus.ACCEPTED,
      REJECTED: QuoteStatus.REJECTED,
      EXPIRED: QuoteStatus.EXPIRED,
      CONVERTED: QuoteStatus.CONVERTED,
    };
    return statusMap[prismaStatus] ?? QuoteStatus.DRAFT;
  }

  private toPrismaStatus(domainStatus: QuoteStatus): PrismaQuoteStatus {
    const statusMap: Record<QuoteStatus, PrismaQuoteStatus> = {
      [QuoteStatus.DRAFT]: 'DRAFT',
      [QuoteStatus.SENT]: 'SENT',
      [QuoteStatus.VIEWED]: 'VIEWED',
      [QuoteStatus.ACCEPTED]: 'ACCEPTED',
      [QuoteStatus.REJECTED]: 'REJECTED',
      [QuoteStatus.EXPIRED]: 'EXPIRED',
      [QuoteStatus.CONVERTED]: 'CONVERTED',
    };
    return statusMap[domainStatus] ?? 'DRAFT';
  }

  // ============================================
  // DOMAIN MAPPING FUNCTIONS
  // ============================================

  private toQuoteDomain(quote: PrismaQuoteWithItems): IQuote {
    const result: IQuote = {
      id: quote.id,
      tenantId: quote.tenantId,
      quoteNumber: quote.quoteNumber,
      partnerId: quote.partnerId,
      status: this.toDomainStatus(quote.status),
      validUntil: quote.validUntil,
      subtotal: Number(quote.subtotal),
      discountAmount: Number(quote.discountAmount),
      vatAmount: Number(quote.vatAmount),
      totalAmount: Number(quote.totalAmount),
      createdBy: quote.createdBy,
      updatedBy: quote.updatedBy,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    };

    // Add optional properties only when defined (exactOptionalPropertyTypes compliance)
    if (quote.worksheetId !== null) {
      result.worksheetId = quote.worksheetId;
    }
    if (quote.sentAt !== null) {
      result.sentAt = quote.sentAt;
    }
    if (quote.viewedAt !== null) {
      result.viewedAt = quote.viewedAt;
    }
    if (quote.respondedAt !== null) {
      result.respondedAt = quote.respondedAt;
    }
    if (quote.introduction !== null) {
      result.introduction = quote.introduction;
    }
    if (quote.terms !== null) {
      result.terms = quote.terms;
    }
    if (quote.notes !== null) {
      result.notes = quote.notes;
    }
    if (quote.pdfUrl !== null) {
      result.pdfUrl = quote.pdfUrl;
    }
    if (quote.pdfGenAt !== null) {
      result.pdfGeneratedAt = quote.pdfGenAt;
    }
    if (quote.acceptedAt !== null) {
      result.acceptedAt = quote.acceptedAt;
    }
    if (quote.rejectedAt !== null) {
      result.rejectedAt = quote.rejectedAt;
    }
    if (quote.rejectionReason !== null) {
      result.rejectionReason = quote.rejectionReason;
    }
    if (quote.convertedToWorksheetId !== null) {
      result.convertedToWorksheetId = quote.convertedToWorksheetId;
    }
    if (quote.convertedAt !== null) {
      result.convertedAt = quote.convertedAt;
    }

    return result;
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async create(data: Partial<IQuote>): Promise<IQuote> {
    if (!data.tenantId) {
      throw new Error('Tenant ID megadása kötelező');
    }
    if (!data.partnerId) {
      throw new Error('Partner ID megadása kötelező');
    }
    if (!data.quoteNumber) {
      throw new Error('Árajánlat szám megadása kötelező');
    }
    if (!data.validUntil) {
      throw new Error('Érvényesség megadása kötelező');
    }
    if (!data.createdBy) {
      throw new Error('Létrehozó user megadása kötelező');
    }

    const quote = await this.prisma.quote.create({
      data: {
        tenantId: data.tenantId,
        quoteNumber: data.quoteNumber,
        partnerId: data.partnerId,
        worksheetId: data.worksheetId ?? null,
        status: data.status ? this.toPrismaStatus(data.status) : 'DRAFT',
        validUntil: data.validUntil,
        subtotal: data.subtotal ?? 0,
        discountAmount: data.discountAmount ?? 0,
        vatAmount: data.vatAmount ?? 0,
        totalAmount: data.totalAmount ?? 0,
        introduction: data.introduction ?? null,
        terms: data.terms ?? null,
        notes: data.notes ?? null,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
    });

    return this.toQuoteDomain(quote);
  }

  async findById(id: string, tenantId: string): Promise<IQuote | null> {
    const quote = await this.prisma.quote.findFirst({
      where: { id, tenantId },
      include: {
        partner: { select: { id: true, name: true } },
        worksheet: { select: { id: true, worksheetNumber: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    return quote ? this.toQuoteDomain(quote) : null;
  }

  async findByNumber(tenantId: string, quoteNumber: string): Promise<IQuote | null> {
    const quote = await this.prisma.quote.findFirst({
      where: { tenantId, quoteNumber },
      include: {
        partner: { select: { id: true, name: true } },
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    return quote ? this.toQuoteDomain(quote) : null;
  }

  async findAll(tenantId: string, filter: Partial<QuoteFilterDto>): Promise<IQuote[]> {
    const where = this.buildWhereClause(tenantId, filter);

    const quotes = await this.prisma.quote.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: filter.offset ?? 0,
      take: filter.limit ?? 20,
    });

    return quotes.map(q => this.toQuoteDomain(q));
  }

  async findByWorksheetId(worksheetId: string, tenantId: string): Promise<IQuote[]> {
    const quotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        worksheetId,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map(q => this.toQuoteDomain(q));
  }

  async findByPartnerId(partnerId: string, tenantId: string): Promise<IQuote[]> {
    const quotes = await this.prisma.quote.findMany({
      where: {
        tenantId,
        partnerId,
      },
      include: {
        partner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return quotes.map(q => this.toQuoteDomain(q));
  }

  async update(id: string, tenantId: string, data: Partial<IQuote>): Promise<IQuote> {
    // Verify quote exists and belongs to tenant (tenant isolation)
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Árajánlat nem található');
    }

    const updateData: Prisma.QuoteUpdateInput = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = this.toPrismaStatus(data.status);
    }
    if (data.validUntil !== undefined) {
      updateData.validUntil = data.validUntil;
    }
    if (data.subtotal !== undefined) {
      updateData.subtotal = data.subtotal;
    }
    if (data.discountAmount !== undefined) {
      updateData.discountAmount = data.discountAmount;
    }
    if (data.vatAmount !== undefined) {
      updateData.vatAmount = data.vatAmount;
    }
    if (data.totalAmount !== undefined) {
      updateData.totalAmount = data.totalAmount;
    }
    if (data.introduction !== undefined) {
      updateData.introduction = data.introduction;
    }
    if (data.terms !== undefined) {
      updateData.terms = data.terms;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.pdfUrl !== undefined) {
      updateData.pdfUrl = data.pdfUrl;
    }
    if (data.pdfGeneratedAt !== undefined) {
      updateData.pdfGenAt = data.pdfGeneratedAt;
    }
    if (data.updatedBy !== undefined) {
      updateData.updatedBy = data.updatedBy;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.quote.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.QuoteUpdateManyMutationInput,
    });

    // Fetch and return the updated quote
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Árajánlat nem található frissítés után');
    }

    return updated;
  }

  async changeStatus(
    id: string,
    tenantId: string,
    newStatus: QuoteStatus,
    changedBy: string
  ): Promise<IQuote> {
    const quote = await this.findById(id, tenantId);
    if (!quote) {
      throw new Error('Árajánlat nem található');
    }

    // Validate state transition
    this.validateStatusTransition(quote.status, newStatus);

    const updateData: Prisma.QuoteUpdateInput = {
      status: this.toPrismaStatus(newStatus),
      updatedBy: changedBy,
      updatedAt: new Date(),
    };

    // Set timestamps based on status
    if (newStatus === QuoteStatus.SENT) {
      updateData.sentAt = new Date();
    }
    if (newStatus === QuoteStatus.VIEWED) {
      updateData.viewedAt = new Date();
    }
    if (newStatus === QuoteStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
      updateData.respondedAt = new Date();
    }
    if (newStatus === QuoteStatus.REJECTED) {
      updateData.rejectedAt = new Date();
      updateData.respondedAt = new Date();
    }
    if (newStatus === QuoteStatus.CONVERTED) {
      updateData.convertedAt = new Date();
    }

    await this.prisma.quote.updateMany({
      where: { id, tenantId },
      data: updateData as Prisma.QuoteUpdateManyMutationInput,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Árajánlat nem található frissítés után');
    }

    return updated;
  }

  private validateStatusTransition(from: QuoteStatus, to: QuoteStatus): void {
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT, QuoteStatus.EXPIRED],
      [QuoteStatus.SENT]: [
        QuoteStatus.VIEWED,
        QuoteStatus.ACCEPTED,
        QuoteStatus.REJECTED,
        QuoteStatus.EXPIRED,
      ],
      [QuoteStatus.VIEWED]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED],
      [QuoteStatus.ACCEPTED]: [QuoteStatus.CONVERTED],
      [QuoteStatus.REJECTED]: [], // Végállapot
      [QuoteStatus.EXPIRED]: [], // Végállapot
      [QuoteStatus.CONVERTED]: [], // Végállapot
    };

    if (from === to) return;

    const allowed = validTransitions[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Érvénytelen státusz átmenet: ${from} → ${to}`);
    }
  }

  async getNextSequence(tenantId: string, year: number): Promise<number> {
    const pattern = `AJ-${year}-`;

    return this.prisma.$transaction(
      async tx => {
        const lastQuote = await tx.quote.findFirst({
          where: {
            tenantId,
            quoteNumber: { startsWith: pattern },
          },
          orderBy: { quoteNumber: 'desc' },
        });

        if (!lastQuote) {
          return 1;
        }

        const match = lastQuote.quoteNumber.match(/-(\d+)$/);
        if (match?.[1]) {
          return parseInt(match[1], 10) + 1;
        }

        return 1;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  async countByTenant(tenantId: string, filter?: Partial<QuoteFilterDto>): Promise<number> {
    const where = this.buildWhereClause(tenantId, filter ?? {});
    return this.prisma.quote.count({ where });
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private buildWhereClause(
    tenantId: string,
    filter: Partial<QuoteFilterDto>
  ): Prisma.QuoteWhereInput {
    const where: Prisma.QuoteWhereInput = {
      tenantId,
    };

    if (filter.status) {
      where.status = this.toPrismaStatus(filter.status);
    }

    if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    if (filter.worksheetId) {
      where.worksheetId = filter.worksheetId;
    }

    if (filter.validOnly) {
      where.validUntil = { gte: new Date() };
      where.status = { in: ['DRAFT', 'SENT', 'VIEWED'] };
    }

    if (filter.dateFrom) {
      where.createdAt = { gte: filter.dateFrom };
    }

    if (filter.dateTo) {
      where.createdAt = {
        ...(where.createdAt as Prisma.DateTimeFilter),
        lte: filter.dateTo,
      };
    }

    if (filter.search) {
      where.OR = [
        { quoteNumber: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
        { introduction: { contains: filter.search, mode: 'insensitive' } },
        { partner: { name: { contains: filter.search, mode: 'insensitive' } } },
      ];
    }

    return where;
  }
}

// ============================================
// QUOTE ITEM REPOSITORY
// ============================================

@Injectable()
export class PrismaQuoteItemRepository implements IQuoteItemRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  private toItemDomain(item: PrismaQuoteItem): IQuoteItem {
    const result: IQuoteItem = {
      id: item.id,
      quoteId: item.quoteId,
      itemType: item.itemType as 'PART' | 'LABOR' | 'OTHER',
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPrice: Number(item.unitPrice),
      totalPrice: Number(item.totalPrice),
      createdAt: item.createdAt,
    };

    // Add optional properties only when defined (exactOptionalPropertyTypes compliance)
    if (item.productId !== null) {
      result.productId = item.productId;
    }
    if (item.explodedPartNumber !== null) {
      result.explodedPartNumber = item.explodedPartNumber;
    }
    if (item.notes !== null) {
      result.notes = item.notes;
    }

    return result;
  }

  async create(data: Partial<IQuoteItem>): Promise<IQuoteItem> {
    if (!data.quoteId) {
      throw new Error('Árajánlat ID megadása kötelező');
    }
    if (!data.description) {
      throw new Error('Leírás megadása kötelező');
    }
    if (data.quantity === undefined || data.quantity <= 0) {
      throw new Error('Mennyiség pozitív kell legyen');
    }
    if (data.unitPrice === undefined || data.unitPrice < 0) {
      throw new Error('Egységár nem lehet negatív');
    }

    // Verify quote exists before creating item
    const quote = await this.prisma.quote.findUnique({
      where: { id: data.quoteId },
      select: { id: true },
    });

    if (!quote) {
      throw new Error('Árajánlat nem található');
    }

    const totalPrice = data.quantity * data.unitPrice;

    const item = await this.prisma.quoteItem.create({
      data: {
        quoteId: data.quoteId,
        itemType: data.itemType ?? 'OTHER',
        productId: data.productId ?? null,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit ?? 'db',
        unitPrice: data.unitPrice,
        totalPrice,
        explodedPartNumber: data.explodedPartNumber ?? null,
        notes: data.notes ?? null,
      },
    });

    // Update quote totals
    await this.updateQuoteTotals(data.quoteId);

    return this.toItemDomain(item);
  }

  async findById(id: string): Promise<IQuoteItem | null> {
    const item = await this.prisma.quoteItem.findUnique({
      where: { id },
    });

    return item ? this.toItemDomain(item) : null;
  }

  async findByQuoteId(quoteId: string): Promise<IQuoteItem[]> {
    const items = await this.prisma.quoteItem.findMany({
      where: { quoteId },
      orderBy: { createdAt: 'asc' },
    });

    return items.map(i => this.toItemDomain(i));
  }

  async update(id: string, data: Partial<IQuoteItem>): Promise<IQuoteItem> {
    const existing = await this.prisma.quoteItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tétel nem található');
    }

    const updateData: Prisma.QuoteItemUpdateInput = {};

    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.quantity !== undefined) {
      updateData.quantity = data.quantity;
    }
    if (data.unitPrice !== undefined) {
      updateData.unitPrice = data.unitPrice;
    }
    if (data.unit !== undefined) {
      updateData.unit = data.unit;
    }
    if (data.itemType !== undefined) {
      updateData.itemType = data.itemType;
    }
    if (data.productId !== undefined) {
      updateData.product = data.productId
        ? { connect: { id: data.productId } }
        : { disconnect: true };
    }
    if (data.explodedPartNumber !== undefined) {
      updateData.explodedPartNumber = data.explodedPartNumber;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    // Recalculate total if quantity or price changed
    const quantity = data.quantity ?? Number(existing.quantity);
    const unitPrice = data.unitPrice ?? Number(existing.unitPrice);
    updateData.totalPrice = quantity * unitPrice;

    const item = await this.prisma.quoteItem.update({
      where: { id },
      data: updateData,
    });

    // Update quote totals
    await this.updateQuoteTotals(existing.quoteId);

    return this.toItemDomain(item);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.prisma.quoteItem.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error('Tétel nem található');
    }

    await this.prisma.quoteItem.delete({
      where: { id },
    });

    // Update quote totals
    await this.updateQuoteTotals(existing.quoteId);
  }

  private async updateQuoteTotals(quoteId: string): Promise<void> {
    // Use transaction to prevent race conditions
    await this.prisma.$transaction(async tx => {
      const items = await tx.quoteItem.findMany({
        where: { quoteId },
      });

      const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
      const vatAmount = Math.round(subtotal * 0.27); // 27% VAT
      const totalAmount = subtotal + vatAmount;

      await tx.quote.update({
        where: { id: quoteId },
        data: {
          subtotal,
          vatAmount,
          totalAmount,
          updatedAt: new Date(),
        },
      });
    });
  }
}

// ============================================
// REPOSITORY TOKENS
// ============================================

export const QUOTE_REPOSITORY = Symbol('QUOTE_REPOSITORY');
export const QUOTE_ITEM_REPOSITORY = Symbol('QUOTE_ITEM_REPOSITORY');
