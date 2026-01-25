/**
 * @kgc/products - Supplier Repository
 * Epic 8: Story 8-3: Beszállító kezelés
 *
 * Repository interface and token for Supplier entity operations.
 * Implements supplier management with API integration support.
 */

import { Injectable } from '@nestjs/common';
import type { CreateSupplierInput, UpdateSupplierInput } from '../dto/supplier.dto';
import type { Supplier, SupplierQuery, SupplierQueryResult } from '../types/product.types';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const SUPPLIER_REPOSITORY = Symbol('SUPPLIER_REPOSITORY');

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface ISupplierRepository {
  /**
   * Clear all data (for testing)
   */
  clear(): void;

  /**
   * Query suppliers with filters and pagination
   */
  query(params: SupplierQuery): Promise<SupplierQueryResult>;

  /**
   * Find supplier by ID
   */
  findById(id: string, tenantId: string): Promise<Supplier | null>;

  /**
   * Find supplier by code
   */
  findByCode(code: string, tenantId: string): Promise<Supplier | null>;

  /**
   * Get all active suppliers
   */
  getActiveSuppliers(tenantId: string): Promise<Supplier[]>;

  /**
   * Get suppliers with API integration enabled
   */
  getApiEnabledSuppliers(tenantId: string): Promise<Supplier[]>;

  /**
   * Create new supplier
   */
  create(tenantId: string, data: CreateSupplierInput): Promise<Supplier>;

  /**
   * Update existing supplier
   */
  update(id: string, tenantId: string, data: UpdateSupplierInput): Promise<Supplier>;

  /**
   * Delete supplier (only if no products)
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Activate supplier
   */
  activate(id: string, tenantId: string): Promise<Supplier>;

  /**
   * Deactivate supplier
   */
  deactivate(id: string, tenantId: string): Promise<Supplier>;

  /**
   * Update API settings
   */
  updateApiSettings(
    id: string,
    tenantId: string,
    apiSettings: {
      apiEnabled?: boolean;
      apiEndpoint?: string | null;
      apiKey?: string | null;
      apiVersion?: string | null;
    }
  ): Promise<Supplier>;

  /**
   * Record successful sync
   */
  recordSync(id: string, tenantId: string): Promise<Supplier>;

  /**
   * Search suppliers by name or code
   */
  search(
    tenantId: string,
    searchTerm: string,
    options?: { activeOnly?: boolean; limit?: number }
  ): Promise<Supplier[]>;

  /**
   * Check if code exists
   */
  codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean>;

  /**
   * Count products by supplier
   */
  countProducts(id: string, tenantId: string): Promise<number>;

  /**
   * Check if supplier has products
   */
  hasProducts(id: string, tenantId: string): Promise<boolean>;

  /**
   * Get suppliers needing sync (last sync older than X hours)
   */
  getSuppliersNeedingSync(tenantId: string, hoursOld: number): Promise<Supplier[]>;
}

// ============================================
// DEFAULT IMPLEMENTATION (In-Memory for testing)
// ============================================

