import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  RentalEquipment,
  EquipmentStatus,
  EquipmentCategory,
  EquipmentCondition,
  EquipmentAccessory,
  EquipmentHistoryEntry,
  EquipmentEventType,
  MaintenanceRecord,
  EquipmentListResult,
  EquipmentScanResult,
  AccessoryChecklistResult,
  AccessoryChecklistItem,
  MaintenanceAlert,
  EquipmentStatistics,
} from '../interfaces/rental-equipment.interface';
import {
  CreateEquipmentDto,
  UpdateEquipmentDto,
  ChangeEquipmentStatusDto,
  ScanEquipmentDto,
  CreateAccessoryDto,
  UpdateAccessoryDto,
  AccessoryChecklistDto,
  CreateMaintenanceRecordDto,
  EquipmentFilterDto,
  validateCreateEquipment,
  validateUpdateEquipment,
  validateChangeStatus,
  validateScanEquipment,
  validateCreateAccessory,
  validateAccessoryChecklist,
  validateCreateMaintenance,
  validateEquipmentFilter,
} from '../dto/rental-equipment.dto';

/**
 * Permission context for equipment operations
 */
export interface EquipmentPermissionContext {
  userId: string;
  tenantId: string;
  locationId: string;
  canManageEquipment: boolean;
  canPerformMaintenance: boolean;
}

/**
 * RentalEquipmentService - Epic 13: Bérgép Management
 * Implements:
 * - Story 13.1: Bérgép CRUD
 * - Story 13.2: Bérgép Státusz Lifecycle
 * - Story 13.3: Serial Number és QR Kód
 * - Story 13.4: Tartozék Kezelés
 * - Story 13.5: Bérgép Előzmények és Karbantartás
 */
@Injectable()
export class RentalEquipmentService {
  // In-memory storage for testing
  private equipment: Map<string, RentalEquipment> = new Map();
  private accessories: Map<string, EquipmentAccessory> = new Map();
  private history: EquipmentHistoryEntry[] = [];
  private maintenanceRecords: MaintenanceRecord[] = [];

  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateQrCode(serialNumber: string, _tenantId: string): string {
    // SECURITY FIX: Do not expose tenant ID in QR code - use hash instead
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `KGC-${timestamp}-${randomPart}-${serialNumber}`.toUpperCase();
  }

