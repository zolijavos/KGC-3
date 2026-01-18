/**
 * @kgc/horilla-hr - EmployeeSyncService
 * Epic 30: Story 30-1 - Dolgozo Adatok Szinkronizalas
 */

import { Injectable } from '@nestjs/common';
import {
  CreateEmployeeMappingDto,
  CreateEmployeeMappingSchema,
  SyncEmployeesDto,
  SyncEmployeesSchema,
} from '../dto/horilla-hr.dto';
import {
  IEmployeeMapping,
  IHorillaConfig,
  IHorillaEmployee,
  IKgcUser,
  ISyncResult,
  SyncDirection,
  SyncStatus,
} from '../interfaces/horilla-hr.interface';

export interface IHorillaApiClient {
  getEmployees(filter?: { department?: string; status?: string }): Promise<IHorillaEmployee[]>;
  getEmployeeById(id: string): Promise<IHorillaEmployee | null>;
  updateEmployee(id: string, data: Partial<IHorillaEmployee>): Promise<IHorillaEmployee>;
}

export interface IUserRepository {
  findById(id: string): Promise<IKgcUser | null>;
  findByEmail(email: string, tenantId: string): Promise<IKgcUser | null>;
  findByHorillaId(horillaEmployeeId: string, tenantId: string): Promise<IKgcUser | null>;
  create(data: Partial<IKgcUser>): Promise<IKgcUser>;
  update(id: string, data: Partial<IKgcUser>): Promise<IKgcUser>;
}

export interface IEmployeeMappingRepository {
  create(data: Partial<IEmployeeMapping>): Promise<IEmployeeMapping>;
  findById(id: string): Promise<IEmployeeMapping | null>;
  findByHorillaId(horillaEmployeeId: string, tenantId: string): Promise<IEmployeeMapping | null>;
  findByKgcUserId(kgcUserId: string): Promise<IEmployeeMapping | null>;
  findAll(tenantId: string): Promise<IEmployeeMapping[]>;
  update(id: string, data: Partial<IEmployeeMapping>): Promise<IEmployeeMapping>;
  delete(id: string): Promise<void>;
}