@Injectable()
export class InMemorySupplierRepository implements ISupplierRepository {
  private suppliers: Map<string, Supplier> = new Map();
  private productCounts: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.suppliers.clear();
    this.productCounts.clear();
  }

  async query(params: SupplierQuery): Promise<SupplierQueryResult> {
    let results = Array.from(this.suppliers.values()).filter(s => s.tenantId === params.tenantId);

    // Apply filters
    if (params.isActive !== undefined) {
      results = results.filter(s => s.isActive === params.isActive);
    }
    if (params.apiEnabled !== undefined) {
      results = results.filter(s => s.apiEnabled === params.apiEnabled);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        s =>
          s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          s.contactName?.toLowerCase().includes(term)
      );
    }

    const total = results.length;

    // Sort by name
    results.sort((a, b) => a.name.localeCompare(b.name));

    // Paginate
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { suppliers: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Supplier | null> {
    const supplier = this.suppliers.get(id);
    if (!supplier || supplier.tenantId !== tenantId) return null;
    return supplier;
  }

  async findByCode(code: string, tenantId: string): Promise<Supplier | null> {
    return (
      Array.from(this.suppliers.values()).find(s => s.code === code && s.tenantId === tenantId) ??
      null
    );
  }

  async getActiveSuppliers(tenantId: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values())
      .filter(s => s.tenantId === tenantId && s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getApiEnabledSuppliers(tenantId: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values())
      .filter(s => s.tenantId === tenantId && s.apiEnabled && s.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(tenantId: string, data: CreateSupplierInput): Promise<Supplier> {
    // H2 Fix: Validate code doesn't exist
    if (await this.codeExists(data.code, tenantId)) {
      throw new Error(`A beszállító kód már létezik: ${data.code}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const supplier: Supplier = {
      id,
      tenantId,
      code: data.code,
      name: data.name,
      taxNumber: data.taxNumber ?? null,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      country: data.country ?? null,
      postalCode: data.postalCode ?? null,
      city: data.city ?? null,
      address: data.address ?? null,
      apiEnabled: data.apiEnabled ?? false,
      apiEndpoint: data.apiEndpoint ?? null,
      apiKey: data.apiKey ?? null,
      apiVersion: data.apiVersion ?? null,
      lastSyncAt: null,
      paymentTermDays: data.paymentTermDays ?? 30,
      defaultDiscountPc: data.defaultDiscountPc ?? 0,
      currency: data.currency ?? 'HUF',
      notes: data.notes ?? null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.suppliers.set(id, supplier);
    return supplier;
  }

  async update(id: string, tenantId: string, data: UpdateSupplierInput): Promise<Supplier> {
    const supplier = await this.findById(id, tenantId);
    if (!supplier) {
      throw new Error('Beszállító nem található');
    }

    const updated: Supplier = {
      ...supplier,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.suppliers.set(id, updated);
    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const supplier = await this.findById(id, tenantId);
    if (!supplier) {
      throw new Error('Beszállító nem található');
    }

    if (await this.hasProducts(id, tenantId)) {
      throw new Error('Nem törölhető: a beszállítóhoz tartoznak termékek');
    }

    this.suppliers.delete(id);
  }

  async activate(id: string, tenantId: string): Promise<Supplier> {
    return this.update(id, tenantId, { isActive: true });
  }

  async deactivate(id: string, tenantId: string): Promise<Supplier> {
    return this.update(id, tenantId, { isActive: false });
  }

  async updateApiSettings(
    id: string,
    tenantId: string,
    apiSettings: {
      apiEnabled?: boolean;
      apiEndpoint?: string | null;
      apiKey?: string | null;
      apiVersion?: string | null;
    }
  ): Promise<Supplier> {
    return this.update(id, tenantId, apiSettings);
  }

  async recordSync(id: string, tenantId: string): Promise<Supplier> {
    const supplier = await this.findById(id, tenantId);
    if (!supplier) {
      throw new Error('Beszállító nem található');
    }

    const updated: Supplier = {
      ...supplier,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    this.suppliers.set(id, updated);
    return updated;
  }

  async search(
    tenantId: string,
    searchTerm: string,
    options?: { activeOnly?: boolean; limit?: number }
  ): Promise<Supplier[]> {
    const term = searchTerm.toLowerCase();
    let results = Array.from(this.suppliers.values()).filter(
      s =>
        s.tenantId === tenantId &&
        (s.name.toLowerCase().includes(term) ||
          s.code.toLowerCase().includes(term) ||
          s.contactName?.toLowerCase().includes(term))
    );

    if (options?.activeOnly !== false) {
      results = results.filter(s => s.isActive);
    }

    return results.slice(0, options?.limit ?? 10);
  }

  async codeExists(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    return Array.from(this.suppliers.values()).some(
      s => s.code === code && s.tenantId === tenantId && s.id !== excludeId
    );
  }

  async countProducts(id: string, _tenantId: string): Promise<number> {
    return this.productCounts.get(id) ?? 0;
  }

  // Helper method for testing - set product count
  setProductCount(supplierId: string, count: number): void {
    this.productCounts.set(supplierId, count);
  }

  async hasProducts(id: string, _tenantId: string): Promise<boolean> {
    return (this.productCounts.get(id) ?? 0) > 0;
  }

  async getSuppliersNeedingSync(tenantId: string, hoursOld: number): Promise<Supplier[]> {
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

    return Array.from(this.suppliers.values()).filter(
      s =>
        s.tenantId === tenantId &&
        s.isActive &&
        s.apiEnabled &&
        (s.lastSyncAt === null || s.lastSyncAt < cutoffTime)
    );
  }
}
