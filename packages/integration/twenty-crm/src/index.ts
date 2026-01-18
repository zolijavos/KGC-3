/**
 * @kgc/twenty-crm - Twenty CRM Integration Module
 * Epic 28: Twenty CRM Integration
 */

// Module
export { TwentyCrmModule } from './twenty-crm.module';

// Services
export { PartnerSyncService } from './services/partner-sync.service';
export type {
  IPartnerMappingRepository,
  IKgcPartnerService,
  ITwentyCrmClient,
  IAuditService as IPartnerSyncAuditService,
} from './services/partner-sync.service';

export { DashboardEmbedService } from './services/dashboard-embed.service';
export type {
  IDashboardConfigRepository,
  ITwentyCrmAuthClient,
  IConfigService,
  IUserService,
  IAuditService as IDashboardAuditService,
} from './services/dashboard-embed.service';

// Interfaces
export { SyncDirection, SyncStatus, EntityType } from './interfaces/twenty-crm.interface';
export type {
  ICrmPartner,
  ICrmAddress,
  ICrmContact,
  ICrmDeal,
  ICrmNote,
  ICrmActivity,
  IPartnerMapping,
  ISyncResult,
  ISyncError,
  IDashboardConfig,
  IEmbedToken,
} from './interfaces/twenty-crm.interface';

// DTOs
export {
  SyncDirectionEnum,
  EntityTypeEnum,
  SyncPartnersSchema,
  CreatePartnerMappingSchema,
  UpdatePartnerMappingSchema,
  SyncContactsSchema,
  CreateDashboardConfigSchema,
  UpdateDashboardConfigSchema,
  GenerateEmbedTokenSchema,
  WebhookPayloadSchema,
} from './dto/twenty-crm.dto';
export type {
  SyncPartnersDto,
  CreatePartnerMappingDto,
  UpdatePartnerMappingDto,
  SyncContactsDto,
  CreateDashboardConfigDto,
  UpdateDashboardConfigDto,
  GenerateEmbedTokenDto,
  WebhookPayloadDto,
} from './dto/twenty-crm.dto';
