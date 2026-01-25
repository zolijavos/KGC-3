/**
 * @kgc/bergep - Equipment Repository
 * Epic 13: Bérgép törzs, státusz lifecycle, tartozék kezelés
 *
 * Repository interface and InMemory implementation for RentalEquipment entity.
 */

import { Injectable } from '@nestjs/common';
import type {
  CreateEquipmentInput,
  EquipmentAccessory,
  EquipmentFilterOptions,
  EquipmentHistoryEntry,
  EquipmentListResult,
  EquipmentStatistics,
  MaintenanceRecord,
  RentalEquipment,
  UpdateEquipmentInput,
} from '../interfaces/rental-equipment.interface';
import {
  EquipmentCondition,
  EquipmentEventType,
  EquipmentStatus,
} from '../interfaces/rental-equipment.interface';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const EQUIPMENT_REPOSITORY = Symbol('EQUIPMENT_REPOSITORY');

// ============================================
// QUERY INTERFACES
// ============================================

export interface EquipmentQuery extends EquipmentFilterOptions {
  tenantId: string;
  locationId?: string;
  offset?: number;
  limit?: number;
  sortBy?: 'name' | 'serialNumber' | 'createdAt' | 'dailyRate' | 'totalRentals';
  sortOrder?: 'asc' | 'desc';
}

export interface AccessoryQuery {
  equipmentId: string;
  tenantId: string;
}

