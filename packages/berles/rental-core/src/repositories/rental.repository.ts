/**
 * @kgc/rental-core - Rental Repository
 * Epic 14: Bérlés kiadás, visszavétel, díjkalkuláció
 *
 * Repository interface and InMemory implementation for Rental entity.
 */

import { Injectable } from '@nestjs/common';
import type {
  AppliedDiscount,
  LateFeeDetails,
  Rental,
  RentalExtension,
  RentalHistoryEntry,
  RentalPricing,
  RentalStatistics,
} from '../interfaces/rental.interface';
import { DepositStatus, RentalEventType, RentalStatus } from '../interfaces/rental.interface';

// ============================================
// REPOSITORY TOKEN
// ============================================

export const RENTAL_REPOSITORY = Symbol('RENTAL_REPOSITORY');

// ============================================
// QUERY INTERFACE
// ============================================

export interface RentalQuery {
  tenantId: string;
  locationId?: string;
  status?: RentalStatus;
  customerId?: string;
  equipmentId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  overdueOnly?: boolean;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface RentalQueryResult {
  rentals: Rental[];
  total: number;
  offset: number;
  limit: number;
}

// ============================================
// CREATE INPUT
// ============================================

export interface CreateRentalInput {
  rentalNumber: string;
  customerId: string;
  customerName: string;
  equipmentId: string;
  equipmentName: string;
  locationId: string;
  startDate: Date;
  expectedReturnDate: Date;
  pricing: RentalPricing;
  depositAmount: number;
  notes?: string;
}

// ============================================
// UPDATE INPUT
// ============================================

export interface UpdateRentalInput {
  status?: RentalStatus;
  expectedReturnDate?: Date;
  actualReturnDate?: Date;
  pricing?: RentalPricing;
  discounts?: AppliedDiscount[];
  lateFee?: LateFeeDetails;
  depositStatus?: DepositStatus;
  pickupChecklistVerified?: boolean;
  returnChecklistVerified?: boolean;
  pickedUpBy?: string;
  returnedBy?: string;
  notes?: string;
  extensionCount?: number;
}

// ============================================
// REPOSITORY INTERFACE
// ============================================

export interface IRentalRepository {
  /**
   * Query rentals with filters and pagination
   */
  query(params: RentalQuery): Promise<RentalQueryResult>;

  /**
   * Find rental by ID
   */
  findById(id: string, tenantId: string): Promise<Rental | null>;

  /**
   * Find rental by rental number
   */
  findByNumber(rentalNumber: string, tenantId: string): Promise<Rental | null>;

  /**
   * Create new rental
   */
  create(tenantId: string, data: CreateRentalInput, createdBy: string): Promise<Rental>;

  /**
   * Update rental
   */
  update(id: string, tenantId: string, data: UpdateRentalInput, updatedBy: string): Promise<Rental>;

  /**
   * Get active rentals for customer
   */
  getActiveRentalsForCustomer(customerId: string, tenantId: string): Promise<Rental[]>;

  /**
   * Get active rentals for equipment
   */
  getActiveRentalsForEquipment(equipmentId: string, tenantId: string): Promise<Rental[]>;

  /**
   * Get overdue rentals
   */
  getOverdueRentals(tenantId: string, locationId?: string): Promise<Rental[]>;

  /**
   * Get rentals due today
   */
  getRentalsDueToday(tenantId: string, locationId?: string): Promise<Rental[]>;

  /**
   * Get rental statistics
   */
  getStatistics(tenantId: string, locationId?: string): Promise<RentalStatistics>;

  /**
   * Count rentals by status
   */
  countByStatus(tenantId: string): Promise<Record<RentalStatus, number>>;

  /**
   * Generate next rental number
   */
  generateNextNumber(tenantId: string, prefix?: string): Promise<string>;

  /**
   * Check if rental number exists
   */
  rentalNumberExists(rentalNumber: string, tenantId: string): Promise<boolean>;

  /**
   * Add extension to rental
   */
  addExtension(
    rentalId: string,
    tenantId: string,
    extension: Omit<RentalExtension, 'id' | 'rentalId' | 'createdAt'>
  ): Promise<RentalExtension>;

  /**
   * Get extensions for rental
   */
  getExtensions(rentalId: string, tenantId: string): Promise<RentalExtension[]>;

  /**
   * Add history entry
   */
  addHistoryEntry(
    entry: Omit<RentalHistoryEntry, 'id' | 'performedAt'>
  ): Promise<RentalHistoryEntry>;

