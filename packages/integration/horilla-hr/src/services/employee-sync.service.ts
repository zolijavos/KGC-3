/**
 * @kgc/horilla-hr - EmployeeSyncService
 * Epic 30: Story 30-1 - Dolgozo Adatok Szinkronizalas
 */

import { Injectable } from '@nestjs/common';
import {
  CreateEmployeeMappingDto,
  CreateEmployeeMappingSchema,
  SyncEmployeesDto,
  SyncEmployeesExtendedDto,
  SyncEmployeesExtendedSchema,
  SyncEmployeesSchema,
} from '../dto/horilla-hr.dto';
import {
  ConflictResolutionStrategy,
  IEmployeeMapping,
  IHorillaConfig,
  IHorillaEmployee,
  IKgcUser,
  ISyncResult,
  ISyncResultExtended,
  SyncDirection,
  SyncStatus,
} from '../interfaces/horilla-hr.interface';

export interface IHorillaApiClient {
  getEmployees(filter?: { department?: string; status?: string }): Promise<IHorillaEmployee[]>;
  getEmployeeById(id: string): Promise<IHorillaEmployee | null>;
  createEmployee(data: Omit<IHorillaEmployee, 'id' | 'lastModified'>): Promise<IHorillaEmployee>;
  updateEmployee(id: string, data: Partial<IHorillaEmployee>): Promise<IHorillaEmployee>;
}

export interface IUserRepository {
  findById(id: string): Promise<IKgcUser | null>;
  findByEmail(email: string, tenantId: string): Promise<IKgcUser | null>;
  findByHorillaId(horillaEmployeeId: string, tenantId: string): Promise<IKgcUser | null>;
  findByIds(ids: string[], tenantId: string): Promise<IKgcUser[]>;
  findAllMapped(tenantId: string): Promise<IKgcUser[]>;
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

  /**
   * Extended sync method supporting bidirectional synchronization
   */
  async syncEmployeesExtended(
    input: SyncEmployeesExtendedDto,
    tenantId: string,
    userId: string
  ): Promise<ISyncResultExtended> {
    const validationResult = SyncEmployeesExtendedSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const startedAt = new Date();

    const config = await this.configRepository.getHorillaConfig(tenantId);
    if (!config) {
      throw new Error('Horilla configuration not found for tenant');
    }

    const result: ISyncResultExtended = {
      direction: validInput.direction as SyncDirection,
      entityType: 'EMPLOYEE',
      totalCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      errors: [],
      startedAt,
      completedAt: new Date(),
      durationMs: 0,
    };

    const direction = validInput.direction as SyncDirection;
    const conflictStrategy = validInput.conflictResolution as ConflictResolutionStrategy;

    // Execute sync based on direction
    if (direction === SyncDirection.HORILLA_TO_KGC || direction === SyncDirection.BIDIRECTIONAL) {
      await this.syncFromHorilla(validInput, tenantId, config, conflictStrategy, result);
    }

    if (direction === SyncDirection.KGC_TO_HORILLA || direction === SyncDirection.BIDIRECTIONAL) {
      await this.syncToHorilla(validInput, tenantId, config, conflictStrategy, result);
    }

    result.completedAt = new Date();
    result.durationMs = result.completedAt.getTime() - startedAt.getTime();
    result.successCount = result.createdCount + result.updatedCount;

    await this.auditService.log({
      action: 'employee_sync_extended_completed',
      entityType: 'sync',
      entityId: tenantId,
      userId,
      tenantId,
      metadata: {
        direction: validInput.direction,
        conflictResolution: validInput.conflictResolution,
        totalCount: result.totalCount,
        successCount: result.successCount,
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        skippedCount: result.skippedCount,
        failedCount: result.failedCount,
        durationMs: result.durationMs,
      },
    });

    return result;
  }

