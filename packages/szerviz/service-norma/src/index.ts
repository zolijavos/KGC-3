/**
 * @kgc/service-norma - Public API
 * Epic 20: Service Standards for Makita warranty pricing
 */

// Module
export { ServiceNormaModule } from './service-norma.module';

// Interfaces
export type {
  INormaVersion,
  INormaItem,
  INormaImportRow,
  INormaImportResult,
  INormaImportError,
  INormaLaborCalculation,
} from './interfaces/norma.interface';
export { NormaVersionStatus } from './interfaces/norma.interface';

// DTOs
export type {
  ImportNormaListDto,
  NormaImportRowDto,
  CalculateLaborCostDto,
  UpdateNormaVersionDto,
} from './dto/norma.dto';
export {
  ImportNormaListSchema,
  NormaImportRowSchema,
  CalculateLaborCostSchema,
  UpdateNormaVersionSchema,
} from './dto/norma.dto';

// Services
export { NormaImportService } from './services/norma-import.service';
export type { INormaVersionRepository, INormaItemRepository, IAuditService } from './services/norma-import.service';
export { NormaLaborService } from './services/norma-labor.service';
export type { IWorksheetRepository, IWorksheet } from './services/norma-labor.service';
export { NormaVersionService } from './services/norma-version.service';