  /**
   * Get rental history
   */
  getHistory(rentalId: string, tenantId: string): Promise<RentalHistoryEntry[]>;

  /**
   * Clear all data (for testing)
   */
  clear(): void;
}

// ============================================
// IN-MEMORY IMPLEMENTATION
// ============================================

@Injectable()
export class InMemoryRentalRepository implements IRentalRepository {
  private rentals: Map<string, Rental> = new Map();
  private extensions: Map<string, RentalExtension[]> = new Map();
  private history: Map<string, RentalHistoryEntry[]> = new Map();
  private numberSequence: Map<string, number> = new Map();

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.rentals.clear();
    this.extensions.clear();
    this.history.clear();
    this.numberSequence.clear();
  }

  async query(params: RentalQuery): Promise<RentalQueryResult> {
    let results = Array.from(this.rentals.values()).filter(r => r.tenantId === params.tenantId);

    // Apply filters
    if (params.locationId) {
      results = results.filter(r => r.locationId === params.locationId);
    }
    if (params.status) {
      results = results.filter(r => r.status === params.status);
    }
    if (params.customerId) {
      results = results.filter(r => r.customerId === params.customerId);
    }
    if (params.equipmentId) {
      results = results.filter(r => r.equipmentId === params.equipmentId);
    }
    if (params.startDateFrom) {
      results = results.filter(r => r.startDate >= params.startDateFrom!);
    }
    if (params.startDateTo) {
      results = results.filter(r => r.startDate <= params.startDateTo!);
    }
    if (params.overdueOnly) {
      const now = new Date();
      results = results.filter(r => r.status === 'ACTIVE' && r.expectedReturnDate < now);
    }
    if (params.search) {
      const term = params.search.toLowerCase();
      results = results.filter(
        r =>
          r.rentalNumber.toLowerCase().includes(term) ||
          r.customerName.toLowerCase().includes(term) ||
          r.equipmentName.toLowerCase().includes(term)
      );
    }

    // Sort by created date descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const offset = params.offset ?? 0;
    const limit = params.limit ?? 20;
    results = results.slice(offset, offset + limit);

    return { rentals: results, total, offset, limit };
  }

  async findById(id: string, tenantId: string): Promise<Rental | null> {
    const rental = this.rentals.get(id);
    if (!rental || rental.tenantId !== tenantId) return null;
    return rental;
  }

  async findByNumber(rentalNumber: string, tenantId: string): Promise<Rental | null> {
    return (
      Array.from(this.rentals.values()).find(
        r => r.rentalNumber === rentalNumber && r.tenantId === tenantId
      ) ?? null
    );
  }

  async create(tenantId: string, data: CreateRentalInput, createdBy: string): Promise<Rental> {
    // Validate rental number doesn't exist
    if (await this.rentalNumberExists(data.rentalNumber, tenantId)) {
      throw new Error(`A bérlési szám már létezik: ${data.rentalNumber}`);
    }

    // Validate deposit amount is not negative
    if (data.depositAmount < 0) {
      throw new Error('A kaució összege nem lehet negatív');
    }

    // Check if equipment already has active rental
    const activeRentals = await this.getActiveRentalsForEquipment(data.equipmentId, tenantId);
    if (activeRentals.length > 0) {
      throw new Error(`A bérgép már ki van bérelve: ${data.equipmentName}`);
    }

    const now = new Date();
    const id = crypto.randomUUID();

    const rental: Rental = {
      id,
      tenantId,
      locationId: data.locationId,
      rentalNumber: data.rentalNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      equipmentId: data.equipmentId,
      equipmentName: data.equipmentName,
      status: RentalStatus.DRAFT,
      startDate: data.startDate,
      expectedReturnDate: data.expectedReturnDate,
      originalReturnDate: data.expectedReturnDate,
      extensionCount: 0,
      pricing: data.pricing,
      discounts: [],
      depositAmount: data.depositAmount,
      depositStatus: DepositStatus.PENDING,
      pickupChecklistVerified: false,
      returnChecklistVerified: false,
      notes: data.notes,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };

    this.rentals.set(id, rental);
    this.extensions.set(id, []);
    this.history.set(id, []);

    // Add creation history entry
    await this.addHistoryEntry({
      rentalId: id,
      eventType: RentalEventType.CREATED,
      newStatus: RentalStatus.DRAFT,
      performedBy: createdBy,
      description: `Bérlés létrehozva: ${data.equipmentName} - ${data.customerName}`,
    });

    return rental;
  }

