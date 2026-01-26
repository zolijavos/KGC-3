/**
 * @kgc/sales-pos - Sales POS Module
 * Epic 22: Point of Sale - Story 22-1 + 22-2
 */

import { Module } from '@nestjs/common';
import { CartService } from './services/cart.service.js';
import { PaymentService } from './services/payment.service.js';
import { SessionService } from './services/session.service.js';
import { TransactionService } from './services/transaction.service.js';

@Module({
  providers: [SessionService, CartService, TransactionService, PaymentService],
  exports: [SessionService, CartService, TransactionService, PaymentService],
})
export class SalesPosModule {}
