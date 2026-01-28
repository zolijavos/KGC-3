/**
 * Twenty CRM Mock Service
 * Sprint 0 Blocker #3: Mock External Services
 *
 * Provides a mock implementation of the Twenty CRM API for E2E testing.
 * Returns predictable responses without making actual API calls.
 *
 * Scenarios supported:
 * - Partner sync (create/update)
 * - Opportunity tracking
 * - Dashboard embed URL generation
 * - Webhook simulation
 */

import { Injectable, Logger } from '@nestjs/common';

// Mock types matching Twenty CRM interface
export interface MockTwentyCrmPerson {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MockTwentyCrmCompany {
  id: string;
  name: string;
  domainName?: string;
  employees?: number;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockTwentyCrmOpportunity {
  id: string;
  name: string;
  amount?: number;
  stage: string;
  probability?: number;
  closeDate?: string;
  company?: { id: string; name: string };
  person?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface MockTwentyCrmConfig {
  /** Force errors for testing */
  forceError?: 'AUTH' | 'NOT_FOUND' | 'RATE_LIMIT' | 'SERVER_ERROR' | null;
  /** Delay response (ms) */
  responseDelay?: number;
  /** Base URL for embed */
  embedBaseUrl?: string;
}

/**
 * Mock Twenty CRM Service for testing
 */
@Injectable()
export class MockTwentyCrmService {
  private readonly logger = new Logger(MockTwentyCrmService.name);
  private persons: Map<string, MockTwentyCrmPerson> = new Map();
  private companies: Map<string, MockTwentyCrmCompany> = new Map();
  private opportunities: Map<string, MockTwentyCrmOpportunity> = new Map();
  private webhookQueue: Array<{ event: string; data: unknown }> = [];
  private config: MockTwentyCrmConfig;

  constructor(config: MockTwentyCrmConfig = {}) {
    this.config = {
      forceError: null,
      responseDelay: 50,
      embedBaseUrl: 'http://localhost:3020',
      ...config,
    };
    this.logger.log('MockTwentyCrmService initialized');
  }

  /**
   * Reset mock state (for test isolation)
   */
  reset(): void {
    this.persons.clear();
    this.companies.clear();
    this.opportunities.clear();
    this.webhookQueue = [];
    this.logger.debug('Mock state reset');
  }

  /**
   * Configure mock behavior
   */
  configure(config: Partial<MockTwentyCrmConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get queued webhooks (for assertions)
   */
  getWebhookQueue(): Array<{ event: string; data: unknown }> {
    return [...this.webhookQueue];
  }

  /**
   * Clear webhook queue
   */
  clearWebhookQueue(): void {
    this.webhookQueue = [];
  }

  // ===========================================
  // Person Operations
  // ===========================================

  async createPerson(
    data: Omit<MockTwentyCrmPerson, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MockTwentyCrmPerson> {
    await this.simulateDelay();
    this.checkForError();

    const person: MockTwentyCrmPerson = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.persons.set(person.id, person);
    this.queueWebhook('person.created', person);

    this.logger.log(`Mock: Person created: ${person.id}`);
    return person;
  }

  async updatePerson(
    id: string,
    data: Partial<MockTwentyCrmPerson>
  ): Promise<MockTwentyCrmPerson | null> {
    await this.simulateDelay();
    this.checkForError();

    const existing = this.persons.get(id);
    if (!existing) {
      this.logger.warn(`Mock: Person not found: ${id}`);
      return null;
    }

    const updated: MockTwentyCrmPerson = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.persons.set(id, updated);
    this.queueWebhook('person.updated', updated);

    this.logger.log(`Mock: Person updated: ${id}`);
    return updated;
  }

  async getPerson(id: string): Promise<MockTwentyCrmPerson | null> {
    await this.simulateDelay();
    this.checkForError();

    return this.persons.get(id) ?? null;
  }

  async findPersonByEmail(email: string): Promise<MockTwentyCrmPerson | null> {
    await this.simulateDelay();
    this.checkForError();

    for (const person of this.persons.values()) {
      if (person.email === email) {
        return person;
      }
    }
    return null;
  }

  // ===========================================
  // Company Operations
  // ===========================================

  async createCompany(
    data: Omit<MockTwentyCrmCompany, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MockTwentyCrmCompany> {
    await this.simulateDelay();
    this.checkForError();

    const company: MockTwentyCrmCompany = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.companies.set(company.id, company);
    this.queueWebhook('company.created', company);

    this.logger.log(`Mock: Company created: ${company.id}`);
    return company;
  }

  async updateCompany(
    id: string,
    data: Partial<MockTwentyCrmCompany>
  ): Promise<MockTwentyCrmCompany | null> {
    await this.simulateDelay();
    this.checkForError();

    const existing = this.companies.get(id);
    if (!existing) {
      this.logger.warn(`Mock: Company not found: ${id}`);
      return null;
    }

    const updated: MockTwentyCrmCompany = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    this.companies.set(id, updated);
    this.queueWebhook('company.updated', updated);

    this.logger.log(`Mock: Company updated: ${id}`);
    return updated;
  }

  async getCompany(id: string): Promise<MockTwentyCrmCompany | null> {
    await this.simulateDelay();
    this.checkForError();

    return this.companies.get(id) ?? null;
  }

  // ===========================================
  // Opportunity Operations
  // ===========================================

  async createOpportunity(
    data: Omit<MockTwentyCrmOpportunity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MockTwentyCrmOpportunity> {
    await this.simulateDelay();
    this.checkForError();

    const opportunity: MockTwentyCrmOpportunity = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.opportunities.set(opportunity.id, opportunity);
    this.queueWebhook('opportunity.created', opportunity);

    this.logger.log(`Mock: Opportunity created: ${opportunity.id}`);
    return opportunity;
  }

  async updateOpportunityStage(
    id: string,
    stage: string
  ): Promise<MockTwentyCrmOpportunity | null> {
    await this.simulateDelay();
    this.checkForError();

    const existing = this.opportunities.get(id);
    if (!existing) {
      this.logger.warn(`Mock: Opportunity not found: ${id}`);
      return null;
    }

    const updated: MockTwentyCrmOpportunity = {
      ...existing,
      stage,
      updatedAt: new Date().toISOString(),
    };

    this.opportunities.set(id, updated);
    this.queueWebhook('opportunity.updated', updated);

    this.logger.log(`Mock: Opportunity stage updated: ${id} -> ${stage}`);
    return updated;
  }

  // ===========================================
  // Dashboard Embed
  // ===========================================

  generateEmbedUrl(dashboardId: string, tenantId: string): string {
    const token = Buffer.from(`${tenantId}:${Date.now()}`).toString('base64');
    return `${this.config.embedBaseUrl}/embed/dashboard/${dashboardId}?token=${token}`;
  }

  // ===========================================
  // Sync Operations (KGC Partner <-> Twenty CRM)
  // ===========================================

  async syncPartnerToTwenty(partner: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    type: 'INDIVIDUAL' | 'COMPANY';
    taxNumber?: string;
    address?: string;
  }): Promise<{ personId?: string; companyId?: string }> {
    await this.simulateDelay();
    this.checkForError();

    if (partner.type === 'COMPANY') {
      const companyData: Omit<MockTwentyCrmCompany, 'id' | 'createdAt' | 'updatedAt'> = {
        name: partner.name,
      };
      if (partner.address) {
        companyData.address = partner.address;
      }
      const company = await this.createCompany(companyData);

      // Also create a contact person
      const personData: Omit<MockTwentyCrmPerson, 'id' | 'createdAt' | 'updatedAt'> = {
        firstName: partner.name.split(' ')[0] ?? partner.name,
        lastName: partner.name.split(' ').slice(1).join(' ') || 'Contact',
        company: { id: company.id, name: company.name },
      };
      if (partner.email) {
        personData.email = partner.email;
      }
      if (partner.phone) {
        personData.phone = partner.phone;
      }
      const person = await this.createPerson(personData);

      return { personId: person.id, companyId: company.id };
    }

    // Individual partner
    const nameParts = partner.name.split(' ');
    const personData: Omit<MockTwentyCrmPerson, 'id' | 'createdAt' | 'updatedAt'> = {
      firstName: nameParts[0] ?? partner.name,
      lastName: nameParts.slice(1).join(' ') || '',
    };
    if (partner.email) {
      personData.email = partner.email;
    }
    if (partner.phone) {
      personData.phone = partner.phone;
    }
    const person = await this.createPerson(personData);

    return { personId: person.id };
  }

  // ===========================================
  // Helper Methods
  // ===========================================

  private generateId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  private async simulateDelay(): Promise<void> {
    if (this.config.responseDelay) {
      await new Promise(resolve => setTimeout(resolve, this.config.responseDelay));
    }
  }

  private checkForError(): void {
    if (!this.config.forceError) return;

    const errors: Record<string, { message: string; status: number }> = {
      AUTH: { message: 'Authentication failed', status: 401 },
      NOT_FOUND: { message: 'Resource not found', status: 404 },
      RATE_LIMIT: { message: 'Rate limit exceeded', status: 429 },
      SERVER_ERROR: { message: 'Internal server error', status: 500 },
    };

    const error = errors[this.config.forceError];
    if (error) {
      throw new Error(`Mock Twenty CRM Error: ${error.message} (${error.status})`);
    }
  }

  private queueWebhook(event: string, data: unknown): void {
    this.webhookQueue.push({ event, data });
  }
}
