/**
 * @kgc/inventory - AlertService
 * Story 9-6: Minimum stock alert
 * Készlet minimum szint figyelmeztetések
 */

import { Injectable, Inject } from '@nestjs/common';
import { ALERT_REPOSITORY } from '../interfaces/alert.interface';
import type {
  StockLevelSetting,
  StockAlert,
  StockAlertType,
  AlertPriority,
  AlertQuery,
  AlertQueryResult,
  AlertSummary,
  StockLevelSettingQuery,
  StockCheckResult,
  IAlertRepository,
} from '../interfaces/alert.interface';
import {
  CreateStockLevelSettingSchema,
  CreateStockLevelSettingInput,
  UpdateStockLevelSettingSchema,
  UpdateStockLevelSettingInput,
  SnoozeAlertSchema,
  SnoozeAlertInput,
} from '../dto/alert.dto';

/**
 * Készlet alert szolgáltatás
 * Minimum készletszint figyelés és értesítések
 */
@Injectable()
export class AlertService {
  constructor(
    @Inject(ALERT_REPOSITORY)
    private readonly repository: IAlertRepository,
  ) {}

  // ============================================
  // STOCK LEVEL SETTINGS
  // ============================================

  /**
   * Készlet szint beállítás létrehozása
   */
  async createStockLevelSetting(
    tenantId: string,
    input: CreateStockLevelSettingInput,
  ): Promise<StockLevelSetting> {
    // Validálás
    const validationResult = CreateStockLevelSettingSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const validInput = validationResult.data;

    // Duplikáció ellenőrzés
    const existing = await this.repository.findStockLevelSettingByProduct(
      validInput.productId,
      tenantId,
      validInput.warehouseId,
    );
    if (existing) {
      throw new Error('A termékhez már létezik készletszint beállítás');
    }

    const settingData: Omit<StockLevelSetting, 'id' | 'createdAt'> = {
      tenantId,
      productId: validInput.productId,
      minimumLevel: validInput.minimumLevel,
      reorderPoint: validInput.reorderPoint,
      reorderQuantity: validInput.reorderQuantity,
      unit: validInput.unit,
      isActive: validInput.isActive ?? true,
    };
    if (validInput.warehouseId !== undefined) {
      settingData.warehouseId = validInput.warehouseId;
    }
    if (validInput.maximumLevel !== undefined) {
      settingData.maximumLevel = validInput.maximumLevel;
    }
    if (validInput.leadTimeDays !== undefined) {
      settingData.leadTimeDays = validInput.leadTimeDays;
    }
    return this.repository.createStockLevelSetting(settingData);
  }

  /**
   * Készlet szint beállítás keresése ID alapján
   */
  async findStockLevelSettingById(
    id: string,
    tenantId: string,
  ): Promise<StockLevelSetting | null> {
    return this.repository.findStockLevelSettingById(id, tenantId);
  }

