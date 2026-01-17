/**
 * @kgc/inventory - InventoryService
 * Story 9-1: Készlet nyilvántartás alap
 * FR4-FR10 implementáció
 */

import { Injectable, Inject } from '@nestjs/common';
import { INVENTORY_REPOSITORY } from '../interfaces/inventory.interface';
import type {
  InventoryItem,
  InventoryQuery,
  InventoryQueryResult,
  IInventoryRepository,
  InventoryStatus,
  StockSummary,
} from '../interfaces/inventory.interface';
import {
  CreateInventoryItemSchema,
  CreateInventoryItemInput,
  UpdateInventoryItemSchema,
  UpdateInventoryItemInput,
  AdjustQuantitySchema,
  AdjustQuantityInput,
  BulkAdjustQuantitySchema,
  BulkAdjustQuantityInput,
} from '../dto/inventory.dto';

/**
 * Készlet nyilvántartás szolgáltatás
 * FR4: Real-time készletállapot
 * FR7: Berendezés hely frissítés
 */
@Injectable()
export class InventoryService {
  /**
   * Érvényes státusz átmenetek mátrixa
   * Kulcs: jelenlegi státusz, Érték: engedélyezett cél státuszok
   */
  private static readonly VALID_STATUS_TRANSITIONS: Record<InventoryStatus, InventoryStatus[]> = {
    AVAILABLE: ['RESERVED', 'RENTED', 'IN_TRANSIT', 'IN_SERVICE', 'SOLD', 'DAMAGED', 'LOST', 'SCRAPPED'],
    RESERVED: ['AVAILABLE', 'RENTED', 'IN_TRANSIT', 'SOLD'],
    IN_TRANSIT: ['AVAILABLE', 'RESERVED', 'DAMAGED', 'LOST'],
    IN_SERVICE: ['AVAILABLE', 'DAMAGED', 'SCRAPPED'],
    SOLD: [], // Eladott tétel nem változtatható
    RENTED: ['AVAILABLE', 'IN_SERVICE', 'DAMAGED', 'LOST'],
    DAMAGED: ['IN_SERVICE', 'SCRAPPED', 'AVAILABLE'],
    LOST: ['AVAILABLE'], // Ha megkerül
    SCRAPPED: [], // Selejtezett tétel nem változtatható
  };

  constructor(
    @Inject(INVENTORY_REPOSITORY)
    private readonly repository: IInventoryRepository,
  ) {}