  async update(
    id: string,
    tenantId: string,
    data: UpdateRentalInput,
    updatedBy: string
  ): Promise<Rental> {
    const rental = await this.findById(id, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const previousStatus = rental.status;
    const updated: Rental = {
      ...rental,
      ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
      updatedAt: new Date(),
    };

    this.rentals.set(id, updated);

    // Add status change history if status changed
    if (data.status && data.status !== previousStatus) {
      await this.addHistoryEntry({
        rentalId: id,
        eventType: RentalEventType.STATUS_CHANGED,
        previousStatus,
        newStatus: data.status,
        performedBy: updatedBy,
        description: `Státusz változás: ${previousStatus} → ${data.status}`,
      });
    }

    return updated;
  }

  async getActiveRentalsForCustomer(customerId: string, tenantId: string): Promise<Rental[]> {
    return Array.from(this.rentals.values()).filter(
      r =>
        r.tenantId === tenantId &&
        r.customerId === customerId &&
        (r.status === 'ACTIVE' || r.status === 'EXTENDED' || r.status === 'OVERDUE')
    );
  }

  async getActiveRentalsForEquipment(equipmentId: string, tenantId: string): Promise<Rental[]> {
    return Array.from(this.rentals.values()).filter(
      r =>
        r.tenantId === tenantId &&
        r.equipmentId === equipmentId &&
        (r.status === 'ACTIVE' ||
          r.status === 'EXTENDED' ||
          r.status === 'OVERDUE' ||
          r.status === 'DRAFT')
    );
  }

  async getOverdueRentals(tenantId: string, locationId?: string): Promise<Rental[]> {
    const now = new Date();
    return Array.from(this.rentals.values()).filter(r => {
      if (r.tenantId !== tenantId) return false;
      if (locationId && r.locationId !== locationId) return false;
      if (r.status !== 'ACTIVE' && r.status !== 'EXTENDED') return false;
      return r.expectedReturnDate < now;
    });
  }

  async getRentalsDueToday(tenantId: string, locationId?: string): Promise<Rental[]> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return Array.from(this.rentals.values()).filter(r => {
      if (r.tenantId !== tenantId) return false;
      if (locationId && r.locationId !== locationId) return false;
      if (r.status !== 'ACTIVE' && r.status !== 'EXTENDED') return false;
      return r.expectedReturnDate >= todayStart && r.expectedReturnDate < todayEnd;
    });
  }