  /**
   * Készlet szint beállítás frissítése
   */
  async updateStockLevelSetting(
    id: string,
    tenantId: string,
    input: UpdateStockLevelSettingInput,
  ): Promise<StockLevelSetting> {
    const validationResult = UpdateStockLevelSettingSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const existing = await this.repository.findStockLevelSettingById(id, tenantId);
    if (!existing) {
      throw new Error('Készletszint beállítás nem található');
    }

    const updateData: Partial<Omit<StockLevelSetting, 'id' | 'createdAt' | 'tenantId'>> = {
      updatedAt: new Date(),
    };
    const data = validationResult.data;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.minimumLevel !== undefined) updateData.minimumLevel = data.minimumLevel;
    if (data.reorderPoint !== undefined) updateData.reorderPoint = data.reorderPoint;
    if (data.reorderQuantity !== undefined) updateData.reorderQuantity = data.reorderQuantity;
    if (data.maximumLevel !== undefined && data.maximumLevel !== null) updateData.maximumLevel = data.maximumLevel;
    if (data.leadTimeDays !== undefined && data.leadTimeDays !== null) updateData.leadTimeDays = data.leadTimeDays;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.repository.updateStockLevelSetting(id, tenantId, updateData);
  }

  /**
   * Készlet szint beállítás törlése
   */
  async deleteStockLevelSetting(id: string, tenantId: string): Promise<void> {
    const existing = await this.repository.findStockLevelSettingById(id, tenantId);
    if (!existing) {
      throw new Error('Készletszint beállítás nem található');
    }

    await this.repository.deleteStockLevelSetting(id, tenantId);
  }

  /**
   * Készlet szint beállítások lekérdezése
   */
  async queryStockLevelSettings(
    query: StockLevelSettingQuery,
  ): Promise<{ items: StockLevelSetting[]; total: number }> {
    return this.repository.queryStockLevelSettings(query);
  }

  // ============================================
  // STOCK CHECKING
  // ============================================

  /**
   * Készlet szint ellenőrzése
   */
  checkStockLevel(
    currentQuantity: number,
    setting: StockLevelSetting,
  ): StockCheckResult {
    const result: StockCheckResult = {
      productId: setting.productId,
      currentQuantity,
      minimumLevel: setting.minimumLevel,
      reorderPoint: setting.reorderPoint,
      levelStatus: 'NORMAL',
      alertRequired: false,
    };
    if (setting.warehouseId !== undefined) {
      result.warehouseId = setting.warehouseId;
    }

    // Kifogyott készlet
    if (currentQuantity === 0) {
      result.levelStatus = 'OUT_OF_STOCK';
      result.alertRequired = true;
      result.suggestedPriority = 'CRITICAL';
      result.suggestedReorderQuantity = setting.reorderQuantity;
      return result;
    }

    // Minimum szint alatt
    if (currentQuantity < setting.minimumLevel) {
      result.levelStatus = 'BELOW_MINIMUM';
      result.alertRequired = true;
      result.suggestedPriority = 'HIGH';
      result.suggestedReorderQuantity = setting.reorderQuantity;
      return result;
    }

    // Újrarendelési pont alatt
    if (currentQuantity < setting.reorderPoint) {
      result.levelStatus = 'BELOW_REORDER';
      result.alertRequired = true;
      result.suggestedPriority = 'MEDIUM';
      result.suggestedReorderQuantity = setting.reorderQuantity;
      return result;
    }

    // Túl magas készlet (ha van max beállítva)
    if (setting.maximumLevel && currentQuantity > setting.maximumLevel) {
      result.levelStatus = 'OVERSTOCK';
      result.alertRequired = true;
      result.suggestedPriority = 'LOW';
      return result;
    }

    return result;
  }

  /**
   * Deficit számítása (mennyivel van a minimum alatt)
   */
  calculateDeficit(currentQuantity: number, minimumLevel: number): number {
    if (currentQuantity >= minimumLevel) {
      return 0;
    }
    return minimumLevel - currentQuantity;
  }

  // ============================================
  // ALERT MANAGEMENT
  // ============================================

  /**
   * Alacsony készlet alert létrehozása vagy frissítése
   *
   * Ha már létezik aktív alert a termékhez, frissíti az aktuális értékekkel.
   */
  async createLowStockAlert(
    tenantId: string,
    productId: string,
    currentQuantity: number,
    minimumLevel: number,
    unit: string,
    warehouseId?: string,
  ): Promise<StockAlert> {
    // Ellenőrizzük van-e már aktív alert
    const existing = await this.repository.findActiveAlertForProduct(
      productId,
      tenantId,
      warehouseId,
      'LOW_STOCK',
    );

    // Ha van meglévő alert, frissítjük az aktuális értékekkel
    if (existing) {
      const deficit = this.calculateDeficit(currentQuantity, minimumLevel);
      const priority = this.calculateAlertPriority('LOW_STOCK', currentQuantity, minimumLevel);
      const message = this.generateAlertMessage('LOW_STOCK', currentQuantity, minimumLevel);

      // Csak akkor frissítünk, ha változott valami
      if (
        existing.currentQuantity !== currentQuantity ||
        existing.deficit !== deficit ||
        existing.priority !== priority
      ) {
        return this.repository.updateAlert(existing.id, tenantId, {
          currentQuantity,
          deficit,
          priority,
          message,
        });
      }
      return existing;
    }

    const priority = this.calculateAlertPriority(
      'LOW_STOCK',
      currentQuantity,
      minimumLevel,
    );
    const deficit = this.calculateDeficit(currentQuantity, minimumLevel);
    const message = this.generateAlertMessage('LOW_STOCK', currentQuantity, minimumLevel);

    const alertData: Omit<StockAlert, 'id' | 'createdAt'> = {
      tenantId,
      productId,
      type: 'LOW_STOCK',
      priority,
      status: 'ACTIVE',
      currentQuantity,
      minimumLevel,
      deficit,
      unit,
      message,
    };
    if (warehouseId !== undefined) {
      alertData.warehouseId = warehouseId;
    }
    return this.repository.createAlert(alertData);
  }

  /**
   * Kifogyott készlet alert létrehozása
   */
  async createOutOfStockAlert(
    tenantId: string,
    productId: string,
    unit: string,
    warehouseId?: string,
  ): Promise<StockAlert> {
    const existing = await this.repository.findActiveAlertForProduct(
      productId,
      tenantId,
      warehouseId,
      'OUT_OF_STOCK',
    );
    if (existing) {
      return existing;
    }

    const message = this.generateAlertMessage('OUT_OF_STOCK', 0, 0);

    const outOfStockAlert: Omit<StockAlert, 'id' | 'createdAt'> = {
      tenantId,
      productId,
      type: 'OUT_OF_STOCK',
      priority: 'CRITICAL',
      status: 'ACTIVE',
      currentQuantity: 0,
      minimumLevel: 0,
      deficit: 0,
      unit,
      message,
    };
    if (warehouseId !== undefined) {
      outOfStockAlert.warehouseId = warehouseId;
    }
    return this.repository.createAlert(outOfStockAlert);
  }

  /**
   * Alert tudomásul vétele
   */
  async acknowledgeAlert(
    alertId: string,
    tenantId: string,
    userId: string,
  ): Promise<StockAlert> {
    const alert = await this.repository.findAlertById(alertId, tenantId);
    if (!alert) {
      throw new Error('Alert nem található');
    }

    if (alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED') {
      throw new Error('Az alert már tudomásul van véve');
    }

    return this.repository.updateAlert(alertId, tenantId, {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: userId,
      acknowledgedAt: new Date(),
    });
  }

  /**
   * Alert megoldása
   */
  async resolveAlert(alertId: string, tenantId: string): Promise<StockAlert> {
    const alert = await this.repository.findAlertById(alertId, tenantId);
    if (!alert) {
      throw new Error('Alert nem található');
    }

    if (alert.status === 'RESOLVED') {
      throw new Error('Az alert már meg van oldva');
    }

    return this.repository.updateAlert(alertId, tenantId, {
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });
  }

  /**
   * Alert elhalasztása
   */
  async snoozeAlert(
    alertId: string,
    tenantId: string,
    input: SnoozeAlertInput,
  ): Promise<StockAlert> {
    const validationResult = SnoozeAlertSchema.safeParse(input);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errorMessage);
    }

    const alert = await this.repository.findAlertById(alertId, tenantId);
    if (!alert) {
      throw new Error('Alert nem található');
    }

    if (alert.status === 'RESOLVED') {
      throw new Error('Megoldott alert nem halasztható el');
    }

    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + validationResult.data.snoozeDays);

    return this.repository.updateAlert(alertId, tenantId, {
      status: 'SNOOZED',
      snoozedUntil,
    });
  }

  /**
   * Alertek lekérdezése
   */
  async queryAlerts(query: AlertQuery): Promise<AlertQueryResult> {
    return this.repository.queryAlerts(query);
  }

  /**
   * Alert összesítés lekérdezése
   */
  async getAlertSummary(tenantId: string): Promise<AlertSummary> {
    return this.repository.getAlertSummary(tenantId);
  }

  /**
   * Termékhez tartozó alertek megoldása
   */
  async resolveAlertsByProduct(
    productId: string,
    tenantId: string,
    warehouseId?: string,
  ): Promise<number> {
    return this.repository.resolveAlertsByProduct(productId, tenantId, warehouseId);
  }

  // ============================================
  // PRIORITY CALCULATION
  // ============================================

  /**
   * Alert prioritás számítása
   */
  calculateAlertPriority(
    type: StockAlertType,
    currentQuantity: number,
    threshold: number,
  ): AlertPriority {
    // OUT_OF_STOCK mindig CRITICAL
    if (type === 'OUT_OF_STOCK') {
      return 'CRITICAL';
    }

    // OVERSTOCK mindig LOW
    if (type === 'OVERSTOCK') {
      return 'LOW';
    }

    // Százalékos arány alapján
    if (threshold === 0) {
      return 'MEDIUM';
    }

    const ratio = currentQuantity / threshold;

    if (ratio < 0.5) {
      return 'HIGH';
    }
    if (ratio < 0.8) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  // ============================================
  // MESSAGE GENERATION
  // ============================================

  /**
   * Alert üzenet generálása
   */
  generateAlertMessage(
    type: StockAlertType,
    currentQuantity: number,
    threshold: number,
  ): string {
    switch (type) {
      case 'OUT_OF_STOCK':
        return 'Készlet kifogyott! Azonnali újrarendelés szükséges.';

      case 'LOW_STOCK':
        return `Alacsony készletszint! Aktuális: ${currentQuantity}, Minimum: ${threshold}`;

      case 'OVERSTOCK':
        return `Túl magas készletszint! Aktuális: ${currentQuantity}, Maximum: ${threshold}`;

      case 'EXPIRING_SOON':
        return 'A tétel hamarosan lejár!';

      case 'WARRANTY_EXPIRING':
        return 'A garancia hamarosan lejár!';

      default:
        return 'Készlet figyelmeztetés';
    }
  }
}
