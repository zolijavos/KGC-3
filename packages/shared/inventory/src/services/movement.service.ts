/**
 * @kgc/inventory - MovementService
 * Story 9-4: Készlet mozgás audit trail
 * Minden készlet mozgás rögzítése auditáláshoz
 */

import { Inject, Injectable } from '@nestjs/common';
import { CreateMovementInput, CreateMovementSchema } from '../dto/movement.dto';
import type {
  IMovementRepository,
  InventoryMovement,
  MovementQuery,
  MovementQueryResult,
  MovementSummary,
} from '../interfaces/movement.interface';
import { MOVEMENT_REPOSITORY } from '../interfaces/movement.interface';

/**
 * Készlet mozgás szolgáltatás (audit trail)
 * Minden készletváltozást rögzít az auditáláshoz
 */
@Injectable()
export class MovementService {
  constructor(
    @Inject(MOVEMENT_REPOSITORY)
    private readonly repository: IMovementRepository
  ) {}

  // ============================================
  // RECORD MOVEMENTS
  // ============================================

  /**
   * Mozgás rögzítése
   * @param tenantId Tenant azonosító
   * @param input Mozgás adatok
   * @param performedBy Végrehajtó user ID
   */
  async recordMovement(
    tenantId: string,
    input: CreateMovementInput,
    performedBy: string
  ): Promise<InventoryMovement> {
    // Validálás
    const validationResult = CreateMovementSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Új mennyiség számítása
    const newQuantity = this.calculateNewQuantity(
      validInput.previousQuantity,
      validInput.quantityChange
    );

    const now = new Date();

    const movementData: Omit<InventoryMovement, 'id' | 'createdAt'> = {
      tenantId,
      inventoryItemId: validInput.inventoryItemId,
      warehouseId: validInput.warehouseId,
      productId: validInput.productId,
      type: validInput.type,
      sourceModule: validInput.sourceModule,
      quantityChange: validInput.quantityChange,
      previousQuantity: validInput.previousQuantity,
      newQuantity,
      unit: validInput.unit,
      performedBy,
      performedAt: now,
    };
    if (validInput.referenceId !== undefined) movementData.referenceId = validInput.referenceId;
    if (validInput.referenceType !== undefined)
      movementData.referenceType = validInput.referenceType;
    if (validInput.previousStatus !== undefined)
      movementData.previousStatus = validInput.previousStatus;
    if (validInput.newStatus !== undefined) movementData.newStatus = validInput.newStatus;
    if (validInput.previousLocationCode !== undefined)
      movementData.previousLocationCode = validInput.previousLocationCode;
    if (validInput.newLocationCode !== undefined)
      movementData.newLocationCode = validInput.newLocationCode;
    if (validInput.serialNumber !== undefined) movementData.serialNumber = validInput.serialNumber;
    if (validInput.batchNumber !== undefined) movementData.batchNumber = validInput.batchNumber;
    if (validInput.value !== undefined) movementData.value = validInput.value;
    if (validInput.currency !== undefined) movementData.currency = validInput.currency;
    if (validInput.reason !== undefined) movementData.reason = validInput.reason;

    return this.repository.create(movementData);
  }

  /**
   * Több mozgás rögzítése (bulk)
   * @param tenantId Tenant azonosító
   * @param inputs Mozgás adatok tömbje
   * @param performedBy Végrehajtó user ID
   */
  async recordManyMovements(
    tenantId: string,
    inputs: CreateMovementInput[],
    performedBy: string
  ): Promise<number> {
    const now = new Date();

    const movements = inputs.map(input => {
      const validationResult = CreateMovementSchema.safeParse(input);
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
        throw new Error(errorMessage);
      }

      const validInput = validationResult.data;
      const newQuantity = this.calculateNewQuantity(
        validInput.previousQuantity,
        validInput.quantityChange
      );

      const movementData: Omit<InventoryMovement, 'id' | 'createdAt'> = {
        tenantId,
        inventoryItemId: validInput.inventoryItemId,
        warehouseId: validInput.warehouseId,
        productId: validInput.productId,
        type: validInput.type,
        sourceModule: validInput.sourceModule,
        quantityChange: validInput.quantityChange,
        previousQuantity: validInput.previousQuantity,
        newQuantity,
        unit: validInput.unit,
        performedBy,
        performedAt: now,
      };
      if (validInput.referenceId !== undefined) movementData.referenceId = validInput.referenceId;
      if (validInput.referenceType !== undefined)
        movementData.referenceType = validInput.referenceType;
      if (validInput.previousStatus !== undefined)
        movementData.previousStatus = validInput.previousStatus;
      if (validInput.newStatus !== undefined) movementData.newStatus = validInput.newStatus;
      if (validInput.previousLocationCode !== undefined)
        movementData.previousLocationCode = validInput.previousLocationCode;
      if (validInput.newLocationCode !== undefined)
        movementData.newLocationCode = validInput.newLocationCode;
      if (validInput.serialNumber !== undefined)
        movementData.serialNumber = validInput.serialNumber;
      if (validInput.batchNumber !== undefined) movementData.batchNumber = validInput.batchNumber;
      if (validInput.value !== undefined) movementData.value = validInput.value;
      if (validInput.currency !== undefined) movementData.currency = validInput.currency;
      if (validInput.reason !== undefined) movementData.reason = validInput.reason;

      return movementData;
    });

    return this.repository.createMany(movements);
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Mozgások lekérdezése szűrőkkel
   */
  async queryMovements(query: MovementQuery): Promise<MovementQueryResult> {
    return this.repository.query(query);
  }

  /**
   * Mozgás lekérdezése ID alapján
   */
  async findById(id: string, tenantId: string): Promise<InventoryMovement | null> {
    return this.repository.findById(id, tenantId);
  }

  /**
   * Készlet tétel előzményeinek lekérdezése
   * @param inventoryItemId Készlet tétel ID
   * @param tenantId Tenant azonosító
   * @param limit Maximum rekordok száma
   */
  async getHistory(
    inventoryItemId: string,
    tenantId: string,
    limit?: number
  ): Promise<InventoryMovement[]> {
    return this.repository.getHistory(inventoryItemId, tenantId, limit);
  }

  /**
   * Mozgás összesítés időszakra
   * @param tenantId Tenant azonosító
   * @param warehouseId Raktár ID (opcionális - összes raktár)
   * @param periodStart Időszak kezdete
   * @param periodEnd Időszak vége
   */
  async getSummary(
    tenantId: string,
    warehouseId: string | undefined,
    periodStart: Date,
    periodEnd: Date
  ): Promise<MovementSummary> {
    return this.repository.getSummary(tenantId, warehouseId, periodStart, periodEnd);
  }

  /**
   * Utolsó mozgás lekérdezése egy készlet tételhez
   * @param inventoryItemId Készlet tétel ID
   * @param tenantId Tenant azonosító
   */
  async getLastMovement(
    inventoryItemId: string,
    tenantId: string
  ): Promise<InventoryMovement | null> {
    return this.repository.getLastMovement(inventoryItemId, tenantId);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Új mennyiség számítása
   * @param previousQuantity Előző mennyiség
   * @param quantityChange Változás (pozitív: növekedés, negatív: csökkenés)
   */
  calculateNewQuantity(previousQuantity: number, quantityChange: number): number {
    return previousQuantity + quantityChange;
  }
}
