/**
 * In-Memory Mock Services for Twenty CRM
 * Epic 28: Twenty CRM Integration
 */

import type {
  IConfigService,
  IKgcPartnerService,
  IPartnerSyncAuditService,
  ITwentyCrmAuthClient,
  ITwentyCrmClient,
  IUserService,
} from '@kgc/twenty-crm';
import { ICrmContact, ICrmPartner } from '@kgc/twenty-crm';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

// Alias for audit service (same interface in both services)
type IAuditService = IPartnerSyncAuditService;

@Injectable()
export class InMemoryKgcPartnerService implements IKgcPartnerService {
  private partners = new Map<
    string,
    {
      id: string;
      type: 'PERSON' | 'COMPANY';
      name: string;
      email?: string;
      phone?: string;
      taxNumber?: string;
      address?: { street?: string; city?: string; postalCode?: string; country?: string };
      updatedAt: Date;
    }
  >();

  async findById(id: string) {
    return this.partners.get(id) || null;
  }

  async findByTenantId(_tenantId: string) {
    return Array.from(this.partners.values());
  }

  async findModifiedSince(_tenantId: string, since: Date) {
    return Array.from(this.partners.values())
      .filter(p => p.updatedAt > since)
      .map(p => ({ id: p.id, updatedAt: p.updatedAt }));
  }

  async updateFromCrm(_id: string, _data: Partial<ICrmPartner>): Promise<void> {
    // Mock update
  }

  // Helper for tests
  addPartner(partner: {
    id: string;
    type: 'PERSON' | 'COMPANY';
    name: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
  }): void {
    this.partners.set(partner.id, { ...partner, updatedAt: new Date() });
  }

  clear(): void {
    this.partners.clear();
  }
}

@Injectable()
export class InMemoryTwentyCrmClient implements ITwentyCrmClient {
  private crmPartners = new Map<string, ICrmPartner>();
  private crmContacts = new Map<string, ICrmContact[]>();

  async createPartner(partner: Partial<ICrmPartner>): Promise<ICrmPartner> {
    const id = partner.id || `crm-${randomUUID()}`;
    const created = {
      id,
      type: partner.type!,
      name: partner.name!,
      tags: partner.tags || [],
      customFields: partner.customFields || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ICrmPartner;
    if (partner.email !== undefined) created.email = partner.email;
    if (partner.phone !== undefined) created.phone = partner.phone;
    if (partner.taxNumber !== undefined) created.taxNumber = partner.taxNumber;
    if (partner.address !== undefined) created.address = partner.address;
    this.crmPartners.set(id, created);
    return created;
  }

  async updatePartner(id: string, partner: Partial<ICrmPartner>): Promise<ICrmPartner> {
    const existing = this.crmPartners.get(id);
    if (!existing) {
      throw new Error('CRM partner not found');
    }
    const updated = { ...existing, ...partner, id, updatedAt: new Date() };
    this.crmPartners.set(id, updated);
    return updated;
  }

  async getPartner(id: string): Promise<ICrmPartner | null> {
    return this.crmPartners.get(id) || null;
  }

  async getPartners(_filter?: { modifiedSince?: Date }): Promise<ICrmPartner[]> {
    return Array.from(this.crmPartners.values());
  }

  async deletePartner(id: string): Promise<void> {
    this.crmPartners.delete(id);
  }

  async createContact(contact: Partial<ICrmContact>): Promise<ICrmContact> {
    const id = contact.id || `contact-${randomUUID()}`;
    const created = {
      id,
      partnerId: contact.partnerId!,
      firstName: contact.firstName!,
      lastName: contact.lastName!,
      isPrimary: contact.isPrimary || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ICrmContact;
    if (contact.email !== undefined) created.email = contact.email;
    if (contact.phone !== undefined) created.phone = contact.phone;
    if (contact.position !== undefined) created.position = contact.position;
    const existing = this.crmContacts.get(contact.partnerId!) || [];
    existing.push(created);
    this.crmContacts.set(contact.partnerId!, existing);
    return created;
  }

  async getContactsByPartner(partnerId: string): Promise<ICrmContact[]> {
    return this.crmContacts.get(partnerId) || [];
  }

  // Helpers for tests
  addCrmPartner(partner: ICrmPartner): void {
    this.crmPartners.set(partner.id, partner);
  }

  clear(): void {
    this.crmPartners.clear();
    this.crmContacts.clear();
  }
}

@Injectable()
export class InMemoryTwentyCrmAuthClient implements ITwentyCrmAuthClient {
  private validDashboards = new Set<string>();

  async validateDashboardAccess(dashboardId: string): Promise<boolean> {
    // For testing, all dashboards are valid unless explicitly invalidated
    return this.validDashboards.size === 0 || this.validDashboards.has(dashboardId);
  }

  async generateEmbedSignature(
    _dashboardId: string,
    _permissions: string[],
    _expiresAt: Date
  ): Promise<string> {
    return `mock-signature-${randomUUID()}`;
  }

  // Helpers for tests
  setValidDashboards(ids: string[]): void {
    this.validDashboards.clear();
    ids.forEach(id => this.validDashboards.add(id));
  }

  clear(): void {
    this.validDashboards.clear();
  }
}

@Injectable()
export class InMemoryUserService implements IUserService {
  private userPermissions = new Map<string, string[]>();

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const perms = this.userPermissions.get(userId) || [];
    return perms.includes(permission);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    return this.userPermissions.get(userId) || [];
  }

  // Helpers for tests
  setUserPermissions(userId: string, permissions: string[]): void {
    this.userPermissions.set(userId, permissions);
  }

  clear(): void {
    this.userPermissions.clear();
  }
}

@Injectable()
export class InMemoryAuditService implements IAuditService {
  private logs: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }> = [];

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logs.push(entry);
  }

  // Helpers for tests
  getLogs() {
    return [...this.logs];
  }

  clear(): void {
    this.logs.length = 0;
  }
}

@Injectable()
export class InMemoryConfigService implements IConfigService {
  private config = new Map<string, string>();

  get(key: string): string | undefined {
    return this.config.get(key);
  }

  // Helpers for tests
  set(key: string, value: string): void {
    this.config.set(key, value);
  }

  clear(): void {
    this.config.clear();
  }
}
