import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  Contract,
  ContractStatus,
  SignatureType,
  PdfGenerationOptions,
} from '../interfaces/contract.interface';
import { GenerateContractDto } from '../dto/contract.dto';
import { TemplateService } from './template.service';
import { PdfService } from './pdf.service';
import { SignatureService } from './signature.service';
import { ArchiveService } from './archive.service';

/**
 * @kgc/rental-contract - Contract Service
 * Orchestrates template, PDF, signature, and archive services
 */

@Injectable()
export class ContractService {
  private contracts: Map<string, Contract> = new Map();
  private contractIdCounter = 0;
  private contractNumberCounter = 0;

  constructor(
    private readonly templateService: TemplateService,
    private readonly pdfService: PdfService,
    private readonly signatureService: SignatureService,
    private readonly archiveService: ArchiveService
  ) {}

  /**
   * Szerződés generálása bérlés adatokból
   */
  async generateContract(
    tenantId: string,
    dto: GenerateContractDto,
    rentalData: {
      id: string;
      startDate: Date;
      endDate?: Date;
      dailyRate: number;
      totalAmount?: number;
    },
    partnerData: {
      name: string;
      address: string;
      taxNumber?: string;
      phone?: string;
      email?: string;
    },
    equipmentData: {
      name: string;
      serialNumber?: string;
      condition?: string;
    },
    tenantData: {
      name: string;
      address: string;
      taxNumber: string;
      phone?: string;
    },
    createdBy: string,
    depositData?: {
      amount: number;
      method: string;
    }
  ): Promise<Contract> {
    // Template lekérdezés
    const template = await this.templateService.getTemplateById(dto.templateId, tenantId);

    if (!template.isActive) {
      throw new BadRequestException('Cannot use inactive template');
    }

    // Szerződés szám generálás
    const contractNumber = this.generateContractNumber(tenantId);

    // Változók összeállítása
    const variables = this.templateService.buildDefaultVariables(
      rentalData,
      partnerData,
      equipmentData,
      tenantData,
      contractNumber,
      depositData
    );

    // Variable overrides alkalmazása
    if (dto.variableOverrides) {
      for (const [key, value] of Object.entries(dto.variableOverrides)) {
        variables[key] = value;
      }
    }

    const id = `contract_${++this.contractIdCounter}_${Date.now()}`;
    const now = new Date();

    const contract: Contract = {
      id,
      tenantId,
      rentalId: dto.rentalId,
      templateId: dto.templateId,
      contractNumber,
      status: ContractStatus.DRAFT,
      variables,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.contracts.set(id, contract);

    return contract;
  }

  /**
   * PDF generálása szerződéshez
   * Csak DRAFT státuszú szerződéshez generálható PDF
   */
  async generatePdf(
    contractId: string,
    tenantId: string,
    options?: PdfGenerationOptions
  ): Promise<{ pdfData: Uint8Array; contract: Contract }> {
    const contract = await this.getContractById(contractId, tenantId);

    // Status validáció - csak DRAFT státuszú szerződéshez generálható PDF
    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot generate PDF for contract with status ${contract.status}. Contract must be in DRAFT status.`
      );
    }

    // Template lekérdezés
    const template = await this.templateService.getTemplateById(
      contract.templateId,
      tenantId
    );

    // Template renderelés
    const renderedContent = this.templateService.renderTemplate(template, contract.variables);

    // PDF generálás
    const pdfData = await this.pdfService.generatePdf(renderedContent, contract, options);

    // Metaadatok hozzáadása
    const finalPdf = await this.pdfService.setPdfMetadata(pdfData, {
      title: `Bérlési szerződés - ${contract.contractNumber}`,
      author: contract.variables.companyName,
      subject: `Bérlési szerződés - ${contract.variables.partnerName}`,
      creator: 'KGC ERP v7.0',
    });

    // Státusz frissítés
    contract.status = ContractStatus.PENDING_SIGNATURE;
    contract.pdfGeneratedAt = new Date();
    contract.pdfPath = `temp/${contract.id}.pdf`; // In-memory path, will be updated on archive
    contract.updatedAt = new Date();

    this.contracts.set(contractId, contract);

    return { pdfData: finalPdf, contract };
  }

  /**
   * Szerződés aláírása
   */
  async signContract(
    contractId: string,
    tenantId: string,
    signatureImage: string,
    signerName: string,
    signerEmail: string | undefined,
    metadata: {
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<Contract> {
    const contract = await this.getContractById(contractId, tenantId);

    // Aláírás rögzítése
    const signature = await this.signatureService.recordSignature(
      contract,
      {
        contractId,
        type: SignatureType.DIGITAL,
        signatureImage,
        signerName,
        signerEmail,
      },
      metadata
    );

    // Státusz frissítés
    contract.status = ContractStatus.SIGNED;
    contract.signature = signature;
    contract.updatedAt = new Date();

    this.contracts.set(contractId, contract);

    return contract;
  }

  /**
   * Szerződés archiválása
   */
  async archiveContract(
    contractId: string,
    tenantId: string,
    pdfData: Uint8Array,
    retentionYears?: number
  ): Promise<Contract> {
    const contract = await this.getContractById(contractId, tenantId);

    // Archiválás
    const archive = await this.archiveService.archiveContract(
      contract,
      pdfData,
      { contractId, retentionYears: retentionYears ?? 10 }
    );

    // Státusz frissítés
    contract.status = ContractStatus.ARCHIVED;
    contract.pdfPath = `${archive.storageBucket}/${archive.storagePath}`;
    contract.updatedAt = new Date();

    this.contracts.set(contractId, contract);

    return contract;
  }

  /**
   * Szerződés lekérdezése ID alapján
   */
  async getContractById(id: string, tenantId: string): Promise<Contract> {
    const contract = this.contracts.get(id);

    if (!contract || contract.tenantId !== tenantId) {
      throw new NotFoundException(`Contract not found: ${id}`);
    }

    return contract;
  }

  /**
   * Szerződés lekérdezése bérlés ID alapján
   */
  async getContractByRentalId(rentalId: string, tenantId: string): Promise<Contract | null> {
    for (const contract of this.contracts.values()) {
      if (contract.rentalId === rentalId && contract.tenantId === tenantId) {
        return contract;
      }
    }
    return null;
  }

  /**
   * Szerződések listázása
   */
  async listContracts(
    tenantId: string,
    filters: {
      status?: ContractStatus;
      rentalId?: string;
      fromDate?: Date;
      toDate?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<{ items: Contract[]; total: number }> {
    let contracts = Array.from(this.contracts.values()).filter(
      (c) => c.tenantId === tenantId
    );

    // Szűrés státusz alapján
    if (filters.status) {
      contracts = contracts.filter((c) => c.status === filters.status);
    }

    // Szűrés bérlés ID alapján
    if (filters.rentalId) {
      contracts = contracts.filter((c) => c.rentalId === filters.rentalId);
    }

    // Szűrés dátum alapján - capture to avoid non-null assertions
    const { fromDate, toDate } = filters;
    if (fromDate) {
      contracts = contracts.filter((c) => c.createdAt >= fromDate);
    }

    if (toDate) {
      contracts = contracts.filter((c) => c.createdAt <= toDate);
    }

    const total = contracts.length;

    // Pagination
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const start = (page - 1) * limit;
    const paginatedContracts = contracts.slice(start, start + limit);

    return { items: paginatedContracts, total };
  }

  /**
   * Szerződés érvénytelenítése
   */
  async cancelContract(contractId: string, tenantId: string, reason: string): Promise<Contract> {
    const contract = await this.getContractById(contractId, tenantId);

    // Csak DRAFT vagy PENDING_SIGNATURE státuszú szerződés törölhető
    if (
      contract.status !== ContractStatus.DRAFT &&
      contract.status !== ContractStatus.PENDING_SIGNATURE
    ) {
      throw new BadRequestException(
        `Cannot cancel contract with status ${contract.status}`
      );
    }

    contract.status = ContractStatus.CANCELLED;
    contract.updatedAt = new Date();
    // Store cancellation reason in variables for audit
    contract.variables['_cancellationReason'] = reason;
    contract.variables['_cancelledAt'] = new Date().toISOString();

    this.contracts.set(contractId, contract);

    return contract;
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  /**
   * Szerződés szám generálás
   * Format: KGC-YYYY-NNNNN
   */
  private generateContractNumber(tenantId: string): string {
    const year = new Date().getFullYear();
    const sequence = String(++this.contractNumberCounter).padStart(5, '0');
    // Use first 3 chars of tenantId as prefix (or KGC as default)
    const prefix = tenantId.substring(0, 3).toUpperCase() || 'KGC';

    return `${prefix}-${year}-${sequence}`;
  }
}