  private generateInventoryCode(category: EquipmentCategory, count: number): string {
    const prefix = category.substring(0, 3).toUpperCase();
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  // =====================================================
  // Story 13.1: Bérgép CRUD
  // =====================================================

  /**
   * Validate permission for equipment management
   */
  private validateManagePermission(context: EquipmentPermissionContext): void {
    if (!context.canManageEquipment) {
      throw new ForbiddenException('User does not have permission to manage equipment');
    }
  }

  /**
   * Validate permission for maintenance operations
   */
  private validateMaintenancePermission(context: EquipmentPermissionContext): void {
    if (!context.canPerformMaintenance) {
      throw new ForbiddenException('User does not have permission to perform maintenance');
    }
  }

  /**
   * Create new rental equipment
   */
  async create(input: CreateEquipmentDto, context: EquipmentPermissionContext): Promise<RentalEquipment> {
    this.validateManagePermission(context);
    const validated = validateCreateEquipment(input);

    // Check for duplicate serial number
    const existingBySerial = Array.from(this.equipment.values()).find(
      (e) => e.tenantId === context.tenantId && e.serialNumber === validated.serialNumber
    );
    if (existingBySerial) {
      throw new ConflictException(`Equipment with serial number ${validated.serialNumber} already exists`);
    }

    const categoryCount = Array.from(this.equipment.values()).filter(
      (e) => e.tenantId === context.tenantId && e.category === validated.category
    ).length;

    const now = new Date();
    const equipment: RentalEquipment = {
      id: this.generateId(),
      tenantId: context.tenantId,
      locationId: context.locationId,
      serialNumber: validated.serialNumber,
      inventoryCode: validated.inventoryCode || this.generateInventoryCode(validated.category, categoryCount),
      qrCode: this.generateQrCode(validated.serialNumber, context.tenantId),
      name: validated.name,
      category: validated.category,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.EXCELLENT,
      dailyRate: validated.dailyRate,
      weeklyRate: validated.weeklyRate,
      monthlyRate: validated.monthlyRate,
      depositAmount: validated.depositAmount,
      totalRentals: 0,
      totalRevenue: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    if (validated.productId !== undefined) {
      equipment.productId = validated.productId;
    }
    if (validated.description !== undefined) {
      equipment.description = validated.description;
    }
    if (validated.brand !== undefined) {
      equipment.brand = validated.brand;
    }
    if (validated.model !== undefined) {
      equipment.model = validated.model;
    }
    if (validated.purchaseDate !== undefined) {
      equipment.purchaseDate = validated.purchaseDate;
    }
    if (validated.purchasePrice !== undefined) {
      equipment.purchasePrice = validated.purchasePrice;
    }
    if (validated.warrantyExpiry !== undefined) {
      equipment.warrantyExpiry = validated.warrantyExpiry;
    }
    if (validated.maintenanceIntervalDays !== undefined) {
      equipment.maintenanceIntervalDays = validated.maintenanceIntervalDays;
    }

    this.equipment.set(equipment.id, equipment);
    this.recordHistory(equipment.id, EquipmentEventType.CREATED, undefined, undefined, context.userId, 'Equipment created');

    return equipment;
  }

  /**
   * Update equipment
   */
  async update(
    equipmentId: string,
    input: UpdateEquipmentDto,
    context: EquipmentPermissionContext
  ): Promise<RentalEquipment> {
    this.validateManagePermission(context);
    const equipment = await this.findById(equipmentId, context);
    const validated = validateUpdateEquipment(input);

    if (validated.name !== undefined) equipment.name = validated.name;
    if (validated.description !== undefined) {
      if (validated.description) {
        equipment.description = validated.description;
      } else {
        delete equipment.description;
      }
    }
    if (validated.category !== undefined) equipment.category = validated.category;
    if (validated.brand !== undefined) {
      if (validated.brand) {
        equipment.brand = validated.brand;
      } else {
        delete equipment.brand;
      }
    }
    if (validated.model !== undefined) {
      if (validated.model) {
        equipment.model = validated.model;
      } else {
        delete equipment.model;
      }
    }
    if (validated.dailyRate !== undefined) equipment.dailyRate = validated.dailyRate;
    if (validated.weeklyRate !== undefined) equipment.weeklyRate = validated.weeklyRate;
    if (validated.monthlyRate !== undefined) equipment.monthlyRate = validated.monthlyRate;
    if (validated.depositAmount !== undefined) equipment.depositAmount = validated.depositAmount;
    if (validated.condition !== undefined) {
      const oldCondition = equipment.condition;
      equipment.condition = validated.condition;
      if (oldCondition !== validated.condition) {
        this.recordHistory(equipmentId, EquipmentEventType.CONDITION_UPDATED, oldCondition, validated.condition, context.userId, `Condition changed from ${oldCondition} to ${validated.condition}`);
      }
    }
    if (validated.warrantyExpiry !== undefined) {
      if (validated.warrantyExpiry) {
        equipment.warrantyExpiry = validated.warrantyExpiry;
      } else {
        delete equipment.warrantyExpiry;
      }
    }
    if (validated.maintenanceIntervalDays !== undefined) {
      if (validated.maintenanceIntervalDays) {
        equipment.maintenanceIntervalDays = validated.maintenanceIntervalDays;
      } else {
        delete equipment.maintenanceIntervalDays;
      }
    }
    if (validated.notes !== undefined) {
      if (validated.notes) {
        equipment.notes = validated.notes;
      } else {
        delete equipment.notes;
      }
      this.recordHistory(equipmentId, EquipmentEventType.NOTES_UPDATED, undefined, undefined, context.userId, 'Notes updated');
    }

    equipment.updatedAt = new Date();
    this.equipment.set(equipmentId, equipment);

    return equipment;
  }

  /**
   * Find equipment by ID
   */
  async findById(equipmentId: string, context: EquipmentPermissionContext): Promise<RentalEquipment> {
    const equipment = this.equipment.get(equipmentId);

    if (!equipment || equipment.tenantId !== context.tenantId) {
      throw new NotFoundException(`Equipment ${equipmentId} not found`);
    }

    return equipment;
  }

  /**
   * List equipment with filters
   */
  async findMany(filter: EquipmentFilterDto, context: EquipmentPermissionContext): Promise<EquipmentListResult> {
    const validated = validateEquipmentFilter(filter);
    let items = Array.from(this.equipment.values());

    // Tenant isolation
    items = items.filter((e) => e.tenantId === context.tenantId && e.isActive);

    // Apply filters
    if (validated.status) {
      items = items.filter((e) => e.status === validated.status);
    }
    if (validated.category) {
      items = items.filter((e) => e.category === validated.category);
    }
    if (validated.condition) {
      items = items.filter((e) => e.condition === validated.condition);
    }
    if (validated.brand) {
      items = items.filter((e) => e.brand?.toLowerCase().includes(validated.brand!.toLowerCase()));
    }
    if (validated.minDailyRate !== undefined) {
      items = items.filter((e) => e.dailyRate >= validated.minDailyRate!);
    }
    if (validated.maxDailyRate !== undefined) {
      items = items.filter((e) => e.dailyRate <= validated.maxDailyRate!);
    }
    if (validated.availableOnly) {
      items = items.filter((e) => e.status === EquipmentStatus.AVAILABLE);
    }
    if (validated.maintenanceDueSoon) {
      const now = new Date();
      const soonDays = 7;
      items = items.filter((e) => {
        if (!e.nextMaintenanceDate) return false;
        const daysUntil = Math.ceil((e.nextMaintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntil <= soonDays;
      });
    }
    if (validated.search) {
      const searchLower = validated.search.toLowerCase();
      items = items.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.serialNumber.toLowerCase().includes(searchLower) ||
          e.inventoryCode.toLowerCase().includes(searchLower) ||
          e.brand?.toLowerCase().includes(searchLower) ||
          e.model?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by name
    items.sort((a, b) => a.name.localeCompare(b.name));

    // Pagination
    const total = items.length;
    const page = validated.page || 1;
    const pageSize = validated.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = items.slice(startIndex, startIndex + pageSize);

    return {
      equipment: paginatedItems,
      total,
      page,
      pageSize,
      hasMore: startIndex + pageSize < total,
    };
  }

  /**
   * Soft delete equipment
   */
  async delete(equipmentId: string, context: EquipmentPermissionContext): Promise<void> {
    this.validateManagePermission(context);
    const equipment = await this.findById(equipmentId, context);

    if (equipment.status === EquipmentStatus.RENTED) {
      throw new ConflictException('Cannot delete equipment that is currently rented');
    }

    equipment.isActive = false;
    equipment.status = EquipmentStatus.DECOMMISSIONED;
    equipment.updatedAt = new Date();
    this.equipment.set(equipmentId, equipment);

    this.recordHistory(equipmentId, EquipmentEventType.DECOMMISSIONED, undefined, undefined, context.userId, 'Equipment decommissioned');
  }

  // =====================================================
  // Story 13.2: Bérgép Státusz Lifecycle
  // =====================================================

  /**
   * Change equipment status
   */
  async changeStatus(input: ChangeEquipmentStatusDto, context: EquipmentPermissionContext): Promise<RentalEquipment> {
    const validated = validateChangeStatus(input);
    const equipment = await this.findById(validated.equipmentId, context);

    // Validate status transition
    this.validateStatusTransition(equipment.status, validated.newStatus);

    const previousStatus = equipment.status;
    equipment.status = validated.newStatus;
    equipment.updatedAt = new Date();

    // Determine event type based on transition
    let eventType = EquipmentEventType.STATUS_CHANGED;
    if (validated.newStatus === EquipmentStatus.RENTED) {
      eventType = EquipmentEventType.RENTED_OUT;
    } else if (previousStatus === EquipmentStatus.RENTED && validated.newStatus === EquipmentStatus.AVAILABLE) {
      eventType = EquipmentEventType.RETURNED;
    } else if (validated.newStatus === EquipmentStatus.IN_SERVICE) {
      eventType = EquipmentEventType.SENT_TO_SERVICE;
    } else if (previousStatus === EquipmentStatus.IN_SERVICE) {
      eventType = EquipmentEventType.RETURNED_FROM_SERVICE;
    }

    this.equipment.set(equipment.id, equipment);
    this.recordHistory(
      equipment.id,
      eventType,
      previousStatus,
      validated.newStatus,
      context.userId,
      validated.reason || `Status changed from ${previousStatus} to ${validated.newStatus}`,
      validated.relatedId
    );

    return equipment;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(from: EquipmentStatus, to: EquipmentStatus): void {
    const validTransitions: Record<EquipmentStatus, EquipmentStatus[]> = {
      [EquipmentStatus.AVAILABLE]: [EquipmentStatus.RENTED, EquipmentStatus.RESERVED, EquipmentStatus.IN_SERVICE, EquipmentStatus.DECOMMISSIONED, EquipmentStatus.MAINTENANCE_REQUIRED],
      [EquipmentStatus.RENTED]: [EquipmentStatus.AVAILABLE, EquipmentStatus.IN_SERVICE, EquipmentStatus.MAINTENANCE_REQUIRED],
      [EquipmentStatus.IN_SERVICE]: [EquipmentStatus.AVAILABLE, EquipmentStatus.DECOMMISSIONED, EquipmentStatus.MAINTENANCE_REQUIRED],
      [EquipmentStatus.RESERVED]: [EquipmentStatus.AVAILABLE, EquipmentStatus.RENTED, EquipmentStatus.DECOMMISSIONED], // FIX: Allow decommissioning reserved equipment
      [EquipmentStatus.DECOMMISSIONED]: [EquipmentStatus.AVAILABLE], // Can reactivate
      [EquipmentStatus.MAINTENANCE_REQUIRED]: [EquipmentStatus.AVAILABLE, EquipmentStatus.IN_SERVICE, EquipmentStatus.DECOMMISSIONED],
    };

    const allowedTransitions = validTransitions[from];
    // noUncheckedIndexedAccess compliance: check for undefined
    if (allowedTransitions === undefined || !allowedTransitions.includes(to)) {
      throw new BadRequestException(`Invalid status transition: ${from} -> ${to}`);
    }
  }

  // =====================================================
  // Story 13.3: Serial Number és QR Kód
  // =====================================================

  /**
   * Scan equipment by QR code, serial number, or inventory code
   */
  async scan(input: ScanEquipmentDto, context: EquipmentPermissionContext): Promise<EquipmentScanResult> {
    const validated = validateScanEquipment(input);
    const codeLower = validated.code.toLowerCase();

    let equipment: RentalEquipment | undefined;

    if (validated.codeType === 'QR') {
      equipment = Array.from(this.equipment.values()).find(
        (e) => e.tenantId === context.tenantId && e.qrCode.toLowerCase() === codeLower
      );
    } else if (validated.codeType === 'SERIAL') {
      equipment = Array.from(this.equipment.values()).find(
        (e) => e.tenantId === context.tenantId && e.serialNumber.toLowerCase() === codeLower
      );
    } else {
      equipment = Array.from(this.equipment.values()).find(
        (e) => e.tenantId === context.tenantId && e.inventoryCode.toLowerCase() === codeLower
      );
    }

    if (!equipment) {
      throw new NotFoundException(`Equipment not found with code: ${validated.code}`);
    }

    // Get accessories
    const accessories = Array.from(this.accessories.values()).filter(
      (a) => a.equipmentId === equipment!.id
    );

    // Get recent history (last 10 entries)
    const recentHistory = this.history
      .filter((h) => h.equipmentId === equipment!.id)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .slice(0, 10);

    // Check maintenance status
    const now = new Date();
    let maintenanceStatus: EquipmentScanResult['maintenanceStatus'] = {
      isDue: false,
    };

    if (equipment.nextMaintenanceDate) {
      const daysUntil = Math.ceil((equipment.nextMaintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      maintenanceStatus = {
        isDue: daysUntil <= 0,
        nextDueDate: equipment.nextMaintenanceDate,
      };
      if (equipment.lastMaintenanceDate) {
        maintenanceStatus.daysSinceLastMaintenance = Math.ceil(
          (now.getTime() - equipment.lastMaintenanceDate.getTime()) / (1000 * 60 * 60 * 24)
        );
      }
    }

    return {
      equipment,
      accessories,
      recentHistory,
      maintenanceStatus,
    };
  }

  // =====================================================
  // Story 13.4: Tartozék Kezelés
  // =====================================================

  /**
   * Add accessory to equipment
   */
  async addAccessory(input: CreateAccessoryDto, context: EquipmentPermissionContext): Promise<EquipmentAccessory> {
    const validated = validateCreateAccessory(input);

    // Verify equipment exists
    await this.findById(validated.equipmentId, context);

    const now = new Date();
    const accessory: EquipmentAccessory = {
      id: this.generateId(),
      equipmentId: validated.equipmentId,
      name: validated.name,
      quantity: validated.quantity,
      isMandatory: validated.isMandatory,
      replacementCost: validated.replacementCost,
      condition: validated.condition,
      createdAt: now,
      updatedAt: now,
    };
    if (validated.description !== undefined) {
      accessory.description = validated.description;
    }
    if (validated.notes !== undefined) {
      accessory.notes = validated.notes;
    }

    this.accessories.set(accessory.id, accessory);
    this.recordHistory(validated.equipmentId, EquipmentEventType.ACCESSORY_ADDED, undefined, undefined, context.userId, `Accessory added: ${accessory.name}`);

    return accessory;
  }

  /**
   * Update accessory
   */
  async updateAccessory(
    accessoryId: string,
    input: UpdateAccessoryDto,
    context: EquipmentPermissionContext
  ): Promise<EquipmentAccessory> {
    const accessory = this.accessories.get(accessoryId);
    if (!accessory) {
      throw new NotFoundException(`Accessory ${accessoryId} not found`);
    }

    // Verify equipment access
    await this.findById(accessory.equipmentId, context);

    if (input.name !== undefined) accessory.name = input.name;
    if (input.description !== undefined) {
      if (input.description) {
        accessory.description = input.description;
      } else {
        delete accessory.description;
      }
    }
    if (input.quantity !== undefined) accessory.quantity = input.quantity;
    if (input.isMandatory !== undefined) accessory.isMandatory = input.isMandatory;
    if (input.replacementCost !== undefined) accessory.replacementCost = input.replacementCost;
    if (input.condition !== undefined) accessory.condition = input.condition;
    if (input.notes !== undefined) {
      if (input.notes) {
        accessory.notes = input.notes;
      } else {
        delete accessory.notes;
      }
    }

    accessory.updatedAt = new Date();
    this.accessories.set(accessoryId, accessory);

    return accessory;
  }

  /**
   * Remove accessory
   */
  async removeAccessory(accessoryId: string, context: EquipmentPermissionContext): Promise<void> {
    const accessory = this.accessories.get(accessoryId);
    if (!accessory) {
      throw new NotFoundException(`Accessory ${accessoryId} not found`);
    }

    // Verify equipment access
    await this.findById(accessory.equipmentId, context);

    this.accessories.delete(accessoryId);
    this.recordHistory(accessory.equipmentId, EquipmentEventType.ACCESSORY_REMOVED, undefined, undefined, context.userId, `Accessory removed: ${accessory.name}`);
  }

  /**
   * Get accessories for equipment
   */
  async getAccessories(equipmentId: string, context: EquipmentPermissionContext): Promise<EquipmentAccessory[]> {
    await this.findById(equipmentId, context);

    return Array.from(this.accessories.values()).filter((a) => a.equipmentId === equipmentId);
  }

  /**
   * Verify accessory checklist
   */
  async verifyAccessoryChecklist(
    input: AccessoryChecklistDto,
    context: EquipmentPermissionContext
  ): Promise<AccessoryChecklistResult> {
    const validated = validateAccessoryChecklist(input);
    await this.findById(validated.equipmentId, context);

    const equipmentAccessories = Array.from(this.accessories.values()).filter(
      (a) => a.equipmentId === validated.equipmentId
    );

    const items: AccessoryChecklistItem[] = [];
    const missingMandatory: EquipmentAccessory[] = [];
    const warnings: string[] = [];

    for (const accessory of equipmentAccessories) {
      const checkItem = validated.items.find((i) => i.accessoryId === accessory.id);

      if (checkItem) {
        const item: AccessoryChecklistItem = {
          accessory,
          isPresent: checkItem.isPresent,
          condition: checkItem.condition,
        };
        if (checkItem.notes !== undefined) {
          item.notes = checkItem.notes;
        }
        items.push(item);

        if (!checkItem.isPresent && accessory.isMandatory) {
          missingMandatory.push(accessory);
          warnings.push(`Mandatory accessory missing: ${accessory.name}`);
        }

        if (checkItem.condition === EquipmentCondition.POOR || checkItem.condition === EquipmentCondition.NEEDS_REPAIR) {
          warnings.push(`Accessory needs attention: ${accessory.name} (${checkItem.condition})`);
        }
      } else {
        // Accessory not in checklist - assume missing
        items.push({
          accessory,
          isPresent: false,
          condition: accessory.condition,
        });

        if (accessory.isMandatory) {
          missingMandatory.push(accessory);
          warnings.push(`Mandatory accessory not checked: ${accessory.name}`);
        }
      }
    }

    return {
      equipmentId: validated.equipmentId,
      items,
      allPresent: items.every((i) => i.isPresent),
      missingMandatory,
      warnings,
    };
  }

  // =====================================================
  // Story 13.5: Bérgép Előzmények és Karbantartás
  // =====================================================

  /**
   * Get equipment history
   */
  async getHistory(equipmentId: string, context: EquipmentPermissionContext): Promise<EquipmentHistoryEntry[]> {
    await this.findById(equipmentId, context);

    return this.history
      .filter((h) => h.equipmentId === equipmentId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Add maintenance record
   */
  async addMaintenanceRecord(
    input: CreateMaintenanceRecordDto,
    context: EquipmentPermissionContext
  ): Promise<MaintenanceRecord> {
    this.validateMaintenancePermission(context);
    const validated = validateCreateMaintenance(input);
    const equipment = await this.findById(validated.equipmentId, context);

    const now = new Date();
    const record: MaintenanceRecord = {
      id: this.generateId(),
      equipmentId: validated.equipmentId,
      maintenanceType: validated.maintenanceType,
      description: validated.description,
      cost: validated.cost,
      performedBy: validated.performedBy,
      performedAt: validated.performedAt || now,
      createdAt: now,
    };
    if (validated.partsReplaced !== undefined) {
      record.partsReplaced = validated.partsReplaced;
    }
    if (validated.nextDueDate !== undefined) {
      record.nextDueDate = validated.nextDueDate;
    }
    if (validated.notes !== undefined) {
      record.notes = validated.notes;
    }

    this.maintenanceRecords.push(record);

    // Update equipment maintenance dates
    equipment.lastMaintenanceDate = record.performedAt;
    if (validated.nextDueDate) {
      equipment.nextMaintenanceDate = validated.nextDueDate;
    } else if (equipment.maintenanceIntervalDays) {
      const nextDate = new Date(record.performedAt);
      nextDate.setDate(nextDate.getDate() + equipment.maintenanceIntervalDays);
      equipment.nextMaintenanceDate = nextDate;
    }

    // If equipment was in MAINTENANCE_REQUIRED status, update it
    if (equipment.status === EquipmentStatus.MAINTENANCE_REQUIRED) {
      equipment.status = EquipmentStatus.AVAILABLE;
    }

    equipment.updatedAt = now;
    this.equipment.set(equipment.id, equipment);

    this.recordHistory(
      equipment.id,
      EquipmentEventType.MAINTENANCE_PERFORMED,
      undefined,
      undefined,
      context.userId,
      `${validated.maintenanceType} maintenance performed: ${validated.description}`
    );

    return record;
  }

  /**
   * Get maintenance records for equipment
   */
  async getMaintenanceRecords(equipmentId: string, context: EquipmentPermissionContext): Promise<MaintenanceRecord[]> {
    await this.findById(equipmentId, context);

    return this.maintenanceRecords
      .filter((r) => r.equipmentId === equipmentId)
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());
  }

  /**
   * Get maintenance alerts
   */
  async getMaintenanceAlerts(context: EquipmentPermissionContext): Promise<MaintenanceAlert[]> {
    const alerts: MaintenanceAlert[] = [];
    const now = new Date();
    const soonDays = 7;

    const tenantEquipment = Array.from(this.equipment.values()).filter(
      (e) => e.tenantId === context.tenantId && e.isActive
    );

    for (const equipment of tenantEquipment) {
      if (!equipment.nextMaintenanceDate) continue;

      const daysUntil = Math.ceil((equipment.nextMaintenanceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) {
        const alert: MaintenanceAlert = {
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          serialNumber: equipment.serialNumber,
          alertType: 'OVERDUE',
          dueDate: equipment.nextMaintenanceDate,
          daysPastDue: Math.abs(daysUntil),
        };
        if (equipment.lastMaintenanceDate !== undefined) {
          alert.lastMaintenanceDate = equipment.lastMaintenanceDate;
        }
        alerts.push(alert);
      } else if (daysUntil <= soonDays) {
        const alert: MaintenanceAlert = {
          equipmentId: equipment.id,
          equipmentName: equipment.name,
          serialNumber: equipment.serialNumber,
          alertType: 'DUE_SOON',
          dueDate: equipment.nextMaintenanceDate,
          daysUntilDue: daysUntil,
        };
        if (equipment.lastMaintenanceDate !== undefined) {
          alert.lastMaintenanceDate = equipment.lastMaintenanceDate;
        }
        alerts.push(alert);
      }
    }

    // Sort by urgency (overdue first, then by days)
    alerts.sort((a, b) => {
      if (a.alertType === 'OVERDUE' && b.alertType !== 'OVERDUE') return -1;
      if (a.alertType !== 'OVERDUE' && b.alertType === 'OVERDUE') return 1;
      return (a.daysUntilDue || 0) - (b.daysUntilDue || 0);
    });

    return alerts;
  }

  /**
   * Get equipment statistics
   */
  async getStatistics(context: EquipmentPermissionContext): Promise<EquipmentStatistics> {
    const tenantEquipment = Array.from(this.equipment.values()).filter(
      (e) => e.tenantId === context.tenantId && e.isActive
    );

    const now = new Date();
    const stats: EquipmentStatistics = {
      totalEquipment: tenantEquipment.length,
      byStatus: {
        [EquipmentStatus.AVAILABLE]: 0,
        [EquipmentStatus.RENTED]: 0,
        [EquipmentStatus.IN_SERVICE]: 0,
        [EquipmentStatus.RESERVED]: 0,
        [EquipmentStatus.DECOMMISSIONED]: 0,
        [EquipmentStatus.MAINTENANCE_REQUIRED]: 0,
      },
      byCategory: {
        [EquipmentCategory.POWER_TOOL]: 0,
        [EquipmentCategory.GARDEN]: 0,
        [EquipmentCategory.CONSTRUCTION]: 0,
        [EquipmentCategory.CLEANING]: 0,
        [EquipmentCategory.MACHINERY]: 0,
        [EquipmentCategory.HAND_TOOL]: 0,
        [EquipmentCategory.MEASUREMENT]: 0,
        [EquipmentCategory.SAFETY]: 0,
      },
      byCondition: {
        [EquipmentCondition.EXCELLENT]: 0,
        [EquipmentCondition.GOOD]: 0,
        [EquipmentCondition.FAIR]: 0,
        [EquipmentCondition.POOR]: 0,
        [EquipmentCondition.NEEDS_REPAIR]: 0,
      },
      availableCount: 0,
      rentedCount: 0,
      inServiceCount: 0,
      maintenanceDueCount: 0,
      totalRevenue: 0,
      averageUtilization: 0,
    };

    let maintenanceDueCount = 0;

    for (const equipment of tenantEquipment) {
      stats.byStatus[equipment.status]++;
      stats.byCategory[equipment.category]++;
      stats.byCondition[equipment.condition]++;
      stats.totalRevenue += equipment.totalRevenue;

      if (equipment.status === EquipmentStatus.AVAILABLE) stats.availableCount++;
      if (equipment.status === EquipmentStatus.RENTED) stats.rentedCount++;
      if (equipment.status === EquipmentStatus.IN_SERVICE) stats.inServiceCount++;

      if (equipment.nextMaintenanceDate && equipment.nextMaintenanceDate <= now) {
        maintenanceDueCount++;
      }
    }

    stats.maintenanceDueCount = maintenanceDueCount;
    stats.averageUtilization = tenantEquipment.length > 0
      ? (stats.rentedCount / tenantEquipment.length) * 100
      : 0;

    return stats;
  }

  /**
   * Record history entry
   * Type-safe helper to convert status values
   */
  private toEquipmentStatus(value: EquipmentStatus | string | undefined): EquipmentStatus | undefined {
    if (value === undefined) return undefined;
    // Validate that the string is a valid EquipmentStatus
    const validStatuses = Object.values(EquipmentStatus);
    if (validStatuses.includes(value as EquipmentStatus)) {
      return value as EquipmentStatus;
    }
    return undefined;
  }

  /**
   * Record history entry
   */
  private recordHistory(
    equipmentId: string,
    eventType: EquipmentEventType,
    previousStatus: EquipmentStatus | string | undefined,
    newStatus: EquipmentStatus | string | undefined,
    performedBy: string,
    description: string,
    relatedId?: string
  ): void {
    const entry: EquipmentHistoryEntry = {
      id: this.generateId(),
      equipmentId,
      eventType,
      performedBy,
      description,
      performedAt: new Date(),
    };
    const prevStatus = this.toEquipmentStatus(previousStatus);
    if (prevStatus !== undefined) {
      entry.previousStatus = prevStatus;
    }
    const newStat = this.toEquipmentStatus(newStatus);
    if (newStat !== undefined) {
      entry.newStatus = newStat;
    }
    if (relatedId !== undefined) {
      entry.rentalId = relatedId;
    }
    this.history.push(entry);
  }

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    this.equipment.clear();
    this.accessories.clear();
    this.history = [];
    this.maintenanceRecords = [];
  }
}