export interface MaintenanceQuery {
  equipmentId: string;
  tenantId: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IEquipmentRepository {
  // Core CRUD operations
  findById(id: string, tenantId: string): Promise<RentalEquipment | null>;
  findBySerialNumber(serialNumber: string, tenantId: string): Promise<RentalEquipment | null>;
  findByQrCode(qrCode: string, tenantId: string): Promise<RentalEquipment | null>;
  findByInventoryCode(inventoryCode: string, tenantId: string): Promise<RentalEquipment | null>;
  query(params: EquipmentQuery): Promise<EquipmentListResult>;
  create(
    tenantId: string,
    locationId: string,
    data: CreateEquipmentInput,
    createdBy: string
  ): Promise<RentalEquipment>;
  update(
    id: string,
    tenantId: string,
    data: UpdateEquipmentInput,
    updatedBy: string
  ): Promise<RentalEquipment>;
  delete(id: string, tenantId: string): Promise<void>;

  // Status management
  changeStatus(
    id: string,
    tenantId: string,
    newStatus: EquipmentStatus,
    changedBy: string,
    reason?: string,
    relatedId?: string
  ): Promise<RentalEquipment>;

  // Accessory management
  getAccessories(equipmentId: string, tenantId: string): Promise<EquipmentAccessory[]>;
  addAccessory(
    equipmentId: string,
    tenantId: string,
    accessory: Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>
  ): Promise<EquipmentAccessory>;
  updateAccessory(
    accessoryId: string,
    equipmentId: string,
    tenantId: string,
    data: Partial<Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EquipmentAccessory>;
  removeAccessory(accessoryId: string, equipmentId: string, tenantId: string): Promise<void>;

  // History
  getHistory(
    equipmentId: string,
    tenantId: string,
    limit?: number
  ): Promise<EquipmentHistoryEntry[]>;
  addHistoryEntry(
    entry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'>
  ): Promise<EquipmentHistoryEntry>;

  // Maintenance
  getMaintenanceRecords(params: MaintenanceQuery): Promise<MaintenanceRecord[]>;
  addMaintenanceRecord(
    equipmentId: string,
    tenantId: string,
    record: Omit<MaintenanceRecord, 'id' | 'equipmentId' | 'createdAt'>
  ): Promise<MaintenanceRecord>;
  getEquipmentNeedingMaintenance(
    tenantId: string,
    daysThreshold?: number
  ): Promise<RentalEquipment[]>;

  // Statistics
  getStatistics(tenantId: string, locationId?: string): Promise<EquipmentStatistics>;
  getAvailableEquipment(tenantId: string, locationId?: string): Promise<RentalEquipment[]>;

  // Code generation
  generateNextInventoryCode(tenantId: string, prefix?: string): Promise<string>;
  generateQrCode(tenantId: string, equipmentId: string): string;

  // Utilities
  serialNumberExists(serialNumber: string, tenantId: string): Promise<boolean>;
  inventoryCodeExists(inventoryCode: string, tenantId: string): Promise<boolean>;
  clear(): void;
}

// ============================================
// IN-MEMORY REPOSITORY IMPLEMENTATION
// ============================================

@Injectable()
export class InMemoryEquipmentRepository implements IEquipmentRepository {
  private equipment: Map<string, RentalEquipment> = new Map();
  private accessories: Map<string, EquipmentAccessory[]> = new Map();
  private history: Map<string, EquipmentHistoryEntry[]> = new Map();
  private maintenance: Map<string, MaintenanceRecord[]> = new Map();
  private inventoryCodeSequence: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.equipment.clear();
    this.accessories.clear();
    this.history.clear();
    this.maintenance.clear();
    this.inventoryCodeSequence.clear();
  }

  // ============================================
  // CORE CRUD OPERATIONS
  // ============================================

  async findById(id: string, tenantId: string): Promise<RentalEquipment | null> {
    const equipment = this.equipment.get(id);
    if (!equipment || equipment.tenantId !== tenantId) return null;
    return equipment;
  }

  async findBySerialNumber(
    serialNumber: string,
    tenantId: string
  ): Promise<RentalEquipment | null> {
    for (const equipment of this.equipment.values()) {
      if (equipment.tenantId === tenantId && equipment.serialNumber === serialNumber) {
        return equipment;
      }
    }
    return null;
  }

  async findByQrCode(qrCode: string, tenantId: string): Promise<RentalEquipment | null> {
    for (const equipment of this.equipment.values()) {
      if (equipment.tenantId === tenantId && equipment.qrCode === qrCode) {
        return equipment;
      }
    }
    return null;
  }

  async findByInventoryCode(
    inventoryCode: string,
    tenantId: string
  ): Promise<RentalEquipment | null> {
    for (const equipment of this.equipment.values()) {
      if (equipment.tenantId === tenantId && equipment.inventoryCode === inventoryCode) {
        return equipment;
      }
    }
    return null;
  }

  async query(params: EquipmentQuery): Promise<EquipmentListResult> {
    let results = Array.from(this.equipment.values()).filter(
      e => e.tenantId === params.tenantId && e.isActive
    );

    // Apply filters
    if (params.locationId) {
      results = results.filter(e => e.locationId === params.locationId);
    }

    if (params.status) {
      results = results.filter(e => e.status === params.status);
    }

    if (params.category) {
      results = results.filter(e => e.category === params.category);
    }

    if (params.condition) {
      results = results.filter(e => e.condition === params.condition);
    }

    if (params.brand) {
      results = results.filter(e => e.brand?.toLowerCase() === params.brand?.toLowerCase());
    }

    if (params.availableOnly) {
      results = results.filter(e => e.status === EquipmentStatus.AVAILABLE);
    }

    if (params.minDailyRate !== undefined) {
      results = results.filter(e => e.dailyRate >= params.minDailyRate!);
    }

    if (params.maxDailyRate !== undefined) {
      results = results.filter(e => e.dailyRate <= params.maxDailyRate!);
    }

    if (params.maintenanceDueSoon) {
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      results = results.filter(
        e => e.nextMaintenanceDate && e.nextMaintenanceDate <= thirtyDaysFromNow
      );
    }

    if (params.search) {
      const search = params.search.toLowerCase();
      results = results.filter(
        e =>
          e.name.toLowerCase().includes(search) ||
          e.serialNumber.toLowerCase().includes(search) ||
          e.inventoryCode.toLowerCase().includes(search) ||
          (e.brand?.toLowerCase().includes(search) ?? false) ||
          (e.model?.toLowerCase().includes(search) ?? false)
      );
    }

    // Sort
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'desc';

    results.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'serialNumber':
          comparison = a.serialNumber.localeCompare(b.serialNumber);
          break;
        case 'dailyRate':
          comparison = a.dailyRate - b.dailyRate;
          break;
        case 'totalRentals':
          comparison = a.totalRentals - b.totalRentals;
          break;
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 50;
    const page = Math.floor(offset / limit) + 1;
    const hasMore = offset + limit < total;

    results = results.slice(offset, offset + limit);

    return {
      equipment: results,
      total,
      page,
      pageSize: limit,
      hasMore,
    };
  }

  async create(
    tenantId: string,
    locationId: string,
    data: CreateEquipmentInput,
    createdBy: string
  ): Promise<RentalEquipment> {
    // Validate serial number doesn't exist
    if (await this.serialNumberExists(data.serialNumber, tenantId)) {
      throw new Error(`A sorozatszám már létezik: ${data.serialNumber}`);
    }

    // Validate rates are positive
    if (data.dailyRate < 0 || data.weeklyRate < 0 || data.monthlyRate < 0) {
      throw new Error('A bérlési díjak nem lehetnek negatívak');
    }

    if (data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    const now = new Date();
    const id = crypto.randomUUID();

    // Generate inventory code if not provided
    const inventoryCode = data.inventoryCode ?? (await this.generateNextInventoryCode(tenantId));

    // Validate inventory code doesn't exist
    if (await this.inventoryCodeExists(inventoryCode, tenantId)) {
      throw new Error(`A leltári kód már létezik: ${inventoryCode}`);
    }

    const equipment: RentalEquipment = {
      id,
      tenantId,
      locationId,
      serialNumber: data.serialNumber,
      inventoryCode,
      qrCode: this.generateQrCode(tenantId, id),
      name: data.name,
      category: data.category,
      status: EquipmentStatus.AVAILABLE,
      condition: EquipmentCondition.GOOD,
      dailyRate: data.dailyRate,
      weeklyRate: data.weeklyRate,
      monthlyRate: data.monthlyRate,
      depositAmount: data.depositAmount,
      totalRentals: 0,
      totalRevenue: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Assign optional properties only when defined
    if (data.productId !== undefined) equipment.productId = data.productId;
    if (data.description !== undefined) equipment.description = data.description;
    if (data.brand !== undefined) equipment.brand = data.brand;
    if (data.model !== undefined) equipment.model = data.model;
    if (data.purchaseDate !== undefined) equipment.purchaseDate = data.purchaseDate;
    if (data.purchasePrice !== undefined) equipment.purchasePrice = data.purchasePrice;
    if (data.warrantyExpiry !== undefined) equipment.warrantyExpiry = data.warrantyExpiry;
    if (data.maintenanceIntervalDays !== undefined)
      equipment.maintenanceIntervalDays = data.maintenanceIntervalDays;
    if (data.notes !== undefined) equipment.notes = data.notes;

    this.equipment.set(id, equipment);
    this.accessories.set(id, []);
    this.history.set(id, []);
    this.maintenance.set(id, []);

    // Add creation history entry
    await this.addHistoryEntry({
      equipmentId: id,
      eventType: EquipmentEventType.CREATED,
      newStatus: EquipmentStatus.AVAILABLE,
      performedBy: createdBy,
      description: `Bérgép létrehozva: ${data.name} (${data.serialNumber})`,
    });

    return equipment;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateEquipmentInput,
    updatedBy: string
  ): Promise<RentalEquipment> {
    const equipment = await this.findById(id, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // Validate rates if provided
    if (data.dailyRate !== undefined && data.dailyRate < 0) {
      throw new Error('A napi bérlési díj nem lehet negatív');
    }
    if (data.weeklyRate !== undefined && data.weeklyRate < 0) {
      throw new Error('A heti bérlési díj nem lehet negatív');
    }
    if (data.monthlyRate !== undefined && data.monthlyRate < 0) {
      throw new Error('A havi bérlési díj nem lehet negatív');
    }
    if (data.depositAmount !== undefined && data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    const previousCondition = equipment.condition;
    const updated: RentalEquipment = {
      ...equipment,
      ...data,
      updatedAt: new Date(),
    };

    this.equipment.set(id, updated);

    // Log condition change
    if (data.condition && data.condition !== previousCondition) {
      await this.addHistoryEntry({
        equipmentId: id,
        eventType: EquipmentEventType.CONDITION_UPDATED,
        performedBy: updatedBy,
        description: `Állapot változás: ${previousCondition} → ${data.condition}`,
      });
    }

    return updated;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const equipment = await this.findById(id, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    // Soft delete - just mark as inactive
    const updated: RentalEquipment = {
      ...equipment,
      isActive: false,
      updatedAt: new Date(),
    };

    this.equipment.set(id, updated);
  }

  // ============================================
  // STATUS MANAGEMENT
  // ============================================

  async changeStatus(
    id: string,
    tenantId: string,
    newStatus: EquipmentStatus,
    changedBy: string,
    reason?: string,
    relatedId?: string
  ): Promise<RentalEquipment> {
    const equipment = await this.findById(id, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const previousStatus = equipment.status;

    // Validate state transition
    this.validateStatusTransition(previousStatus, newStatus);

    const updated: RentalEquipment = {
      ...equipment,
      status: newStatus,
      updatedAt: new Date(),
    };

    // Update rental counts if rented out
    if (newStatus === EquipmentStatus.RENTED && previousStatus === EquipmentStatus.AVAILABLE) {
      updated.totalRentals = equipment.totalRentals + 1;
    }

    this.equipment.set(id, updated);

    // Determine event type
    let eventType = EquipmentEventType.STATUS_CHANGED;
    if (newStatus === EquipmentStatus.RENTED) {
      eventType = EquipmentEventType.RENTED_OUT;
    } else if (
      previousStatus === EquipmentStatus.RENTED &&
      newStatus === EquipmentStatus.AVAILABLE
    ) {
      eventType = EquipmentEventType.RETURNED;
    } else if (newStatus === EquipmentStatus.IN_SERVICE) {
      eventType = EquipmentEventType.SENT_TO_SERVICE;
    } else if (previousStatus === EquipmentStatus.IN_SERVICE) {
      eventType = EquipmentEventType.RETURNED_FROM_SERVICE;
    } else if (newStatus === EquipmentStatus.DECOMMISSIONED) {
      eventType = EquipmentEventType.DECOMMISSIONED;
    }

    const historyEntry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'> = {
      equipmentId: id,
      eventType,
      previousStatus,
      newStatus,
      performedBy: changedBy,
      description: `Státusz változás: ${previousStatus} → ${newStatus}${reason ? ` (${reason})` : ''}`,
    };

    // Add optional fields only when defined
    if (newStatus === EquipmentStatus.RENTED || previousStatus === EquipmentStatus.RENTED) {
      if (relatedId !== undefined) historyEntry.rentalId = relatedId;
    }
    if (newStatus === EquipmentStatus.IN_SERVICE || previousStatus === EquipmentStatus.IN_SERVICE) {
      if (relatedId !== undefined) historyEntry.serviceId = relatedId;
    }
    if (reason !== undefined) historyEntry.notes = reason;

    await this.addHistoryEntry(historyEntry);

    return updated;
  }

  private validateStatusTransition(from: EquipmentStatus, to: EquipmentStatus): void {
    const validTransitions: Record<EquipmentStatus, EquipmentStatus[]> = {
      [EquipmentStatus.AVAILABLE]: [
        EquipmentStatus.RENTED,
        EquipmentStatus.RESERVED,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.RENTED]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
      ],
      [EquipmentStatus.RESERVED]: [EquipmentStatus.AVAILABLE, EquipmentStatus.RENTED],
      [EquipmentStatus.IN_SERVICE]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.MAINTENANCE_REQUIRED,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.MAINTENANCE_REQUIRED]: [
        EquipmentStatus.AVAILABLE,
        EquipmentStatus.IN_SERVICE,
        EquipmentStatus.DECOMMISSIONED,
      ],
      [EquipmentStatus.DECOMMISSIONED]: [], // Final state, can only be reactivated via special process
    };

    if (from === to) {
      return; // No change
    }

    const allowed = validTransitions[from];
    if (!allowed?.includes(to)) {
      throw new Error(`Érvénytelen státusz átmenet: ${from} → ${to}`);
    }
  }

  // ============================================
  // ACCESSORY MANAGEMENT
  // ============================================

  async getAccessories(equipmentId: string, tenantId: string): Promise<EquipmentAccessory[]> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }
    return this.accessories.get(equipmentId) ?? [];
  }

  async addAccessory(
    equipmentId: string,
    tenantId: string,
    accessory: Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>
  ): Promise<EquipmentAccessory> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const newAccessory: EquipmentAccessory = {
      ...accessory,
      id,
      equipmentId,
      createdAt: now,
      updatedAt: now,
    };

    const accessories = this.accessories.get(equipmentId) ?? [];
    accessories.push(newAccessory);
    this.accessories.set(equipmentId, accessories);

    await this.addHistoryEntry({
      equipmentId,
      eventType: EquipmentEventType.ACCESSORY_ADDED,
      performedBy: 'system',
      description: `Tartozék hozzáadva: ${accessory.name} (${accessory.quantity} db)`,
    });

    return newAccessory;
  }

  async updateAccessory(
    accessoryId: string,
    equipmentId: string,
    tenantId: string,
    data: Partial<Omit<EquipmentAccessory, 'id' | 'equipmentId' | 'createdAt' | 'updatedAt'>>
  ): Promise<EquipmentAccessory> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const accessories = this.accessories.get(equipmentId) ?? [];
    const index = accessories.findIndex(a => a.id === accessoryId);

    if (index === -1) {
      throw new Error('Tartozék nem található');
    }

    const updated: EquipmentAccessory = {
      ...accessories[index]!,
      ...data,
      updatedAt: new Date(),
    };

    accessories[index] = updated;
    this.accessories.set(equipmentId, accessories);

    return updated;
  }

