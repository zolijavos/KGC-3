/**
 * Invoice Queue Service
 * Story 11-5: Offline Fallback és Queue
 * Handles failed invoice retry queue processing
 * @package @kgc/nav-online
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NavService } from './nav.service';
import { RetryService } from './retry.service';
import type { RetryQueueItem, QueueStats } from '../interfaces/retry.interface';
import type { Invoice } from '../interfaces/invoice.interface';

/**
 * Queue Repository Interface
 * Must be implemented by the actual data layer
 */
export interface IQueueRepository {
  findPendingItems(limit: number): Promise<RetryQueueItem[]>;
  findByInvoiceId(invoiceId: string): Promise<RetryQueueItem | null>;
  create(item: Omit<RetryQueueItem, 'id' | 'createdAt'>): Promise<RetryQueueItem>;
  update(id: string, item: Partial<RetryQueueItem>): Promise<RetryQueueItem>;
  delete(id: string): Promise<void>;
  getStats(tenantId?: string): Promise<QueueStats>;
}

/**
 * Invoice Repository Interface
 */
export interface IInvoiceRepository {
  findById(id: string): Promise<Invoice | null>;
  updateStatus(id: string, status: string, details?: Record<string, unknown>): Promise<void>;
}

/**
 * Invoice Queue Service
 * Manages the retry queue for failed invoice submissions
 */
@Injectable()
export class InvoiceQueueService {
  private readonly logger = new Logger(InvoiceQueueService.name);
  private readonly batchSize = 10;
  private isProcessing = false;

  constructor(
    private readonly navService: NavService,
    private readonly retryService: RetryService,
    private readonly queueRepository: IQueueRepository,
    private readonly invoiceRepository: IInvoiceRepository,
  ) {
    this.logger.log('Invoice Queue Service initialized');
  }

  /**
   * Számla hozzáadása a retry queue-hoz
   */
  async addToQueue(
    tenantId: string,
    invoiceId: string,
    priority: number = 0,
  ): Promise<RetryQueueItem> {
    this.logger.debug(`Adding invoice ${invoiceId} to retry queue`);

    // Check if already in queue
    const existing = await this.queueRepository.findByInvoiceId(invoiceId);
    if (existing) {
      this.logger.debug(`Invoice ${invoiceId} already in queue`);
      return existing;
    }

    const queueItem = this.retryService.createQueueItem(tenantId, invoiceId, priority);
    const created = await this.queueRepository.create(queueItem);

    this.logger.log(`Invoice ${invoiceId} added to retry queue`);
    return created;
  }

  /**
   * Elem eltávolítása a queue-ból
   */
  async removeFromQueue(invoiceId: string): Promise<void> {
    const item = await this.queueRepository.findByInvoiceId(invoiceId);
    if (item) {
      await this.queueRepository.delete(item.id);
      this.logger.debug(`Invoice ${invoiceId} removed from queue`);
    }
  }

  /**
   * Queue feldolgozása (5 percenként fut)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Queue processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.debug('Starting queue processing');

      const pendingItems = await this.queueRepository.findPendingItems(this.batchSize);

      if (pendingItems.length === 0) {
        this.logger.debug('No pending items in queue');
        return;
      }

      this.logger.log(`Processing ${pendingItems.length} items from queue`);

      for (const item of pendingItems) {
        await this.processQueueItem(item);
      }

      this.logger.log('Queue processing completed');
    } catch (error) {
      this.logger.error(`Queue processing failed: ${(error as Error).message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Egyedi queue elem feldolgozása
   *
   * FONTOS: A repository implementációnak biztosítania kell az atomi lock-olást
   * a race condition elkerülése érdekében. Ajánlott megoldások:
   * - PostgreSQL: SELECT ... FOR UPDATE SKIP LOCKED
   * - A findPendingItems-nek csak isProcessing: false elemeket szabad visszaadnia
   * - Az update-nek ellenőriznie kell, hogy az elem még mindig nem feldolgozás alatt van
   */
  private async processQueueItem(item: RetryQueueItem): Promise<void> {
    this.logger.debug(`Processing queue item: ${item.id} (invoice: ${item.invoiceId})`);

    // Mark as processing - FONTOS: Repository-nak atomi lock-ot kell biztosítania
    await this.queueRepository.update(item.id, { isProcessing: true });

    try {
      // Get invoice
      const invoice = await this.invoiceRepository.findById(item.invoiceId);

      if (!invoice) {
        this.logger.warn(`Invoice ${item.invoiceId} not found, removing from queue`);
        await this.queueRepository.delete(item.id);
        return;
      }

      // Attempt to submit
      const result = await this.navService.createAndSubmitInvoice(invoice);

      if (result.success) {
        this.logger.log(`Invoice ${item.invoiceId} successfully submitted`);

        // Update invoice status
        await this.invoiceRepository.updateStatus(item.invoiceId, 'SUCCESS', {
          navTransactionId: result.transactionId,
          navStatus: result.navStatus,
        });

        // Remove from queue
        await this.queueRepository.delete(item.id);
      } else {
        await this.handleFailedSubmission(item, result.error?.message ?? 'Unknown error');
      }
    } catch (error) {
      await this.handleFailedSubmission(item, (error as Error).message);
    }
  }

  /**
   * Sikertelen beküldés kezelése
   */
  private async handleFailedSubmission(
    item: RetryQueueItem,
    errorMessage: string,
  ): Promise<void> {
    const updatedItem = this.retryService.updateQueueItemOnFailure(
      { ...item, createdAt: item.createdAt ?? new Date() },
      errorMessage,
    );

    if (this.retryService.isMaxRetriesReached(updatedItem.attempts)) {
      this.logger.warn(`Max retries reached for invoice ${item.invoiceId}`);

      // Update invoice status to manual required
      await this.invoiceRepository.updateStatus(item.invoiceId, 'MANUAL_REQUIRED', {
        errorMessage,
        attempts: updatedItem.attempts,
      });

      // Remove from queue
      await this.queueRepository.delete(item.id);

      // TODO: Send notification to store manager
    } else {
      // Update queue item for next retry
      await this.queueRepository.update(item.id, {
        attempts: updatedItem.attempts,
        scheduledAt: updatedItem.scheduledAt,
        isProcessing: false,
        lastError: errorMessage,
      });

      const scheduledAtStr = updatedItem.scheduledAt instanceof Date
        ? updatedItem.scheduledAt.toISOString()
        : 'unknown';
      this.logger.debug(
        `Invoice ${item.invoiceId} scheduled for retry at ${scheduledAtStr}`,
      );
    }
  }

  /**
   * Queue statisztikák lekérése
   */
  async getQueueStats(tenantId?: string): Promise<QueueStats> {
    return this.queueRepository.getStats(tenantId);
  }

  /**
   * Manuális queue feldolgozás triggerelése
   */
  async triggerProcessing(): Promise<void> {
    this.logger.log('Manual queue processing triggered');
    await this.processQueue();
  }

  /**
   * Queue elem prioritás frissítése
   */
  async updatePriority(invoiceId: string, priority: number): Promise<void> {
    const item = await this.queueRepository.findByInvoiceId(invoiceId);
    if (item) {
      await this.queueRepository.update(item.id, { priority });
      this.logger.debug(`Priority updated for invoice ${invoiceId}: ${priority}`);
    }
  }
}
