/**
 * @kgc/service-norma - NormaVersionService
 * Epic 20: Story 20-3 - Norma Lista Frissites
 */

import { Injectable } from '@nestjs/common';
import { INormaVersion, NormaVersionStatus } from '../interfaces/norma.interface';
import { UpdateNormaVersionDto, UpdateNormaVersionSchema } from '../dto/norma.dto';
import { INormaVersionRepository, IAuditService } from './norma-import.service';

@Injectable()
export class NormaVersionService {
  constructor(
    private readonly versionRepository: INormaVersionRepository,
    private readonly auditService: IAuditService,
  ) {}

  async getActiveVersion(tenantId: string, supplier: string): Promise<INormaVersion | null> {
    return this.versionRepository.findActiveBySupplier(tenantId, supplier);
  }

  async getVersionById(versionId: string, tenantId: string): Promise<INormaVersion> {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new Error('Version not found');
    }
    if (version.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return version;
  }

  async activateVersion(
    versionId: string,
    tenantId: string,
    userId: string,
  ): Promise<INormaVersion> {
    const version = await this.getVersionById(versionId, tenantId);

    if (version.status === NormaVersionStatus.ACTIVE) {
      throw new Error('Version is already active');
    }

    // Archive current active version for this supplier
    const currentActive = await this.versionRepository.findActiveBySupplier(
      tenantId,
      version.supplier,
    );
    if (currentActive && currentActive.id !== versionId) {
      await this.versionRepository.update(currentActive.id, {
        status: NormaVersionStatus.ARCHIVED,
        effectiveTo: new Date(),
      });
    }

    const updatedVersion = await this.versionRepository.update(versionId, {
      status: NormaVersionStatus.ACTIVE,
      effectiveFrom: new Date(),
      effectiveTo: undefined,
    });

    await this.auditService.log({
      action: 'norma_version_activated',
      entityType: 'norma_version',
      entityId: versionId,
      userId,
      tenantId,
      metadata: {
        supplier: version.supplier,
        versionNumber: version.versionNumber,
        previousActiveId: currentActive?.id,
      },
    });

    return updatedVersion;
  }

  async archiveVersion(
    versionId: string,
    tenantId: string,
    userId: string,
  ): Promise<INormaVersion> {
    const version = await this.getVersionById(versionId, tenantId);

    if (version.status === NormaVersionStatus.ARCHIVED) {
      throw new Error('Version is already archived');
    }

    const updatedVersion = await this.versionRepository.update(versionId, {
      status: NormaVersionStatus.ARCHIVED,
      effectiveTo: new Date(),
    });

    await this.auditService.log({
      action: 'norma_version_archived',
      entityType: 'norma_version',
      entityId: versionId,
      userId,
      tenantId,
      metadata: {
        supplier: version.supplier,
        versionNumber: version.versionNumber,
      },
    });

    return updatedVersion;
  }

  async updateVersion(
    versionId: string,
    input: UpdateNormaVersionDto,
    tenantId: string,
    userId: string,
  ): Promise<INormaVersion> {
    const validationResult = UpdateNormaVersionSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const version = await this.getVersionById(versionId, tenantId);

    const updateData: Partial<INormaVersion> = {};
    if (input.effectiveTo !== undefined) {
      updateData.effectiveTo = input.effectiveTo;
    }
    if (input.status !== undefined) {
      updateData.status = input.status as NormaVersionStatus;
    }

    const updatedVersion = await this.versionRepository.update(versionId, updateData);

    await this.auditService.log({
      action: 'norma_version_updated',
      entityType: 'norma_version',
      entityId: versionId,
      userId,
      tenantId,
      metadata: {
        supplier: version.supplier,
        versionNumber: version.versionNumber,
        changes: input,
      },
    });

    return updatedVersion;
  }
}
