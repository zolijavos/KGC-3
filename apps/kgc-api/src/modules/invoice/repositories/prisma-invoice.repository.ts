/**
 * Prisma Invoice Repository
 * Implements IInvoiceRepository for PostgreSQL persistence
 * Epic 10: Story 10-1: Számla CRUD
 */

import {
  IInvoice,
  IInvoiceItem,
  IInvoiceRepository,
  InvoiceFilterOptions,
  InvoiceStatus,
  InvoiceType,
  PaginatedResult,
  PaginationOptions,
  PaymentMethod,
  VatRate,
} from '@kgc/sales-invoice';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  Invoice as PrismaInvoice,
  InvoiceItem as PrismaInvoiceItem,
  InvoiceStatus as PrismaInvoiceStatus,
  InvoiceType as PrismaInvoiceType,
} from '@prisma/client';

type PrismaInvoiceWithItems = PrismaInvoice & {
  items: PrismaInvoiceItem[];
};

@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // CLEAR (testing only)
  // ============================================

  /**
   * Clear is a no-op for Prisma repositories.
   * In tests, use database cleanup utilities instead.
   * H7 FIX: Added for consistency with other repositories
   */
  clear(): void {
    // No-op: Database cleanup should be handled by test fixtures
  }

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  /**
   * Map Prisma InvoiceItem to domain interface
   */
  private toItemDomain(item: PrismaInvoiceItem, lineNumber: number): IInvoiceItem {
    const result: IInvoiceItem = {
      lineNumber,
      description: item.description,
      quantity: Number(item.quantity),
      unit: item.unit,
      unitPriceNet: Number(item.unitPrice),
      vatRate: this.mapPrismaVatToVatRate(Number(item.vatPercent)),
      vatPercentage: Number(item.vatPercent),
      netAmount: Number(item.unitPrice) * Number(item.quantity),
      vatAmount: Number(item.vatAmount),
      grossAmount: Number(item.totalPrice),
    };
    if (item.id) result.id = item.id;
    if (item.productId) result.productId = item.productId;
    return result;
  }

  /**
   * Map Prisma Invoice to domain interface
   */
  private toDomain(invoice: PrismaInvoiceWithItems): IInvoice {
    // Parse prefix and sequence from invoice number
    const parts = invoice.invoiceNumber.split('-');
    const prefix = parts[0] ?? 'KGC';
    const sequenceNumber = parts.length >= 3 ? parseInt(parts[2] ?? '0', 10) : 0;

    const result: IInvoice = {
      id: invoice.id,
      tenantId: invoice.tenantId,
      invoiceNumber: invoice.invoiceNumber,
      prefix,
      sequenceNumber,
      type: this.mapPrismaTypeToType(invoice.type),
      status: this.mapPrismaStatusToStatus(invoice.status),
      partnerId: invoice.partnerId,
      partnerName: '', // Not stored in Prisma model, fetched from Partner relation
      partnerAddress: '', // Not stored in Prisma model
      invoiceDate: invoice.issueDate,
      fulfillmentDate: invoice.deliveryDate ?? invoice.issueDate,
      dueDate: invoice.dueDate,
      paymentMethod: (invoice.paymentMethod as PaymentMethod) ?? 'TRANSFER',
      netAmount: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      grossAmount: Number(invoice.totalAmount),
      paidAmount: Number(invoice.paidAmount),
      currency: invoice.currency,
      isConfidential: false, // Not in Prisma model
      visibleToRoles: [], // Not in Prisma model
      items: invoice.items.map((item, index) => this.toItemDomain(item, index + 1)),
      createdAt: invoice.createdAt,
      createdBy: invoice.createdBy,
      updatedAt: invoice.updatedAt,
    };

    // Conditionally add optional properties
    if (invoice.paidAt) result.paidAt = invoice.paidAt;
    if (invoice.paymentRef) result.paymentReference = invoice.paymentRef;
    if (invoice.navStatus) result.navStatus = invoice.navStatus;
    if (invoice.navTransactionId) result.navTransactionId = invoice.navTransactionId;
    if (invoice.navSentAt) result.navSubmittedAt = invoice.navSentAt;
    if (invoice.pdfUrl) result.pdfUrl = invoice.pdfUrl;
    if (invoice.pdfGenAt) result.pdfGeneratedAt = invoice.pdfGenAt;
    if (invoice.notes) result.notes = invoice.notes;
    if (invoice.internalNotes) result.internalNotes = invoice.internalNotes;
    if (invoice.updatedBy) result.updatedBy = invoice.updatedBy;
    if (invoice.voidedAt) result.cancelledAt = invoice.voidedAt;
    if (invoice.voidedBy) result.cancelledBy = invoice.voidedBy;
    if (invoice.voidReason) result.cancellationReason = invoice.voidReason;

    return result;
  }

  /**
   * Map domain status to Prisma enum
   */
  private mapStatusToPrisma(status: InvoiceStatus): PrismaInvoiceStatus {
    const mapping: Record<InvoiceStatus, PrismaInvoiceStatus> = {
      DRAFT: 'DRAFT',
      ISSUED: 'APPROVED',
      SENT: 'SENT',
      PAID: 'PAID',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      OVERDUE: 'OVERDUE',
      CANCELLED: 'VOIDED',
    };
    return mapping[status] ?? 'DRAFT';
  }

  /**
   * Map Prisma status to domain
   */
  private mapPrismaStatusToStatus(status: PrismaInvoiceStatus): InvoiceStatus {
    const mapping: Record<PrismaInvoiceStatus, InvoiceStatus> = {
      DRAFT: 'DRAFT',
      PENDING: 'DRAFT',
      APPROVED: 'ISSUED',
      SENT: 'SENT',
      PAID: 'PAID',
      PARTIALLY_PAID: 'PARTIALLY_PAID',
      OVERDUE: 'OVERDUE',
      CANCELLED: 'CANCELLED',
      VOIDED: 'CANCELLED',
    };
    return mapping[status] ?? 'DRAFT';
  }

  /**
   * Map domain type to Prisma enum
   */
  private mapTypeToPrisma(type: InvoiceType): PrismaInvoiceType {
    const mapping: Record<InvoiceType, PrismaInvoiceType> = {
      STANDARD: 'STANDARD',
      PROFORMA: 'PROFORMA',
      CORRECTION: 'CREDIT_NOTE',
      STORNO: 'CREDIT_NOTE',
      ADVANCE: 'ADVANCE',
      FINAL: 'FINAL',
    };
    return mapping[type] ?? 'STANDARD';
  }

  /**
   * Map Prisma type to domain
   */
  private mapPrismaTypeToType(type: PrismaInvoiceType): InvoiceType {
    const mapping: Record<PrismaInvoiceType, InvoiceType> = {
      STANDARD: 'STANDARD',
      ADVANCE: 'ADVANCE',
      FINAL: 'FINAL',
      PROFORMA: 'PROFORMA',
      CREDIT_NOTE: 'CORRECTION',
    };
    return mapping[type] ?? 'STANDARD';
  }

  /**
   * Map VAT percentage to VatRate
   */
  private mapPrismaVatToVatRate(vatPercent: number): VatRate {
    if (vatPercent === 27) return 'RATE_27';
    if (vatPercent === 18) return 'RATE_18';
    if (vatPercent === 5) return 'RATE_5';
    if (vatPercent === 0) return 'RATE_0';
    return 'RATE_27';
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findById(id: string, tenantId?: string): Promise<IInvoice | null> {
    // H1 FIX: Use findFirst with optional tenantId for multi-tenant safety
    const where: Prisma.InvoiceWhereInput = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    const invoice = await this.prisma.invoice.findFirst({
      where,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return invoice ? this.toDomain(invoice) : null;
  }

  async findByNumber(tenantId: string, invoiceNumber: string): Promise<IInvoice | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { tenantId, invoiceNumber },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return invoice ? this.toDomain(invoice) : null;
  }

  async findMany(
    filter: InvoiceFilterOptions,
    pagination: PaginationOptions
  ): Promise<PaginatedResult<IInvoice>> {
    const where: Prisma.InvoiceWhereInput = {
      tenantId: filter.tenantId,
    };

    // Status filter
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        where.status = { in: filter.status.map((s: InvoiceStatus) => this.mapStatusToPrisma(s)) };
      } else {
        where.status = this.mapStatusToPrisma(filter.status);
      }
    }

    // Type filter
    if (filter.type) {
      if (Array.isArray(filter.type)) {
        where.type = { in: filter.type.map((t: InvoiceType) => this.mapTypeToPrisma(t)) };
      } else {
        where.type = this.mapTypeToPrisma(filter.type);
      }
    }

    // Partner filter
    if (filter.partnerId) {
      where.partnerId = filter.partnerId;
    }

    // Date range filters
    if (filter.dateFrom || filter.dateTo) {
      where.issueDate = {};
      if (filter.dateFrom) {
        where.issueDate.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.issueDate.lte = filter.dateTo;
      }
    }

    // Due date range
    if (filter.dueDateFrom || filter.dueDateTo) {
      where.dueDate = {};
      if (filter.dueDateFrom) {
        where.dueDate.gte = filter.dueDateFrom;
      }
      if (filter.dueDateTo) {
        where.dueDate.lte = filter.dueDateTo;
      }
    }

    // Amount range
    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      where.totalAmount = {};
      if (filter.minAmount !== undefined) {
        where.totalAmount.gte = filter.minAmount;
      }
      if (filter.maxAmount !== undefined) {
        where.totalAmount.lte = filter.maxAmount;
      }
    }

    // Search
    if (filter.search) {
      where.OR = [
        { invoiceNumber: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const orderByField = pagination.sortBy ?? 'issueDate';
    const orderByDir = pagination.sortOrder ?? 'desc';
    const orderBy: Prisma.InvoiceOrderByWithRelationInput = { [orderByField]: orderByDir };

    const offset = (pagination.page - 1) * pagination.pageSize;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        orderBy,
        skip: offset,
        take: pagination.pageSize,
        include: { items: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: invoices.map(inv => this.toDomain(inv)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  }

  // ============================================
  // CREATE / UPDATE / DELETE
  // ============================================

  async create(invoiceData: Omit<IInvoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<IInvoice> {
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId: invoiceData.tenantId,
        invoiceNumber: invoiceData.invoiceNumber,
        partnerId: invoiceData.partnerId,
        type: this.mapTypeToPrisma(invoiceData.type),
        status: this.mapStatusToPrisma(invoiceData.status),
        issueDate: invoiceData.invoiceDate,
        dueDate: invoiceData.dueDate,
        deliveryDate: invoiceData.fulfillmentDate,
        subtotal: invoiceData.netAmount,
        discountAmount: 0,
        vatAmount: invoiceData.vatAmount,
        totalAmount: invoiceData.grossAmount,
        paidAmount: invoiceData.paidAmount,
        balanceDue: invoiceData.grossAmount - invoiceData.paidAmount,
        currency: invoiceData.currency,
        paymentMethod: invoiceData.paymentMethod ?? null,
        paymentRef: invoiceData.paymentReference ?? null,
        notes: invoiceData.notes ?? null,
        internalNotes: invoiceData.internalNotes ?? null,
        createdBy: invoiceData.createdBy,
        updatedBy: invoiceData.createdBy,
        items: {
          create: invoiceData.items.map((item: IInvoiceItem, index: number) => ({
            itemType: this.getItemType(item),
            productId: item.productId ?? null,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPriceNet,
            vatPercent: item.vatPercentage,
            vatAmount: item.vatAmount,
            totalPrice: item.grossAmount,
            sortOrder: index,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return this.toDomain(invoice);
  }

  async update(id: string, data: Partial<IInvoice>, tenantId?: string): Promise<IInvoice> {
    // H4 FIX: Verify invoice exists and belongs to tenant before update
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error(`Invoice not found: ${id}`);
    }

    const updateData: Prisma.InvoiceUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      updateData.status = this.mapStatusToPrisma(data.status);
    }
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate;
    }
    if (data.paymentMethod !== undefined) {
      updateData.paymentMethod = data.paymentMethod;
    }
    if (data.paymentReference !== undefined) {
      updateData.paymentRef = data.paymentReference;
    }
    if (data.paidAmount !== undefined) {
      updateData.paidAmount = data.paidAmount;
      // H3 FIX: Calculate balance due from existing data instead of extra query
      updateData.balanceDue = existing.grossAmount - data.paidAmount;
    }
    if (data.paidAt !== undefined) {
      updateData.paidAt = data.paidAt;
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }
    if (data.internalNotes !== undefined) {
      updateData.internalNotes = data.internalNotes;
    }
    if (data.updatedBy !== undefined) {
      updateData.updatedBy = data.updatedBy;
    }
    if (data.cancelledAt !== undefined) {
      updateData.voidedAt = data.cancelledAt;
    }
    if (data.cancelledBy !== undefined) {
      updateData.voidedBy = data.cancelledBy;
    }
    if (data.cancellationReason !== undefined) {
      updateData.voidReason = data.cancellationReason;
    }
    if (data.navStatus !== undefined) {
      updateData.navStatus = data.navStatus;
    }
    if (data.navTransactionId !== undefined) {
      updateData.navTransactionId = data.navTransactionId;
    }
    if (data.navSubmittedAt !== undefined) {
      updateData.navSentAt = data.navSubmittedAt;
    }
    if (data.pdfUrl !== undefined) {
      updateData.pdfUrl = data.pdfUrl;
    }
    if (data.pdfGeneratedAt !== undefined) {
      updateData.pdfGenAt = data.pdfGeneratedAt;
    }

    // H4 FIX: Use updateMany with tenantId for multi-tenant safety
    const where: Prisma.InvoiceWhereInput = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    await this.prisma.invoice.updateMany({
      where,
      data: updateData,
    });

    // Fetch updated invoice with items
    return (await this.findById(id, tenantId))!;
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    // H1 FIX: Use deleteMany with tenantId for multi-tenant safety
    const where: Prisma.InvoiceWhereInput = { id };
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // InvoiceItems are cascade deleted due to onDelete: Cascade
    const result = await this.prisma.invoice.deleteMany({ where });

    if (result.count === 0) {
      throw new Error(`Invoice not found: ${id}`);
    }
  }

  // ============================================
  // SEQUENCE NUMBER
  // ============================================

  async getNextSequenceNumber(tenantId: string, prefix: string, year: number): Promise<number> {
    // H2 FIX: Use transaction with advisory lock to prevent race conditions
    const pattern = `${prefix}-${year}-%`;

    // Generate a unique lock key based on tenant+prefix+year
    const lockKey = `${tenantId}-${prefix}-${year}`
      .split('')
      .reduce((a, c) => a + c.charCodeAt(0), 0);

    const result = await this.prisma.$transaction(async tx => {
      // Acquire advisory lock for this specific sequence
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

      // Find highest sequence for this tenant/prefix/year
      const seqResult = await tx.$queryRaw<{ max_seq: number | null }[]>`
        SELECT MAX(
          CAST(SPLIT_PART(invoice_number, '-', 3) AS INTEGER)
        ) as max_seq
        FROM invoices
        WHERE tenant_id = ${tenantId}::uuid
          AND invoice_number LIKE ${pattern}
      `;

      return seqResult[0]?.max_seq ?? 0;
    });

    return result + 1;
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Determine item type from item data
   */
  private getItemType(item: IInvoiceItem): string {
    if (item.rentalItemId) return 'RENTAL';
    if (item.serviceItemId) return 'SERVICE';
    if (item.productId) return 'PRODUCT';
    return 'OTHER';
  }

  /**
   * Get invoices by partner
   */
  async findByPartnerId(
    tenantId: string,
    partnerId: string,
    options?: { status?: InvoiceStatus; limit?: number }
  ): Promise<IInvoice[]> {
    const where: Prisma.InvoiceWhereInput = {
      tenantId,
      partnerId,
    };

    if (options?.status) {
      where.status = this.mapStatusToPrisma(options.status);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      take: options?.limit ?? 100,
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return invoices.map(inv => this.toDomain(inv));
  }

  /**
   * Get overdue invoices
   */
  async findOverdue(tenantId: string): Promise<IInvoice[]> {
    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'APPROVED'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
      orderBy: { dueDate: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    });

    return invoices.map(inv => this.toDomain(inv));
  }

  /**
   * Get unpaid amount summary
   */
  async getUnpaidSummary(tenantId: string): Promise<{ count: number; totalAmount: number }> {
    const result = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'APPROVED', 'OVERDUE'] },
        balanceDue: { gt: 0 },
      },
      _count: { id: true },
      _sum: { balanceDue: true },
    });

    return {
      count: result._count.id,
      totalAmount: Number(result._sum.balanceDue ?? 0),
    };
  }

  /**
   * Count invoices by status
   */
  async countByStatus(tenantId: string): Promise<Record<InvoiceStatus, number>> {
    const counts = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { status: true },
    });

    const result: Record<InvoiceStatus, number> = {
      DRAFT: 0,
      ISSUED: 0,
      SENT: 0,
      PAID: 0,
      PARTIALLY_PAID: 0,
      OVERDUE: 0,
      CANCELLED: 0,
    };

    for (const { status, _count } of counts) {
      const domainStatus = this.mapPrismaStatusToStatus(status);
      result[domainStatus] = (result[domainStatus] ?? 0) + _count.status;
    }

    return result;
  }

  // ============================================
  // STATUS WORKFLOW (Story 10-4)
  // State machine: DRAFT → SENT → PAID | OVERDUE | CANCELLED
  // ============================================

  /**
   * Validate status transition
   * @throws Error if transition is not allowed
   */
  private validateStatusTransition(currentStatus: InvoiceStatus, newStatus: InvoiceStatus): void {
    // Define valid transitions
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: ['ISSUED', 'SENT', 'CANCELLED'],
      ISSUED: ['SENT', 'CANCELLED'],
      SENT: ['PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED'],
      PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
      OVERDUE: ['PAID', 'PARTIALLY_PAID', 'CANCELLED'],
      PAID: [], // Terminal state - no transitions allowed
      CANCELLED: [], // Terminal state - no transitions allowed
    };

    // Same status is always allowed (no-op)
    if (currentStatus === newStatus) return;

    const allowed = validTransitions[currentStatus];
    if (!allowed?.includes(newStatus)) {
      throw new Error(`Érvénytelen státusz átmenet: ${currentStatus} → ${newStatus}`);
    }
  }

  /**
   * Mark invoice as sent (DRAFT/ISSUED → SENT)
   * Updates sentAt timestamp (only if not already sent)
   */
  async markAsSent(
    id: string,
    tenantId: string,
    updatedBy: string,
    sentTo?: string
  ): Promise<IInvoice> {
    // Verify invoice exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Számla nem található');
    }

    // Validate transition
    this.validateStatusTransition(existing.status, 'SENT');

    const now = new Date();

    // H3 FIX: Build update data conditionally
    const updateData: Prisma.InvoiceUpdateManyMutationInput = {
      status: 'SENT',
      sentTo: sentTo ?? null,
      updatedBy,
      updatedAt: now,
    };

    // H3 FIX: Only set sentAt if not already sent (preserve original send date)
    // Check if this is first send by looking at existing status and sentAt
    const rawInvoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      select: { sentAt: true },
    });
    if (!rawInvoice?.sentAt) {
      updateData.sentAt = now;
    }

    // Use updateMany for tenant-safe update
    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Mark invoice as paid (SENT/PARTIALLY_PAID/OVERDUE → PAID)
   * Updates paidAt timestamp and paidAmount
   * H2 FIX: Uses transaction to prevent race conditions
   */
  async markAsPaid(
    id: string,
    tenantId: string,
    updatedBy: string,
    paymentData: {
      paidAmount: number;
      paymentMethod?: string;
      paymentReference?: string;
    }
  ): Promise<IInvoice> {
    // Validate payment amount before transaction
    if (paymentData.paidAmount <= 0) {
      throw new Error('Fizetett összeg pozitív kell legyen');
    }

    const now = new Date();

    // H2 FIX: Use transaction to prevent race conditions
    await this.prisma.$transaction(async tx => {
      // Read invoice within transaction
      const invoice = await tx.invoice.findFirst({
        where: { id, tenantId },
      });

      if (!invoice) {
        throw new Error('Számla nem található');
      }

      // Map to domain status for validation
      const currentStatus = this.mapPrismaStatusToStatus(invoice.status);

      // Calculate new total paid amount
      const currentPaid = Number(invoice.paidAmount);
      const grossAmount = Number(invoice.totalAmount);
      const totalPaid = currentPaid + paymentData.paidAmount;
      const balanceDue = grossAmount - totalPaid;

      // H1 FIX: Check for overpayment
      if (totalPaid > grossAmount) {
        throw new Error(
          `Túlfizetés: a fizetés (${paymentData.paidAmount} Ft) meghaladja a fennmaradó összeget (${grossAmount - currentPaid} Ft)`
        );
      }

      // Determine new status based on payment
      let newStatus: InvoiceStatus;
      if (balanceDue <= 0) {
        newStatus = 'PAID';
      } else {
        newStatus = 'PARTIALLY_PAID';
      }

      // Validate transition
      this.validateStatusTransition(currentStatus, newStatus);

      const updateData: Prisma.InvoiceUpdateInput = {
        status: this.mapStatusToPrisma(newStatus),
        paidAmount: totalPaid,
        balanceDue: Math.max(0, balanceDue),
        updatedBy,
        updatedAt: now,
      };

      // Set paidAt only when fully paid
      if (newStatus === 'PAID') {
        updateData.paidAt = now;
      }

      // Optional payment details
      if (paymentData.paymentMethod) {
        updateData.paymentMethod = paymentData.paymentMethod;
      }
      if (paymentData.paymentReference) {
        updateData.paymentRef = paymentData.paymentReference;
      }

      // Update within transaction
      await tx.invoice.update({
        where: { id },
        data: updateData,
      });
    });

    // Fetch final result outside transaction
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Mark invoice as overdue (SENT/PARTIALLY_PAID → OVERDUE)
   * Called by scheduled job when dueDate passes
   */
  async markAsOverdue(id: string, tenantId: string, updatedBy: string): Promise<IInvoice> {
    // Verify invoice exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Számla nem található');
    }

    // Validate transition
    this.validateStatusTransition(existing.status, 'OVERDUE');

    // Verify invoice is actually overdue
    const now = new Date();
    if (existing.dueDate >= now) {
      throw new Error('Számla még nem lejárt');
    }

    // Verify there is balance due
    if (existing.grossAmount - existing.paidAmount <= 0) {
      throw new Error('Számla már ki van fizetve');
    }

    // Use updateMany for tenant-safe update
    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: {
        status: 'OVERDUE',
        updatedBy,
        updatedAt: now,
      },
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Batch mark overdue invoices
   * Called by scheduled job to process all overdue invoices for a tenant
   */
  async markOverdueInvoices(tenantId: string, updatedBy: string): Promise<number> {
    const now = new Date();

    // Find all invoices that should be marked overdue
    const result = await this.prisma.invoice.updateMany({
      where: {
        tenantId,
        status: { in: ['SENT', 'PARTIALLY_PAID', 'APPROVED'] },
        dueDate: { lt: now },
        balanceDue: { gt: 0 },
      },
      data: {
        status: 'OVERDUE',
        updatedBy,
        updatedAt: now,
      },
    });

    return result.count;
  }

  /**
   * Cancel/void invoice (DRAFT/SENT/OVERDUE → CANCELLED)
   * Updates voidedAt timestamp and void reason
   */
  async cancel(
    id: string,
    tenantId: string,
    cancelledBy: string,
    reason: string
  ): Promise<IInvoice> {
    // Verify invoice exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Számla nem található');
    }

    // Validate reason is provided
    if (!reason.trim()) {
      throw new Error('Sztornó indoklás megadása kötelező');
    }

    // Validate transition
    this.validateStatusTransition(existing.status, 'CANCELLED');

    const now = new Date();

    // Use updateMany for tenant-safe update
    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: {
        status: 'VOIDED',
        voidedAt: now,
        voidedBy: cancelledBy,
        voidReason: reason.trim(),
        updatedBy: cancelledBy,
        updatedAt: now,
      },
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Update status with validation
   * Generic method for any status transition with validation
   */
  async updateStatus(
    id: string,
    tenantId: string,
    newStatus: InvoiceStatus,
    updatedBy: string
  ): Promise<IInvoice> {
    // Verify invoice exists and belongs to tenant
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Számla nem található');
    }

    // Validate transition
    this.validateStatusTransition(existing.status, newStatus);

    const now = new Date();

    // Use updateMany for tenant-safe update
    await this.prisma.invoice.updateMany({
      where: { id, tenantId },
      data: {
        status: this.mapStatusToPrisma(newStatus),
        updatedBy,
        updatedAt: now,
      },
    });

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  // ============================================
  // INVOICE ITEM MANAGEMENT (Story 10-2)
  // ============================================

  /**
   * Verify invoice is in DRAFT status (modifiable)
   * @throws Error if invoice is not DRAFT
   */
  private async verifyDraftStatus(invoiceId: string, tenantId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { status: true },
    });

    if (!invoice) {
      throw new Error('Számla nem található');
    }

    const domainStatus = this.mapPrismaStatusToStatus(invoice.status);
    if (domainStatus !== 'DRAFT') {
      throw new Error(
        `Számla tétel csak DRAFT státuszban módosítható. Jelenlegi státusz: ${domainStatus}`
      );
    }
  }

  /**
   * Add item to invoice
   * Only DRAFT invoices can have items added
   */
  async addItem(
    invoiceId: string,
    tenantId: string,
    item: Omit<IInvoiceItem, 'id' | 'lineNumber'>
  ): Promise<IInvoice> {
    // Verify invoice exists and is DRAFT
    await this.verifyDraftStatus(invoiceId, tenantId);

    // H4 FIX: Validate quantity and price
    if (item.quantity <= 0) {
      throw new Error('Mennyiség pozitív kell legyen');
    }
    if (item.unitPriceNet < 0) {
      throw new Error('Egységár nem lehet negatív');
    }

    // H3 FIX: Calculate net and VAT amounts with rounding
    const netAmount = Math.round(item.quantity * item.unitPriceNet * 100) / 100;
    const vatAmount = Math.round(netAmount * (item.vatPercentage / 100) * 100) / 100;
    const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

    // Determine item type from provided data
    let itemType = 'OTHER';
    if (item.productId) itemType = 'PRODUCT';
    else if ((item as { rentalItemId?: string }).rentalItemId) itemType = 'RENTAL';
    else if ((item as { serviceItemId?: string }).serviceItemId) itemType = 'SERVICE';

    // H1 FIX: Add item within transaction including sortOrder calculation
    await this.prisma.$transaction(async tx => {
      // Get next sort order inside transaction to prevent race condition
      const maxSortOrder = await tx.invoiceItem.aggregate({
        where: { invoiceId },
        _max: { sortOrder: true },
      });
      const nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

      await tx.invoiceItem.create({
        data: {
          invoiceId,
          itemType,
          productId: item.productId ?? null,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPriceNet,
          vatPercent: item.vatPercentage,
          vatAmount,
          totalPrice: grossAmount,
          sortOrder: nextSortOrder,
        },
      });

      // Recalculate invoice totals
      await this.recalculateInvoiceTotalsInTx(tx, invoiceId, tenantId);
    });

    const updated = await this.findById(invoiceId, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Remove item from invoice
   * Only DRAFT invoices can have items removed
   */
  async removeItem(itemId: string, tenantId: string): Promise<IInvoice> {
    // H2 FIX: All verification and deletion within single transaction
    const invoiceId = await this.prisma.$transaction(async tx => {
      // Find item and verify invoice inside transaction
      const item = await tx.invoiceItem.findFirst({
        where: { id: itemId },
        include: { invoice: { select: { id: true, tenantId: true, status: true } } },
      });

      if (!item) {
        throw new Error('Számla tétel nem található');
      }

      // Verify tenant ownership
      if (item.invoice.tenantId !== tenantId) {
        throw new Error('Számla tétel nem található');
      }

      const foundInvoiceId = item.invoice.id;

      // Verify DRAFT status
      const domainStatus = this.mapPrismaStatusToStatus(item.invoice.status);
      if (domainStatus !== 'DRAFT') {
        throw new Error(
          `Számla tétel csak DRAFT státuszban törölhető. Jelenlegi státusz: ${domainStatus}`
        );
      }

      // Delete item
      await tx.invoiceItem.delete({
        where: { id: itemId },
      });

      // Recalculate invoice totals
      await this.recalculateInvoiceTotalsInTx(tx, foundInvoiceId, tenantId);

      return foundInvoiceId;
    });

    const updated = await this.findById(invoiceId, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Update item in invoice
   * Only DRAFT invoices can have items updated
   */
  async updateItem(
    itemId: string,
    tenantId: string,
    data: Partial<
      Pick<
        IInvoiceItem,
        'description' | 'quantity' | 'unit' | 'unitPriceNet' | 'vatPercentage' | 'productId'
      >
    >
  ): Promise<IInvoice> {
    // H4 FIX: Validate quantity and price if provided
    if (data.quantity !== undefined && data.quantity <= 0) {
      throw new Error('Mennyiség pozitív kell legyen');
    }
    if (data.unitPriceNet !== undefined && data.unitPriceNet < 0) {
      throw new Error('Egységár nem lehet negatív');
    }

    // H2 FIX: All verification and update within single transaction
    const invoiceId = await this.prisma.$transaction(async tx => {
      // Find item and verify invoice inside transaction
      const item = await tx.invoiceItem.findFirst({
        where: { id: itemId },
        include: { invoice: { select: { id: true, tenantId: true, status: true } } },
      });

      if (!item) {
        throw new Error('Számla tétel nem található');
      }

      // Verify tenant ownership
      if (item.invoice.tenantId !== tenantId) {
        throw new Error('Számla tétel nem található');
      }

      const foundInvoiceId = item.invoice.id;

      // Verify DRAFT status
      const domainStatus = this.mapPrismaStatusToStatus(item.invoice.status);
      if (domainStatus !== 'DRAFT') {
        throw new Error(
          `Számla tétel csak DRAFT státuszban módosítható. Jelenlegi státusz: ${domainStatus}`
        );
      }

      // Build update data
      const updateData: Prisma.InvoiceItemUpdateInput = {};

      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      if (data.quantity !== undefined) {
        updateData.quantity = data.quantity;
      }
      if (data.unit !== undefined) {
        updateData.unit = data.unit;
      }
      if (data.unitPriceNet !== undefined) {
        updateData.unitPrice = data.unitPriceNet;
      }
      if (data.vatPercentage !== undefined) {
        updateData.vatPercent = data.vatPercentage;
      }
      if (data.productId !== undefined) {
        if (data.productId) {
          updateData.product = { connect: { id: data.productId } };
        } else {
          updateData.product = { disconnect: true };
        }
      }

      // If quantity, price or VAT changed, recalculate amounts
      const quantity = data.quantity ?? Number(item.quantity);
      const unitPrice = data.unitPriceNet ?? Number(item.unitPrice);
      const vatPercent = data.vatPercentage ?? Number(item.vatPercent);

      // H3 FIX: Round to 2 decimal places for money precision
      const netAmount = Math.round(quantity * unitPrice * 100) / 100;
      const vatAmount = Math.round(netAmount * (vatPercent / 100) * 100) / 100;
      const grossAmount = Math.round((netAmount + vatAmount) * 100) / 100;

      updateData.vatAmount = vatAmount;
      updateData.totalPrice = grossAmount;

      // Update item
      await tx.invoiceItem.update({
        where: { id: itemId },
        data: updateData,
      });

      // Recalculate invoice totals
      await this.recalculateInvoiceTotalsInTx(tx, foundInvoiceId, tenantId);

      return foundInvoiceId;
    });

    const updated = await this.findById(invoiceId, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Recalculate invoice totals from items
   * Public method for external recalculation needs
   */
  async recalculateInvoiceTotals(invoiceId: string, tenantId: string): Promise<IInvoice> {
    // Verify invoice exists
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new Error('Számla nem található');
    }

    await this.prisma.$transaction(async tx => {
      await this.recalculateInvoiceTotalsInTx(tx, invoiceId, tenantId);
    });

    const updated = await this.findById(invoiceId, tenantId);
    if (!updated) {
      throw new Error('Számla nem található frissítés után');
    }

    return updated;
  }

  /**
   * Internal helper to recalculate invoice totals within a transaction
   */
  private async recalculateInvoiceTotalsInTx(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    tenantId: string
  ): Promise<void> {
    // Get items to calculate totals
    const items = await tx.invoiceItem.findMany({
      where: { invoiceId },
      select: { quantity: true, unitPrice: true, vatAmount: true, totalPrice: true },
    });

    let netAmount = 0;
    let vatAmount = 0;
    let grossAmount = 0;

    for (const item of items) {
      const itemNet = Number(item.quantity) * Number(item.unitPrice);
      netAmount += itemNet;
      vatAmount += Number(item.vatAmount);
      grossAmount += Number(item.totalPrice);
    }

    // Get current paid amount for balance calculation
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      select: { paidAmount: true },
    });

    const paidAmount = Number(invoice?.paidAmount ?? 0);
    const balanceDue = grossAmount - paidAmount;

    // Update invoice totals
    await tx.invoice.updateMany({
      where: { id: invoiceId, tenantId },
      data: {
        subtotal: netAmount,
        vatAmount: vatAmount,
        totalAmount: grossAmount,
        balanceDue: Math.max(0, balanceDue),
        updatedAt: new Date(),
      },
    });
  }
}
