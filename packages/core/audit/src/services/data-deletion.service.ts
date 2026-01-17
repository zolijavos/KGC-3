import { Inject, Injectable } from '@nestjs/common';
import type { IDeletionRequestRepository } from '../interfaces/data-deletion.interface';
import type {
  IDataDeletionService,
  EntityDeletionConfig,
  CreateDeletionRequestInput,
  DeletionRequest,
  DeletionResult,
  DeletionLogEntry,
  DeletionRequestQueryOptions,
} from '../interfaces/data-deletion.interface';
import type { AuditEntityType } from '../interfaces/audit.interface';
import { AuditService } from './audit.service';

export const DELETION_REQUEST_REPOSITORY = Symbol('DELETION_REQUEST_REPOSITORY');

/**
 * Data Deletion Service - GDPR Cascade Delete Implementation
 * FR68: GDPR elfeledtetési jog támogatása
 */
@Injectable()
export class DataDeletionService implements IDataDeletionService {
  private entityConfigs = new Map<AuditEntityType, EntityDeletionConfig>();

  constructor(
    @Inject(DELETION_REQUEST_REPOSITORY)
    private readonly repository: IDeletionRequestRepository,
    private readonly auditService: AuditService
  ) {}

  /**
   * Register entity deletion configuration
   */
  registerEntity(config: EntityDeletionConfig): void {
    this.entityConfigs.set(config.entityType, config);
  }

  /**
   * Get entity configuration (internal helper)
   */
  getEntityConfig(entityType: AuditEntityType): EntityDeletionConfig | undefined {
    return this.entityConfigs.get(entityType);
  }

  /**
   * Create a deletion request
   */
  async createRequest(input: CreateDeletionRequestInput): Promise<DeletionRequest> {
    const config = this.entityConfigs.get(input.entityType);

    if (!config) {
      throw new Error(
        `No deletion configuration registered for entity type: ${input.entityType}`
      );
    }

    // Use provided strategy or default from config
    const strategy = input.strategy ?? config.strategy;

    // Create the request
    const request = await this.repository.create({
      ...input,
      strategy,
    });

    // Audit log the request creation
    await this.auditService.log({
      tenantId: input.tenantId,
      userId: input.requesterId,
      action: 'DELETE',
      entityType: input.entityType,
      entityId: input.entityId,
      reason: `Deletion request created: ${input.reason}`,
      metadata: {
        requestId: request.id,
        strategy,
        subjectId: input.subjectId,
      },
    });

    return request;
  }

  /**
   * Process a pending deletion request
   */
  async processRequest(requestId: string, tenantId: string): Promise<DeletionResult> {
    const request = await this.repository.findById(requestId, tenantId);

    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request already processed');
    }

    // Update to processing
    await this.repository.updateStatus(requestId, tenantId, 'PROCESSING');

    const deletionLog: DeletionLogEntry[] = [];
    let deletedCount = 0;
    let anonymizedCount = 0;
    let retainedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    try {
      const config = this.entityConfigs.get(request.entityType);

      if (!config) {
        throw new Error(`No configuration for entity type: ${request.entityType}`);
      }

      // Process based on strategy
      const logEntry = await this.executeStrategy(
        request.entityType,
        request.entityId,
        request.strategy,
        config.anonymizeFields
      );

      deletionLog.push(logEntry);

      switch (logEntry.action) {
        case 'DELETED':
          deletedCount++;
          break;
        case 'ANONYMIZED':
          anonymizedCount++;
          break;
        case 'RETAINED':
          retainedCount++;
          break;
        case 'FAILED':
          failedCount++;
          if (logEntry.error) {
            errors.push(logEntry.error);
          }
          break;
      }

      // Process dependent entities
      if (config.dependentEntities) {
        for (const dep of config.dependentEntities) {
          const depLogEntry = await this.executeStrategy(
            dep.entityType,
            request.entityId, // Use parent entity ID for lookup
            dep.strategy
          );
          deletionLog.push(depLogEntry);

          switch (depLogEntry.action) {
            case 'DELETED':
              deletedCount++;
              break;
            case 'ANONYMIZED':
              anonymizedCount++;
              break;
            case 'RETAINED':
              retainedCount++;
              break;
          }
        }
      }

      // Update status to completed
      const finalStatus = failedCount > 0 ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
      await this.repository.updateStatus(requestId, tenantId, finalStatus);

      return {
        success: failedCount === 0,
        requestId,
        status: finalStatus,
        deletedEntities: deletedCount,
        anonymizedEntities: anonymizedCount,
        retainedEntities: retainedCount,
        failedEntities: failedCount,
        errors,
        deletionLog,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.repository.updateStatus(requestId, tenantId, 'FAILED', undefined, errorMessage);

      return {
        success: false,
        requestId,
        status: 'FAILED',
        deletedEntities: deletedCount,
        anonymizedEntities: anonymizedCount,
        retainedEntities: retainedCount,
        failedEntities: 1,
        errors: [errorMessage],
        deletionLog,
      };
    }
  }

