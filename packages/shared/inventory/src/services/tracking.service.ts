/**
 * @kgc/inventory - TrackingService
 * Story 9-5: Serial number és batch tracking
 * Egyedi azonosítás és batch nyomon követés
 */

import { Injectable, Inject } from '@nestjs/common';
import { TRACKING_REPOSITORY } from '../interfaces/tracking.interface';
import type {
  SerialNumber,
  Batch,
  SerialNumberStatus,
  SerialNumberQuery,
  SerialNumberQueryResult,
  BatchQuery,
  BatchQueryResult,
  ITrackingRepository,
} from '../interfaces/tracking.interface';
import {
  CreateSerialNumberSchema,
  CreateSerialNumberInput,
  UpdateSerialNumberSchema,
  UpdateSerialNumberInput,
  CreateBatchSchema,
  CreateBatchInput,
  UpdateBatchSchema,
  UpdateBatchInput,
} from '../dto/tracking.dto';

/**
 * Serial number és batch tracking szolgáltatás
 */
@Injectable()
export class TrackingService {
  constructor(
    @Inject(TRACKING_REPOSITORY)
    private readonly repository: ITrackingRepository,
  ) {}

  // ============================================
  // SERIAL NUMBER MANAGEMENT
  // ============================================

  /**
   * Serial number létrehozása
   */
  async createSerialNumber(
    tenantId: string,
    input: CreateSerialNumberInput,
  ): Promise<SerialNumber> {
    // Validálás
    const validationResult = CreateSerialNumberSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Duplikáció ellenőrzés
    const exists = await this.repository.serialNumberExists(
      validInput.serialNumber,
      tenantId,
    );
    if (exists) {
      throw new Error('A serial number már létezik');
    }

    const serialData: Omit<SerialNumber, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      serialNumber: validInput.serialNumber,
      productId: validInput.productId,
      status: validInput.status ?? 'AVAILABLE',
    };
    if (validInput.inventoryItemId !== undefined) serialData.inventoryItemId = validInput.inventoryItemId;
    if (validInput.warehouseId !== undefined) serialData.warehouseId = validInput.warehouseId;
    if (validInput.locationCode !== undefined) serialData.locationCode = validInput.locationCode;
    if (validInput.manufacturerSerialNumber !== undefined) serialData.manufacturerSerialNumber = validInput.manufacturerSerialNumber;
    if (validInput.manufacturingDate !== undefined) serialData.manufacturingDate = validInput.manufacturingDate;
    if (validInput.warrantyExpiryDate !== undefined) serialData.warrantyExpiryDate = validInput.warrantyExpiryDate;
    if (validInput.purchaseDate !== undefined) serialData.purchaseDate = validInput.purchaseDate;
    if (validInput.purchasePrice !== undefined) serialData.purchasePrice = validInput.purchasePrice;
    if (validInput.currentValue !== undefined) serialData.currentValue = validInput.currentValue;
    if (validInput.note !== undefined) serialData.note = validInput.note;

