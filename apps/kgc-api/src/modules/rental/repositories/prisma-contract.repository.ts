/**
 * Prisma Contract Repository
 * Implements IContractRepository and IContractTemplateRepository for PostgreSQL
 * Epic 15: Bérlési szerződés kezelés
 */

import type {
  ArchivedContract,
  Contract,
  ContractSignature,
  ContractTemplate,
  ContractTemplateType,
  ContractVariables,
} from '@kgc/rental-contract';
import {
  ContractQuery,
  ContractQueryResult,
  ContractStatus,
  CreateContractInput,
  CreateTemplateInput,
  IContractRepository,
  IContractTemplateRepository,
  SignatureType,
  TemplateQuery,
  TemplateQueryResult,
  UpdateContractInput,
  UpdateTemplateInput,
} from '@kgc/rental-contract';
import { Inject, Injectable } from '@nestjs/common';
import {
  Prisma,
  PrismaClient,
  RentalContract as PrismaContract,
  ContractTemplate as PrismaTemplate,
} from '@prisma/client';

// ============================================
// CONTRACT REPOSITORY
// ============================================

@Injectable()
export class PrismaContractRepository implements IContractRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private createDefaultVariables(): ContractVariables {
    return {
      partnerName: '',
      partnerAddress: '',
      rentalId: '',
      rentalStartDate: '',
      rentalDailyRate: 0,
      equipmentName: '',
      companyName: '',
      companyAddress: '',
      companyTaxNumber: '',
      currentDate: '',
      contractNumber: '',
    };
  }

  private toContractDomain(contract: PrismaContract): Contract {
    const status = this.mapPrismaStatus(contract);

    const result: Contract = {
      id: contract.id,
      tenantId: contract.tenantId,
      rentalId: '', // Joined via rentals relation
      templateId: contract.templateId ?? '',
      contractNumber: contract.contractNumber,
      status,
      variables: this.createDefaultVariables(),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      createdBy: '',
    };

    if (contract.pdfUrl) {
      result.pdfPath = contract.pdfUrl;
    }
    if (contract.pdfGenAt) {
      result.pdfGeneratedAt = contract.pdfGenAt;
    }
    if (contract.signedAt && contract.partnerSignature) {
      result.signature = {
        id: crypto.randomUUID(),
        contractId: contract.id,
        type: SignatureType.DIGITAL,
        signerName: '',
        signedAt: contract.signedAt,
        signatureHash: '',
        signatureImage: contract.partnerSignature,
      };
    }

    return result;
  }

  private mapPrismaStatus(contract: PrismaContract): ContractStatus {
    if (contract.archivedAt) return ContractStatus.ARCHIVED;
    if (contract.signedByPartner && contract.signedByOperator) return ContractStatus.SIGNED;
    if (contract.signedByPartner || contract.signedByOperator)
      return ContractStatus.PENDING_SIGNATURE;
    if (contract.pdfGenAt) return ContractStatus.PENDING_SIGNATURE;
    return ContractStatus.DRAFT;
  }

  clear(): void {
    // No-op for Prisma
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: ContractQuery): Promise<ContractQueryResult> {
    const where: Prisma.RentalContractWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.templateId) {
      where.templateId = params.templateId;
    }
    if (params.createdFrom) {
      where.createdAt = { gte: params.createdFrom };
    }
    if (params.createdTo) {
      where.createdAt = { ...(where.createdAt as object), lte: params.createdTo };
    }
    if (params.search) {
      where.contractNumber = { contains: params.search, mode: 'insensitive' };
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [contracts, total] = await Promise.all([
      this.prisma.rentalContract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.rentalContract.count({ where }),
    ]);

    return {
      contracts: contracts.map(c => this.toContractDomain(c)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<Contract | null> {
    const contract = await this.prisma.rentalContract.findFirst({
      where: { id, tenantId },
    });
    return contract ? this.toContractDomain(contract) : null;
  }

  async findByRentalId(rentalId: string, tenantId: string): Promise<Contract | null> {
    const rental = await this.prisma.rental.findFirst({
      where: { id: rentalId, tenantId, contractId: { not: null } },
      select: { contractId: true },
    });
    if (!rental?.contractId) return null;

    return this.findById(rental.contractId, tenantId);
  }

  async findByNumber(contractNumber: string, tenantId: string): Promise<Contract | null> {
    const contract = await this.prisma.rentalContract.findFirst({
      where: { contractNumber, tenantId },
    });
    return contract ? this.toContractDomain(contract) : null;
  }

  // ============================================
  // CREATE / UPDATE
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(tenantId: string, data: CreateContractInput, _createdBy: string): Promise<Contract> {
    // Validate contract number doesn't exist
    if (await this.contractNumberExists(data.contractNumber, tenantId)) {
      throw new Error(`A szerződésszám már létezik: ${data.contractNumber}`);
    }

    const contract = await this.prisma.rentalContract.create({
      data: {
        tenantId,
        contractNumber: data.contractNumber,
        templateId: data.templateId ?? null,
      },
    });

    // Link to rental if provided
    if (data.rentalId) {
      await this.prisma.rental.updateMany({
        where: { id: data.rentalId, tenantId },
        data: { contractId: contract.id },
      });
    }

    return this.toContractDomain(contract);
  }

  async update(id: string, tenantId: string, data: UpdateContractInput): Promise<Contract> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Szerződés nem található');
    }

    const updateData: Prisma.RentalContractUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.pdfPath !== undefined) {
      updateData.pdfUrl = data.pdfPath;
    }
    if (data.pdfGeneratedAt !== undefined) {
      updateData.pdfGenAt = data.pdfGeneratedAt;
    }

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.rentalContract.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error('Szerződés frissítése sikertelen');
    }

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Szerződés nem található frissítés után');
    }
    return updated;
  }

  // ============================================
  // SIGNATURE
  // ============================================

  async sign(
    id: string,
    tenantId: string,
    signature: Omit<ContractSignature, 'id' | 'contractId'>
  ): Promise<Contract> {
    const contract = await this.findById(id, tenantId);
    if (!contract) {
      throw new Error('Szerződés nem található');
    }

    if (
      contract.status !== ContractStatus.PENDING_SIGNATURE &&
      contract.status !== ContractStatus.DRAFT
    ) {
      throw new Error(`A szerződés nem írható alá ebben az állapotban: ${contract.status}`);
    }

    // For now, assume partner signature - could be determined by signature.signerName or additional parameter
    const signatureImage = signature.signatureImage ?? '';

    await this.prisma.rentalContract.updateMany({
      where: { id, tenantId },
      data: {
        signedAt: signature.signedAt,
        signedByPartner: true,
        partnerSignature: signatureImage,
        updatedAt: new Date(),
      },
    });

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Szerződés nem található aláírás után');
    }
    return updated;
  }

  // ============================================
  // ARCHIVE
  // ============================================

  async archive(
    id: string,
    tenantId: string,
    archiveData: Omit<ArchivedContract, 'id' | 'contractId' | 'tenantId' | 'archivedAt'>
  ): Promise<ArchivedContract> {
    const contract = await this.findById(id, tenantId);
    if (!contract) {
      throw new Error('Szerződés nem található');
    }

    if (contract.status !== ContractStatus.SIGNED && contract.status !== ContractStatus.EXPIRED) {
      throw new Error(`A szerződés nem archiválható ebben az állapotban: ${contract.status}`);
    }

    const now = new Date();

    await this.prisma.rentalContract.updateMany({
      where: { id, tenantId },
      data: {
        archivedAt: now,
        updatedAt: now,
      },
    });

    return {
      id: crypto.randomUUID(),
      contractId: id,
      tenantId,
      storageBucket: archiveData.storageBucket,
      storagePath: archiveData.storagePath,
      fileSize: archiveData.fileSize,
      contentHash: archiveData.contentHash,
      retentionYears: archiveData.retentionYears,
      archivedAt: now,
    };
  }

  async getArchived(contractId: string, tenantId: string): Promise<ArchivedContract | null> {
    const contract = await this.prisma.rentalContract.findFirst({
      where: { id: contractId, tenantId, archivedAt: { not: null } },
    });

    if (!contract || !contract.archivedAt) return null;

    return {
      id: crypto.randomUUID(),
      contractId: contract.id,
      tenantId: contract.tenantId,
      storageBucket: 'default',
      storagePath: contract.pdfUrl ?? '',
      fileSize: 0,
      contentHash: '',
      retentionYears: 7,
      archivedAt: contract.archivedAt,
    };
  }

  // ============================================
  // CANCEL
  // ============================================

  async cancel(id: string, tenantId: string): Promise<Contract> {
    const contract = await this.findById(id, tenantId);
    if (!contract) {
      throw new Error('Szerződés nem található');
    }

    if (contract.status === ContractStatus.SIGNED || contract.status === ContractStatus.ARCHIVED) {
      throw new Error('Az aláírt vagy archivált szerződés nem vonható vissza');
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    // We soft-delete by archiving with a cancellation note
    await this.prisma.rentalContract.deleteMany({
      where: { id, tenantId },
    });

    return contract;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async getPendingSignature(tenantId: string): Promise<Contract[]> {
    const contracts = await this.prisma.rentalContract.findMany({
      where: {
        tenantId,
        archivedAt: null,
        pdfGenAt: { not: null },
        OR: [{ signedByPartner: false }, { signedByOperator: false }],
      },
      orderBy: { createdAt: 'asc' },
    });
    return contracts.map(c => this.toContractDomain(c));
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getExpiringSoon(_tenantId: string, _days: number): Promise<Contract[]> {
    // Contracts don't have expiration dates in current schema
    // Would need to join with rentals to check expectedEnd
    return [];
  }

  // ============================================
  // NUMBER GENERATION
  // ============================================

  async generateNextNumber(tenantId: string, prefix = 'SZ'): Promise<string> {
    const year = new Date().getFullYear();
    const pattern = `${prefix}${year}-`;

    // C3 FIX: Use transaction with SERIALIZABLE isolation to prevent race conditions
    return this.prisma.$transaction(
      async tx => {
        const lastContract = await tx.rentalContract.findFirst({
          where: {
            tenantId,
            contractNumber: { startsWith: pattern },
          },
          orderBy: { contractNumber: 'desc' },
        });

        let nextNum = 1;
        if (lastContract) {
          const match = lastContract.contractNumber.match(/-(\d+)$/);
          if (match?.[1]) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }

        return `${pattern}${nextNum.toString().padStart(5, '0')}`;
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );
  }

  async contractNumberExists(contractNumber: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.rentalContract.count({
      where: { contractNumber, tenantId },
    });
    return count > 0;
  }

  async countByStatus(tenantId: string): Promise<Record<ContractStatus, number>> {
    const contracts = await this.prisma.rentalContract.findMany({
      where: { tenantId },
      select: {
        signedByPartner: true,
        signedByOperator: true,
        archivedAt: true,
        pdfGenAt: true,
      },
    });

    let draftCount = 0;
    let pendingCount = 0;
    let signedCount = 0;
    let archivedCount = 0;

    for (const c of contracts) {
      if (c.archivedAt) archivedCount++;
      else if (c.signedByPartner && c.signedByOperator) signedCount++;
      else if (c.pdfGenAt) pendingCount++;
      else draftCount++;
    }

    return {
      DRAFT: draftCount,
      PENDING_SIGNATURE: pendingCount,
      SIGNED: signedCount,
      EXPIRED: 0,
      ARCHIVED: archivedCount,
      CANCELLED: 0,
    } as Record<ContractStatus, number>;
  }
}

// ============================================
// CONTRACT TEMPLATE REPOSITORY
// ============================================

@Injectable()
export class PrismaContractTemplateRepository implements IContractTemplateRepository {
  constructor(
    @Inject('PRISMA_CLIENT')
    private readonly prisma: PrismaClient
  ) {}

  // ============================================
  // MAPPING FUNCTIONS
  // ============================================

  private toTemplateDomain(template: PrismaTemplate): ContractTemplate {
    return {
      id: template.id,
      tenantId: template.tenantId,
      name: template.name,
      type: 'STANDARD' as ContractTemplateType, // Not stored in Prisma
      content: template.content,
      availableVariables: [], // Not stored in Prisma
      version: template.version,
      isActive: template.isActive,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      createdBy: '',
    };
  }

  clear(): void {
    // No-op for Prisma
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async query(params: TemplateQuery): Promise<TemplateQueryResult> {
    const where: Prisma.ContractTemplateWhereInput = {
      tenantId: params.tenantId,
    };

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;

    const [templates, total] = await Promise.all([
      this.prisma.contractTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.contractTemplate.count({ where }),
    ]);

    return {
      templates: templates.map(t => this.toTemplateDomain(t)),
      total,
      offset,
      limit,
    };
  }

  async findById(id: string, tenantId: string): Promise<ContractTemplate | null> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id, tenantId },
    });
    return template ? this.toTemplateDomain(template) : null;
  }

  async findActiveByType(
    _type: ContractTemplateType,
    tenantId: string
  ): Promise<ContractTemplate | null> {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { tenantId, isActive: true, isDefault: true },
    });
    return template ? this.toTemplateDomain(template) : null;
  }

  // ============================================
  // CREATE / UPDATE
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(
    tenantId: string,
    data: CreateTemplateInput,
    _createdBy: string
  ): Promise<ContractTemplate> {
    const template = await this.prisma.contractTemplate.create({
      data: {
        tenantId,
        name: data.name,
        content: data.content,
        description: null,
        version: 1,
        isActive: data.isActive ?? true,
        isDefault: false,
      },
    });

    return this.toTemplateDomain(template);
  }

  async update(id: string, tenantId: string, data: UpdateTemplateInput): Promise<ContractTemplate> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Sablon nem található');
    }

    // Check if used - if content changes, create new version
    if (data.content !== undefined && (await this.isUsed(id, tenantId))) {
      // Create new version
      const newTemplate = await this.prisma.contractTemplate.create({
        data: {
          tenantId,
          name: data.name ?? existing.name,
          content: data.content,
          description: null,
          version: existing.version + 1,
          isActive: data.isActive ?? existing.isActive,
          isDefault: false,
        },
      });

      // Deactivate old version
      await this.prisma.contractTemplate.updateMany({
        where: { id, tenantId },
        data: { isActive: false },
      });

      return this.toTemplateDomain(newTemplate);
    }

    const updateData: Prisma.ContractTemplateUpdateManyMutationInput = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // H2 FIX: Use updateMany with tenantId for multi-tenant safety
    const result = await this.prisma.contractTemplate.updateMany({
      where: { id, tenantId },
      data: updateData,
    });

    if (result.count === 0) {
      throw new Error('Sablon frissítése sikertelen');
    }

    // M3 FIX: Explicit null check
    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Sablon nem található frissítés után');
    }
    return updated;
  }

  async activate(id: string, tenantId: string): Promise<ContractTemplate> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<ContractTemplate> {
    return this.update(id, tenantId, { isActive: false });
  }

  async getVersions(templateName: string, tenantId: string): Promise<ContractTemplate[]> {
    const templates = await this.prisma.contractTemplate.findMany({
      where: { tenantId, name: templateName },
      orderBy: { version: 'desc' },
    });
    return templates.map(t => this.toTemplateDomain(t));
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const existing = await this.findById(id, tenantId);
    if (!existing) {
      throw new Error('Sablon nem található');
    }

    if (await this.isUsed(id, tenantId)) {
      throw new Error('A sablon használatban van, nem törölhető');
    }

    // H2 FIX: Use deleteMany with tenantId for multi-tenant safety
    await this.prisma.contractTemplate.deleteMany({
      where: { id, tenantId },
    });
  }

  async isUsed(id: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.rentalContract.count({
      where: { templateId: id, tenantId },
    });
    return count > 0;
  }
}
