/**
 * @kgc/sales-quote - SalesQuoteModule
 * Epic 18
 */

import { Module } from '@nestjs/common';
import { QuoteService } from './services/quote.service';
import { ExplodedViewService } from './services/exploded-view.service';
import { QuoteExportService } from './services/quote-export.service';
import { QuoteAcceptanceService } from './services/quote-acceptance.service';

@Module({
  providers: [
    QuoteService,
    ExplodedViewService,
    QuoteExportService,
    QuoteAcceptanceService,
  ],
  exports: [
    QuoteService,
    ExplodedViewService,
    QuoteExportService,
    QuoteAcceptanceService,
  ],
})
export class SalesQuoteModule {}
