/**
 * @kgc/twenty-crm - DashboardEmbedService
 * Epic 28: Story 28-2 - CRM Dashboard Embed
 */

import { Injectable } from '@nestjs/common';
import {
  IDashboardConfig,
  IEmbedToken,
} from '../interfaces/twenty-crm.interface';
import {
  CreateDashboardConfigDto,
  CreateDashboardConfigSchema,
  UpdateDashboardConfigDto,
  UpdateDashboardConfigSchema,
  GenerateEmbedTokenDto,
  GenerateEmbedTokenSchema,
} from '../dto/twenty-crm.dto';
import { randomBytes } from 'crypto';

export interface IDashboardConfigRepository {
  create(data: Partial<IDashboardConfig>): Promise<IDashboardConfig>;
  findById(id: string): Promise<IDashboardConfig | null>;
  findByTenantId(tenantId: string): Promise<IDashboardConfig[]>;
  findActiveByTenantId(tenantId: string): Promise<IDashboardConfig[]>;
  update(id: string, data: Partial<IDashboardConfig>): Promise<IDashboardConfig>;
  delete(id: string): Promise<void>;
}

export interface ITwentyCrmAuthClient {
  validateDashboardAccess(dashboardId: string): Promise<boolean>;
  generateEmbedSignature(
    dashboardId: string,
    permissions: string[],
    expiresAt: Date,
  ): Promise<string>;
}

export interface IConfigService {
  get(key: string): string | undefined;
}