  async removeAccessory(accessoryId: string, equipmentId: string, tenantId: string): Promise<void> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const accessories = this.accessories.get(equipmentId) ?? [];
    const accessory = accessories.find(a => a.id === accessoryId);

    if (!accessory) {
      throw new Error('Tartozék nem található');
    }

    const filtered = accessories.filter(a => a.id !== accessoryId);
    this.accessories.set(equipmentId, filtered);

    await this.addHistoryEntry({
      equipmentId,
      eventType: EquipmentEventType.ACCESSORY_REMOVED,
      performedBy: 'system',
      description: `Tartozék eltávolítva: ${accessory.name}`,
    });
  }

  // ============================================
  // HISTORY
  // ============================================

  async getHistory(
    equipmentId: string,
    tenantId: string,
    limit?: number
  ): Promise<EquipmentHistoryEntry[]> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const history = (this.history.get(equipmentId) ?? []).sort(
      (a, b) => b.performedAt.getTime() - a.performedAt.getTime()
    );

    return limit ? history.slice(0, limit) : history;
  }

  async addHistoryEntry(
    entry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'>
  ): Promise<EquipmentHistoryEntry> {
    // Verify equipment exists
    const equipment = this.equipment.get(entry.equipmentId);
    if (!equipment) {
      throw new Error('Bérgép nem található a history bejegyzéshez');
    }

    const id = crypto.randomUUID();
    const historyEntry: EquipmentHistoryEntry = {
      ...entry,
      id,
      performedAt: new Date(),
    };

    const equipmentHistory = this.history.get(entry.equipmentId) ?? [];
    equipmentHistory.push(historyEntry);
    this.history.set(entry.equipmentId, equipmentHistory);

    return historyEntry;
  }

  // ============================================
  // MAINTENANCE
  // ============================================

  async getMaintenanceRecords(params: MaintenanceQuery): Promise<MaintenanceRecord[]> {
    const equipment = this.equipment.get(params.equipmentId);
    if (!equipment || equipment.tenantId !== params.tenantId) {
      throw new Error('Bérgép nem található');
    }

    let records = this.maintenance.get(params.equipmentId) ?? [];

    if (params.fromDate) {
      records = records.filter(r => r.performedAt >= params.fromDate!);
    }

    if (params.toDate) {
      records = records.filter(r => r.performedAt <= params.toDate!);
    }

    records.sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime());

    if (params.limit) {
      records = records.slice(0, params.limit);
    }

    return records;
  }

  async addMaintenanceRecord(
    equipmentId: string,
    tenantId: string,
    record: Omit<MaintenanceRecord, 'id' | 'equipmentId' | 'createdAt'>
  ): Promise<MaintenanceRecord> {
    const equipment = await this.findById(equipmentId, tenantId);
    if (!equipment) {
      throw new Error('Bérgép nem található');
    }

    const id = crypto.randomUUID();
    const now = new Date();

    const maintenanceRecord: MaintenanceRecord = {
      ...record,
      id,
      equipmentId,
      createdAt: now,
    };

    const records = this.maintenance.get(equipmentId) ?? [];
    records.push(maintenanceRecord);
    this.maintenance.set(equipmentId, records);

    // Update equipment with maintenance info
    const updated: RentalEquipment = {
      ...equipment,
      lastMaintenanceDate: record.performedAt,
      updatedAt: now,
    };

    // Assign nextMaintenanceDate only when defined
    if (record.nextDueDate !== undefined) {
      updated.nextMaintenanceDate = record.nextDueDate;
    }

    // If equipment was in maintenance required status, set to available
    if (equipment.status === EquipmentStatus.MAINTENANCE_REQUIRED) {
      updated.status = EquipmentStatus.AVAILABLE;
    }

    this.equipment.set(equipmentId, updated);

    const maintenanceHistoryEntry: Omit<EquipmentHistoryEntry, 'id' | 'performedAt'> = {
      equipmentId,
      eventType: EquipmentEventType.MAINTENANCE_PERFORMED,
      performedBy: record.performedBy,
      description: `Karbantartás elvégezve: ${record.maintenanceType} - ${record.description}`,
    };

    if (record.notes !== undefined) {
      maintenanceHistoryEntry.notes = record.notes;
    }

    await this.addHistoryEntry(maintenanceHistoryEntry);

    return maintenanceRecord;
  }

  async getEquipmentNeedingMaintenance(
    tenantId: string,
    daysThreshold = 7
  ): Promise<RentalEquipment[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return Array.from(this.equipment.values()).filter(e => {
      if (e.tenantId !== tenantId || !e.isActive) return false;
      if (e.status === EquipmentStatus.MAINTENANCE_REQUIRED) return true;
      if (e.nextMaintenanceDate && e.nextMaintenanceDate <= thresholdDate) return true;
      return false;
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStatistics(tenantId: string, locationId?: string): Promise<EquipmentStatistics> {
    let equipment = Array.from(this.equipment.values()).filter(
      e => e.tenantId === tenantId && e.isActive
    );

    if (locationId) {
      equipment = equipment.filter(e => e.locationId === locationId);
    }

    const byStatus: Record<EquipmentStatus, number> = {
      [EquipmentStatus.AVAILABLE]: 0,
      [EquipmentStatus.RENTED]: 0,
      [EquipmentStatus.IN_SERVICE]: 0,
      [EquipmentStatus.RESERVED]: 0,
      [EquipmentStatus.DECOMMISSIONED]: 0,
      [EquipmentStatus.MAINTENANCE_REQUIRED]: 0,
    };

    const byCategory: Record<string, number> = {};
    const byCondition: Record<EquipmentCondition, number> = {
      [EquipmentCondition.EXCELLENT]: 0,
      [EquipmentCondition.GOOD]: 0,
      [EquipmentCondition.FAIR]: 0,
      [EquipmentCondition.POOR]: 0,
      [EquipmentCondition.NEEDS_REPAIR]: 0,
    };

    let totalRevenue = 0;
    let maintenanceDueCount = 0;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const e of equipment) {
      byStatus[e.status]++;
      byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
      byCondition[e.condition]++;
      totalRevenue += e.totalRevenue;

      if (
        e.status === EquipmentStatus.MAINTENANCE_REQUIRED ||
        (e.nextMaintenanceDate && e.nextMaintenanceDate <= thirtyDaysFromNow)
      ) {
        maintenanceDueCount++;
      }
    }

    const totalEquipment = equipment.length;
    const averageUtilization =
      totalEquipment > 0 ? (byStatus[EquipmentStatus.RENTED] / totalEquipment) * 100 : 0;

    return {
      totalEquipment,
      byStatus,
      byCategory: byCategory as Record<string, number>,
      byCondition,
      availableCount: byStatus[EquipmentStatus.AVAILABLE],
      rentedCount: byStatus[EquipmentStatus.RENTED],
      inServiceCount: byStatus[EquipmentStatus.IN_SERVICE],
      maintenanceDueCount,
      totalRevenue,
      averageUtilization,
    };
  }

  async getAvailableEquipment(tenantId: string, locationId?: string): Promise<RentalEquipment[]> {
    return Array.from(this.equipment.values()).filter(e => {
      if (e.tenantId !== tenantId) return false;
      if (!e.isActive) return false;
      if (e.status !== EquipmentStatus.AVAILABLE) return false;
      if (locationId && e.locationId !== locationId) return false;
      return true;
    });
  }

  // ============================================
  // CODE GENERATION
  // ============================================

  async generateNextInventoryCode(tenantId: string, prefix = 'EQ'): Promise<string> {
    const key = `${tenantId}:${prefix}`;
    const current = this.inventoryCodeSequence.get(key) ?? 0;
    const next = current + 1;
    this.inventoryCodeSequence.set(key, next);
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  generateQrCode(tenantId: string, equipmentId: string): string {
    return `KGC:EQ:${tenantId}:${equipmentId}`;
  }

  // ============================================
  // UTILITIES
  // ============================================

  async serialNumberExists(serialNumber: string, tenantId: string): Promise<boolean> {
    for (const equipment of this.equipment.values()) {
      if (equipment.tenantId === tenantId && equipment.serialNumber === serialNumber) {
        return true;
      }
    }
    return false;
  }

  async inventoryCodeExists(inventoryCode: string, tenantId: string): Promise<boolean> {
    for (const equipment of this.equipment.values()) {
      if (equipment.tenantId === tenantId && equipment.inventoryCode === inventoryCode) {
        return true;
      }
    }
    return false;
  }
}
