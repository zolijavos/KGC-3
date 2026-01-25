/**
 * Quote Module Exports
 * Epic 18: Árajánlat
 */

// Module
export { QUOTE_EMAIL_SERVICE, QUOTE_PDF_SERVICE, QuoteModule } from './quote.module';
export type { QuoteModuleOptions } from './quote.module';

// Controller
export { QuoteController } from './quote.controller';

// Repositories
export {
  EXPLODED_VIEW_REPOSITORY,
  PrismaExplodedViewRepository,
  PrismaQuoteItemRepository,
  PrismaQuoteRepository,
  QUOTE_ITEM_REPOSITORY,
  QUOTE_REPOSITORY,
  QuoteStatus,
  type ExplodedViewFilterDto,
  type IExplodedView,
  type IExplodedViewHotspot,
  type IExplodedViewRepository,
  type IPartSelection,
  type IQuote,
  type IQuoteItem,
  type IQuoteItemRepository,
  type IQuoteRepository,
  type QuoteFilterDto,
} from './repositories';

// Services
export {
  QuotePdfService,
  type QuoteCompanyInfo,
  type QuotePartnerInfo,
  type QuotePdfOptions,
} from './services/quote-pdf.service';

export {
  EMAIL_SERVICE,
  QuoteEmailService,
  type IEmailAttachment,
  type IEmailMessage,
  type IEmailService,
  type QuoteEmailOptions,
  type QuoteEmailPartnerInfo,
} from './services/quote-email.service';