export interface IUserService {
  hasPermission(userId: string, permission: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<string[]>;
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
export class DashboardEmbedService {
  constructor(
    private readonly configRepository: IDashboardConfigRepository,
    private readonly crmAuthClient: ITwentyCrmAuthClient,
    private readonly configService: IConfigService,
    private readonly userService: IUserService,
    private readonly auditService: IAuditService,
  ) {}

  async createDashboardConfig(
    input: CreateDashboardConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<IDashboardConfig> {
    const validationResult = CreateDashboardConfigSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    // Validate CRM dashboard exists and is accessible
    const hasAccess = await this.crmAuthClient.validateDashboardAccess(validInput.crmDashboardId);
    if (!hasAccess) {
      throw new Error('CRM dashboard not found or not accessible');
    }

    const config = await this.configRepository.create({
      tenantId,
      name: validInput.name,
      crmDashboardId: validInput.crmDashboardId,
      embedUrl: validInput.embedUrl,
      width: validInput.width || '100%',
      height: validInput.height || '600px',
      refreshInterval: validInput.refreshInterval,
      permissions: validInput.permissions,
      isActive: validInput.isActive,
    });

    await this.auditService.log({
      action: 'dashboard_config_created',
      entityType: 'dashboard_config',
      entityId: config.id,
      userId,
      tenantId,
      metadata: {
        name: validInput.name,
        crmDashboardId: validInput.crmDashboardId,
      },
    });

    return config;
  }

  async updateDashboardConfig(
    configId: string,
    input: UpdateDashboardConfigDto,
    tenantId: string,
    userId: string,
  ): Promise<IDashboardConfig> {
    const validationResult = UpdateDashboardConfigSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const config = await this.configRepository.findById(configId);
    if (!config) {
      throw new Error('Dashboard config not found');
    }
    if (config.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const validInput = validationResult.data;

    // If changing CRM dashboard, validate access
    if (validInput.crmDashboardId && validInput.crmDashboardId !== config.crmDashboardId) {
      const hasAccess = await this.crmAuthClient.validateDashboardAccess(validInput.crmDashboardId);
      if (!hasAccess) {
        throw new Error('CRM dashboard not found or not accessible');
      }
    }

    const updatedConfig = await this.configRepository.update(configId, {
      ...(validInput.name && { name: validInput.name }),
      ...(validInput.crmDashboardId && { crmDashboardId: validInput.crmDashboardId }),
      ...(validInput.embedUrl && { embedUrl: validInput.embedUrl }),
      ...(validInput.width && { width: validInput.width }),
      ...(validInput.height && { height: validInput.height }),
      ...(validInput.refreshInterval !== undefined && { refreshInterval: validInput.refreshInterval }),
      ...(validInput.permissions && { permissions: validInput.permissions }),
      ...(validInput.isActive !== undefined && { isActive: validInput.isActive }),
    });

    await this.auditService.log({
      action: 'dashboard_config_updated',
      entityType: 'dashboard_config',
      entityId: configId,
      userId,
      tenantId,
      metadata: { changes: Object.keys(validInput) },
    });

    return updatedConfig;
  }

  async deleteDashboardConfig(
    configId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const config = await this.configRepository.findById(configId);
    if (!config) {
      throw new Error('Dashboard config not found');
    }
    if (config.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    await this.configRepository.delete(configId);

    await this.auditService.log({
      action: 'dashboard_config_deleted',
      entityType: 'dashboard_config',
      entityId: configId,
      userId,
      tenantId,
      metadata: { name: config.name },
    });
  }

  async generateEmbedToken(
    input: GenerateEmbedTokenDto,
    tenantId: string,
    userId: string,
  ): Promise<IEmbedToken> {
    const validationResult = GenerateEmbedTokenSchema.safeParse(input);
    if (!validationResult.success) {
      throw new Error(`Validation failed: ${validationResult.error.message}`);
    }

    const validInput = validationResult.data;

    const config = await this.configRepository.findById(validInput.dashboardId);
    if (!config) {
      throw new Error('Dashboard config not found');
    }
    if (config.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    if (!config.isActive) {
      throw new Error('Dashboard is not active');
    }

    // Check user has required permissions
    const userPermissions = await this.userService.getUserPermissions(userId);
    const hasRequiredPermissions = config.permissions.length === 0 ||
      config.permissions.some((p) => userPermissions.includes(p));

    if (!hasRequiredPermissions) {
      throw new Error('Insufficient permissions to access dashboard');
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + validInput.expiresInMinutes);

    // Generate secure token
    const signature = await this.crmAuthClient.generateEmbedSignature(
      config.crmDashboardId,
      userPermissions,
      expiresAt,
    );

    const tokenPayload = {
      dashboardId: config.crmDashboardId,
      tenantId,
      userId,
      permissions: userPermissions.filter((p) =>
        config.permissions.length === 0 || config.permissions.includes(p),
      ),
      expiresAt: expiresAt.toISOString(),
      nonce: randomBytes(16).toString('hex'),
    };

    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url') + '.' + signature;

    await this.auditService.log({
      action: 'embed_token_generated',
      entityType: 'embed_token',
      entityId: config.id,
      userId,
      tenantId,
      metadata: {
        dashboardName: config.name,
        expiresAt,
        expiresInMinutes: validInput.expiresInMinutes,
      },
    });

    return {
      token,
      expiresAt,
      dashboardId: config.id,
      permissions: tokenPayload.permissions,
    };
  }

  async getDashboardConfigs(tenantId: string): Promise<IDashboardConfig[]> {
    return this.configRepository.findByTenantId(tenantId);
  }

  async getActiveDashboards(tenantId: string, userId: string): Promise<IDashboardConfig[]> {
    const configs = await this.configRepository.findActiveByTenantId(tenantId);
    const userPermissions = await this.userService.getUserPermissions(userId);

    // Filter dashboards user has access to
    return configs.filter((config) =>
      config.permissions.length === 0 ||
      config.permissions.some((p) => userPermissions.includes(p)),
    );
  }

  async getDashboardById(
    configId: string,
    tenantId: string,
  ): Promise<IDashboardConfig | null> {
    const config = await this.configRepository.findById(configId);
    if (!config) {
      return null;
    }
    if (config.tenantId !== tenantId) {
      throw new Error('Access denied');
    }
    return config;
  }

  async getEmbedUrl(
    configId: string,
    tenantId: string,
    userId: string,
  ): Promise<{ url: string; token: string; config: IDashboardConfig }> {
    const config = await this.configRepository.findById(configId);
    if (!config) {
      throw new Error('Dashboard config not found');
    }
    if (config.tenantId !== tenantId) {
      throw new Error('Access denied');
    }

    const tokenResult = await this.generateEmbedToken(
      { dashboardId: configId, expiresInMinutes: 60 },
      tenantId,
      userId,
    );

    const embedUrl = `${config.embedUrl}?token=${encodeURIComponent(tokenResult.token)}`;

    return {
      url: embedUrl,
      token: tokenResult.token,
      config,
    };
  }
}