  /**
   * Sync from Horilla to KGC (pull employees from Horilla)
   */
  private async syncFromHorilla(
    input: SyncEmployeesExtendedDto,
    tenantId: string,
    config: IHorillaConfig,
    conflictStrategy: ConflictResolutionStrategy,
    result: ISyncResultExtended
  ): Promise<void> {
    const filter: { department?: string; status?: string } = {};
    if (input.departmentFilter) filter.department = input.departmentFilter;
    if (input.statusFilter) filter.status = input.statusFilter;

    const horillaEmployees = await this.horillaClient.getEmployees(
      Object.keys(filter).length > 0 ? filter : undefined
    );

    result.totalCount += horillaEmployees.length;

    for (const employee of horillaEmployees) {
      try {
        const mapping = await this.mappingRepository.findByHorillaId(employee.employeeId, tenantId);

        if (mapping) {
          // Skip if direction is KGC_TO_HORILLA only
          if (mapping.syncDirection === SyncDirection.KGC_TO_HORILLA) {
            result.skippedCount++;
            continue;
          }

          const existingUser = await this.userRepository.findById(mapping.kgcUserId);
          if (!existingUser) {
            result.skippedCount++;
            continue;
          }

          // Check for conflicts in bidirectional mode
          if (input.direction === 'BIDIRECTIONAL') {
            const hasConflict = this.detectConflict(existingUser, employee, mapping);
            if (hasConflict) {
              const winner = this.resolveConflict(existingUser, employee, conflictStrategy);
              if (winner === 'HORILLA') {
                await this.updateKgcUserFromHorilla(existingUser, employee, mapping);
                result.updatedCount++;
              } else if (winner === 'KGC') {
                result.skippedCount++;
              } else {
                // MANUAL - skip and log
                result.skippedCount++;
                result.errors.push({
                  entityId: employee.employeeId,
                  entityType: 'EMPLOYEE',
                  error: 'Manual conflict resolution required',
                  details: { kgcUserId: existingUser.id, horillaEmployeeId: employee.employeeId },
                });
              }
              continue;
            }
          }

          // No conflict or not bidirectional - update from Horilla
          if (
            !input.fullSync &&
            mapping.lastSyncAt &&
            employee.lastModified <= mapping.lastSyncAt
          ) {
            result.skippedCount++;
            continue;
          }

          await this.updateKgcUserFromHorilla(existingUser, employee, mapping);
          result.updatedCount++;
        } else {
          // No mapping - create new user or link existing
          const existingByEmail = await this.userRepository.findByEmail(employee.email, tenantId);
          if (existingByEmail) {
            await this.mappingRepository.create({
              tenantId,
              horillaEmployeeId: employee.employeeId,
              kgcUserId: existingByEmail.id,
              syncDirection: SyncDirection.BIDIRECTIONAL,
              lastSyncAt: new Date(),
              lastSyncStatus: SyncStatus.COMPLETED,
            });
            await this.userRepository.update(existingByEmail.id, {
              horillaEmployeeId: employee.employeeId,
            });
            result.updatedCount++;
          } else {
            const newUser = await this.createKgcUserFromHorilla(employee, tenantId, config);
            await this.mappingRepository.create({
              tenantId,
              horillaEmployeeId: employee.employeeId,
              kgcUserId: newUser.id,
              syncDirection: SyncDirection.BIDIRECTIONAL,
              lastSyncAt: new Date(),
              lastSyncStatus: SyncStatus.COMPLETED,
            });
            result.createdCount++;
          }
        }
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          entityId: employee.employeeId,
          entityType: 'EMPLOYEE',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Sync from KGC to Horilla (push users to Horilla)
   */
  private async syncToHorilla(
    input: SyncEmployeesExtendedDto,
    tenantId: string,
    _config: IHorillaConfig,
    conflictStrategy: ConflictResolutionStrategy,
    result: ISyncResultExtended
  ): Promise<void> {
    let usersToSync: IKgcUser[];

    if (input.userIds && input.userIds.length > 0) {
      usersToSync = await this.userRepository.findByIds(input.userIds, tenantId);
    } else {
      usersToSync = await this.userRepository.findAllMapped(tenantId);
    }

    result.totalCount += usersToSync.length;

    for (const user of usersToSync) {
      try {
        const mapping = user.horillaEmployeeId
          ? await this.mappingRepository.findByHorillaId(user.horillaEmployeeId, tenantId)
          : await this.mappingRepository.findByKgcUserId(user.id);

        if (mapping) {
          // Skip if direction is HORILLA_TO_KGC only
          if (mapping.syncDirection === SyncDirection.HORILLA_TO_KGC) {
            result.skippedCount++;
            continue;
          }

          // Update existing employee in Horilla
          const horillaEmployee = await this.horillaClient.getEmployeeById(
            mapping.horillaEmployeeId
          );
          if (!horillaEmployee) {
            result.skippedCount++;
            continue;
          }

          // Check for conflicts in bidirectional mode
          if (input.direction === 'BIDIRECTIONAL') {
            const hasConflict = this.detectConflict(user, horillaEmployee, mapping);
            if (hasConflict) {
              const winner = this.resolveConflict(user, horillaEmployee, conflictStrategy);
              if (winner === 'KGC') {
                await this.updateHorillaFromKgc(user, horillaEmployee, mapping);
                result.updatedCount++;
              } else if (winner === 'HORILLA') {
                result.skippedCount++;
              } else {
                result.skippedCount++;
              }
              continue;
            }
          }

          // No conflict - update Horilla
          if (!input.fullSync && mapping.lastSyncAt && user.updatedAt <= mapping.lastSyncAt) {
            result.skippedCount++;
            continue;
          }

          await this.updateHorillaFromKgc(user, horillaEmployee, mapping);
          result.updatedCount++;
        } else {
          // No mapping - create new employee in Horilla
          const newEmployee = await this.createHorillaFromKgc(user);
          await this.mappingRepository.create({
            tenantId,
            horillaEmployeeId: newEmployee.employeeId,
            kgcUserId: user.id,
            syncDirection: SyncDirection.BIDIRECTIONAL,
            lastSyncAt: new Date(),
            lastSyncStatus: SyncStatus.COMPLETED,
          });
          await this.userRepository.update(user.id, { horillaEmployeeId: newEmployee.employeeId });
          result.createdCount++;
        }
      } catch (error) {
        result.failedCount++;
        result.errors.push({
          entityId: user.id,
          entityType: 'USER',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Detect if there's a conflict between KGC and Horilla data
   */
  private detectConflict(
    kgcUser: IKgcUser,
    horillaEmployee: IHorillaEmployee,
    mapping: IEmployeeMapping
  ): boolean {
    if (!mapping.lastSyncAt) return false;

    const kgcModified = kgcUser.updatedAt > mapping.lastSyncAt;
    const horillaModified = horillaEmployee.lastModified > mapping.lastSyncAt;

    return kgcModified && horillaModified;
  }

  /**
   * Resolve conflict based on strategy
   */
  private resolveConflict(
    kgcUser: IKgcUser,
    horillaEmployee: IHorillaEmployee,
    strategy: ConflictResolutionStrategy
  ): 'KGC' | 'HORILLA' | 'MANUAL' {
    switch (strategy) {
      case ConflictResolutionStrategy.KGC_WINS:
        return 'KGC';
      case ConflictResolutionStrategy.HORILLA_WINS:
        return 'HORILLA';
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        return kgcUser.updatedAt > horillaEmployee.lastModified ? 'KGC' : 'HORILLA';
      case ConflictResolutionStrategy.MANUAL:
      default:
        return 'MANUAL';
    }
  }

  /**
   * Update KGC user from Horilla employee data
   */
  private async updateKgcUserFromHorilla(
    user: IKgcUser,
    employee: IHorillaEmployee,
    mapping: IEmployeeMapping
  ): Promise<void> {
    const updateData: Partial<IKgcUser> = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      isActive: employee.status === 'ACTIVE',
    };
    if (employee.phone) updateData.phone = employee.phone;

    await this.userRepository.update(user.id, updateData);
    await this.mappingRepository.update(mapping.id, {
      lastSyncAt: new Date(),
      lastSyncStatus: SyncStatus.COMPLETED,
    });
  }

  /**
   * Create KGC user from Horilla employee
   */
  private async createKgcUserFromHorilla(
    employee: IHorillaEmployee,
    tenantId: string,
    config: IHorillaConfig
  ): Promise<IKgcUser> {
    const createData: Partial<IKgcUser> = {
      tenantId,
      email: employee.email,
      firstName: employee.firstName,
      lastName: employee.lastName,
      role: config.defaultRole || 'EMPLOYEE',
      isActive: employee.status === 'ACTIVE',
      horillaEmployeeId: employee.employeeId,
    };
    if (employee.phone) createData.phone = employee.phone;
    if (config.defaultLocationId) createData.locationId = config.defaultLocationId;

    return this.userRepository.create(createData);
  }

  /**
   * Update Horilla employee from KGC user data
   */
  private async updateHorillaFromKgc(
    user: IKgcUser,
    _employee: IHorillaEmployee,
    mapping: IEmployeeMapping
  ): Promise<void> {
    const updateData: Partial<IHorillaEmployee> = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
    };
    if (user.phone) {
      updateData.phone = user.phone;
    }

    await this.horillaClient.updateEmployee(mapping.horillaEmployeeId, updateData);

    await this.mappingRepository.update(mapping.id, {
      lastSyncAt: new Date(),
      lastSyncStatus: SyncStatus.COMPLETED,
    });
  }

  /**
   * Create Horilla employee from KGC user
   */
  private async createHorillaFromKgc(user: IKgcUser): Promise<IHorillaEmployee> {
    const employeeData: Omit<IHorillaEmployee, 'id' | 'lastModified'> = {
      employeeId: `KGC-${user.id.substring(0, 8)}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      hireDate: user.createdAt,
    };
    if (user.phone) {
      employeeData.phone = user.phone;
    }

    return this.horillaClient.createEmployee(employeeData);
  }
}
