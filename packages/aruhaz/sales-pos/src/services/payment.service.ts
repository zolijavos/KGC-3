/**
 * @kgc/sales-pos - PaymentService
 * Epic 22: Story 22-2 - Payment Methods
 */

import { Injectable } from '@nestjs/common';
import {
  AddPartialPaymentDto,
  AddPartialPaymentSchema,
  PAYMENT_CONSTANTS,
  ProcessCashPaymentDto,
  ProcessCashPaymentSchema,
} from '../dto/payment.dto.js';
import {
  ICardPaymentResult,
  ICashPaymentResult,
  IInventoryDeductionResult,
  IInventoryService,
  IMyPosService,
  IPaymentCreateResult,
  IPaymentRepository,
  ISalePayment,
  PaymentMethod,
} from '../interfaces/payment.interface.js';
import {
  ISaleItemRepository,
  ISaleTransaction,
  ITransactionRepository,
  PaymentStatus,
  SaleStatus,
} from '../interfaces/transaction.interface.js';

export interface ICompletePaymentResult {
  transactionId: string;
  deductionResults: IInventoryDeductionResult[];
  allDeductionsSuccessful: boolean;
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: IPaymentRepository,
    private readonly transactionRepository: ITransactionRepository,
    private readonly saleItemRepository: ISaleItemRepository,
    private readonly myPosService: IMyPosService,
    private readonly inventoryService: IInventoryService
  ) {}

  /**
   * Process cash payment with change calculation
   * AC1: Cash payment
   */
  async processCashPayment(
    transactionId: string,
    input: ProcessCashPaymentDto,
    tenantId: string
  ): Promise<ICashPaymentResult> {
    const validationResult = ProcessCashPaymentSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const { receivedAmount } = validationResult.data;

    // Validate transaction
    const transaction = await this.validateTransactionForPayment(transactionId, tenantId);

    // Get already paid amount
    const alreadyPaid = await this.paymentRepository.sumByTransaction(transactionId);
    const remainingAmount = transaction.total - alreadyPaid;

    // Check if received amount covers remaining
    if (receivedAmount < remainingAmount) {
      throw new Error('Insufficient payment: received amount is less than remaining balance');
    }

    // Calculate change
    const changeAmount = receivedAmount - remainingAmount;

    // Create payment record
    const paymentData: Omit<ISalePayment, 'id' | 'receivedAt'> = {
      transactionId,
      tenantId,
      method: PaymentMethod.CASH,
      amount: remainingAmount, // Store actual payment amount, not received
    };

    const payment = await this.paymentRepository.create(paymentData);

    // Update transaction
    const totalPaid = alreadyPaid + remainingAmount;
    const isFullyPaid = totalPaid >= transaction.total;

    const updateData: Partial<ISaleTransaction> = {
      paidAmount: totalPaid,
      changeAmount,
      paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
      status: isFullyPaid ? SaleStatus.COMPLETED : transaction.status,
    };
    if (isFullyPaid) {
      updateData.completedAt = new Date();
    }
    await this.transactionRepository.update(transactionId, updateData);

    return {
      payment,
      changeAmount,
      transactionPaidAmount: totalPaid,
      transactionChangeAmount: changeAmount,
      isFullyPaid,
    };
  }

  /**
   * Process card payment via MyPos
   * AC2: Card payment
   */
  async processCardPayment(transactionId: string, tenantId: string): Promise<ICardPaymentResult> {
    // Validate transaction
    const transaction = await this.validateTransactionForPayment(transactionId, tenantId);

    // Get remaining amount
    const alreadyPaid = await this.paymentRepository.sumByTransaction(transactionId);
    const remainingAmount = transaction.total - alreadyPaid;

    if (remainingAmount <= 0) {
      throw new Error('Transaction is already fully paid');
    }

    // Call MyPos stub
    const myPosResult = await this.myPosService.processCardPayment({
      amount: remainingAmount,
      currency: PAYMENT_CONSTANTS.DEFAULT_CURRENCY,
      reference: transaction.transactionNumber,
    });

    if (!myPosResult.success) {
      throw new Error(`Card payment failed: ${myPosResult.errorMessage ?? 'Unknown error'}`);
    }

    // Create payment record with card details
    const paymentData: Omit<ISalePayment, 'id' | 'receivedAt'> = {
      transactionId,
      tenantId,
      method: PaymentMethod.CARD,
      amount: remainingAmount,
    };

    // Conditionally add optional fields (exactOptionalPropertyTypes compliance)
    if (myPosResult.transactionId !== undefined) {
      paymentData.cardTransactionId = myPosResult.transactionId;
    }
    if (myPosResult.cardLastFour !== undefined) {
      paymentData.cardLastFour = myPosResult.cardLastFour;
    }
    if (myPosResult.cardBrand !== undefined) {
      paymentData.cardBrand = myPosResult.cardBrand;
    }

    const payment = await this.paymentRepository.create(paymentData);

    // Update transaction
    const totalPaid = alreadyPaid + remainingAmount;

    await this.transactionRepository.update(transactionId, {
      paidAmount: totalPaid,
      paymentStatus: PaymentStatus.PAID,
      status: SaleStatus.COMPLETED,
      completedAt: new Date(),
    });

    return {
      payment,
      cardTransactionId: myPosResult.transactionId ?? '',
      cardLastFour: myPosResult.cardLastFour ?? '',
      cardBrand: myPosResult.cardBrand ?? '',
      transactionPaidAmount: totalPaid,
      transactionChangeAmount: 0,
      isFullyPaid: true,
    };
  }

  /**
   * Add partial payment (for mixed payments)
   * AC3: Mixed payment
   */
  async addPartialPayment(
    transactionId: string,
    input: AddPartialPaymentDto,
    tenantId: string
  ): Promise<IPaymentCreateResult> {
    const validationResult = AddPartialPaymentSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate transaction
    const transaction = await this.validateTransactionForPayment(transactionId, tenantId);

    // Check remaining amount
    const alreadyPaid = await this.paymentRepository.sumByTransaction(transactionId);
    const remainingAmount = transaction.total - alreadyPaid;

    if (validInput.amount > remainingAmount) {
      throw new Error('Payment amount exceeds remaining balance');
    }

    // Create payment record
    const paymentData: Omit<ISalePayment, 'id' | 'receivedAt'> = {
      transactionId,
      tenantId,
      method: validInput.method,
      amount: validInput.amount,
    };

    // Add optional fields based on payment method
    if (validInput.cardTransactionId !== undefined) {
      paymentData.cardTransactionId = validInput.cardTransactionId;
    }
    if (validInput.cardLastFour !== undefined) {
      paymentData.cardLastFour = validInput.cardLastFour;
    }
    if (validInput.cardBrand !== undefined) {
      paymentData.cardBrand = validInput.cardBrand;
    }
    if (validInput.transferReference !== undefined) {
      paymentData.transferReference = validInput.transferReference;
    }
    if (validInput.voucherCode !== undefined) {
      paymentData.voucherCode = validInput.voucherCode;
    }

    const payment = await this.paymentRepository.create(paymentData);

    // Update transaction status
    const totalPaid = alreadyPaid + validInput.amount;
    const isFullyPaid = totalPaid >= transaction.total;

    const partialUpdateData: Partial<ISaleTransaction> = {
      paidAmount: totalPaid,
      paymentStatus: isFullyPaid ? PaymentStatus.PAID : PaymentStatus.PARTIAL,
      status: isFullyPaid ? SaleStatus.COMPLETED : transaction.status,
    };
    if (isFullyPaid) {
      partialUpdateData.completedAt = new Date();
    }
    await this.transactionRepository.update(transactionId, partialUpdateData);

    return {
      payment,
      transactionPaidAmount: totalPaid,
      transactionChangeAmount: 0,
      isFullyPaid,
    };
  }

  /**
   * Complete payment with inventory deduction
   * AC4: Inventory deduction
   */
  async completePayment(transactionId: string, tenantId: string): Promise<ICompletePaymentResult> {
    const transaction = await this.getTransaction(transactionId, tenantId);

    if (transaction.paymentStatus !== PaymentStatus.PAID) {
      throw new Error('Transaction is not fully paid');
    }

    // Get all items for the transaction
    const items = await this.saleItemRepository.findByTransaction(transactionId);

    const deductionResults: IInventoryDeductionResult[] = [];

    // Deduct inventory for each item
    for (const item of items) {
      if (item.inventoryDeducted) {
        // Skip already deducted items
        deductionResults.push({
          itemId: item.id,
          productId: item.productId,
          success: true,
        });
        continue;
      }

      const warehouseId = item.warehouseId ?? 'default';

      const deductResult = await this.inventoryService.deductStock({
        productId: item.productId,
        warehouseId,
        quantity: item.quantity,
        reference: transaction.transactionNumber,
        tenantId,
      });

      // Mark item as deducted regardless of success (we log errors but continue)
      if (deductResult.success) {
        await this.saleItemRepository.update(item.id, {
          inventoryDeducted: true,
        });
      }

      const itemResult: IInventoryDeductionResult = {
        itemId: item.id,
        productId: item.productId,
        success: deductResult.success,
      };
      if (deductResult.newQuantity !== undefined) {
        itemResult.newQuantity = deductResult.newQuantity;
      }
      if (deductResult.errorMessage !== undefined) {
        itemResult.errorMessage = deductResult.errorMessage;
      }
      deductionResults.push(itemResult);
    }

    return {
      transactionId,
      deductionResults,
      allDeductionsSuccessful: deductionResults.every(r => r.success),
    };
  }

  /**
   * Refund all payments for a voided transaction
   * AC5: Void refund
   */
  async refundPayments(transactionId: string, tenantId: string): Promise<void> {
    const transaction = await this.getTransaction(transactionId, tenantId);

    if (transaction.status !== SaleStatus.VOIDED) {
      throw new Error('Can only refund voided transactions');
    }

    // Get all payments
    const payments = await this.paymentRepository.findByTransaction(transactionId);

    // Refund card payments via MyPos
    for (const payment of payments) {
      if (payment.method === PaymentMethod.CARD && payment.cardTransactionId) {
        const refundResult = await this.myPosService.refundPayment(payment.cardTransactionId);
        if (!refundResult.success) {
          throw new Error(
            `Card refund failed for payment ${payment.id}: ${refundResult.errorMessage ?? 'Unknown error'}`
          );
        }
      }
    }

    // Delete all payment records
    await this.paymentRepository.deleteByTransaction(transactionId);
  }

  /**
   * Get payments for a transaction
   */
  async getPayments(transactionId: string, tenantId: string): Promise<ISalePayment[]> {
    await this.getTransaction(transactionId, tenantId);
    return this.paymentRepository.findByTransaction(transactionId);
  }

  /**
   * Get transaction with tenant validation
   */
  private async getTransaction(transactionId: string, tenantId: string) {
    const transaction = await this.transactionRepository.findById(transactionId);

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    return transaction;
  }

  /**
   * Validate transaction is eligible for payment
   */
  private async validateTransactionForPayment(transactionId: string, tenantId: string) {
    const transaction = await this.getTransaction(transactionId, tenantId);

    if (transaction.status !== SaleStatus.PENDING_PAYMENT) {
      throw new Error('Transaction is not in PENDING_PAYMENT status');
    }

    if (transaction.paymentStatus === PaymentStatus.PAID) {
      throw new Error('Transaction is already paid');
    }

    return transaction;
  }
}
