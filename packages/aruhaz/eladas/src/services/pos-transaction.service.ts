/**
 * POS Transaction Service - Story 22.1: Értékesítés Kasszából
 */

import { Inject } from '@nestjs/common';
import type {
  IPosTransaction,
  IPosTransactionService,
  ICreateTransactionInput,
  IAddItemInput,
  IAddPaymentInput,
  ICartItem,
  IPaymentItem,
  IStockReservation,
  TransactionStatus,
  PaymentMethod,
} from '../interfaces/pos-transaction.interface';
import { CreateTransactionSchema, AddItemSchema, AddPaymentSchema } from '../dto/pos-transaction.dto';

/**
 * Repository interfész
 */
export interface IPosTransactionRepository {
  create(transaction: IPosTransaction): Promise<IPosTransaction>;
  findById(id: string): Promise<IPosTransaction | null>;
  update(id: string, data: Partial<IPosTransaction>): Promise<IPosTransaction>;
  findByRegisterAndDate(registerId: string, date: Date): Promise<IPosTransaction[]>;
  generateTransactionNumber(tenantId: string): Promise<string>;
}

/**
 * Cikk szolgáltatás interfész
 */
export interface IProductService {
  findById(productId: string): Promise<IProductInfo | null>;
  findByBarcode(barcode: string): Promise<IProductInfo | null>;
}

export interface IProductInfo {
  id: string;
  name: string;
  sku: string;
  barcode?: string | undefined;
  unitPrice: number;
  vatRate: number;
  stockQuantity: number;
}

/**
 * Készlet szolgáltatás interfész
 */
export interface IInventoryService {
  checkAvailability(items: Array<{ productId: string; quantity: number }>): Promise<IStockReservation>;
  reserveStock(transactionId: string, items: Array<{ productId: string; quantity: number }>): Promise<void>;
  commitStock(transactionId: string): Promise<void>;
  releaseStock(transactionId: string): Promise<void>;
}

/**
 * Audit szolgáltatás interfész
 */
export interface IAuditService {
  log(event: string, entityType: string, entityId: string, data: Record<string, unknown>): Promise<void>;
}

/**
 * POS Transaction Service implementáció
 */
export class PosTransactionService implements IPosTransactionService {
  constructor(
    @Inject('POS_TRANSACTION_REPOSITORY')
    private readonly repository: IPosTransactionRepository,
    @Inject('PRODUCT_SERVICE')
    private readonly productService: IProductService,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryService: IInventoryService,
    @Inject('AUDIT_SERVICE')
    private readonly auditService: IAuditService
  ) {}

  /**
   * Új tranzakció létrehozása (üres kosár)
   */
  async createTransaction(input: ICreateTransactionInput): Promise<IPosTransaction> {
    const validated = CreateTransactionSchema.parse(input);

    const transactionNumber = await this.repository.generateTransactionNumber(validated.tenantId);

    const transaction: IPosTransaction = {
      id: crypto.randomUUID(),
      tenantId: validated.tenantId,
      locationId: validated.locationId,
      registerId: validated.registerId,
      operatorId: validated.operatorId,
      partnerId: validated.partnerId,
      transactionNumber,
      items: [],
      payments: [],
      status: 'PENDING' as TransactionStatus,
      netTotal: 0,
      vatTotal: 0,
      grossTotal: 0,
      paidAmount: 0,
      changeAmount: 0,
      navSubmitted: false,
      createdAt: new Date(),
    };

    const created = await this.repository.create(transaction);

    await this.auditService.log(
      'POS_TRANSACTION_CREATED',
      'PosTransaction',
      created.id,
      { transactionNumber, operatorId: validated.operatorId }
    );

    return created;
  }

  /**
   * Termék hozzáadása kosárhoz
   */
  async addItem(transactionId: string, input: IAddItemInput): Promise<IPosTransaction> {
    const validated = AddItemSchema.parse(input);

    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú tranzakcióhoz adható tétel');
    }

    // Cikk keresés ID vagy vonalkód alapján
    let product: IProductInfo | null = null;
    if (validated.productId) {
      product = await this.productService.findById(validated.productId);
    } else if (validated.barcode) {
      product = await this.productService.findByBarcode(validated.barcode);
    }

    if (!product) {
      throw new Error('Termék nem található');
    }

    // Készlet ellenőrzés
    const availability = await this.inventoryService.checkAvailability([
      { productId: product.id, quantity: validated.quantity },
    ]);

