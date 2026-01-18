/**
 * @kgc/bevetelezes - Goods Receipt Module
 * Epic 21: Goods Receipt management
 */

import { Module } from '@nestjs/common';
import { AvizoService } from './services/avizo.service';
import { ReceiptService } from './services/receipt.service';
import { DiscrepancyService } from './services/discrepancy.service';

@Module({
  providers: [AvizoService, ReceiptService, DiscrepancyService],
  exports: [AvizoService, ReceiptService, DiscrepancyService],
})
export class BevetelezesModule {}