  /**
   * Get deletion request by ID
   */
  async getRequest(requestId: string, tenantId: string): Promise<DeletionRequest | null> {
    return this.repository.findById(requestId, tenantId);
  }

  /**
   * Query deletion requests
   */
  async queryRequests(options: DeletionRequestQueryOptions): Promise<DeletionRequest[]> {
    return this.repository.query(options);
  }

  /**
   * Cancel a pending deletion request
   */
  async cancelRequest(requestId: string, tenantId: string, reason: string): Promise<void> {
    const request = await this.repository.findById(requestId, tenantId);

    if (!request) {
      throw new Error('Deletion request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Cannot cancel request in status: ${request.status}`);
    }

    const logEntry: DeletionLogEntry = {
      entityType: request.entityType,
      entityId: request.entityId,
      action: 'FAILED',
      timestamp: new Date(),
      error: `Cancelled: ${reason}`,
    };

    await this.repository.updateStatus(
      requestId,
      tenantId,
      'FAILED',
      logEntry,
      `Cancelled: ${reason}`
    );
  }

  /**
   * Get dependent entities that would be affected
   */
  async getDependentEntities(
    entityType: AuditEntityType,
    _entityId: string,
    _tenantId: string
  ): Promise<{ entityType: AuditEntityType; count: number }[]> {
    const config = this.entityConfigs.get(entityType);

    if (!config || !config.dependentEntities) {
      return [];
    }

    // Return configured dependencies (actual count would require DB lookup)
    return config.dependentEntities.map((dep) => ({
      entityType: dep.entityType,
      count: 0, // Would be populated by actual DB query
    }));
  }

  /**
   * Anonymize a specific entity without deletion
   */
  async anonymizeEntity(
    entityType: AuditEntityType,
    entityId: string,
    _tenantId: string,
    _fields?: string[]
  ): Promise<DeletionLogEntry> {
    // In real implementation, this would update the database
    return {
      entityType,
      entityId,
      action: 'ANONYMIZED',
      timestamp: new Date(),
    };
  }

  /**
   * Execute deletion strategy for an entity
   */
  private async executeStrategy(
    entityType: AuditEntityType,
    entityId: string,
    strategy: string,
    _anonymizeFields?: string[]
  ): Promise<DeletionLogEntry> {
    const timestamp = new Date();

    switch (strategy) {
      case 'CASCADE':
        // In real implementation, this would delete from database
        return {
          entityType,
          entityId,
          action: 'DELETED',
          timestamp,
          affectedRows: 1,
        };

      case 'ANONYMIZE':
        // In real implementation, this would update fields in database
        return {
          entityType,
          entityId,
          action: 'ANONYMIZED',
          timestamp,
          affectedRows: 1,
        };

      case 'SOFT_DELETE':
        // In real implementation, this would set deleted_at timestamp
        return {
          entityType,
          entityId,
          action: 'SOFT_DELETED',
          timestamp,
          affectedRows: 1,
        };

      case 'RETAIN':
        // Data is kept for legal/compliance reasons
        return {
          entityType,
          entityId,
          action: 'RETAINED',
          timestamp,
        };

      default:
        return {
          entityType,
          entityId,
          action: 'FAILED',
          timestamp,
          error: `Unknown strategy: ${strategy}`,
        };
    }
  }
}
