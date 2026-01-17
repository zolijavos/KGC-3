/**
 * @kgc/rental-checkout - Checkout Module
 * Epic 16: Deposit Management
 *
 * MyPosService requires external configuration:
 * - IMyPosConfig (API key, merchant ID, etc.)
 * - IHttpClient (HTTP adapter implementation)
 *
 * Use the service directly or configure via consuming module.
 */

import { Module } from '@nestjs/common';
import { DepositService } from './services/deposit.service';

@Module({
  providers: [DepositService],
  exports: [DepositService],
})
export class CheckoutModule {}
