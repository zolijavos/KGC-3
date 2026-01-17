import { Module } from '@nestjs/common';
import { TemplateService } from './services/template.service';
import { PdfService } from './services/pdf.service';
import { SignatureService } from './services/signature.service';
import { ArchiveService } from './services/archive.service';
import { ContractService } from './services/contract.service';

/**
 * @kgc/rental-contract - Contract Module
 * Epic 15: Bérlési szerződés kezelés NestJS module
 */
@Module({
  providers: [
    TemplateService,
    PdfService,
    SignatureService,
    ArchiveService,
    ContractService,
  ],
  exports: [
    TemplateService,
    PdfService,
    SignatureService,
    ArchiveService,
    ContractService,
  ],
})
export class ContractModule {}
