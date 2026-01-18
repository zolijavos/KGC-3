/**
 * @kgc/twenty-crm - PartnerSyncService
 * Epic 28: Story 28-1 - Partner Szinkronizalas
 */

import { Injectable } from '@nestjs/common';
import {
  ICrmPartner,
  ICrmContact,
  IPartnerMapping,
  ISyncResult,
  ISyncError,
  SyncDirection,
  SyncStatus,
  EntityType,
} from '../interfaces/twenty-crm.interface';
import {
  SyncPartnersDto,
  SyncPartnersSchema,
  CreatePartnerMappingDto,
  CreatePartnerMappingSchema,
} from '../dto/twenty-crm.dto';

export interface IPartnerMappingRepository {
  create(data: Partial<IPartnerMapping>): Promise<IPartnerMapping>;
  findById(id: string): Promise<IPartnerMapping | null>;
  findByKgcPartnerId(tenantId: string, kgcPartnerId: string): Promise<IPartnerMapping | null>;
  findByCrmPartnerId(tenantId: string, crmPartnerId: string): Promise<IPartnerMapping | null>;
  findByTenantId(tenantId: string): Promise<IPartnerMapping[]>;
  update(id: string, data: Partial<IPartnerMapping>): Promise<IPartnerMapping>;
  delete(id: string): Promise<void>;
}

export interface IKgcPartnerService {
  findById(id: string): Promise<{
    id: string;
    type: 'PERSON' | 'COMPANY';
    name: string;
    email?: string;
    phone?: string;
    taxNumber?: string;
    address?: { street?: string; city?: string; postalCode?: string; country?: string };
    updatedAt: Date;
  } | null>;
  findByTenantId(tenantId: string): Promise<Array<{
    id: string;
    type: 'PERSON' | 'COMPANY';
    name: string;
    email?: string;
    updatedAt: Date;
  }>>;
  findModifiedSince(tenantId: string, since: Date): Promise<Array<{ id: string; updatedAt: Date }>>;
  updateFromCrm(id: string, data: Partial<ICrmPartner>): Promise<void>;
}

export interface ITwentyCrmClient {
  createPartner(partner: Partial<ICrmPartner>): Promise<ICrmPartner>;
  updatePartner(id: string, partner: Partial<ICrmPartner>): Promise<ICrmPartner>;
  getPartner(id: string): Promise<ICrmPartner | null>;
  getPartners(filter?: { modifiedSince?: Date }): Promise<ICrmPartner[]>;
  deletePartner(id: string): Promise<void>;
  createContact(contact: Partial<ICrmContact>): Promise<ICrmContact>;
  getContactsByPartner(partnerId: string): Promise<ICrmContact[]>;
}

