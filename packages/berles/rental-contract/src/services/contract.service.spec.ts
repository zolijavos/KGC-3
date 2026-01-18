import { describe, it, expect, beforeEach } from 'vitest';
import { ContractService } from './contract.service';
import { TemplateService } from './template.service';
import { PdfService } from './pdf.service';
import { SignatureService } from './signature.service';
import { ArchiveService, InMemoryStorageAdapter } from './archive.service';
import { ContractStatus, ContractTemplateType } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - ContractService Unit Tests
 * Epic 15: Szerződés Kezelés Orchestrator Service
 *
 * TDD-KÖTELEZŐ: State machine átmenetek, validációk
 */

describe('ContractService', () => {
  let service: ContractService;
  let templateService: TemplateService;
  let pdfService: PdfService;
  let signatureService: SignatureService;
  let archiveService: ArchiveService;

  const validTemplateContent = `
    {{contractNumber}} {{currentDate}} {{companyName}}
    {{partnerName}} {{partnerAddress}} {{equipmentName}}
    {{rentalStartDate}} {{rentalDailyRate}}
  `;

  const mockRentalData = {
    id: 'rental_1',
    startDate: new Date('2026-01-15'),
    dailyRate: 10000,
  };

  const mockPartnerData = {
    name: 'Teszt Partner Kft',
    address: 'Budapest, Teszt utca 1.',
    taxNumber: '12345678-2-42',
  };

  const mockEquipmentData = {
    name: 'Makita HR2470',
    serialNumber: 'SN123456',
  };

  const mockTenantData = {
    name: 'Kisgépcentrum Kft',
    address: 'Budapest, Bérlés utca 2.',
    taxNumber: '87654321-2-13',
  };

  beforeEach(async () => {
    templateService = new TemplateService();
    pdfService = new PdfService();
    signatureService = new SignatureService();
    archiveService = new ArchiveService(new InMemoryStorageAdapter());

    service = new ContractService(
      templateService,
      pdfService,
      signatureService,
      archiveService
    );

    // Create a valid template for testing
    await templateService.createTemplate(
      'tenant_1',
      {
        name: 'Standard Bérlés',
        type: ContractTemplateType.RENTAL_STANDARD,
        content: validTemplateContent,
        isActive: true,
      },
      'user_1'
    );
  });

  // ===========================================================================
  // generateContract() tests
  // ===========================================================================
  describe('generateContract()', () => {
    it('should create contract in DRAFT status', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      expect(contract.id).toBeDefined();
      expect(contract.status).toBe(ContractStatus.DRAFT);
      expect(contract.tenantId).toBe('tenant_1');
      expect(contract.rentalId).toBe('rental_1');
      expect(contract.contractNumber).toMatch(/^TEN-\d{4}-\d{5}$/);
    });

    it('should reject inactive template', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];
      await templateService.deactivateTemplate(template!.id, 'tenant_1');

      await expect(
        service.generateContract(
          'tenant_1',
          { templateId: template!.id, rentalId: mockRentalData.id },
          mockRentalData,
          mockPartnerData,
          mockEquipmentData,
          mockTenantData,
          'user_1'
        )
      ).rejects.toThrow('Cannot use inactive template');
    });

    it('should apply variable overrides', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        {
          templateId: template!.id,
          rentalId: mockRentalData.id,
          variableOverrides: { customField: 'Custom Value' },
        },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      expect(contract.variables['customField']).toBe('Custom Value');
    });
  });

  // ===========================================================================
  // generatePdf() tests - TDD KÖTELEZŐ (State machine)
  // ===========================================================================
  describe('generatePdf()', () => {
    it('should generate PDF for DRAFT contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      const result = await service.generatePdf(contract.id, 'tenant_1');

      expect(result.pdfData).toBeInstanceOf(Uint8Array);
      expect(result.pdfData.length).toBeGreaterThan(0);
      expect(result.contract.status).toBe(ContractStatus.PENDING_SIGNATURE);
      expect(result.contract.pdfGeneratedAt).toBeInstanceOf(Date);
    });

    it('should reject PDF generation for non-DRAFT contracts', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      // Generate PDF first (transitions to PENDING_SIGNATURE)
      await service.generatePdf(contract.id, 'tenant_1');

      // Try to generate again
      await expect(service.generatePdf(contract.id, 'tenant_1')).rejects.toThrow(
        'Contract must be in DRAFT status'
      );
    });
  });

  // ===========================================================================
  // signContract() tests - TDD KÖTELEZŐ (State machine)
  // ===========================================================================
  describe('signContract()', () => {
    const validSignatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should sign PENDING_SIGNATURE contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      await service.generatePdf(contract.id, 'tenant_1');

      const signedContract = await service.signContract(
        contract.id,
        'tenant_1',
        validSignatureImage,
        'Teszt Aláíró',
        'test@example.com',
        { ipAddress: '127.0.0.1', userAgent: 'Test Agent' }
      );

      expect(signedContract.status).toBe(ContractStatus.SIGNED);
      expect(signedContract.signature).toBeDefined();
      expect(signedContract.signature?.signerName).toBe('Teszt Aláíró');
    });
  });

  // ===========================================================================
  // archiveContract() tests - TDD KÖTELEZŐ (State machine)
  // ===========================================================================
  describe('archiveContract()', () => {
    const validSignatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    it('should archive SIGNED contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      const { pdfData } = await service.generatePdf(contract.id, 'tenant_1');

      await service.signContract(
        contract.id,
        'tenant_1',
        validSignatureImage,
        'Teszt Aláíró',
        undefined,
        {}
      );

      const archivedContract = await service.archiveContract(
        contract.id,
        'tenant_1',
        pdfData
      );

      expect(archivedContract.status).toBe(ContractStatus.ARCHIVED);
      expect(archivedContract.pdfPath).toBeDefined();
    });
  });

  // ===========================================================================
  // cancelContract() tests - TDD KÖTELEZŐ (State machine)
  // ===========================================================================
  describe('cancelContract()', () => {
    it('should cancel DRAFT contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      const cancelledContract = await service.cancelContract(
        contract.id,
        'tenant_1',
        'Testing cancellation'
      );

      expect(cancelledContract.status).toBe(ContractStatus.CANCELLED);
      expect(cancelledContract.variables['_cancellationReason']).toBe('Testing cancellation');
    });

    it('should cancel PENDING_SIGNATURE contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      await service.generatePdf(contract.id, 'tenant_1');

      const cancelledContract = await service.cancelContract(
        contract.id,
        'tenant_1',
        'Changed mind'
      );

      expect(cancelledContract.status).toBe(ContractStatus.CANCELLED);
    });

    it('should reject cancellation of SIGNED contract', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];
      const validSignatureImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const contract = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      await service.generatePdf(contract.id, 'tenant_1');
      await service.signContract(contract.id, 'tenant_1', validSignatureImage, 'Signer', undefined, {});

      await expect(
        service.cancelContract(contract.id, 'tenant_1', 'Too late')
      ).rejects.toThrow('Cannot cancel contract with status SIGNED');
    });
  });

  // ===========================================================================
  // getContractById() tests
  // ===========================================================================
  describe('getContractById()', () => {
    it('should retrieve contract by ID', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const created = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      const retrieved = await service.getContractById(created.id, 'tenant_1');

      expect(retrieved.id).toBe(created.id);
    });

    it('should throw NotFoundException for wrong tenant', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const created = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: mockRentalData.id },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      await expect(service.getContractById(created.id, 'tenant_2')).rejects.toThrow(
        'Contract not found'
      );
    });
  });

  // ===========================================================================
  // listContracts() tests
  // ===========================================================================
  describe('listContracts()', () => {
    it('should list contracts with pagination', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      // Create multiple contracts
      for (let i = 0; i < 5; i++) {
        await service.generateContract(
          'tenant_1',
          { templateId: template!.id, rentalId: `rental_${i}` },
          { ...mockRentalData, id: `rental_${i}` },
          mockPartnerData,
          mockEquipmentData,
          mockTenantData,
          'user_1'
        );
      }

      const result = await service.listContracts('tenant_1', { page: 1, limit: 3 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
    });

    it('should filter by status', async () => {
      const templates = await templateService.listTemplates('tenant_1', { page: 1, limit: 10 });
      const template = templates.items[0];

      const contract1 = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: 'rental_draft' },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      const contract2 = await service.generateContract(
        'tenant_1',
        { templateId: template!.id, rentalId: 'rental_pending' },
        mockRentalData,
        mockPartnerData,
        mockEquipmentData,
        mockTenantData,
        'user_1'
      );

      // Generate PDF for contract2 (transitions to PENDING_SIGNATURE)
      await service.generatePdf(contract2.id, 'tenant_1');

      const draftOnly = await service.listContracts('tenant_1', {
        status: ContractStatus.DRAFT,
      });

      expect(draftOnly.items).toHaveLength(1);
      expect(draftOnly.items[0]?.id).toBe(contract1.id);
    });
  });
});
