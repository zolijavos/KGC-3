/**
 * In-Memory Services for Horilla HR Integration
 * Epic 30: Horilla HR Integration
 *
 * These are mock implementations for testing and initial development.
 * Will be replaced with real Prisma/API implementations.
 */

import {
  IAuditService,
  IConfigRepository,
  IEmployeeMapping,
  IEmployeeMappingRepository,
  IHorillaApiClient,
  IHorillaConfig,
  IHorillaEmployee,
  IKgcUser,
  IUserRepository,
  SyncStatus,
} from '@kgc/horilla-hr';
import { Injectable } from '@nestjs/common';

/**
 * In-Memory Horilla API Client
 */
@Injectable()
export class InMemoryHorillaApiClient implements IHorillaApiClient {
  private employees: Map<string, IHorillaEmployee> = new Map();

  async getEmployees(filter?: {
    department?: string;
    status?: string;
  }): Promise<IHorillaEmployee[]> {
    let result = Array.from(this.employees.values());

    if (filter?.department) {
      result = result.filter(e => e.department === filter.department);
    }
    if (filter?.status) {
      result = result.filter(e => e.status === filter.status);
    }

    return result;
  }

  async getEmployeeById(id: string): Promise<IHorillaEmployee | null> {
    return this.employees.get(id) || null;
  }

  async createEmployee(
    data: Omit<IHorillaEmployee, 'id' | 'lastModified'>
  ): Promise<IHorillaEmployee> {
    const employee: IHorillaEmployee = {
      ...data,
      id: `horilla-${Date.now()}`,
      lastModified: new Date(),
    };
    this.employees.set(employee.employeeId, employee);
    return employee;
  }

  async updateEmployee(id: string, data: Partial<IHorillaEmployee>): Promise<IHorillaEmployee> {
    const existing = this.employees.get(id);
    if (!existing) {
      throw new Error('Employee not found in Horilla');
    }

    const updated: IHorillaEmployee = {
      ...existing,
      ...data,
      lastModified: new Date(),
    };
    this.employees.set(id, updated);
    return updated;
  }

  // Test helper methods
  seedEmployee(employee: IHorillaEmployee): void {
    this.employees.set(employee.employeeId, employee);
  }

  clear(): void {
    this.employees.clear();
  }

  getEmployeeCount(): number {
    return this.employees.size;
  }
}

/**
 * In-Memory User Repository
 */
@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, IKgcUser> = new Map();

  async findById(id: string): Promise<IKgcUser | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string, tenantId: string): Promise<IKgcUser | null> {
    return (
      Array.from(this.users.values()).find(u => u.email === email && u.tenantId === tenantId) ||
      null
    );
  }

  async findByHorillaId(horillaEmployeeId: string, tenantId: string): Promise<IKgcUser | null> {
    return (
      Array.from(this.users.values()).find(
        u => u.horillaEmployeeId === horillaEmployeeId && u.tenantId === tenantId
      ) || null
    );
  }

  async findByIds(ids: string[], tenantId: string): Promise<IKgcUser[]> {
    return Array.from(this.users.values()).filter(
      u => ids.includes(u.id) && u.tenantId === tenantId
    );
  }

  async findAllMapped(tenantId: string): Promise<IKgcUser[]> {
    return Array.from(this.users.values()).filter(
      u => u.horillaEmployeeId && u.tenantId === tenantId
    );
  }

  async create(data: Partial<IKgcUser>): Promise<IKgcUser> {
    const user: IKgcUser = {
      id: data.id || `user-${Date.now()}`,
      tenantId: data.tenantId || 'default-tenant',
      email: data.email || '',
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      phone: data.phone,
      role: data.role || 'EMPLOYEE',
      locationId: data.locationId,
      isActive: data.isActive ?? true,
      horillaEmployeeId: data.horillaEmployeeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async update(id: string, data: Partial<IKgcUser>): Promise<IKgcUser> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error('User not found');
    }

    const updated: IKgcUser = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.users.set(id, updated);
    return updated;
  }

  // Test helper methods
  seedUser(user: IKgcUser): void {
    this.users.set(user.id, user);
  }

  clear(): void {
    this.users.clear();
  }
}

/**
 * In-Memory Employee Mapping Repository
 */
@Injectable()
export class InMemoryEmployeeMappingRepository implements IEmployeeMappingRepository {
  private mappings: Map<string, IEmployeeMapping> = new Map();

  async create(data: Partial<IEmployeeMapping>): Promise<IEmployeeMapping> {
    const mapping: IEmployeeMapping = {
      id: data.id || `mapping-${Date.now()}`,
      tenantId: data.tenantId || 'default-tenant',
      horillaEmployeeId: data.horillaEmployeeId || '',
      kgcUserId: data.kgcUserId || '',
      syncDirection: data.syncDirection!,
      lastSyncAt: data.lastSyncAt,
      lastSyncStatus: data.lastSyncStatus || SyncStatus.PENDING,
      syncErrors: data.syncErrors,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  async findById(id: string): Promise<IEmployeeMapping | null> {
    return this.mappings.get(id) || null;
  }

  async findByHorillaId(
    horillaEmployeeId: string,
    tenantId: string
  ): Promise<IEmployeeMapping | null> {
    return (
      Array.from(this.mappings.values()).find(
        m => m.horillaEmployeeId === horillaEmployeeId && m.tenantId === tenantId
      ) || null
    );
  }

  async findByKgcUserId(kgcUserId: string): Promise<IEmployeeMapping | null> {
    return Array.from(this.mappings.values()).find(m => m.kgcUserId === kgcUserId) || null;
  }

  async findAll(tenantId: string): Promise<IEmployeeMapping[]> {
    return Array.from(this.mappings.values()).filter(m => m.tenantId === tenantId);
  }

  async update(id: string, data: Partial<IEmployeeMapping>): Promise<IEmployeeMapping> {
    const existing = this.mappings.get(id);
    if (!existing) {
      throw new Error('Mapping not found');
    }

    const updated: IEmployeeMapping = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    this.mappings.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    this.mappings.delete(id);
  }

  // Test helper methods
  clear(): void {
    this.mappings.clear();
  }
}

/**
 * In-Memory Config Repository
 */
@Injectable()
export class InMemoryConfigRepository implements IConfigRepository {
  private configs: Map<string, IHorillaConfig> = new Map();

  async getHorillaConfig(tenantId: string): Promise<IHorillaConfig | null> {
    return this.configs.get(tenantId) || null;
  }

  async saveHorillaConfig(tenantId: string, config: IHorillaConfig): Promise<void> {
    this.configs.set(tenantId, { ...config, tenantId });
  }

  // Test helper methods
  seedConfig(config: IHorillaConfig): void {
    this.configs.set(config.tenantId, config);
  }

  clear(): void {
    this.configs.clear();
  }
}

/**
 * In-Memory Audit Service
 */
@Injectable()
export class InMemoryAuditService implements IAuditService {
  private logs: Array<{
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
    timestamp: Date;
  }> = [];

  async log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.logs.push({
      ...entry,
      timestamp: new Date(),
    });
  }

  // Test helper methods
  getLogs(): typeof this.logs {
    return [...this.logs];
  }

  getLogsByAction(action: string): typeof this.logs {
    return this.logs.filter(l => l.action === action);
  }

  clear(): void {
    this.logs = [];
  }
}