    if (!availability.success) {
      const unavailable = availability.unavailable[0];
      if (unavailable) {
        throw new Error(`Nincs elegendő készlet. Elérhető: ${unavailable.availableQty}`);
      }
      throw new Error('Nincs elegendő készlet');
    }

    // Tétel kalkuláció
    const netAmount = product.unitPrice * validated.quantity;
    const vatAmount = netAmount * (product.vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    const newItem: ICartItem = {
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      barcode: product.barcode,
      quantity: validated.quantity,
      unitPrice: product.unitPrice,
      vatRate: product.vatRate,
      discountPercent: 0,
      netAmount,
      vatAmount,
      grossAmount,
    };

    const updatedItems = [...transaction.items, newItem];
    const totals = this.calculateTotals(updatedItems);

    const updated = await this.repository.update(transactionId, {
      items: updatedItems,
      ...totals,
    });

    await this.auditService.log(
      'POS_ITEM_ADDED',
      'PosTransaction',
      transactionId,
      { itemId: newItem.id, productId: product.id, quantity: validated.quantity }
    );

    return updated;
  }

  /**
   * Tétel eltávolítása kosárból
   */
  async removeItem(transactionId: string, itemId: string): Promise<IPosTransaction> {
    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú tranzakcióból törölhető tétel');
    }

    const updatedItems = transaction.items.filter((item) => item.id !== itemId);
    const totals = this.calculateTotals(updatedItems);

    const updated = await this.repository.update(transactionId, {
      items: updatedItems,
      ...totals,
    });

    await this.auditService.log(
      'POS_ITEM_REMOVED',
      'PosTransaction',
      transactionId,
      { itemId }
    );