export interface IAuditService {
  log(entry: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    tenantId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

@Injectable()
export class PartnerSyncService {
  constructor(
    private readonly mappingRepository: IPartnerMappingRepository,
    private readonly kgcPartnerService: IKgcPartnerService,
    private readonly crmClient: ITwentyCrmClient,
    private readonly auditService: IAuditService,
  ) {}

  async syncPartners(
    input: SyncPartnersDto,
    tenantId: string,
    userId: string,
  ): Promise<ISyncResult> {
    const startTime = Date.now();

    const validationResult = SyncPartnersSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;
    const direction = validInput.direction as SyncDirection;
    const errors: ISyncError[] = [];
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Get partners to sync
    let partnerIds: string[];
    if (validInput.partnerIds && validInput.partnerIds.length > 0) {
      partnerIds = validInput.partnerIds;
    } else {
      const partners = await this.kgcPartnerService.findByTenantId(tenantId);
      partnerIds = partners.map((p) => p.id);
    }

    // Sync each partner
    for (const partnerId of partnerIds) {
      try {
        const mapping = await this.mappingRepository.findByKgcPartnerId(tenantId, partnerId);

        if (direction === SyncDirection.KGC_TO_CRM || direction === SyncDirection.BIDIRECTIONAL) {
          await this.syncPartnerToCrm(partnerId, tenantId, mapping);
        }

        if (direction === SyncDirection.CRM_TO_KGC || direction === SyncDirection.BIDIRECTIONAL) {
          if (mapping) {
            await this.syncPartnerFromCrm(mapping, tenantId);
          } else {
            skippedCount++;
            continue;
          }
        }

        // Sync contacts if requested
        if (validInput.includeContacts && mapping) {
          await this.syncContactsForPartner(partnerId, mapping.crmPartnerId, tenantId, direction);
        }

        successCount++;
      } catch (error) {
        failedCount++;
        errors.push({
          entityId: partnerId,
          entityType: EntityType.PARTNER,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const result: ISyncResult = {
      direction,
      entityType: EntityType.PARTNER,
      totalCount: partnerIds.length,
      successCount,
      failedCount,
      skippedCount,
      errors,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
    };

    await this.auditService.log({
      action: 'partner_sync_completed',
      entityType: 'sync',
      entityId: `sync-${Date.now()}`,
      userId,
      tenantId,
      metadata: {
        direction,
        totalCount: partnerIds.length,
        successCount,
        failedCount,
        skippedCount,
        durationMs: result.durationMs,
      },
    });

    return result;
  }

  async createMapping(
    input: CreatePartnerMappingDto,
    tenantId: string,
    userId: string,
  ): Promise<IPartnerMapping> {
    const validationResult = CreatePartnerMappingSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Check if mapping already exists
    const existingMapping = await this.mappingRepository.findByKgcPartnerId(
      tenantId,
      validInput.kgcPartnerId,
    );
    if (existingMapping) {
      throw new Error('Partner mapping already exists');
    }

    // Verify KGC partner exists
    const kgcPartner = await this.kgcPartnerService.findById(validInput.kgcPartnerId);
    if (!kgcPartner) {
      throw new Error('KGC partner not found');
    }

    // Verify CRM partner exists
    const crmPartner = await this.crmClient.getPartner(validInput.crmPartnerId);
    if (!crmPartner) {
      throw new Error('CRM partner not found');
    }

    const mapping = await this.mappingRepository.create({
      tenantId,
      kgcPartnerId: validInput.kgcPartnerId,
      crmPartnerId: validInput.crmPartnerId,
      syncStatus: SyncStatus.PENDING,
    });

    await this.auditService.log({
      action: 'partner_mapping_created',
      entityType: 'partner_mapping',
      entityId: mapping.id,
      userId,
      tenantId,
      metadata: {
        kgcPartnerId: validInput.kgcPartnerId,
        crmPartnerId: validInput.crmPartnerId,
      },
    });

    return mapping;
  }

  async autoLinkByEmail(tenantId: string, userId: string): Promise<{
    linked: number;
    skipped: number;
    errors: string[];
  }> {
    const kgcPartners = await this.kgcPartnerService.findByTenantId(tenantId);
    const crmPartners = await this.crmClient.getPartners();

    let linked = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const kgcPartner of kgcPartners) {
      if (!kgcPartner.email) {
        skipped++;
        continue;
      }

      // Check if already mapped
      const existingMapping = await this.mappingRepository.findByKgcPartnerId(tenantId, kgcPartner.id);
      if (existingMapping) {
        skipped++;
        continue;
      }

      // Find matching CRM partner by email
      const matchingCrmPartner = crmPartners.find(
        (crm) => crm.email?.toLowerCase() === kgcPartner.email?.toLowerCase(),
      );

      if (matchingCrmPartner) {
        try {
          await this.mappingRepository.create({
            tenantId,
            kgcPartnerId: kgcPartner.id,
            crmPartnerId: matchingCrmPartner.id,
            syncStatus: SyncStatus.COMPLETED,
            lastSyncedAt: new Date(),
          });
          linked++;
        } catch (error) {
          errors.push(`Failed to link ${kgcPartner.name}: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      } else {
        skipped++;
      }
    }

    await this.auditService.log({
      action: 'partner_auto_link_completed',
      entityType: 'auto_link',
      entityId: `auto-link-${Date.now()}`,
      userId,
      tenantId,
      metadata: { linked, skipped, errorCount: errors.length },
    });

    return { linked, skipped, errors };
  }

  async getMappings(tenantId: string): Promise<IPartnerMapping[]> {
    return this.mappingRepository.findByTenantId(tenantId);
  }

  async deleteMapping(mappingId: string, tenantId: string, userId: string): Promise<void> {
    const mapping = await this.mappingRepository.findById(mappingId);
    if (!mapping) {
      throw new Error('Mapping not found');
    }
    if (mapping.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    await this.mappingRepository.delete(mappingId);

    await this.auditService.log({
      action: 'partner_mapping_deleted',
      entityType: 'partner_mapping',
      entityId: mappingId,
      userId,
      tenantId,
      metadata: {
        kgcPartnerId: mapping.kgcPartnerId,
        crmPartnerId: mapping.crmPartnerId,
      },
    });
  }

  private async syncPartnerToCrm(
    kgcPartnerId: string,
    tenantId: string,
    existingMapping: IPartnerMapping | null,
  ): Promise<void> {
    const kgcPartner = await this.kgcPartnerService.findById(kgcPartnerId);
    if (!kgcPartner) {
      throw new Error('KGC partner not found');
    }

    const crmPartnerData: Partial<ICrmPartner> = {
      type: kgcPartner.type,
      name: kgcPartner.name,
    };
    if (kgcPartner.email) {
      crmPartnerData.email = kgcPartner.email;
    }
    if (kgcPartner.phone) {
      crmPartnerData.phone = kgcPartner.phone;
    }
    if (kgcPartner.taxNumber) {
      crmPartnerData.taxNumber = kgcPartner.taxNumber;
    }
    if (kgcPartner.address) {
      crmPartnerData.address = kgcPartner.address;
    }

    if (existingMapping) {
      // Update existing CRM partner
      await this.crmClient.updatePartner(existingMapping.crmPartnerId, crmPartnerData);
      await this.mappingRepository.update(existingMapping.id, {
        syncStatus: SyncStatus.COMPLETED,
        lastSyncedAt: new Date(),
      });
    } else {
      // Create new CRM partner
      const crmPartner = await this.crmClient.createPartner(crmPartnerData);
      await this.mappingRepository.create({
        tenantId,
        kgcPartnerId,
        crmPartnerId: crmPartner.id,
        syncStatus: SyncStatus.COMPLETED,
        lastSyncedAt: new Date(),
      });
    }
  }

  private async syncPartnerFromCrm(
    mapping: IPartnerMapping,
    _tenantId: string,
  ): Promise<void> {
    const crmPartner = await this.crmClient.getPartner(mapping.crmPartnerId);
    if (!crmPartner) {
      await this.mappingRepository.update(mapping.id, {
        syncStatus: SyncStatus.FAILED,
        syncError: 'CRM partner not found',
      });
      throw new Error('CRM partner not found');
    }

    await this.kgcPartnerService.updateFromCrm(mapping.kgcPartnerId, crmPartner);
    await this.mappingRepository.update(mapping.id, {
      syncStatus: SyncStatus.COMPLETED,
      lastSyncedAt: new Date(),
    });
  }

  private async syncContactsForPartner(
    _kgcPartnerId: string,
    crmPartnerId: string,
    _tenantId: string,
    _direction: SyncDirection,
  ): Promise<void> {
    // This is a placeholder for contact synchronization
    // In a real implementation, this would sync contacts between systems
    const contacts = await this.crmClient.getContactsByPartner(crmPartnerId);
    // Process contacts based on direction
    if (contacts.length > 0) {
      // Contacts found, could be synced
    }
  }
}