  /**
   * Új készlet tétel létrehozása
   */
  async create(
    tenantId: string,
    input: CreateInventoryItemInput,
    createdBy: string,
  ): Promise<InventoryItem> {
    // Validálás Zod schema-val
    const validationResult = CreateInventoryItemSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Bérgéphez serial number kötelező
    if (validInput.type === 'RENTAL_EQUIPMENT' && !validInput.serialNumber) {
      throw new Error('Bérgéphez serial number kötelező');
    }

    // Serial number duplikáció ellenőrzése
    if (validInput.serialNumber) {
      const existing = await this.repository.findBySerialNumber(
        validInput.serialNumber,
        tenantId,
      );
      if (existing) {
        throw new Error('Serial number már létezik');
      }
    }

    // Létrehozás
    const itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      warehouseId: validInput.warehouseId,
      productId: validInput.productId,
      type: validInput.type,
      status: validInput.status ?? 'AVAILABLE',
      quantity: validInput.quantity,
      unit: validInput.unit,
      createdBy,
      updatedBy: createdBy,
      isDeleted: false,
    };
    if (validInput.serialNumber !== undefined) itemData.serialNumber = validInput.serialNumber;
    if (validInput.batchNumber !== undefined) itemData.batchNumber = validInput.batchNumber;
    if (validInput.locationCode !== undefined) itemData.locationCode = validInput.locationCode;
    if (validInput.minStockLevel !== undefined) itemData.minStockLevel = validInput.minStockLevel;
    if (validInput.maxStockLevel !== undefined) itemData.maxStockLevel = validInput.maxStockLevel;
    if (validInput.purchasePrice !== undefined) itemData.purchasePrice = validInput.purchasePrice;
    if (validInput.lastPurchaseDate !== undefined) itemData.lastPurchaseDate = validInput.lastPurchaseDate;
    return this.repository.create(itemData);
  }

  /**
   * Készlet tétel lekérdezése ID alapján
   * Soft deleted tételeket nem adja vissza
   */
  async findById(id: string, tenantId: string): Promise<InventoryItem | null> {
    const item = await this.repository.findById(id, tenantId);
    if (item?.isDeleted) {
      return null;
    }
    return item;
  }

  /**
   * Készlet tétel lekérdezése serial number alapján
   */
  async findBySerialNumber(
    serialNumber: string,
    tenantId: string,
  ): Promise<InventoryItem | null> {
    const item = await this.repository.findBySerialNumber(serialNumber, tenantId);
    if (item?.isDeleted) {
      return null;
    }
    return item;
  }

  /**
   * Készlet tétel frissítése
   */
  async update(
    id: string,
    tenantId: string,
    input: UpdateInventoryItemInput,
    updatedBy: string,
  ): Promise<InventoryItem> {
    // Validálás
    const validationResult = UpdateInventoryItemSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Létezés ellenőrzése
    const existing = await this.repository.findById(id, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Készlet tétel nem található');
    }

    // Státusz átmenet validálás
    if (validInput.status && validInput.status !== existing.status) {
      if (!this.isValidStatusTransition(existing.status, validInput.status)) {
        throw new Error(
          `Érvénytelen státusz átmenet: ${existing.status} -> ${validInput.status}`,
        );
      }
    }

    // Frissítés
    const updateData: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'tenantId' | 'createdBy'>> = {
      updatedBy,
      updatedAt: new Date(),
    };
    if (validInput.warehouseId !== undefined) updateData.warehouseId = validInput.warehouseId;
    if (validInput.status !== undefined) updateData.status = validInput.status;
    if (validInput.locationCode !== undefined && validInput.locationCode !== null) updateData.locationCode = validInput.locationCode;
    if (validInput.quantity !== undefined) updateData.quantity = validInput.quantity;
    if (validInput.minStockLevel !== undefined && validInput.minStockLevel !== null) updateData.minStockLevel = validInput.minStockLevel;
    if (validInput.maxStockLevel !== undefined && validInput.maxStockLevel !== null) updateData.maxStockLevel = validInput.maxStockLevel;
    if (validInput.purchasePrice !== undefined && validInput.purchasePrice !== null) updateData.purchasePrice = validInput.purchasePrice;
    if (validInput.lastPurchaseDate !== undefined && validInput.lastPurchaseDate !== null) updateData.lastPurchaseDate = validInput.lastPurchaseDate;
    return this.repository.update(id, tenantId, updateData);
  }

  /**
   * Készlet tétel soft delete
   *
   * MEGJEGYZÉS: Pozitív mennyiségű tétel törlése figyelmeztetéssel jár,
   * mert készleteltérést okozhat. Ajánlott először nullázni a mennyiséget.
   */
  async delete(id: string, tenantId: string, deletedBy: string): Promise<void> {
    const existing = await this.repository.findById(id, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Készlet tétel nem található');
    }

    // Kiadott/foglalt tétel nem törölhető
    if (existing.status === 'RENTED') {
      throw new Error('Kiadott (RENTED) tétel nem törölhető');
    }
    if (existing.status === 'RESERVED') {
      throw new Error('Foglalt (RESERVED) tétel nem törölhető');
    }
    if (existing.status === 'IN_TRANSIT') {
      throw new Error('Szállítás alatt lévő (IN_TRANSIT) tétel nem törölhető');
    }

    // Pozitív mennyiségű tétel törlése nem engedélyezett (készleteltérés elkerülése)
    if (existing.quantity > 0) {
      throw new Error(
        `Pozitív mennyiségű tétel nem törölhető (aktuális: ${existing.quantity} ${existing.unit}). Először csökkentse nullára a mennyiséget.`,
      );
    }

    await this.repository.delete(id, tenantId, deletedBy);
  }

  /**
   * Készlet tétel hard delete (GDPR)
   * Csak már soft deleted tétel törölhető véglegesen
   */
  async hardDelete(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findById(id, tenantId);
    if (!existing) {
      throw new Error('Készlet tétel nem található');
    }
    if (!existing.isDeleted) {
      throw new Error('Csak soft deleted tétel törölhető véglegesen');
    }

    await this.repository.hardDelete(id, tenantId);
  }

  /**
   * Készlet tételek lekérdezése szűrőkkel
   */
  async query(query: InventoryQuery): Promise<InventoryQueryResult> {
    return this.repository.query(query);
  }

  /**
   * Mennyiség módosítás (pozitív: növelés, negatív: csökkentés)
   */
  async adjustQuantity(
    id: string,
    tenantId: string,
    input: AdjustQuantityInput,
    updatedBy: string,
  ): Promise<InventoryItem> {
    // Validálás
    const validationResult = AdjustQuantitySchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const { adjustment } = validationResult.data;

    // Létezés és aktuális mennyiség ellenőrzése
    const existing = await this.repository.findById(id, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Készlet tétel nem található');
    }

    // Negatívba nem mehet
    const newQuantity = existing.quantity + adjustment;
    if (newQuantity < 0) {
      throw new Error('A mennyiség nem lehet negatív');
    }

    return this.repository.adjustQuantity(id, tenantId, adjustment, updatedBy);
  }

  /**
   * Több tétel mennyiségének egyszerre módosítása
   *
   * FONTOS: A repository implementációnak tranzakcióban kell végrehajtania a műveletet!
   * Ez a metódus előzetesen ellenőrzi, hogy egyik tétel sem menne negatívba,
   * de a repository-nak SELECT FOR UPDATE vagy hasonló mechanizmust kell használnia
   * a race condition elkerülésére.
   *
   * @throws Error ha bármelyik tétel negatívba menne
   * @throws Error ha validációs hiba van
   */
  async bulkAdjustQuantity(
    tenantId: string,
    input: BulkAdjustQuantityInput,
    updatedBy: string,
  ): Promise<void> {
    // Validálás
    const validationResult = BulkAdjustQuantitySchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const { adjustments, reason: _reason } = validationResult.data;

    // Minden tétel ellenőrzése - ha bármelyik negatívba menne, az egész művelet elutasítva
    for (const adj of adjustments) {
      const existing = await this.repository.findById(adj.id, tenantId);
      if (!existing || existing.isDeleted) {
        throw new Error(`Készlet tétel nem található: ${adj.id}`);
      }
      const newQuantity = existing.quantity + adj.adjustment;
      if (newQuantity < 0) {
        throw new Error(`Tétel ${adj.id} mennyisége negatívba menne`);
      }
    }

    // Bulk művelet végrehajtása
    await this.repository.bulkAdjustQuantity(
      adjustments.map((a) => ({ ...a, tenantId })),
      updatedBy,
    );
  }

  /**
   * Készlet összesítés lekérdezése (FR4: Real-time készletállapot)
   */
  async getStockSummary(
    tenantId: string,
    productId: string,
    warehouseId?: string,
  ): Promise<StockSummary | null> {
    return this.repository.getStockSummary(tenantId, productId, warehouseId);
  }

  /**
   * Több cikk készlet összesítése
   */
  async getStockSummaries(
    tenantId: string,
    warehouseId?: string,
    productIds?: string[],
  ): Promise<StockSummary[]> {
    return this.repository.getStockSummaries(tenantId, warehouseId, productIds);
  }

  /**
   * Minimum készlet alatt lévő tételek (FR4)
   */
  async findBelowMinStock(
    tenantId: string,
    warehouseId?: string,
  ): Promise<StockSummary[]> {
    return this.repository.findBelowMinStock(tenantId, warehouseId);
  }

  /**
   * Készlet szint státusz számítás
   * - OK: elérhető >= min * 1.5
   * - LOW: min <= elérhető < min * 1.5
   * - CRITICAL: 0 < elérhető < min
   * - OUT_OF_STOCK: elérhető = 0
   *
   * EDGE CASE: minStockLevel = 0
   * - Ha minStockLevel = 0, akkor min * 1.5 = 0
   * - Ez azt jelenti, hogy bármilyen pozitív készlet 'OK' lesz
   * - 0 készlet viszont 'OUT_OF_STOCK' (ez a várt viselkedés)
   *
   * EDGE CASE: minStockLevel = undefined/null
   * - Mindig 'OK' státuszt ad vissza (nincs figyelmeztetés küszöb)
   */
  calculateStockLevelStatus(
    availableQuantity: number,
    minStockLevel?: number,
  ): 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' {
    // Ha nincs minimum beállítva, mindig OK (nincs figyelés)
    if (minStockLevel === undefined || minStockLevel === null) {
      return 'OK';
    }

    if (availableQuantity === 0) {
      return 'OUT_OF_STOCK';
    }

    if (availableQuantity < minStockLevel) {
      return 'CRITICAL';
    }

    if (availableQuantity < minStockLevel * 1.5) {
      return 'LOW';
    }

    return 'OK';
  }

  /**
   * Státusz átmenet validálás
   */
  isValidStatusTransition(from: InventoryStatus, to: InventoryStatus): boolean {
    const allowedTransitions = InventoryService.VALID_STATUS_TRANSITIONS[from];
    // Handle undefined case for noUncheckedIndexedAccess compliance
    if (!allowedTransitions) {
      return false;
    }
    return allowedTransitions.includes(to);
  }
}