    return this.repository.createSerialNumber(serialData);
  }

  /**
   * Serial number keresése ID alapján
   */
  async findSerialNumberById(
    id: string,
    tenantId: string,
  ): Promise<SerialNumber | null> {
    return this.repository.findSerialNumberById(id, tenantId);
  }

  /**
   * Serial number keresése érték alapján
   */
  async findSerialNumberByValue(
    serialNumber: string,
    tenantId: string,
  ): Promise<SerialNumber | null> {
    return this.repository.findSerialNumberByValue(serialNumber, tenantId);
  }

  /**
   * Serial number frissítése
   */
  async updateSerialNumber(
    id: string,
    tenantId: string,
    input: UpdateSerialNumberInput,
  ): Promise<SerialNumber> {
    // Validálás
    const validationResult = UpdateSerialNumberSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    // Létezés ellenőrzés
    const existing = await this.repository.findSerialNumberById(id, tenantId);
    if (!existing) {
      throw new Error('Serial number nem található');
    }

    const updateData: Partial<Omit<SerialNumber, 'id' | 'createdAt' | 'tenantId' | 'serialNumber'>> = {
      updatedAt: new Date(),
    };
    const data = validationResult.data;
    if (data.inventoryItemId !== undefined && data.inventoryItemId !== null) updateData.inventoryItemId = data.inventoryItemId;
    if (data.warehouseId !== undefined && data.warehouseId !== null) updateData.warehouseId = data.warehouseId;
    if (data.locationCode !== undefined && data.locationCode !== null) updateData.locationCode = data.locationCode;

    // Státusz átmenet validálás
    if (data.status !== undefined && data.status !== existing.status) {
      if (!this.isValidSerialNumberTransition(existing.status, data.status)) {
        throw new Error(
          `Érvénytelen státusz átmenet: ${existing.status} -> ${data.status}`,
        );
      }
      updateData.status = data.status;
    }
    if (data.manufacturerSerialNumber !== undefined && data.manufacturerSerialNumber !== null) updateData.manufacturerSerialNumber = data.manufacturerSerialNumber;
    if (data.manufacturingDate !== undefined && data.manufacturingDate !== null) updateData.manufacturingDate = data.manufacturingDate;
    if (data.warrantyExpiryDate !== undefined && data.warrantyExpiryDate !== null) updateData.warrantyExpiryDate = data.warrantyExpiryDate;
    if (data.purchaseDate !== undefined && data.purchaseDate !== null) updateData.purchaseDate = data.purchaseDate;
    if (data.purchasePrice !== undefined && data.purchasePrice !== null) updateData.purchasePrice = data.purchasePrice;
    if (data.currentValue !== undefined && data.currentValue !== null) updateData.currentValue = data.currentValue;
    if (data.note !== undefined && data.note !== null) updateData.note = data.note;

    return this.repository.updateSerialNumber(id, tenantId, updateData);
  }

  /**
   * Serial numberek lekérdezése
   */
  async querySerialNumbers(
    query: SerialNumberQuery,
  ): Promise<SerialNumberQueryResult> {
    return this.repository.querySerialNumbers(query);
  }

  /**
   * Hamarosan lejáró garanciák lekérdezése
   */
  async getExpiringWarranties(
    tenantId: string,
    beforeDate: Date,
    limit?: number,
  ): Promise<SerialNumber[]> {
    return this.repository.getExpiringWarranties(tenantId, beforeDate, limit);
  }

  /**
   * Serial number státusz átmenet validálás
   * Meghatározza mely átmenetek megengedettek
   */
  isValidSerialNumberTransition(
    from: SerialNumberStatus,
    to: SerialNumberStatus,
  ): boolean {
    // Végleges státuszok - nincs visszaút
    const finalStatuses: SerialNumberStatus[] = ['SOLD', 'LOST', 'SCRAPPED'];
    if (finalStatuses.includes(from)) {
      return false;
    }

    // Megengedett átmenetek mátrix
    const allowedTransitions: Record<SerialNumberStatus, SerialNumberStatus[]> = {
      AVAILABLE: ['RESERVED', 'RENTED', 'IN_SERVICE', 'SOLD', 'DAMAGED', 'LOST', 'SCRAPPED'],
      RESERVED: ['AVAILABLE', 'RENTED', 'IN_SERVICE'],
      RENTED: ['AVAILABLE', 'IN_SERVICE', 'DAMAGED', 'LOST'],
      IN_SERVICE: ['AVAILABLE', 'RENTED', 'DAMAGED', 'SCRAPPED'],
      SOLD: [], // Nincs visszaút
      DAMAGED: ['AVAILABLE', 'IN_SERVICE', 'SCRAPPED'],
      LOST: [], // Nincs visszaút
      SCRAPPED: [], // Nincs visszaút
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }

  // ============================================
  // BATCH MANAGEMENT
  // ============================================

  /**
   * Batch létrehozása
   */
  async createBatch(tenantId: string, input: CreateBatchInput): Promise<Batch> {
    // Validálás
    const validationResult = CreateBatchSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Duplikáció ellenőrzés
    const exists = await this.repository.batchExists(
      validInput.batchNumber,
      tenantId,
    );
    if (exists) {
      throw new Error('A batch number már létezik');
    }

    // Aktuális mennyiség alapértelmezetten = eredeti mennyiség
    const currentQuantity = validInput.currentQuantity ?? validInput.originalQuantity;

    const batchData: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      batchNumber: validInput.batchNumber,
      productId: validInput.productId,
      status: validInput.status ?? 'ACTIVE',
      originalQuantity: validInput.originalQuantity,
      currentQuantity,
      unit: validInput.unit,
    };
    if (validInput.warehouseId !== undefined) batchData.warehouseId = validInput.warehouseId;
    if (validInput.manufacturingDate !== undefined) batchData.manufacturingDate = validInput.manufacturingDate;
    if (validInput.expiryDate !== undefined) batchData.expiryDate = validInput.expiryDate;
    if (validInput.supplierBatchNumber !== undefined) batchData.supplierBatchNumber = validInput.supplierBatchNumber;
    if (validInput.supplierId !== undefined) batchData.supplierId = validInput.supplierId;
    if (validInput.receivedDate !== undefined) batchData.receivedDate = validInput.receivedDate;
    if (validInput.unitCost !== undefined) batchData.unitCost = validInput.unitCost;
    if (validInput.note !== undefined) batchData.note = validInput.note;

    return this.repository.createBatch(batchData);
  }

  /**
   * Batch keresése ID alapján
   */
  async findBatchById(id: string, tenantId: string): Promise<Batch | null> {
    return this.repository.findBatchById(id, tenantId);
  }

  /**
   * Batch keresése number alapján
   */
  async findBatchByNumber(
    batchNumber: string,
    tenantId: string,
  ): Promise<Batch | null> {
    return this.repository.findBatchByNumber(batchNumber, tenantId);
  }

  /**
   * Batch frissítése
   */
  async updateBatch(
    id: string,
    tenantId: string,
    input: UpdateBatchInput,
  ): Promise<Batch> {
    const validationResult = UpdateBatchSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const existing = await this.repository.findBatchById(id, tenantId);
    if (!existing) {
      throw new Error('Batch nem található');
    }

    const updateData: Partial<Omit<Batch, 'id' | 'createdAt' | 'tenantId' | 'batchNumber'>> = {
      updatedAt: new Date(),
    };
    const data = validationResult.data;
    if (data.warehouseId !== undefined && data.warehouseId !== null) updateData.warehouseId = data.warehouseId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.manufacturingDate !== undefined && data.manufacturingDate !== null) updateData.manufacturingDate = data.manufacturingDate;
    if (data.expiryDate !== undefined && data.expiryDate !== null) updateData.expiryDate = data.expiryDate;
    if (data.supplierBatchNumber !== undefined && data.supplierBatchNumber !== null) updateData.supplierBatchNumber = data.supplierBatchNumber;
    if (data.supplierId !== undefined && data.supplierId !== null) updateData.supplierId = data.supplierId;
    if (data.receivedDate !== undefined && data.receivedDate !== null) updateData.receivedDate = data.receivedDate;
    if (data.unitCost !== undefined && data.unitCost !== null) updateData.unitCost = data.unitCost;
    if (data.note !== undefined && data.note !== null) updateData.note = data.note;

    return this.repository.updateBatch(id, tenantId, updateData);
  }

  /**
   * Batch mennyiség módosítása
   */
  async adjustBatchQuantity(
    id: string,
    tenantId: string,
    quantityChange: number,
  ): Promise<Batch> {
    const existing = await this.repository.findBatchById(id, tenantId);
    if (!existing) {
      throw new Error('Batch nem található');
    }

    // Ellenőrizzük hogy nem megy negatívba
    const newQuantity = existing.currentQuantity + quantityChange;
    if (newQuantity < 0) {
      throw new Error('A csökkentés túl nagy');
    }

    return this.repository.adjustBatchQuantity(id, tenantId, quantityChange);
  }

  /**
   * Batch-ek lekérdezése
   */
  async queryBatches(query: BatchQuery): Promise<BatchQueryResult> {
    return this.repository.queryBatches(query);
  }

  /**
   * Hamarosan lejáró batch-ek lekérdezése
   */
  async getExpiringBatches(
    tenantId: string,
    beforeDate: Date,
    limit?: number,
  ): Promise<Batch[]> {
    return this.repository.getExpiringBatches(tenantId, beforeDate, limit);
  }

  /**
   * Alacsony készletű batch-ek lekérdezése
   */
  async getLowStockBatches(
    tenantId: string,
    minQuantityThreshold: number,
    limit?: number,
  ): Promise<Batch[]> {
    return this.repository.getLowStockBatches(
      tenantId,
      minQuantityThreshold,
      limit,
    );
  }

  /**
   * Batch lejárt-e
   */
  isBatchExpired(batch: Batch): boolean {
    if (!batch.expiryDate) {
      return false;
    }
    return new Date() > batch.expiryDate;
  }

  /**
   * Batch hátralévő napok számítása
   */
  getBatchRemainingDays(batch: Batch): number | null {
    if (!batch.expiryDate) {
      return null;
    }

    const now = new Date();
    const expiryTime = batch.expiryDate.getTime();
    const nowTime = now.getTime();
    const diffMs = expiryTime - nowTime;

    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /**
   * Serial number formátum validálása
   */
  isValidSerialNumberFormat(serialNumber: string): boolean {
    if (!serialNumber || serialNumber.length === 0) {
      return false;
    }
    // Betűk, számok, kötőjel, aláhúzás, pont, perjel
    const pattern = /^[A-Za-z0-9_\-./]+$/;
    return pattern.test(serialNumber);
  }

  /**
   * Batch number formátum validálása
   */
  isValidBatchNumberFormat(batchNumber: string): boolean {
    if (!batchNumber || batchNumber.length === 0) {
      return false;
    }
    // Betűk, számok, kötőjel, aláhúzás, pont, perjel
    const pattern = /^[A-Za-z0-9_\-./]+$/;
    return pattern.test(batchNumber);
  }
}
