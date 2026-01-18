/**
 * Count Recording Service - Story 24.2: Leltár Rögzítés
 */

import { Inject } from '@nestjs/common';
import type {
  ICountRecordingService,
  ICounterSession,
  IRecordCountInput,
  IBatchCountInput,
  ICountItemFilter,
  ICountingProgress,
} from '../interfaces/count-recording.interface';
import type { IStockCountItem, IStockCount } from '../interfaces/stock-count.interface';
import { RecordCountSchema, BatchCountSchema } from '../dto/count-recording.dto';

/**
 * Counter Session Repository interfész
 */
export interface ICounterSessionRepository {
  create(session: ICounterSession): Promise<ICounterSession>;
  findById(id: string): Promise<ICounterSession | null>;
  findActiveByStockCountId(stockCountId: string): Promise<ICounterSession[]>;
  update(id: string, data: Partial<ICounterSession>): Promise<ICounterSession>;
}

/**
 * Stock Count Item Repository interfész
 */
export interface IStockCountItemRepository {
  findById(id: string): Promise<IStockCountItem | null>;
  findByStockCountId(stockCountId: string): Promise<IStockCountItem[]>;
  findByBarcode(stockCountId: string, barcode: string): Promise<IStockCountItem | null>;
  findByProductId(stockCountId: string, productId: string): Promise<IStockCountItem | null>;
  update(id: string, data: Partial<IStockCountItem>): Promise<IStockCountItem>;
  findByFilter(stockCountId: string, filter: ICountItemFilter): Promise<IStockCountItem[]>;
}

/**
 * Stock Count Repository interfész
 */
export interface IStockCountRepository {
  findById(id: string): Promise<IStockCount | null>;
  update(id: string, data: Partial<IStockCount>): Promise<IStockCount>;
}

/**
 * User Repository interfész
 */
export interface IUserRepository {
  findById(id: string): Promise<{ id: string; name: string } | null>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * Count Recording Service implementáció
 */
export class CountRecordingService implements ICountRecordingService {
  constructor(
    @Inject('COUNTER_SESSION_REPOSITORY')
    private readonly sessionRepository: ICounterSessionRepository,
    @Inject('STOCK_COUNT_ITEM_REPOSITORY')
    private readonly itemRepository: IStockCountItemRepository,
    @Inject('STOCK_COUNT_REPOSITORY')
    private readonly stockCountRepository: IStockCountRepository,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: IUserRepository,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Számláló session indítása
   */
  async startCounterSession(
    stockCountId: string,
    userId: string,
    assignedZone?: string
  ): Promise<ICounterSession> {
    const stockCount = await this.stockCountRepository.findById(stockCountId);
    if (!stockCount) {
      throw new Error('Leltár nem található');
    }

    if (stockCount.status !== 'IN_PROGRESS') {
      throw new Error('Csak aktív leltárhoz csatlakozhat számláló');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Felhasználó nem található');
    }

    const session: ICounterSession = {
      id: crypto.randomUUID(),
      stockCountId,
      userId,
      userName: user.name,
      isActive: true,
      assignedZone,
      itemsCounted: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };

    const created = await this.sessionRepository.create(session);

    await this.auditService.log(
      'COUNTER_SESSION_STARTED',
      'CounterSession',
      created.id,
      { stockCountId, userId, assignedZone }
    );

    return created;
  }

  /**
   * Számláló session befejezése
   */
  async endCounterSession(sessionId: string): Promise<ICounterSession> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session nem található');
    }

    const updated = await this.sessionRepository.update(sessionId, {
      isActive: false,
      endedAt: new Date(),
    });

    await this.auditService.log(
      'COUNTER_SESSION_ENDED',
      'CounterSession',
      sessionId,
      { itemsCounted: session.itemsCounted }
    );

    return updated;
  }

  /**
   * Aktív sessionök lekérdezése
   */
  async getActiveSessions(stockCountId: string): Promise<ICounterSession[]> {
    return this.sessionRepository.findActiveByStockCountId(stockCountId);
  }

  /**
   * Számlálás rögzítése
   */
  async recordCount(input: IRecordCountInput): Promise<IStockCountItem> {
    const validated = RecordCountSchema.parse(input);

    const item = await this.itemRepository.findById(validated.itemId);
    if (!item) {
      throw new Error('Tétel nem található');
    }

    // Eltérés számítás
    const variance = validated.countedQuantity - item.bookQuantity;

    const updated = await this.itemRepository.update(validated.itemId, {
      countedQuantity: validated.countedQuantity,
      variance,
      countedByUserId: validated.userId,
      countedAt: new Date(),
      recountRequired: false,
      notes: validated.notes,
    });

    // Leltár statisztika frissítése
    await this.updateStockCountStats(item.stockCountId);

    await this.auditService.log(
      'COUNT_RECORDED',
      'StockCountItem',
      validated.itemId,
      {
        bookQuantity: item.bookQuantity,
        countedQuantity: validated.countedQuantity,
        variance,
        mode: validated.mode,
      }
    );

    return updated;
  }

