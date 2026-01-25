/**
 * Quote Module - NestJS Module for Quotation Management
 * Epic 18: Árajánlat (ADR-027)
 *
 * Provides:
 * - Quote CRUD operations
 * - Quote item management
 * - Status workflow (DRAFT → SENT → ACCEPTED/REJECTED → CONVERTED)
 * - PDF generation and email sending
 * - Quote to Worksheet conversion
 * - Statistics and reporting
 */

import { DynamicModule, Module, Provider } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Repositories
import {
  EXPLODED_VIEW_REPOSITORY,
  PrismaExplodedViewRepository,
  PrismaQuoteItemRepository,
  PrismaQuoteRepository,
  QUOTE_ITEM_REPOSITORY,
  QUOTE_REPOSITORY,
} from './repositories';

// Worksheet repositories for conversion (Epic 18-4)
import {
  PrismaWorksheetItemRepository,
  PrismaWorksheetRepository,
  WORKSHEET_ITEM_REPOSITORY,
  WORKSHEET_REPOSITORY,
} from '../service/repositories';

// Services
import { EMAIL_SERVICE, IEmailService, QuoteEmailService } from './services/quote-email.service';
import { QuotePdfService } from './services/quote-pdf.service';

// Controller
import { QuoteController } from './quote.controller';

export interface QuoteModuleOptions {
  prisma: PrismaClient;
  emailService?: IEmailService;
  /** Enable worksheet conversion (requires worksheet repositories) */
  enableWorksheetConversion?: boolean;
}

/** Injection token for PDF service */
export const QUOTE_PDF_SERVICE = 'QUOTE_PDF_SERVICE';

/** Injection token for Email service */
export const QUOTE_EMAIL_SERVICE = 'QUOTE_EMAIL_SERVICE';

@Module({})
export class QuoteModule {
  static forRoot(options: QuoteModuleOptions): DynamicModule {
    const providers: Provider[] = [
      // Prisma Client
      {
        provide: 'PRISMA_CLIENT',
        useValue: options.prisma,
      },

      // Repositories
      {
        provide: QUOTE_REPOSITORY,
        useClass: PrismaQuoteRepository,
      },
      {
        provide: QUOTE_ITEM_REPOSITORY,
        useClass: PrismaQuoteItemRepository,
      },
      // Exploded View Repository (Story 18-2)
      {
        provide: EXPLODED_VIEW_REPOSITORY,
        useClass: PrismaExplodedViewRepository,
      },

      // Services
      {
        provide: QUOTE_PDF_SERVICE,
        useClass: QuotePdfService,
      },
    ];

    // Add email service if provided
    if (options.emailService) {
      providers.push(
        {
          provide: EMAIL_SERVICE,
          useValue: options.emailService,
        },
        {
          provide: QUOTE_EMAIL_SERVICE,
          useClass: QuoteEmailService,
        }
      );
    }

    // Add worksheet repositories for conversion (Epic 18-4)
    if (options.enableWorksheetConversion !== false) {
      providers.push(
        {
          provide: WORKSHEET_REPOSITORY,
          useClass: PrismaWorksheetRepository,
        },
        {
          provide: WORKSHEET_ITEM_REPOSITORY,
          useClass: PrismaWorksheetItemRepository,
        }
      );
    }

    return {
      module: QuoteModule,
      controllers: [QuoteController],
      providers,
      exports: [
        QUOTE_REPOSITORY,
        QUOTE_ITEM_REPOSITORY,
        EXPLODED_VIEW_REPOSITORY,
        QUOTE_PDF_SERVICE,
        QUOTE_EMAIL_SERVICE,
        WORKSHEET_REPOSITORY,
        WORKSHEET_ITEM_REPOSITORY,
      ],
    };
  }
}
