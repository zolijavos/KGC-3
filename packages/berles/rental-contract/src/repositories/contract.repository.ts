/**
 * @kgc/rental-contract - Contract Repository
 * Epic 15: Bérlési szerződés kezelés
 *
 * Repository interface and InMemory implementation for Contract and ContractTemplate entities.
 */

import { Injectable } from '@nestjs/common';
import type {
  ArchivedContract,
  Contract,
  ContractSignature,
  ContractTemplate,
  ContractTemplateType,
  ContractVariables,
} from '../interfaces/contract.interface';
import { ContractStatus } from '../interfaces/contract.interface';

// ============================================
// REPOSITORY TOKENS
// ============================================

export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY');
export const CONTRACT_TEMPLATE_REPOSITORY = Symbol('CONTRACT_TEMPLATE_REPOSITORY');

// ============================================
// QUERY INTERFACES
// ============================================

export interface ContractQuery {
  tenantId: string;
  rentalId?: string;
  templateId?: string;
  status?: ContractStatus;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
  offset?: number;
  limit?: number;
}

export interface ContractQueryResult {
  contracts: Contract[];
  total: number;
  offset: number;
  limit: number;
}

export interface TemplateQuery {
  tenantId: string;
  type?: ContractTemplateType;
  isActive?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface TemplateQueryResult {
  templates: ContractTemplate[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// CREATE/UPDATE INPUTS
// ============================================

export interface CreateContractInput {
  rentalId: string;
  templateId: string;
  contractNumber: string;
  variables: ContractVariables;
}

export interface UpdateContractInput {
  status?: ContractStatus;
  pdfPath?: string;
  pdfGeneratedAt?: Date;
  signature?: ContractSignature;
}

export interface CreateTemplateInput {
  name: string;
  type: ContractTemplateType;
  content: string;
  availableVariables: string[];
  isActive?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  content?: string;
  availableVariables?: string[];
  isActive?: boolean;
}

// ============================================
// CONTRACT REPOSITORY INTERFACE
// ============================================

export interface IContractRepository {
  /**
   * Query contracts with filters and pagination
   */
  query(params: ContractQuery): Promise<ContractQueryResult>;

  /**
   * Find contract by ID
   */
  findById(id: string, tenantId: string): Promise<Contract | null>;

  /**
   * Find contract by rental ID
   */
  findByRentalId(rentalId: string, tenantId: string): Promise<Contract | null>;

  /**
   * Find contract by contract number
   */
  findByNumber(contractNumber: string, tenantId: string): Promise<Contract | null>;

  /**
   * Create new contract
   */
  create(tenantId: string, data: CreateContractInput, createdBy: string): Promise<Contract>;

  /**
   * Update contract
   */
  update(id: string, tenantId: string, data: UpdateContractInput): Promise<Contract>;

  /**
   * Add signature to contract
   */
  sign(
    id: string,
    tenantId: string,
    signature: Omit<ContractSignature, 'id' | 'contractId'>
  ): Promise<Contract>;

  /**
   * Archive contract
   */
  archive(
    id: string,
    tenantId: string,
    archiveData: Omit<ArchivedContract, 'id' | 'contractId' | 'tenantId' | 'archivedAt'>
  ): Promise<ArchivedContract>;

  /**
   * Get archived contract
   */
  getArchived(contractId: string, tenantId: string): Promise<ArchivedContract | null>;

  /**
   * Cancel contract
   */
  cancel(id: string, tenantId: string): Promise<Contract>;

  /**
   * Get contracts pending signature
   */
  getPendingSignature(tenantId: string): Promise<Contract[]>;

  /**
   * Get contracts expiring soon
   */
  getExpiringSoon(tenantId: string, days: number): Promise<Contract[]>;

  /**
   * Generate next contract number
   */
  generateNextNumber(tenantId: string, prefix?: string): Promise<string>;

  /**
   * Contract number exists
   */
  contractNumberExists(contractNumber: string, tenantId: string): Promise<boolean>;

  /**
   * Count contracts by status
   */
  countByStatus(tenantId: string): Promise<Record<ContractStatus, number>>;

  /**
   * Clear all data (for testing)
   */
  clear(): void;
}

// ============================================
// CONTRACT TEMPLATE REPOSITORY INTERFACE
// ============================================

export interface IContractTemplateRepository {
  /**
   * Query templates with filters
   */
  query(params: TemplateQuery): Promise<TemplateQueryResult>;

  /**
   * Find template by ID
   */
  findById(id: string, tenantId: string): Promise<ContractTemplate | null>;

  /**
   * Find active template by type
   */
  findActiveByType(type: ContractTemplateType, tenantId: string): Promise<ContractTemplate | null>;

  /**
   * Create new template
   */
  create(tenantId: string, data: CreateTemplateInput, createdBy: string): Promise<ContractTemplate>;

  /**
   * Update template (creates new version)
   */
  update(id: string, tenantId: string, data: UpdateTemplateInput): Promise<ContractTemplate>;

  /**
   * Activate template
   */
  activate(id: string, tenantId: string): Promise<ContractTemplate>;

  /**
   * Deactivate template
   */
  deactivate(id: string, tenantId: string): Promise<ContractTemplate>;

  /**
   * Get template versions
   */
  getVersions(templateName: string, tenantId: string): Promise<ContractTemplate[]>;

  /**
   * Delete template (only if not used)
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Check if template is used by any contract
   */
  isUsed(id: string, tenantId: string): Promise<boolean>;

  /**
   * Clear all data (for testing)
   */
  clear(): void;
}

// ============================================
// IN-MEMORY CONTRACT REPOSITORY
// ============================================

@Injectable()
export class InMemoryContractRepository implements IContractRepository {
  private contracts: Map<string, Contract> = new Map();
  private archives: Map<string, ArchivedContract> = new Map();
  private numberSequence: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.contracts.clear();
    this.archives.clear();
    this.numberSequence.clear();
  }

  async query(params: ContractQuery): Promise<ContractQueryResult> {
    let results = Array.from(this.contracts.values()).filter(c => c.tenantId === params.tenantId);

    // Apply filters
    if (params.rentalId) {
      results = results.filter(c => c.rentalId === params.rentalId);
    }
    if (params.templateId) {
      results = results.filter(c => c.templateId === params.templateId);
    }
    if (params.status) {
      results = results.filter(c => c.status === params.status);
    }
    if (params.createdFrom) {
      results = results.filter(c => c.createdAt >= params.createdFrom!);
    }
    if (params.createdTo) {
      results = results.filter(c => c.createdAt <= params.createdTo!);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        c =>
          c.contractNumber.toLowerCase().includes(term) ||
          c.variables.partnerName?.toLowerCase().includes(term) ||
          c.variables.equipmentName?.toLowerCase().includes(term)
      );
    }

    // Sort by created date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { contracts: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Contract | null> {
    const contract = this.contracts.get(id);
    if (!contract || contract.tenantId !== tenantId) return null;
    return contract;
  }

  async findByRentalId(rentalId: string, tenantId: string): Promise<Contract | null> {
    return (
      Array.from(this.contracts.values()).find(
        c => c.rentalId === rentalId && c.tenantId === tenantId
      ) ?? null
    );
  }

  async findByNumber(contractNumber: string, tenantId: string): Promise<Contract | null> {
    return (
      Array.from(this.contracts.values()).find(
        c => c.contractNumber === contractNumber && c.tenantId === tenantId
      ) ?? null
    );
  }

  async create(tenantId: string, data: CreateContractInput, createdBy: string): Promise<Contract> {
    // Validate contract number doesn't exist
    if (await this.contractNumberExists(data.contractNumber, tenantId)) {
      throw new Error(`A szerződésszám már létezik: ${data.contractNumber}`);
    }

    // Check if contract already exists for rental
    const existing = await this.findByRentalId(data.rentalId, tenantId);
    if (existing) {
      throw new Error(`Szerződés már létezik ehhez a bérléshez: ${data.rentalId}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const contract: Contract = {
      id,
      tenantId,
      rentalId: data.rentalId,
      templateId: data.templateId,
      contractNumber: data.contractNumber,
      status: ContractStatus.DRAFT,
      variables: data.variables,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.contracts.set(id, contract);
    return contract;
  }

  async update(id: string, tenantId: string, data: UpdateContractInput): Promise<Contract> {
    const contract = await this.findById(id, tenantId);
    if (!contract) {
      throw new Error('Szerződés nem található');
    }

    const updated: Contract = {
      ...contract,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.contracts.set(id, updated);
    return updated;
  }

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

    const signatureRecord: ContractSignature = {
      id: crypto.randomUUID(),
      contractId: id,
      ...signature,
    };

    return this.update(id, tenantId, {
      status: ContractStatus.SIGNED,
      signature: signatureRecord,
    });
  }

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

    const archiveId = crypto.randomUUID();
    const archived: ArchivedContract = {
      id: archiveId,
      contractId: id,
      tenantId,
      ...archiveData,
      archivedAt: new Date(),
    };

    this.archives.set(id, archived);
    await this.update(id, tenantId, { status: ContractStatus.ARCHIVED });

    return archived;
  }

  async getArchived(contractId: string, tenantId: string): Promise<ArchivedContract | null> {
    const archived = this.archives.get(contractId);
    if (!archived || archived.tenantId !== tenantId) return null;
    return archived;
  }

  async cancel(id: string, tenantId: string): Promise<Contract> {
    const contract = await this.findById(id, tenantId);
    if (!contract) {
      throw new Error('Szerződés nem található');
    }

    if (contract.status === ContractStatus.SIGNED || contract.status === ContractStatus.ARCHIVED) {
      throw new Error(`Az aláírt vagy archivált szerződés nem vonható vissza`);
    }

    return this.update(id, tenantId, { status: ContractStatus.CANCELLED });
  }

  async getPendingSignature(tenantId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values())
      .filter(c => c.tenantId === tenantId && c.status === ContractStatus.PENDING_SIGNATURE)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getExpiringSoon(tenantId: string, days: number): Promise<Contract[]> {
    // Filter for SIGNED contracts that have an expiration date
    // Note: Standard rental contracts don't expire - they end when rental returns
    // Long-term/recurring contracts would need expirationDate field in Contract interface
    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    return Array.from(this.contracts.values()).filter(c => {
      if (c.tenantId !== tenantId) return false;
      if (c.status !== ContractStatus.SIGNED) return false;
      // Check if contract has expiration date in variables (long-term contracts)
      const expirationDate = c.variables.contractEndDate;
      if (!expirationDate) return false;
      const expDate = new Date(expirationDate);
      return expDate >= now && expDate <= futureDate;
    });
  }

  async generateNextNumber(tenantId: string, prefix = 'SZ'): Promise<string> {
    const key = `${tenantId}:${prefix}`;
    const year = new Date().getFullYear();
    const current = this.numberSequence.get(key) ?? 0;
    const next = current + 1;
    this.numberSequence.set(key, next);
    return `${prefix}${year}-${next.toString().padStart(5, '0')}`;
  }

  async contractNumberExists(contractNumber: string, tenantId: string): Promise<boolean> {
    return Array.from(this.contracts.values()).some(
      c => c.contractNumber === contractNumber && c.tenantId === tenantId
    );
  }

  async countByStatus(tenantId: string): Promise<Record<ContractStatus, number>> {
    const counts: Record<string, number> = {
      DRAFT: 0,
      PENDING_SIGNATURE: 0,
      SIGNED: 0,
      EXPIRED: 0,
      ARCHIVED: 0,
      CANCELLED: 0,
    };

    for (const contract of this.contracts.values()) {
      if (contract.tenantId === tenantId) {
        counts[contract.status] = (counts[contract.status] ?? 0) + 1;
      }
    }

    return counts as Record<ContractStatus, number>;
  }
}

// ============================================
// IN-MEMORY CONTRACT TEMPLATE REPOSITORY
// ============================================

@Injectable()
export class InMemoryContractTemplateRepository implements IContractTemplateRepository {
  private templates: Map<string, ContractTemplate> = new Map();
  private usedTemplates: Set<string> = new Set();
  private contractRepository: IContractRepository | null = null;

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.templates.clear();
    this.usedTemplates.clear();
  }

  /**
   * Mark template as used (for testing or manual tracking)
   */
  markAsUsed(templateId: string): void {
    this.usedTemplates.add(templateId);
  }

  /**
   * Set contract repository reference for isUsed() validation
   * In production, this would be injected via dependency injection
   */
  setContractRepository(repo: IContractRepository): void {
    this.contractRepository = repo;
  }

  async query(params: TemplateQuery): Promise<TemplateQueryResult> {
    let results = Array.from(this.templates.values()).filter(t => t.tenantId === params.tenantId);

    // Apply filters
    if (params.type) {
      results = results.filter(t => t.type === params.type);
    }
    if (params.isActive !== undefined) {
      results = results.filter(t => t.isActive === params.isActive);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(t => t.name.toLowerCase().includes(term));
    }

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { templates: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<ContractTemplate | null> {
    const template = this.templates.get(id);
    if (!template || template.tenantId !== tenantId) return null;
    return template;
  }

  async findActiveByType(
    type: ContractTemplateType,
    tenantId: string
  ): Promise<ContractTemplate | null> {
    return (
      Array.from(this.templates.values()).find(
        t => t.type === type && t.tenantId === tenantId && t.isActive
      ) ?? null
    );
  }

  async create(
    tenantId: string,
    data: CreateTemplateInput,
    createdBy: string
  ): Promise<ContractTemplate> {
    const now = new Date();
    const id = crypto.randomUUID();

    const template: ContractTemplate = {
      id,
      tenantId,
      name: data.name,
      type: data.type,
      content: data.content,
      availableVariables: data.availableVariables,
      version: 1,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.templates.set(id, template);
    return template;
  }

  async update(id: string, tenantId: string, data: UpdateTemplateInput): Promise<ContractTemplate> {
    const template = await this.findById(id, tenantId);
    if (!template) {
      throw new Error('Sablon nem található');
    }

    // Check if used - if yes, create new version
    if (
      (await this.isUsed(id, tenantId)) &&
      (data.content !== undefined || data.availableVariables !== undefined)
    ) {
      // Create new version
      const newTemplate: ContractTemplate = {
        id: crypto.randomUUID(),
        tenantId,
        name: data.name ?? template.name,
        type: template.type,
        content: data.content ?? template.content,
        availableVariables: data.availableVariables ?? template.availableVariables,
        version: template.version + 1,
        isActive: data.isActive ?? template.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: template.createdBy,
      };

      // Deactivate old version
      this.templates.set(id, { ...template, isActive: false, updatedAt: new Date() });
      this.templates.set(newTemplate.id, newTemplate);

      return newTemplate;
    }

    const updated: ContractTemplate = {
      ...template,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  async activate(id: string, tenantId: string): Promise<ContractTemplate> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<ContractTemplate> {
    return this.update(id, tenantId, { isActive: false });
  }

  async getVersions(templateName: string, tenantId: string): Promise<ContractTemplate[]> {
    return Array.from(this.templates.values())
      .filter(t => t.tenantId === tenantId && t.name === templateName)
      .sort((a, b) => b.version - a.version);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const template = await this.findById(id, tenantId);
    if (!template) {
      throw new Error('Sablon nem található');
    }

    if (await this.isUsed(id, tenantId)) {
      throw new Error('A sablon használatban van, nem törölhető');
    }

    this.templates.delete(id);
  }

  async isUsed(id: string, tenantId: string): Promise<boolean> {
    // First check manual tracking (for tests)
    if (this.usedTemplates.has(id)) {
      return true;
    }

    // If contract repository is available, query it
    if (this.contractRepository) {
      const result = await this.contractRepository.query({
        tenantId,
        templateId: id,
        limit: 1,
      });
      return result.total > 0;
    }

    return false;
  }
}
