/**
 * @kgc/inventory - WarehouseService
 * Story 9-3: Multi-warehouse támogatás
 * FR9: Raktárak közötti átmozgatás
 */

import { Injectable, Inject } from '@nestjs/common';
import { WAREHOUSE_REPOSITORY } from '../interfaces/warehouse.interface';
import type {
  Warehouse,
  InventoryTransfer,
  TransferItem,
  WarehouseQuery,
  WarehouseQueryResult,
  TransferQuery,
  TransferQueryResult,
  IWarehouseRepository,
  CrossWarehouseStockSummary,
} from '../interfaces/warehouse.interface';
import {
  CreateWarehouseSchema,
  CreateWarehouseInput,
  UpdateWarehouseSchema,
  UpdateWarehouseInput,
  CreateTransferSchema,
  CreateTransferInput,
  CompleteTransferSchema,
  CompleteTransferInput,
} from '../dto/warehouse.dto';

/**
 * Raktár kezelő szolgáltatás
 * FR9: Raktárak közötti átmozgatás
 */
@Injectable()
export class WarehouseService {
  constructor(
    @Inject(WAREHOUSE_REPOSITORY)
    private readonly repository: IWarehouseRepository,
  ) {}

  // ============================================
  // WAREHOUSE CRUD
  // ============================================

  /**
   * Raktár létrehozása
   */
  async createWarehouse(
    tenantId: string,
    input: CreateWarehouseInput,
  ): Promise<Warehouse> {
    // Validálás
    const validationResult = CreateWarehouseSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Duplikált kód ellenőrzés
    const existingByCode = await this.repository.findByCode(validInput.code, tenantId);
    if (existingByCode) {
      throw new Error('A raktár kód már létezik');
    }

    // Ha ez az első raktár, automatikusan default
    const defaultWarehouse = await this.repository.findDefault(tenantId);
    const isDefault = validInput.isDefault ?? (defaultWarehouse === null);

    const warehouseData: Omit<Warehouse, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      code: validInput.code,
      name: validInput.name,
      type: validInput.type,
      status: validInput.status ?? 'ACTIVE',
      isDefault,
      isDeleted: false,
    };
    if (validInput.address !== undefined) warehouseData.address = validInput.address;
    if (validInput.city !== undefined) warehouseData.city = validInput.city;
    if (validInput.postalCode !== undefined) warehouseData.postalCode = validInput.postalCode;
    if (validInput.contactName !== undefined) warehouseData.contactName = validInput.contactName;
    if (validInput.contactPhone !== undefined) warehouseData.contactPhone = validInput.contactPhone;
    if (validInput.contactEmail !== undefined) warehouseData.contactEmail = validInput.contactEmail;

