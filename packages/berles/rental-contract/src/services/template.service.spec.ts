import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from './template.service';
import { ContractTemplateType, ContractTemplate, ContractVariables } from '../interfaces/contract.interface';

/**
 * @kgc/rental-contract - TemplateService Unit Tests
 * Story 15-1: Szerződés Template Kezelés
 *
 * TDD részben: renderTemplate() és validateTemplateContent() pure functions
 */

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    service = new TemplateService();
  });

  // ===========================================================================
  // validateTemplateContent() - TDD (pure function validáció)
  // ===========================================================================
  describe('validateTemplateContent()', () => {
    it('should validate template with all required variables', () => {
      const content = `
        Szerződésszám: {{contractNumber}}
        Kelt: {{currentDate}}

        Bérbeadó: {{companyName}}
        Bérlő: {{partnerName}}, {{partnerAddress}}

        Bérgép: {{equipmentName}}
        Kezdet: {{rentalStartDate}}
        Napi díj: {{rentalDailyRate}} Ft
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.RENTAL_STANDARD);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.foundVariables).toContain('contractNumber');
      expect(result.foundVariables).toContain('partnerName');
      expect(result.foundVariables).toContain('equipmentName');
    });

    it('should fail when required variables are missing', () => {
      const content = `
        Szerződésszám: {{contractNumber}}
        Kelt: {{currentDate}}
        Bérbeadó: {{companyName}}
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.RENTAL_STANDARD);

      expect(result.isValid).toBe(false);
      expect(result.missingRequiredVariables).toContain('partnerName');
      expect(result.missingRequiredVariables).toContain('equipmentName');
      expect(result.missingRequiredVariables).toContain('rentalStartDate');
    });

    it('should warn about unknown variables', () => {
      const content = `
        {{contractNumber}} {{currentDate}} {{companyName}}
        {{partnerName}} {{partnerAddress}} {{equipmentName}}
        {{rentalStartDate}} {{rentalDailyRate}}
        {{unknownVariable}}
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.RENTAL_STANDARD);

      expect(result.isValid).toBe(true); // Still valid but with warning
      expect(result.warnings).toContain('Unknown variable: {{unknownVariable}} - may not be populated');
    });

    it('should detect malformed variables with spaces', () => {
      const content = `
        {{contractNumber}} {{currentDate}} {{companyName}}
        {{partnerName}} {{partnerAddress}} {{equipmentName}}
        {{rentalStartDate}} {{rentalDailyRate}}
        {{ invalid variable }}
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.RENTAL_STANDARD);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Malformed'))).toBe(true);
    });

    it('should require different variables for DEPOSIT_AGREEMENT type', () => {
      const content = `
        {{contractNumber}} {{currentDate}} {{companyName}}
        {{partnerName}} {{equipmentName}}
        {{depositAmount}} {{depositMethod}}
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.DEPOSIT_AGREEMENT);

      expect(result.isValid).toBe(true);
      expect(result.foundVariables).toContain('depositAmount');
      expect(result.foundVariables).toContain('depositMethod');
    });

    it('should require taxNumber for CORPORATE type', () => {
      const content = `
        {{contractNumber}} {{currentDate}} {{companyName}} {{companyTaxNumber}}
        {{partnerName}} {{partnerAddress}} {{partnerTaxNumber}}
      `;

      const result = service.validateTemplateContent(content, ContractTemplateType.RENTAL_CORPORATE);

      expect(result.isValid).toBe(true);
      expect(result.foundVariables).toContain('partnerTaxNumber');
      expect(result.foundVariables).toContain('companyTaxNumber');
    });
  });

  // ===========================================================================
  // renderTemplate() - TDD (pure function)
  // ===========================================================================
  describe('renderTemplate()', () => {
    const mockTemplate: ContractTemplate = {
      id: 'template_1',
      tenantId: 'tenant_1',
      name: 'Test Template',
      type: ContractTemplateType.RENTAL_STANDARD,
      content: 'Partner: {{partnerName}}, Gép: {{equipmentName}}, Díj: {{rentalDailyRate}} Ft',
      availableVariables: ['partnerName', 'equipmentName', 'rentalDailyRate'],
      version: 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user_1',
    };

    it('should replace all variables with values', () => {
      const variables: ContractVariables = {
        partnerName: 'Teszt Kft',
        partnerAddress: '',
        equipmentName: 'Makita HR2470',
        rentalId: '',
        rentalStartDate: '',
        rentalDailyRate: 10000,
        companyName: '',
        companyAddress: '',
        companyTaxNumber: '',
        currentDate: '',
        contractNumber: '',
      };

      const result = service.renderTemplate(mockTemplate, variables);

      // Hungarian locale uses non-breaking space as thousands separator
      expect(result).toMatch(/Partner: Teszt Kft, Gép: Makita HR2470, Díj: 10[\s\u00A0]000 Ft/);
    });

    it('should format numbers with Hungarian locale', () => {
      const template: ContractTemplate = {
        ...mockTemplate,
        content: 'Összeg: {{rentalTotalAmount}} Ft',
        availableVariables: ['rentalTotalAmount'],
      };

      const variables: ContractVariables = {
        partnerName: '',
        partnerAddress: '',
        rentalId: '',
        rentalStartDate: '',
        rentalDailyRate: 0,
        rentalTotalAmount: 1234567,
        equipmentName: '',
        companyName: '',
        companyAddress: '',
        companyTaxNumber: '',
        currentDate: '',
        contractNumber: '',
      };

      const result = service.renderTemplate(template, variables);

      // Hungarian locale uses space as thousands separator
      expect(result).toMatch(/Összeg: 1[\s ]234[\s ]567 Ft/);
    });

    it('should replace undefined values with empty string', () => {
      const template: ContractTemplate = {
        ...mockTemplate,
        content: 'Phone: {{partnerPhone}}',
        availableVariables: ['partnerPhone'],
      };

      const variables: ContractVariables = {
        partnerName: '',
        partnerAddress: '',
        partnerPhone: undefined,
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

      const result = service.renderTemplate(template, variables);

      expect(result).toBe('Phone: ');
    });

    it('should handle multiple occurrences of same variable', () => {
      const template: ContractTemplate = {
        ...mockTemplate,
        content: '{{partnerName}} - {{partnerName}} - {{partnerName}}',
        availableVariables: ['partnerName'],
      };

      const variables: ContractVariables = {
        partnerName: 'ABC Kft',
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

      const result = service.renderTemplate(template, variables);

      expect(result).toBe('ABC Kft - ABC Kft - ABC Kft');
    });
  });

  // ===========================================================================
  // buildDefaultVariables() - TDD
  // ===========================================================================
  describe('buildDefaultVariables()', () => {
    it('should build complete variables object', () => {
      const rental = {
        id: 'rental_123',
        startDate: new Date('2026-01-15'),
        dailyRate: 10000,
      };
      const partner = {
        name: 'Teszt Partner',
        address: 'Budapest, Teszt utca 1.',
        taxNumber: '12345678-2-42',
      };
      const equipment = {
        name: 'Makita HR2470',
        serialNumber: 'SN123456',
      };
      const tenant = {
        name: 'KGC Kft',
        address: 'Budapest, Bérlés utca 2.',
        taxNumber: '87654321-2-13',
      };

      const result = service.buildDefaultVariables(
        rental,
        partner,
        equipment,
        tenant,
        'KGC-2026-00001'
      );

      expect(result.partnerName).toBe('Teszt Partner');
      expect(result.partnerAddress).toBe('Budapest, Teszt utca 1.');
      expect(result.partnerTaxNumber).toBe('12345678-2-42');
      expect(result.equipmentName).toBe('Makita HR2470');
      expect(result.equipmentSerialNumber).toBe('SN123456');
      expect(result.companyName).toBe('KGC Kft');
      expect(result.contractNumber).toBe('KGC-2026-00001');
      expect(result.rentalDailyRate).toBe(10000);
      expect(result.rentalStartDate).toContain('2026');
    });

    it('should include deposit data when provided', () => {
      const rental = { id: 'rental_123', startDate: new Date(), dailyRate: 10000 };
      const partner = { name: 'Test', address: 'Test' };
      const equipment = { name: 'Test' };
      const tenant = { name: 'Test', address: 'Test', taxNumber: '123' };
      const deposit = { amount: 50000, method: 'Készpénz' };

      const result = service.buildDefaultVariables(
        rental,
        partner,
        equipment,
        tenant,
        'KGC-2026-00001',
        deposit
      );

      expect(result.depositAmount).toBe(50000);
      expect(result.depositMethod).toBe('Készpénz');
    });
  });

  // ===========================================================================
  // CRUD Operations (TRADICIONÁLIS - post-implementation tests)
  // ===========================================================================
  describe('CRUD operations', () => {
    const validContent = `
      {{contractNumber}} {{currentDate}} {{companyName}}
      {{partnerName}} {{partnerAddress}} {{equipmentName}}
      {{rentalStartDate}} {{rentalDailyRate}}
    `;

    describe('createTemplate()', () => {
      it('should create template successfully', async () => {
        const template = await service.createTemplate(
          'tenant_1',
          {
            name: 'Standard Bérlés',
            type: ContractTemplateType.RENTAL_STANDARD,
            content: validContent,
            isActive: true,
          },
          'user_1'
        );

        expect(template.id).toBeDefined();
        expect(template.name).toBe('Standard Bérlés');
        expect(template.type).toBe(ContractTemplateType.RENTAL_STANDARD);
        expect(template.version).toBe(1);
        expect(template.isActive).toBe(true);
        expect(template.tenantId).toBe('tenant_1');
        expect(template.createdBy).toBe('user_1');
      });

      it('should reject invalid template content', async () => {
        await expect(
          service.createTemplate(
            'tenant_1',
            {
              name: 'Invalid Template',
              type: ContractTemplateType.RENTAL_STANDARD,
              content: 'No variables here',
              isActive: true,
            },
            'user_1'
          )
        ).rejects.toThrow('Template validation failed');
      });
    });

    describe('getTemplateById()', () => {
      it('should retrieve template by ID', async () => {
        const created = await service.createTemplate(
          'tenant_1',
          {
            name: 'Test Template',
            type: ContractTemplateType.RENTAL_STANDARD,
            content: validContent,
            isActive: true,
          },
          'user_1'
        );

        const retrieved = await service.getTemplateById(created.id, 'tenant_1');

        expect(retrieved.id).toBe(created.id);
        expect(retrieved.name).toBe('Test Template');
      });

      it('should throw NotFoundException for non-existent template', async () => {
        await expect(service.getTemplateById('non_existent', 'tenant_1')).rejects.toThrow(
          'Template not found'
        );
      });

      it('should not return template from different tenant', async () => {
        const created = await service.createTemplate(
          'tenant_1',
          {
            name: 'Test Template',
            type: ContractTemplateType.RENTAL_STANDARD,
            content: validContent,
            isActive: true,
          },
          'user_1'
        );

        await expect(service.getTemplateById(created.id, 'tenant_2')).rejects.toThrow(
          'Template not found'
        );
      });
    });

    describe('updateTemplate()', () => {
      it('should update template and increment version', async () => {
        const created = await service.createTemplate(
          'tenant_1',
          {
            name: 'Original Name',
            type: ContractTemplateType.RENTAL_STANDARD,
            content: validContent,
            isActive: true,
          },
          'user_1'
        );

        const updated = await service.updateTemplate(created.id, 'tenant_1', {
          name: 'Updated Name',
        });

        expect(updated.name).toBe('Updated Name');
        expect(updated.version).toBe(2);
      });
    });

    describe('listTemplates()', () => {
      it('should list templates with pagination', async () => {
        // Create multiple templates
        for (let i = 0; i < 5; i++) {
          await service.createTemplate(
            'tenant_1',
            {
              name: `Template ${i}`,
              type: ContractTemplateType.RENTAL_STANDARD,
              content: validContent,
              isActive: true,
            },
            'user_1'
          );
        }

        const result = await service.listTemplates('tenant_1', {
          page: 1,
          limit: 3,
        });

        expect(result.items).toHaveLength(3);
        expect(result.total).toBe(5);
      });

      it('should filter by type', async () => {
        await service.createTemplate(
          'tenant_1',
          {
            name: 'Standard',
            type: ContractTemplateType.RENTAL_STANDARD,
            content: validContent,
            isActive: true,
          },
          'user_1'
        );

        const depositContent = `
          {{contractNumber}} {{currentDate}} {{companyName}}
          {{partnerName}} {{equipmentName}}
          {{depositAmount}} {{depositMethod}}
        `;
        await service.createTemplate(
          'tenant_1',
          {
            name: 'Deposit',
            type: ContractTemplateType.DEPOSIT_AGREEMENT,
            content: depositContent,
            isActive: true,
          },
          'user_1'
        );

        const result = await service.listTemplates('tenant_1', {
          type: ContractTemplateType.DEPOSIT_AGREEMENT,
          page: 1,
          limit: 10,
        });

        expect(result.items).toHaveLength(1);
        expect(result.items[0]?.name).toBe('Deposit');
      });
    });
  });
});