  async getStatistics(tenantId: string, locationId?: string): Promise<RentalStatistics> {
    const rentals = Array.from(this.rentals.values()).filter(r => {
      if (r.tenantId !== tenantId) return false;
      if (locationId && r.locationId !== locationId) return false;
      return true;
    });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const activeRentals = rentals.filter(r => r.status === 'ACTIVE' || r.status === 'EXTENDED');
    const overdueRentals = activeRentals.filter(r => r.expectedReturnDate < now);
    const returnedToday = rentals.filter(
      r =>
        r.status === 'RETURNED' &&
        r.actualReturnDate &&
        r.actualReturnDate >= todayStart &&
        r.actualReturnDate < todayEnd
    );
    const dueToday = activeRentals.filter(
      r => r.expectedReturnDate >= todayStart && r.expectedReturnDate < todayEnd
    );

    const returnedRentals = rentals.filter(r => r.status === 'RETURNED');
    const totalRevenue = returnedRentals.reduce((sum, r) => sum + r.pricing.grandTotal, 0);
    const totalDays = returnedRentals.reduce((sum, r) => sum + r.pricing.durationDays, 0);

    // Equipment popularity
    const equipmentCounts = new Map<string, { name: string; count: number }>();
    for (const r of rentals) {
      const current = equipmentCounts.get(r.equipmentId);
      if (current) {
        current.count++;
      } else {
        equipmentCounts.set(r.equipmentId, { name: r.equipmentName, count: 1 });
      }
    }
    const topEquipment = Array.from(equipmentCounts.entries())
      .map(([equipmentId, data]) => ({
        equipmentId,
        equipmentName: data.name,
        rentalCount: data.count,
      }))
      .sort((a, b) => b.rentalCount - a.rentalCount)
      .slice(0, 5);

    // Status counts
    const byStatus: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      EXTENDED: 0,
      OVERDUE: 0,
      RETURNED: 0,
      CANCELLED: 0,
      DISPUTED: 0,
    };
    for (const r of rentals) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }

    return {
      totalRentals: rentals.length,
      activeRentals: activeRentals.length,
      overdueRentals: overdueRentals.length,
      returnedToday: returnedToday.length,
      dueTodayCount: dueToday.length,
      totalRevenue,
      averageRentalDays: returnedRentals.length > 0 ? totalDays / returnedRentals.length : 0,
      averageRentalValue: returnedRentals.length > 0 ? totalRevenue / returnedRentals.length : 0,
      topEquipment,
      byStatus: byStatus as Record<RentalStatus, number>,
    };
  }

  async countByStatus(tenantId: string): Promise<Record<RentalStatus, number>> {
    const counts: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      EXTENDED: 0,
      OVERDUE: 0,
      RETURNED: 0,
      CANCELLED: 0,
      DISPUTED: 0,
    };

    for (const rental of this.rentals.values()) {
      if (rental.tenantId === tenantId) {
        counts[rental.status] = (counts[rental.status] ?? 0) + 1;
      }
    }

    return counts as Record<RentalStatus, number>;
  }

  async generateNextNumber(tenantId: string, prefix = 'BER'): Promise<string> {
    const key = `${tenantId}:${prefix}`;
    const current = this.numberSequence.get(key) ?? 0;
    const next = current + 1;
    this.numberSequence.set(key, next);
    return `${prefix}${next.toString().padStart(6, '0')}`;
  }

  async rentalNumberExists(rentalNumber: string, tenantId: string): Promise<boolean> {
    return Array.from(this.rentals.values()).some(
      r => r.rentalNumber === rentalNumber && r.tenantId === tenantId
    );
  }

  async addExtension(
    rentalId: string,
    tenantId: string,
    extension: Omit<RentalExtension, 'id' | 'rentalId' | 'createdAt'>
  ): Promise<RentalExtension> {
    const rental = await this.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }

    const id = crypto.randomUUID();
    const newExtension: RentalExtension = {
      id,
      rentalId,
      ...extension,
      createdAt: new Date(),
    };

    const rentalExtensions = this.extensions.get(rentalId) ?? [];
    rentalExtensions.push(newExtension);
    this.extensions.set(rentalId, rentalExtensions);

    // Update rental
    await this.update(
      rentalId,
      tenantId,
      {
        expectedReturnDate: extension.newReturnDate,
        extensionCount: rental.extensionCount + 1,
      },
      extension.approvedBy ?? rental.createdBy
    );

    // Add history entry
    await this.addHistoryEntry({
      rentalId,
      eventType: RentalEventType.EXTENDED,
      previousValue: extension.previousReturnDate.toISOString(),
      newValue: extension.newReturnDate.toISOString(),
      performedBy: extension.approvedBy ?? rental.createdBy,
      description: `Bérlés hosszabbítva ${extension.additionalDays} nappal`,
      metadata: { additionalAmount: extension.additionalAmount },
    });

    return newExtension;
  }

  async getExtensions(rentalId: string, tenantId: string): Promise<RentalExtension[]> {
    // Validate rental exists and belongs to tenant
    const rental = await this.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }
    return this.extensions.get(rentalId) ?? [];
  }

  async addHistoryEntry(
    entry: Omit<RentalHistoryEntry, 'id' | 'performedAt'>
  ): Promise<RentalHistoryEntry> {
    // Verify rental exists before adding history
    const rental = this.rentals.get(entry.rentalId);
    if (!rental) {
      throw new Error('Bérlés nem található a history bejegyzéshez');
    }

    const id = crypto.randomUUID();
    const historyEntry: RentalHistoryEntry = {
      ...entry,
      id,
      performedAt: new Date(),
    };

    const rentalHistory = this.history.get(entry.rentalId) ?? [];
    rentalHistory.push(historyEntry);
    this.history.set(entry.rentalId, rentalHistory);

    return historyEntry;
  }

  async getHistory(rentalId: string, tenantId: string): Promise<RentalHistoryEntry[]> {
    // Validate rental exists and belongs to tenant
    const rental = await this.findById(rentalId, tenantId);
    if (!rental) {
      throw new Error('Bérlés nem található');
    }
    return (this.history.get(rentalId) ?? []).sort(
      (a, b) => b.performedAt.getTime() - a.performedAt.getTime()
    );
  }
}