    return this.repository.create(warehouseData);
  }

  /**
   * Raktár lekérdezése ID alapján
   */
  async findWarehouseById(
    id: string,
    tenantId: string,
  ): Promise<Warehouse | null> {
    const warehouse = await this.repository.findById(id, tenantId);
    if (warehouse?.isDeleted) {
      return null;
    }
    return warehouse;
  }

  /**
   * Raktár lekérdezése kód alapján
   */
  async findWarehouseByCode(
    code: string,
    tenantId: string,
  ): Promise<Warehouse | null> {
    const warehouse = await this.repository.findByCode(code, tenantId);
    if (warehouse?.isDeleted) {
      return null;
    }
    return warehouse;
  }

  /**
   * Alapértelmezett raktár lekérdezése
   */
  async findDefaultWarehouse(tenantId: string): Promise<Warehouse | null> {
    return this.repository.findDefault(tenantId);
  }

  /**
   * Raktárak lekérdezése szűrőkkel
   */
  async queryWarehouses(query: WarehouseQuery): Promise<WarehouseQueryResult> {
    return this.repository.query(query);
  }

  /**
   * Raktár frissítése
   */
  async updateWarehouse(
    id: string,
    tenantId: string,
    input: UpdateWarehouseInput,
  ): Promise<Warehouse> {
    const validationResult = UpdateWarehouseSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const existing = await this.repository.findById(id, tenantId);
    if (!existing || existing.isDeleted) {
      throw new Error('Raktár nem található');
    }

    const updateData: Partial<Omit<Warehouse, 'id' | 'createdAt' | 'tenantId' | 'code'>> = {
      updatedAt: new Date(),
    };
    const data = validationResult.data;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.address !== undefined && data.address !== null) updateData.address = data.address;
    if (data.city !== undefined && data.city !== null) updateData.city = data.city;
    if (data.postalCode !== undefined && data.postalCode !== null) updateData.postalCode = data.postalCode;
    if (data.contactName !== undefined && data.contactName !== null) updateData.contactName = data.contactName;
    if (data.contactPhone !== undefined && data.contactPhone !== null) updateData.contactPhone = data.contactPhone;
    if (data.contactEmail !== undefined && data.contactEmail !== null) updateData.contactEmail = data.contactEmail;
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

    return this.repository.update(id, tenantId, updateData);
  }

  /**
   * Alapértelmezett raktár beállítása
   */
  async setDefaultWarehouse(id: string, tenantId: string): Promise<Warehouse> {
    const warehouse = await this.repository.findById(id, tenantId);
    if (!warehouse || warehouse.isDeleted) {
      throw new Error('Raktár nem található');
    }

    // Előző default törlése
    const currentDefault = await this.repository.findDefault(tenantId);
    if (currentDefault && currentDefault.id !== id) {
      await this.repository.update(currentDefault.id, tenantId, {
        isDefault: false,
        updatedAt: new Date(),
      });
    }

    // Új default beállítása
    return this.repository.update(id, tenantId, {
      isDefault: true,
      updatedAt: new Date(),
    });
  }

  /**
   * Raktár törlése (soft delete)
   *
   * MEGJEGYZÉS: A törlés előtt ellenőrizzük, hogy nincs-e készlet a raktárban.
   * Készletet tartalmazó raktár nem törölhető, mert orphan adatok keletkeznének.
   */
  async deleteWarehouse(id: string, tenantId: string): Promise<void> {
    const warehouse = await this.repository.findById(id, tenantId);
    if (!warehouse || warehouse.isDeleted) {
      throw new Error('Raktár nem található');
    }

    if (warehouse.isDefault) {
      throw new Error('Alapértelmezett raktár nem törölhető');
    }

    // Ellenőrizzük, hogy van-e készlet a raktárban
    const hasItems = await this.repository.hasInventoryItems(id, tenantId);
    if (hasItems) {
      throw new Error('Készletet tartalmazó raktár nem törölhető. Először mozgassa át vagy törölje a készletet.');
    }

    await this.repository.delete(id, tenantId);
  }

  // ============================================
  // TRANSFER MANAGEMENT (FR9)
  // ============================================

  /**
   * Transfer létrehozása (FR9: Raktárak közötti átmozgatás)
   */
  async createTransfer(
    tenantId: string,
    input: CreateTransferInput,
    initiatedBy: string,
  ): Promise<InventoryTransfer> {
    // Validálás
    const validationResult = CreateTransferSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Azonos raktár ellenőrzés
    if (validInput.sourceWarehouseId === validInput.targetWarehouseId) {
      throw new Error('A forrás és cél raktár nem lehet azonos');
    }

    // Forrás raktár ellenőrzés
    const sourceWarehouse = await this.repository.findById(
      validInput.sourceWarehouseId,
      tenantId,
    );
    if (!sourceWarehouse || sourceWarehouse.isDeleted) {
      throw new Error('Forrás raktár nem található');
    }

    // Cél raktár ellenőrzés
    const targetWarehouse = await this.repository.findById(
      validInput.targetWarehouseId,
      tenantId,
    );
    if (!targetWarehouse || targetWarehouse.isDeleted) {
      throw new Error('Cél raktár nem található');
    }

    if (targetWarehouse.status !== 'ACTIVE') {
      throw new Error('Cél raktár nem aktív');
    }

    // Transfer létrehozása
    const transferCode = this.generateTransferCode();
    const now = new Date();

    // Map items to ensure proper typing without undefined values in optional properties
    const mappedItems: TransferItem[] = validInput.items.map((item) => {
      const transferItem: TransferItem = {
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
        unit: item.unit,
      };
      if (item.serialNumber !== undefined) transferItem.serialNumber = item.serialNumber;
      if (item.note !== undefined) transferItem.note = item.note;
      return transferItem;
    });

    const transferData: Omit<InventoryTransfer, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      transferCode,
      sourceWarehouseId: validInput.sourceWarehouseId,
      targetWarehouseId: validInput.targetWarehouseId,
      status: 'PENDING',
      initiatedBy,
      initiatedAt: now,
      items: mappedItems,
    };
    if (validInput.reason !== undefined) transferData.reason = validInput.reason;

    return this.repository.createTransfer(transferData);
  }

  /**
   * Transfer indítása (PENDING -> IN_TRANSIT)
   */
  async startTransfer(
    transferId: string,
    tenantId: string,
  ): Promise<InventoryTransfer> {
    const transfer = await this.repository.findTransferById(transferId, tenantId);
    if (!transfer) {
      throw new Error('Transfer nem található');
    }

    if (transfer.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú transfer indítható');
    }

    return this.repository.updateTransfer(transferId, tenantId, {
      status: 'IN_TRANSIT',
      updatedAt: new Date(),
    });
  }

  /**
   * Transfer befejezése (IN_TRANSIT -> COMPLETED)
   */
  async completeTransfer(
    transferId: string,
    tenantId: string,
    completedBy: string,
    input?: CompleteTransferInput,
  ): Promise<InventoryTransfer> {
    // Optional input validation
    if (input) {
      const validationResult = CompleteTransferSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors
          .map((e) => e.message)
          .join(', ');
        throw new Error(errorMessage);
      }
    }

    const transfer = await this.repository.findTransferById(transferId, tenantId);
    if (!transfer) {
      throw new Error('Transfer nem található');
    }

    if (transfer.status !== 'IN_TRANSIT') {
      throw new Error('Csak IN_TRANSIT státuszú transfer fejezhető be');
    }

    const now = new Date();
    return this.repository.updateTransfer(transferId, tenantId, {
      status: 'COMPLETED',
      completedBy,
      completedAt: now,
      updatedAt: now,
    });
  }

  /**
   * Transfer visszavonása
   */
  async cancelTransfer(
    transferId: string,
    tenantId: string,
    reason: string,
  ): Promise<InventoryTransfer> {
    const transfer = await this.repository.findTransferById(transferId, tenantId);
    if (!transfer) {
      throw new Error('Transfer nem található');
    }

    if (transfer.status === 'COMPLETED') {
      throw new Error('COMPLETED státuszú transfer nem vonható vissza');
    }

    return this.repository.updateTransfer(transferId, tenantId, {
      status: 'CANCELLED',
      reason: `${transfer.reason ?? ''} | VISSZAVONVA: ${reason}`,
      updatedAt: new Date(),
    });
  }

  /**
   * Transfer-ek lekérdezése
   */
  async queryTransfers(query: TransferQuery): Promise<TransferQueryResult> {
    return this.repository.queryTransfers(query);
  }

  /**
   * Transfer lekérdezése
   */
  async findTransferById(
    transferId: string,
    tenantId: string,
  ): Promise<InventoryTransfer | null> {
    return this.repository.findTransferById(transferId, tenantId);
  }

  // ============================================
  // CROSS-WAREHOUSE STOCK
  // ============================================

  /**
   * Összesített készlet lekérdezése több raktáron keresztül
   */
  async getCrossWarehouseStock(
    tenantId: string,
    productIds?: string[],
  ): Promise<CrossWarehouseStockSummary[]> {
    return this.repository.getCrossWarehouseStock(tenantId, productIds);
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Transfer kód generálása
   * Formátum: TRF-YYYY-XXXXXXXX (UUID alapú)
   *
   * MEGJEGYZÉS: UUID-v4 alapú generálás garantálja az egyediséget
   * magas terhelés mellett is, ellentétben a korábbi Math.random() megoldással.
   */
  generateTransferCode(): string {
    const year = new Date().getFullYear();
    // UUID-v4 szerű egyedi azonosító generálása (8 karakter)
    const uniquePart = this.generateUniqueId();
    return `TRF-${year}-${uniquePart}`;
  }

  /**
   * Egyedi azonosító generálása (8 hex karakter)
   * Crypto API használata a valódi véletlenszerűséghez
   */
  private generateUniqueId(): string {
    // Node.js crypto vagy fallback
    const array = new Uint8Array(4);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback: timestamp + high-resolution time kombinációja
      const now = Date.now();
      const hrTime = typeof process !== 'undefined' && process.hrtime
        ? process.hrtime()[1]
        : Math.floor(Math.random() * 1000000);
      array[0] = (now >> 24) & 0xff;
      array[1] = (now >> 16) & 0xff;
      array[2] = (hrTime >> 8) & 0xff;
      array[3] = hrTime & 0xff;
    }
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
}