  /**
   * Batch számlálás rögzítése
   */
  async recordBatchCount(input: IBatchCountInput): Promise<IStockCountItem[]> {
    const validated = BatchCountSchema.parse(input);

    const results: IStockCountItem[] = [];

    for (const itemInput of validated.items) {
      let item: IStockCountItem | null = null;

      if (itemInput.productId) {
        item = await this.itemRepository.findByProductId(validated.stockCountId, itemInput.productId);
      } else if (itemInput.barcode) {
        item = await this.itemRepository.findByBarcode(validated.stockCountId, itemInput.barcode);
      }

      if (!item) {
        continue; // Skip unknown items
      }

      const variance = itemInput.countedQuantity - item.bookQuantity;

      const updated = await this.itemRepository.update(item.id, {
        countedQuantity: itemInput.countedQuantity,
        variance,
        countedByUserId: validated.userId,
        countedAt: new Date(),
        recountRequired: false,
      });

      results.push(updated);
    }

    // Leltár statisztika frissítése
    await this.updateStockCountStats(validated.stockCountId);

    await this.auditService.log(
      'BATCH_COUNT_RECORDED',
      'StockCount',
      validated.stockCountId,
      { itemCount: results.length, userId: validated.userId }
    );

    return results;
  }

  /**
   * Tétel keresése vonalkóddal
   */
  async findItemByBarcode(
    stockCountId: string,
    barcode: string
  ): Promise<IStockCountItem | null> {
    return this.itemRepository.findByBarcode(stockCountId, barcode);
  }

  /**
   * Számlálás visszavonása
   */
  async undoCount(itemId: string, userId: string): Promise<IStockCountItem> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) {
      throw new Error('Tétel nem található');
    }

    if (item.countedQuantity === undefined) {
      throw new Error('Tétel még nincs számlálva');
    }

    const updated = await this.itemRepository.update(itemId, {
      countedQuantity: undefined,
      variance: undefined,
      countedByUserId: undefined,
      countedAt: undefined,
      recountRequired: false,
    });

    // Leltár statisztika frissítése
    await this.updateStockCountStats(item.stockCountId);

    await this.auditService.log(
      'COUNT_UNDONE',
      'StockCountItem',
      itemId,
      { userId, previousCount: item.countedQuantity }
    );

    return updated;
  }

  /**
   * Újraszámlálás megjelölése
   */
  async markForRecount(itemId: string, reason: string): Promise<IStockCountItem> {
    const item = await this.itemRepository.findById(itemId);
    if (!item) {
      throw new Error('Tétel nem található');
    }

    const updated = await this.itemRepository.update(itemId, {
      recountRequired: true,
      notes: `${item.notes ?? ''}\nÚjraszámlálás: ${reason}`,
    });

    await this.auditService.log(
      'RECOUNT_MARKED',
      'StockCountItem',
      itemId,
      { reason }
    );

    return updated;
  }

  /**
   * Számláló tételek lekérdezése
   */
  async getCountItems(
    stockCountId: string,
    filter: ICountItemFilter
  ): Promise<IStockCountItem[]> {
    return this.itemRepository.findByFilter(stockCountId, filter);
  }

  /**
   * Számlálás progress lekérdezése
   */
  async getCountingProgress(stockCountId: string): Promise<ICountingProgress> {
    const items = await this.itemRepository.findByStockCountId(stockCountId);
    const activeSessions = await this.sessionRepository.findActiveByStockCountId(stockCountId);

    const totalItems = items.length;
    const countedItems = items.filter((i) => i.countedQuantity !== undefined).length;
    const pendingRecountItems = items.filter((i) => i.recountRequired).length;
    const varianceItems = items.filter((i) => i.variance !== undefined && i.variance !== 0).length;
    const matchingItems = countedItems - varianceItems;

    const completionPercent = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;

    return {
      stockCountId,
      totalItems,
      countedItems,
      pendingRecountItems,
      matchingItems,
      varianceItems,
      completionPercent,
      activeCounters: activeSessions.length,
    };
  }

  /**
   * Leltár statisztika frissítése
   */
  private async updateStockCountStats(stockCountId: string): Promise<void> {
    const items = await this.itemRepository.findByStockCountId(stockCountId);

    const countedItems = items.filter((i) => i.countedQuantity !== undefined).length;
    const varianceCount = items.filter(
      (i) => i.variance !== undefined && i.variance !== 0
    ).length;

    await this.stockCountRepository.update(stockCountId, {
      countedItems,
      varianceCount,
      updatedAt: new Date(),
    });
  }
}
