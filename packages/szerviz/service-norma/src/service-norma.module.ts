/**
 * @kgc/service-norma - NestJS Module
 * Epic 20: Service Standards for Makita warranty pricing
 */

import { Module } from '@nestjs/common';
import { NormaImportService } from './services/norma-import.service';
import { NormaLaborService } from './services/norma-labor.service';
import { NormaVersionService } from './services/norma-version.service';

@Module({
  providers: [NormaImportService, NormaLaborService, NormaVersionService],
  exports: [NormaImportService, NormaLaborService, NormaVersionService],
})
export class ServiceNormaModule {}