export interface IConfigRepository {
  getHorillaConfig(tenantId: string): Promise<IHorillaConfig | null>;
  saveHorillaConfig(tenantId: string, config: IHorillaConfig): Promise<void>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class EmployeeSyncService {
  constructor(
    private readonly horillaClient: IHorillaApiClient,
    private readonly userRepository: IUserRepository,
    private readonly mappingRepository: IEmployeeMappingRepository,
    private readonly configRepository: IConfigRepository,
    private readonly auditService: IAuditService
  ) {}

  async syncEmployees(
    input: SyncEmployeesDto,
    tenantId: string,
    userId: string
  ): Promise<ISyncResult> {
    const validationResult = SyncEmployeesSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Get config
    const config = await this.configRepository.getHorillaConfig(tenantId);
    if (!config) {
      throw new Error('Horilla configuration not found for tenant');
    }

    const result: ISyncResult = {
      totalRecords: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      syncedAt: new Date(),
    };

    // Fetch employees from Horilla
    const filter: { department?: string; status?: string } = {};
    if (validInput.departmentFilter) {
      filter.department = validInput.departmentFilter;
    }
    if (validInput.statusFilter) {
      filter.status = validInput.statusFilter;
    }

    const horillaEmployees = await this.horillaClient.getEmployees(
      Object.keys(filter).length > 0 ? filter : undefined
    );

    result.totalRecords = horillaEmployees.length;

    for (const employee of horillaEmployees) {
      try {
        await this.syncSingleEmployee(employee, tenantId, config, validInput.fullSync, result);
      } catch (error) {
        result.failed++;
        result.errors.push({
          employeeId: employee.employeeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await this.auditService.log({
      action: 'employee_sync_completed',
      entityType: 'sync',
      entityId: tenantId,
      userId,
      tenantId,
      metadata: {
        totalRecords: result.totalRecords,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        fullSync: validInput.fullSync,
      },
    });

    return result;
  }

  private async syncSingleEmployee(
    employee: IHorillaEmployee,
    tenantId: string,
    config: IHorillaConfig,
    fullSync: boolean,
    result: ISyncResult
  ): Promise<void> {
    // Check existing mapping
    const mapping = await this.mappingRepository.findByHorillaId(employee.employeeId, tenantId);

    if (mapping) {
      // Update existing user
      if (mapping.syncDirection === SyncDirection.KGC_TO_HORILLA) {
        result.skipped++;
        return;
      }

      const existingUser = await this.userRepository.findById(mapping.kgcUserId);
      if (!existingUser) {
        result.skipped++;
        return;
      }

      // Check if update needed
      if (!fullSync && mapping.lastSyncAt && employee.lastModified <= mapping.lastSyncAt) {
        result.skipped++;
        return;
      }

      const updateData: Partial<IKgcUser> = {
        firstName: employee.firstName,
        lastName: employee.lastName,
        isActive: employee.status === 'ACTIVE',
      };
      if (employee.phone) {
        updateData.phone = employee.phone;
      }
      await this.userRepository.update(existingUser.id, updateData);

      await this.mappingRepository.update(mapping.id, {
        lastSyncAt: new Date(),
        lastSyncStatus: SyncStatus.COMPLETED,
      });

      result.updated++;
    } else {
      // Create new user
      const existingByEmail = await this.userRepository.findByEmail(employee.email, tenantId);
      if (existingByEmail) {
        // Link existing user
        await this.mappingRepository.create({
          tenantId,
          horillaEmployeeId: employee.employeeId,
          kgcUserId: existingByEmail.id,
          syncDirection: SyncDirection.HORILLA_TO_KGC,
          lastSyncAt: new Date(),
          lastSyncStatus: SyncStatus.COMPLETED,
        });

        await this.userRepository.update(existingByEmail.id, {
          horillaEmployeeId: employee.employeeId,
        });

        result.updated++;
      } else {
        // Create new user
        const createData: Partial<IKgcUser> = {
          tenantId,
          email: employee.email,
          firstName: employee.firstName,
          lastName: employee.lastName,
          role: config.defaultRole || 'EMPLOYEE',
          isActive: employee.status === 'ACTIVE',
          horillaEmployeeId: employee.employeeId,
        };
        if (employee.phone) {
          createData.phone = employee.phone;
        }
        if (config.defaultLocationId) {
          createData.locationId = config.defaultLocationId;
        }
        const newUser = await this.userRepository.create(createData);

        await this.mappingRepository.create({
          tenantId,
          horillaEmployeeId: employee.employeeId,
          kgcUserId: newUser.id,
          syncDirection: SyncDirection.HORILLA_TO_KGC,
          lastSyncAt: new Date(),
          lastSyncStatus: SyncStatus.COMPLETED,
        });

        result.created++;
      }
    }
  }

  async createMapping(
    input: CreateEmployeeMappingDto,
    tenantId: string,
    userId: string
  ): Promise<IEmployeeMapping> {
    const validationResult = CreateEmployeeMappingSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Check if mapping already exists
    const existingByHorilla = await this.mappingRepository.findByHorillaId(
      validInput.horillaEmployeeId,
      tenantId
    );
    if (existingByHorilla) {
      throw new Error('Horilla employee already mapped');
    }

    const existingByKgc = await this.mappingRepository.findByKgcUserId(validInput.kgcUserId);
    if (existingByKgc) {
      throw new Error('KGC user already mapped to another employee');
    }

    // Verify KGC user exists
    const kgcUser = await this.userRepository.findById(validInput.kgcUserId);
    if (!kgcUser) {
      throw new Error('KGC user not found');
    }
    if (kgcUser.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const mapping = await this.mappingRepository.create({
      tenantId,
      horillaEmployeeId: validInput.horillaEmployeeId,
      kgcUserId: validInput.kgcUserId,
      syncDirection: validInput.syncDirection as SyncDirection,
    });

    await this.userRepository.update(validInput.kgcUserId, {
      horillaEmployeeId: validInput.horillaEmployeeId,
    });

    await this.auditService.log({
      action: 'employee_mapping_created',
      entityType: 'employee_mapping',
      entityId: mapping.id,
      userId,
      tenantId,
      metadata: {
        horillaEmployeeId: validInput.horillaEmployeeId,
        kgcUserId: validInput.kgcUserId,
        syncDirection: validInput.syncDirection,
      },
    });

    return mapping;
  }

  async getMappings(tenantId: string): Promise<IEmployeeMapping[]> {
    return this.mappingRepository.findAll(tenantId);
  }

  async deleteMapping(mappingId: string, tenantId: string, userId: string): Promise<void> {
    const mapping = await this.mappingRepository.findById(mappingId);
    if (!mapping) {
      throw new Error('Mapping not found');
    }
    if (mapping.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    // Clear horillaEmployeeId from user
    await this.userRepository.update(mapping.kgcUserId, {
      horillaEmployeeId: undefined,
    });

    await this.mappingRepository.delete(mappingId);

    await this.auditService.log({
      action: 'employee_mapping_deleted',
      entityType: 'employee_mapping',
      entityId: mappingId,
      userId,
      tenantId,
      metadata: {
        horillaEmployeeId: mapping.horillaEmployeeId,
        kgcUserId: mapping.kgcUserId,
      },
    });
  }
}
