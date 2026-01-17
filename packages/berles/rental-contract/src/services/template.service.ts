import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ContractTemplate,
  ContractTemplateType,
  ContractVariables,
  TemplateValidationResult,
  TemplateValidationError,
} from '../interfaces/contract.interface';
import { CreateTemplateDto, UpdateTemplateDto, ListTemplatesDto } from '../dto/contract.dto';

/**
 * @kgc/rental-contract - Template Service
 * Story 15-1: Szerződés Template Kezelés
 *
 * TRADICIONÁLIS fejlesztés - CRUD műveletek
 */

/** Template változó regex pattern: {{variableName}} */
const VARIABLE_PATTERN = /\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g;

/** Kötelező változók minden template típushoz */
const REQUIRED_VARIABLES_BY_TYPE: Record<ContractTemplateType, string[]> = {
  [ContractTemplateType.RENTAL_STANDARD]: [
    'partnerName',
    'partnerAddress',
    'equipmentName',
    'rentalStartDate',
    'rentalDailyRate',
    'companyName',
    'contractNumber',
    'currentDate',
  ],
  [ContractTemplateType.RENTAL_LONG_TERM]: [
    'partnerName',
    'partnerAddress',
    'equipmentName',
    'rentalStartDate',
    'rentalEndDate',
    'rentalDailyRate',
    'companyName',
    'contractNumber',
    'currentDate',
  ],
  [ContractTemplateType.RENTAL_CORPORATE]: [
    'partnerName',
    'partnerAddress',
    'partnerTaxNumber',
    'companyName',
    'companyTaxNumber',
    'contractNumber',
    'currentDate',
  ],
  [ContractTemplateType.DEPOSIT_AGREEMENT]: [
    'partnerName',
    'depositAmount',
    'depositMethod',
    'equipmentName',
    'companyName',
    'contractNumber',
    'currentDate',
  ],
};

/** Összes elérhető változó */
const ALL_AVAILABLE_VARIABLES = [
  'partnerName',
  'partnerAddress',
  'partnerTaxNumber',
  'partnerPhone',
  'partnerEmail',
  'rentalId',
  'rentalStartDate',
  'rentalEndDate',
  'rentalDailyRate',
  'rentalTotalAmount',
  'equipmentName',
  'equipmentSerialNumber',
  'equipmentCondition',
  'depositAmount',
  'depositMethod',
  'companyName',
  'companyAddress',
  'companyTaxNumber',
  'companyPhone',
  'currentDate',
  'contractNumber',
];

@Injectable()
export class TemplateService {
  private templates: Map<string, ContractTemplate> = new Map();
  private templateIdCounter = 0;