    return updated;
  }

  /**
   * Tétel mennyiség módosítása
   */
  async updateItemQuantity(
    transactionId: string,
    itemId: string,
    quantity: number
  ): Promise<IPosTransaction> {
    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú tranzakción módosítható mennyiség');
    }

    const itemIndex = transaction.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Tétel nem található');
    }

    const item = transaction.items[itemIndex];
    if (!item) {
      throw new Error('Tétel nem található');
    }

    // Készlet ellenőrzés
    const availability = await this.inventoryService.checkAvailability([
      { productId: item.productId, quantity },
    ]);

    if (!availability.success) {
      const unavailable = availability.unavailable[0];
      if (unavailable) {
        throw new Error(`Nincs elegendő készlet. Elérhető: ${unavailable.availableQty}`);
      }
      throw new Error('Nincs elegendő készlet');
    }

    // Újraszámolás
    const netAmount = item.unitPrice * quantity * (1 - item.discountPercent / 100);
    const vatAmount = netAmount * (item.vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    const updatedItem: ICartItem = {
      ...item,
      quantity,
      netAmount,
      vatAmount,
      grossAmount,
    };

    const updatedItems = [...transaction.items];
    updatedItems[itemIndex] = updatedItem;
    const totals = this.calculateTotals(updatedItems);

    const updated = await this.repository.update(transactionId, {
      items: updatedItems,
      ...totals,
    });

    await this.auditService.log(
      'POS_ITEM_QUANTITY_UPDATED',
      'PosTransaction',
      transactionId,
      { itemId, oldQuantity: item.quantity, newQuantity: quantity }
    );

    return updated;
  }

  /**
   * Kedvezmény alkalmazása tételre
   */
  async applyItemDiscount(
    transactionId: string,
    itemId: string,
    discountPercent: number
  ): Promise<IPosTransaction> {
    if (discountPercent < 0 || discountPercent > 100) {
      throw new Error('Kedvezmény 0-100% között lehet');
    }

    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PENDING') {
      throw new Error('Csak PENDING státuszú tranzakción alkalmazható kedvezmény');
    }

    const itemIndex = transaction.items.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Tétel nem található');
    }

    const item = transaction.items[itemIndex];
    if (!item) {
      throw new Error('Tétel nem található');
    }

    // Újraszámolás kedvezménnyel
    const netAmount = item.unitPrice * item.quantity * (1 - discountPercent / 100);
    const vatAmount = netAmount * (item.vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    const updatedItem: ICartItem = {
      ...item,
      discountPercent,
      netAmount,
      vatAmount,
      grossAmount,
    };

    const updatedItems = [...transaction.items];
    updatedItems[itemIndex] = updatedItem;
    const totals = this.calculateTotals(updatedItems);

    const updated = await this.repository.update(transactionId, {
      items: updatedItems,
      ...totals,
    });

    await this.auditService.log(
      'POS_ITEM_DISCOUNT_APPLIED',
      'PosTransaction',
      transactionId,
      { itemId, discountPercent }
    );

    return updated;
  }

  /**
   * Fizetés hozzáadása
   */
  async addPayment(transactionId: string, input: IAddPaymentInput): Promise<IPosTransaction> {
    const validated = AddPaymentSchema.parse(input);

    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PENDING' && transaction.status !== 'PROCESSING') {
      throw new Error('Fizetés csak PENDING vagy PROCESSING státuszú tranzakcióhoz adható');
    }

    const newPayment: IPaymentItem = {
      id: crypto.randomUUID(),
      method: validated.method as PaymentMethod,
      amount: validated.amount,
      reference: validated.reference,
      paidAt: new Date(),
    };

    const updatedPayments = [...transaction.payments, newPayment];
    const paidAmount = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
    const changeAmount = Math.max(0, paidAmount - transaction.grossTotal);

    const updated = await this.repository.update(transactionId, {
      payments: updatedPayments,
      paidAmount,
      changeAmount,
      status: 'PROCESSING' as TransactionStatus,
    });

    await this.auditService.log(
      'POS_PAYMENT_ADDED',
      'PosTransaction',
      transactionId,
      { paymentId: newPayment.id, method: validated.method, amount: validated.amount }
    );

    return updated;
  }

  /**
   * Tranzakció lezárása
   */
  async completeTransaction(transactionId: string): Promise<IPosTransaction> {
    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status !== 'PROCESSING') {
      throw new Error('Csak PROCESSING státuszú tranzakció zárható le');
    }

    if (transaction.paidAmount < transaction.grossTotal) {
      throw new Error('Fizetés nem elegendő');
    }

    if (transaction.items.length === 0) {
      throw new Error('Üres kosár nem zárható le');
    }

    // Készlet foglalás és csökkentés
    const stockItems = transaction.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    await this.inventoryService.reserveStock(transactionId, stockItems);
    await this.inventoryService.commitStock(transactionId);

    // Nyugtaszám generálás (egyszerűsített)
    const receiptNumber = `R-${Date.now()}`;

    const updated = await this.repository.update(transactionId, {
      status: 'COMPLETED' as TransactionStatus,
      receiptNumber,
      completedAt: new Date(),
    });

    await this.auditService.log(
      'POS_TRANSACTION_COMPLETED',
      'PosTransaction',
      transactionId,
      { receiptNumber, grossTotal: transaction.grossTotal }
    );

    return updated;
  }

  /**
   * Tranzakció visszavonása
   */
  async cancelTransaction(transactionId: string, reason: string): Promise<IPosTransaction> {
    const transaction = await this.repository.findById(transactionId);
    if (!transaction) {
      throw new Error('Tranzakció nem található');
    }

    if (transaction.status === 'COMPLETED' || transaction.status === 'REFUNDED') {
      throw new Error('Lezárt vagy visszáruzott tranzakció nem vonható vissza');
    }

    // Készlet felszabadítás ha volt foglalás
    if (transaction.status === 'PROCESSING') {
      await this.inventoryService.releaseStock(transactionId);
    }

    const updated = await this.repository.update(transactionId, {
      status: 'CANCELLED' as TransactionStatus,
      notes: reason,
    });

    await this.auditService.log(
      'POS_TRANSACTION_CANCELLED',
      'PosTransaction',
      transactionId,
      { reason }
    );

    return updated;
  }

  /**
   * Tranzakció lekérdezése
   */
  async getTransaction(transactionId: string): Promise<IPosTransaction | null> {
    return this.repository.findById(transactionId);
  }

  /**
   * Napi tranzakciók lekérdezése
   */
  async getDailyTransactions(registerId: string, date: Date): Promise<IPosTransaction[]> {
    return this.repository.findByRegisterAndDate(registerId, date);
  }

  /**
   * Készlet elérhetőség ellenőrzés
   */
  async checkStockAvailability(
    items: Array<{ productId: string; quantity: number }>
  ): Promise<IStockReservation> {
    return this.inventoryService.checkAvailability(items);
  }

  /**
   * Összegek kalkulálása
   */
  private calculateTotals(items: ICartItem[]): {
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
  } {
    return items.reduce(
      (acc, item) => ({
        netTotal: acc.netTotal + item.netAmount,
        vatTotal: acc.vatTotal + item.vatAmount,
        grossTotal: acc.grossTotal + item.grossAmount,
      }),
      { netTotal: 0, vatTotal: 0, grossTotal: 0 }
    );
  }
}
