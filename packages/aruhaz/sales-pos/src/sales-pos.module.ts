/**
 * @kgc/sales-pos - Sales POS Module
 * Epic 22: Point of Sale - Story 22-1
 */

import { Module } from '@nestjs/common';
import { CartService } from './services/cart.service.js';
import { SessionService } from './services/session.service.js';
import { TransactionService } from './services/transaction.service.js';

@Module({
  providers: [SessionService, CartService, TransactionService],
  exports: [SessionService, CartService, TransactionService],
})
export class SalesPosModule {}