  /**
   * Template létrehozása
   */
  async createTemplate(
    tenantId: string,
    dto: CreateTemplateDto,
    createdBy: string
  ): Promise<ContractTemplate> {
    // Validáljuk a template tartalmat
    const validation = this.validateTemplateContent(dto.content, dto.type);
    if (!validation.isValid) {
      throw new BadRequestException(
        `Template validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
      );
    }

    const id = `template_${++this.templateIdCounter}_${Date.now()}`;
    const now = new Date();

    const template: ContractTemplate = {
      id,
      tenantId,
      name: dto.name,
      type: dto.type,
      content: dto.content,
      availableVariables: validation.foundVariables,
      version: 1,
      isActive: dto.isActive,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * Template lekérdezés ID alapján
   */
  async getTemplateById(id: string, tenantId: string): Promise<ContractTemplate> {
    const template = this.templates.get(id);

    if (!template || template.tenantId !== tenantId) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  /**
   * Template lista lekérdezés szűréssel
   */
  async listTemplates(
    tenantId: string,
    filters: ListTemplatesDto
  ): Promise<{ items: ContractTemplate[]; total: number }> {
    let templates = Array.from(this.templates.values()).filter((t) => t.tenantId === tenantId);

    // Szűrés típus alapján
    if (filters.type) {
      templates = templates.filter((t) => t.type === filters.type);
    }

    // Szűrés aktív státusz alapján
    if (filters.isActive !== undefined) {
      templates = templates.filter((t) => t.isActive === filters.isActive);
    }

    // Szűrés keresőkifejezés alapján
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(searchLower));
    }

    const total = templates.length;

    // Pagination
    const start = (filters.page - 1) * filters.limit;
    const paginatedTemplates = templates.slice(start, start + filters.limit);

    return { items: paginatedTemplates, total };
  }

  /**
   * Template frissítése (új verzió létrehozása)
   */
  async updateTemplate(
    id: string,
    tenantId: string,
    dto: UpdateTemplateDto
  ): Promise<ContractTemplate> {
    const existing = await this.getTemplateById(id, tenantId);

    // Ha van új content, validáljuk
    if (dto.content) {
      const validation = this.validateTemplateContent(dto.content, existing.type);
      if (!validation.isValid) {
        throw new BadRequestException(
          `Template validation failed: ${validation.errors.map((e) => e.message).join(', ')}`
        );
      }
      existing.availableVariables = validation.foundVariables;
    }

    const updated: ContractTemplate = {
      ...existing,
      name: dto.name ?? existing.name,
      content: dto.content ?? existing.content,
      isActive: dto.isActive ?? existing.isActive,
      version: existing.version + 1,
      updatedAt: new Date(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  /**
   * Template törlése (soft delete - deaktiválás)
   */
  async deactivateTemplate(id: string, tenantId: string): Promise<void> {
    const template = await this.getTemplateById(id, tenantId);
    template.isActive = false;
    template.updatedAt = new Date();
    this.templates.set(id, template);
  }

  /**
   * Template tartalom validálása
   * - Ellenőrzi a változó szintaxist
   * - Ellenőrzi a kötelező változókat
   */
  validateTemplateContent(
    content: string,
    type: ContractTemplateType
  ): TemplateValidationResult {
    const errors: TemplateValidationError[] = [];
    const warnings: string[] = [];
    const foundVariables: string[] = [];

    // Változók keresése
    let match: RegExpExecArray | null;
    while ((match = VARIABLE_PATTERN.exec(content)) !== null) {
      const variableName = match[1];
      if (variableName && !foundVariables.includes(variableName)) {
        foundVariables.push(variableName);

        // Ellenőrizzük, hogy ismert változó-e
        if (!ALL_AVAILABLE_VARIABLES.includes(variableName)) {
          warnings.push(`Unknown variable: {{${variableName}}} - may not be populated`);
        }
      }
    }

    // Kötelező változók ellenőrzése
    const requiredVars = REQUIRED_VARIABLES_BY_TYPE[type];
    const missingRequired = requiredVars.filter((v) => !foundVariables.includes(v));

    for (const missing of missingRequired) {
      errors.push({
        message: `Missing required variable: {{${missing}}}`,
        variableName: missing,
      });
    }

    // Malformed változók keresése (pl. {{ space }})
    const malformedPattern = /\{\{\s*([^}]*\s+[^}]*)\s*\}\}/g;
    let malformedMatch: RegExpExecArray | null;
    while ((malformedMatch = malformedPattern.exec(content)) !== null) {
      errors.push({
        message: `Malformed variable with spaces: {{${malformedMatch[1]}}}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      foundVariables,
      missingRequiredVariables: missingRequired,
    };
  }

  /**
   * Template renderelése változókkal
   * Pure function - TDD target
   *
   * SECURITY: Escapes HTML special characters to prevent injection attacks
   */
  renderTemplate(template: ContractTemplate, variables: ContractVariables): string {
    let result = template.content;

    // Minden talált változót helyettesítünk
    for (const varName of template.availableVariables) {
      const value = variables[varName];
      const placeholder = `{{${varName}}}`;

      if (value !== undefined && value !== null) {
        // Szám formázás (pénznem)
        if (typeof value === 'number') {
          const formatted = new Intl.NumberFormat('hu-HU').format(value);
          result = result.split(placeholder).join(formatted);
        } else {
          // SECURITY: Escape HTML special characters to prevent injection
          const escapedValue = this.escapeHtmlChars(String(value));
          result = result.split(placeholder).join(escapedValue);
        }
      } else {
        // Üres string, ha nincs érték
        result = result.split(placeholder).join('');
      }
    }

    return result;
  }

  /**
   * Escape HTML special characters to prevent injection attacks
   * SECURITY: Critical for preventing template injection
   */
  private escapeHtmlChars(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] ?? char);
  }

  /**
   * Alapértelmezett változók összeállítása bérlés adatokból
   */
  buildDefaultVariables(
    rental: {
      id: string;
      startDate: Date;
      endDate?: Date;
      dailyRate: number;
      totalAmount?: number;
    },
    partner: {
      name: string;
      address: string;
      taxNumber?: string;
      phone?: string;
      email?: string;
    },
    equipment: {
      name: string;
      serialNumber?: string;
      condition?: string;
    },
    tenant: {
      name: string;
      address: string;
      taxNumber: string;
      phone?: string;
    },
    contractNumber: string,
    deposit?: {
      amount: number;
      method: string;
    }
  ): ContractVariables {
    const dateFormatter = new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Build variables object conditionally to satisfy exactOptionalPropertyTypes
    const variables: ContractVariables = {
      partnerName: partner.name,
      partnerAddress: partner.address,
      rentalId: rental.id,
      rentalStartDate: dateFormatter.format(rental.startDate),
      rentalDailyRate: rental.dailyRate,
      equipmentName: equipment.name,
      companyName: tenant.name,
      companyAddress: tenant.address,
      companyTaxNumber: tenant.taxNumber,
      currentDate: dateFormatter.format(new Date()),
      contractNumber,
    };

    // Add optional fields only if they have values
    if (partner.taxNumber) variables.partnerTaxNumber = partner.taxNumber;
    if (partner.phone) variables.partnerPhone = partner.phone;
    if (partner.email) variables.partnerEmail = partner.email;
    if (rental.endDate) variables.rentalEndDate = dateFormatter.format(rental.endDate);
    if (rental.totalAmount !== undefined) variables.rentalTotalAmount = rental.totalAmount;
    if (equipment.serialNumber) variables.equipmentSerialNumber = equipment.serialNumber;
    if (equipment.condition) variables.equipmentCondition = equipment.condition;
    if (deposit?.amount !== undefined) variables.depositAmount = deposit.amount;
    if (deposit?.method) variables.depositMethod = deposit.method;
    if (tenant.phone) variables.companyPhone = tenant.phone;

    return variables;
  }

  /**
   * Elérhető változók listája
   */
  getAvailableVariables(): string[] {
    return [...ALL_AVAILABLE_VARIABLES];
  }

  /**
   * Kötelező változók típus alapján
   */
  getRequiredVariables(type: ContractTemplateType): string[] {
    return [...REQUIRED_VARIABLES_BY_TYPE[type]];
  }
}
