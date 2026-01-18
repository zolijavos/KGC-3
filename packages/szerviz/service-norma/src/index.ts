/**
 * @kgc/service-norma - Public API
 * Epic 20: Service Standards for Makita warranty pricing
 */

// Module
export { ServiceNormaModule } from './service-norma.module';

// Interfaces
export {
  INormaVersion,
  INormaItem,
  INormaImportRow,
  INormaImportResult,
  INormaImportError,
  INormaLaborCalculation,
  NormaVersionStatus,
} from './interfaces/norma.interface';

// DTOs
export {
  ImportNormaListDto,
  ImportNormaListSchema,
  NormaImportRowDto,
  NormaImportRowSchema,
  CalculateLaborCostDto,
  CalculateLaborCostSchema,
  UpdateNormaVersionDto,
  UpdateNormaVersionSchema,
} from './dto/norma.dto';

// Services
export {
  NormaImportService,
  INormaVersionRepository,
  INormaItemRepository,
  IAuditService,
} from './services/norma-import.service';
export { NormaLaborService, IWorksheetRepository, IWorksheet } from './services/norma-labor.service';
export { NormaVersionService } from './services/norma-version.service';
