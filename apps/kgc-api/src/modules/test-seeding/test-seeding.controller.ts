/**
 * Test Seeding Controller
 * Sprint 0 Blocker #1: Test Data Seeding API
 *
 * Provides endpoints for creating and cleaning up test data in E2E tests.
 * ONLY AVAILABLE IN: development, staging, test environments
 *
 * Endpoints:
 * - POST /api/test/seed - Create test data
 * - DELETE /api/test/cleanup - Clean up test data
 * - GET /api/test/health - Check if test API is available
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaClient, Role } from '@prisma/client';
import { InventoryFactory, PartnerFactory, TenantFactory, UserFactory } from './factories';
import {
  SeededInventoryItem,
  SeededPartner,
  TestCleanupRequest,
  TestCleanupResponse,
  TestSeedRequest,
  TestSeedResponse,
} from './types';

const ALLOWED_ENVIRONMENTS = ['development', 'staging', 'test'];

@ApiTags('test')
@Controller('test')
export class TestSeedingController {
  private readonly logger = new Logger(TestSeedingController.name);
  private readonly tenantFactory: TenantFactory;
  private readonly userFactory: UserFactory;
  private readonly partnerFactory: PartnerFactory;
  private readonly inventoryFactory: InventoryFactory;

  constructor(@Inject('PRISMA_CLIENT') private readonly prisma: PrismaClient) {
    this.tenantFactory = new TenantFactory(prisma);
    this.userFactory = new UserFactory(prisma);
    this.partnerFactory = new PartnerFactory(prisma);
    this.inventoryFactory = new InventoryFactory(prisma);
  }

  /**
   * Environment guard - throws if not in allowed environment
   */
  private guardEnvironment(): void {
    const env = process.env['NODE_ENV'] ?? 'production';
    if (!ALLOWED_ENVIRONMENTS.includes(env)) {
      this.logger.warn(`Test API access denied in environment: ${env}`);
      throw new ForbiddenException(
        `Test API is only available in: ${ALLOWED_ENVIRONMENTS.join(', ')}`
      );
    }
  }

  /**
   * Health check for test API
   */
  @Get('health')
  @ApiOperation({ summary: 'Check if test API is available' })
  @ApiResponse({ status: 200, description: 'Test API is available' })
  @ApiResponse({ status: 403, description: 'Test API not available in this environment' })
  health() {
    this.guardEnvironment();

    return {
      status: 'available',
      environment: process.env['NODE_ENV'],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Create test data for E2E tests
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create test data for E2E tests' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['testRunId'],
      properties: {
        testRunId: { type: 'string', description: 'Unique identifier for this test run' },
        tenant: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            slug: { type: 'string' },
          },
        },
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string', enum: Object.values(Role) },
            },
          },
        },
        partners: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
        inventoryItems: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              sku: { type: 'string' },
              name: { type: 'string' },
              currentStock: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Test data created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  async seed(@Body() request: TestSeedRequest): Promise<TestSeedResponse> {
    this.guardEnvironment();

    if (!request.testRunId) {
      throw new BadRequestException('testRunId is required');
    }

    this.logger.log(`Starting test seed for run: ${request.testRunId}`);

    const response: TestSeedResponse = {
      success: true,
      testRunId: request.testRunId,
      createdAt: new Date().toISOString(),
      users: [],
      partners: [],
      inventoryItems: [],
      rentals: [],
      worksheets: [],
    };

    try {
      // 1. Create tenant (or use existing)
      let tenantId: string;
      if (request.tenant) {
        const tenant = await this.tenantFactory.create(request.testRunId, request.tenant);
        response.tenant = tenant;
        tenantId = tenant.id;
        this.logger.log(`Created test tenant: ${tenant.slug}`);
      } else {
        // Use first active tenant as fallback
        const existing = await this.prisma.tenant.findFirst({
          where: { status: 'ACTIVE' },
        });
        if (!existing) {
          throw new BadRequestException(
            'No active tenant found. Please provide tenant in request.'
          );
        }
        tenantId = existing.id;
      }

      // 2. Create admin user first (needed for inventory createdBy)
      let adminUserId: string;
      const adminUser = await this.userFactory.create(request.testRunId, {
        tenantId,
        role: Role.SUPER_ADMIN,
        name: `Test Admin ${request.testRunId}`,
        email: `test-${request.testRunId}-admin@test.kgc.local`,
      });
      adminUserId = adminUser.id;
      response.users.push(adminUser);
      this.logger.log(`Created admin user: ${adminUser.email}`);

      // 3. Create additional users
      if (request.users && request.users.length > 0) {
        for (const userReq of request.users) {
          const user = await this.userFactory.create(request.testRunId, {
            ...userReq,
            tenantId: userReq.tenantId ?? tenantId,
          });
          response.users.push(user);
        }
        this.logger.log(`Created ${request.users.length} additional users`);
      }

      // 4. Create partners
      if (request.partners && request.partners.length > 0) {
        const partners: SeededPartner[] = [];
        for (const partnerReq of request.partners) {
          const partner = await this.partnerFactory.create(
            request.testRunId,
            {
              ...partnerReq,
              tenantId: partnerReq.tenantId ?? tenantId,
            },
            adminUserId
          );
          partners.push(partner);
        }
        response.partners = partners;
        this.logger.log(`Created ${partners.length} partners`);
      }

      // 5. Create inventory items
      if (request.inventoryItems && request.inventoryItems.length > 0) {
        const items: SeededInventoryItem[] = [];
        for (const itemReq of request.inventoryItems) {
          const item = await this.inventoryFactory.create(
            request.testRunId,
            {
              ...itemReq,
              tenantId: itemReq.tenantId ?? tenantId,
            },
            adminUserId
          );
          items.push(item);
        }
        response.inventoryItems = items;
        this.logger.log(`Created ${items.length} inventory items`);
      }

      this.logger.log(`Test seed completed for run: ${request.testRunId}`);
      return response;
    } catch (error) {
      this.logger.error(`Test seed failed for run: ${request.testRunId}`, error);
      throw error;
    }
  }

  /**
   * Clean up test data after E2E tests
   */
  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean up test data after E2E tests' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['testRunId'],
      properties: {
        testRunId: { type: 'string', description: 'Test run ID to clean up' },
        entities: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['tenant', 'users', 'partners', 'inventoryItems', 'rentals', 'worksheets'],
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Test data cleaned up successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  async cleanup(@Body() request: TestCleanupRequest): Promise<TestCleanupResponse> {
    this.guardEnvironment();

    if (!request.testRunId) {
      throw new BadRequestException('testRunId is required');
    }

    this.logger.log(`Starting cleanup for test run: ${request.testRunId}`);

    const deleted = {
      tenants: 0,
      users: 0,
      partners: 0,
      inventoryItems: 0,
      rentals: 0,
      worksheets: 0,
    };

    try {
      const cleanAll = !request.entities || request.entities.length === 0;

      // Clean up in reverse order of creation (dependencies first)

      // Inventory items
      if (cleanAll || request.entities?.includes('inventoryItems')) {
        deleted.inventoryItems = await this.inventoryFactory.cleanup(request.testRunId);
        this.logger.log(`Deleted ${deleted.inventoryItems} inventory items`);
      }

      // Partners
      if (cleanAll || request.entities?.includes('partners')) {
        deleted.partners = await this.partnerFactory.cleanup(request.testRunId);
        this.logger.log(`Deleted ${deleted.partners} partners`);
      }

      // Users
      if (cleanAll || request.entities?.includes('users')) {
        deleted.users = await this.userFactory.cleanup(request.testRunId);
        this.logger.log(`Deleted ${deleted.users} users`);
      }

      // Tenants (last, as other entities depend on it)
      if (cleanAll || request.entities?.includes('tenant')) {
        deleted.tenants = await this.tenantFactory.cleanup(request.testRunId);
        this.logger.log(`Deleted ${deleted.tenants} tenants`);
      }

      this.logger.log(`Cleanup completed for test run: ${request.testRunId}`);

      return {
        success: true,
        testRunId: request.testRunId,
        deleted,
      };
    } catch (error) {
      this.logger.error(`Cleanup failed for test run: ${request.testRunId}`, error);
      throw error;
    }
  }

  // ============================================
  // MOCK CONFIGURATION ENDPOINTS
  // Sprint 0 Blocker #3: Mock External Services
  // ============================================

  /**
   * In-memory mock configuration storage
   */
  private mockConfigurations: Map<string, Record<string, unknown>> = new Map();

  /**
   * Configure Számlázz.hu mock behavior
   */
  @Post('mock/szamlazz-hu/configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure Számlázz.hu mock behavior for tests' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable mock' },
        defaultResponse: {
          type: 'string',
          enum: ['SUCCESS', 'ERROR', 'TIMEOUT'],
          description: 'Default response type',
        },
        invoiceNumberPrefix: {
          type: 'string',
          description: 'Prefix for generated invoice numbers',
        },
        simulateDelay: { type: 'number', description: 'Simulated response delay in ms' },
        failOnInvoiceType: {
          type: 'array',
          items: { type: 'string' },
          description: 'Invoice types that should fail',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mock configuration updated' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  configureSzamlazzHuMock(@Body() config: Record<string, unknown>) {
    this.guardEnvironment();

    const currentConfig = this.mockConfigurations.get('szamlazz-hu') ?? {};
    const newConfig = { ...currentConfig, ...config, updatedAt: new Date().toISOString() };
    this.mockConfigurations.set('szamlazz-hu', newConfig);

    this.logger.log(`Számlázz.hu mock configured: ${JSON.stringify(config)}`);

    return {
      success: true,
      service: 'szamlazz-hu',
      config: newConfig,
    };
  }

  /**
   * Get Számlázz.hu mock configuration
   */
  @Get('mock/szamlazz-hu/config')
  @ApiOperation({ summary: 'Get current Számlázz.hu mock configuration' })
  @ApiResponse({ status: 200, description: 'Current mock configuration' })
  getSzamlazzHuMockConfig() {
    this.guardEnvironment();

    return {
      service: 'szamlazz-hu',
      config: this.mockConfigurations.get('szamlazz-hu') ?? {
        enabled: true,
        defaultResponse: 'SUCCESS',
        invoiceNumberPrefix: 'MOCK-',
        simulateDelay: 0,
      },
    };
  }

  /**
   * Configure MyPOS mock behavior
   */
  @Post('mock/mypos/configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure MyPOS mock behavior for tests' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable mock' },
        defaultResponse: {
          type: 'string',
          enum: ['APPROVED', 'DECLINED', 'TIMEOUT', 'ERROR'],
          description: 'Default transaction response',
        },
        simulateDelay: { type: 'number', description: 'Simulated response delay in ms' },
        preAuthEnabled: { type: 'boolean', description: 'Enable pre-authorization support' },
        failOnAmount: { type: 'number', description: 'Fail transactions above this amount' },
        requirePinAbove: { type: 'number', description: 'Require PIN for amounts above this' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mock configuration updated' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  configureMyPosMock(@Body() config: Record<string, unknown>) {
    this.guardEnvironment();

    const currentConfig = this.mockConfigurations.get('mypos') ?? {};
    const newConfig = { ...currentConfig, ...config, updatedAt: new Date().toISOString() };
    this.mockConfigurations.set('mypos', newConfig);

    this.logger.log(`MyPOS mock configured: ${JSON.stringify(config)}`);

    return {
      success: true,
      service: 'mypos',
      config: newConfig,
    };
  }

  /**
   * Get MyPOS mock configuration
   */
  @Get('mock/mypos/config')
  @ApiOperation({ summary: 'Get current MyPOS mock configuration' })
  @ApiResponse({ status: 200, description: 'Current mock configuration' })
  getMyPosMockConfig() {
    this.guardEnvironment();

    return {
      service: 'mypos',
      config: this.mockConfigurations.get('mypos') ?? {
        enabled: true,
        defaultResponse: 'APPROVED',
        simulateDelay: 0,
        preAuthEnabled: true,
        failOnAmount: 0,
        requirePinAbove: 5000,
      },
    };
  }

  /**
   * Configure Twenty CRM mock behavior
   */
  @Post('mock/twenty-crm/configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure Twenty CRM mock behavior for tests' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable mock' },
        defaultResponse: {
          type: 'string',
          enum: ['SUCCESS', 'ERROR', 'NOT_FOUND'],
          description: 'Default API response',
        },
        simulateDelay: { type: 'number', description: 'Simulated response delay in ms' },
        syncEnabled: { type: 'boolean', description: 'Enable data synchronization' },
        webhooksEnabled: { type: 'boolean', description: 'Enable webhook callbacks' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mock configuration updated' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  configureTwentyCrmMock(@Body() config: Record<string, unknown>) {
    this.guardEnvironment();

    const currentConfig = this.mockConfigurations.get('twenty-crm') ?? {};
    const newConfig = { ...currentConfig, ...config, updatedAt: new Date().toISOString() };
    this.mockConfigurations.set('twenty-crm', newConfig);

    this.logger.log(`Twenty CRM mock configured: ${JSON.stringify(config)}`);

    return {
      success: true,
      service: 'twenty-crm',
      config: newConfig,
    };
  }

  /**
   * Get Twenty CRM mock configuration
   */
  @Get('mock/twenty-crm/config')
  @ApiOperation({ summary: 'Get current Twenty CRM mock configuration' })
  @ApiResponse({ status: 200, description: 'Current mock configuration' })
  getTwentyCrmMockConfig() {
    this.guardEnvironment();

    return {
      service: 'twenty-crm',
      config: this.mockConfigurations.get('twenty-crm') ?? {
        enabled: true,
        defaultResponse: 'SUCCESS',
        simulateDelay: 0,
        syncEnabled: false,
        webhooksEnabled: false,
      },
    };
  }

  /**
   * Configure NAV Online mock behavior
   */
  @Post('mock/nav-online/configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure NAV Online mock behavior for tests' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean', description: 'Enable/disable mock' },
        defaultResponse: {
          type: 'string',
          enum: ['ACCEPTED', 'REJECTED', 'PENDING', 'ERROR'],
          description: 'Default invoice reporting response',
        },
        simulateDelay: { type: 'number', description: 'Simulated response delay in ms' },
        autoAcceptAfter: { type: 'number', description: 'Auto-accept invoices after this many ms' },
        rejectPattern: {
          type: 'string',
          description: 'Regex pattern for invoice numbers to reject',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Mock configuration updated' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  configureNavOnlineMock(@Body() config: Record<string, unknown>) {
    this.guardEnvironment();

    const currentConfig = this.mockConfigurations.get('nav-online') ?? {};
    const newConfig = { ...currentConfig, ...config, updatedAt: new Date().toISOString() };
    this.mockConfigurations.set('nav-online', newConfig);

    this.logger.log(`NAV Online mock configured: ${JSON.stringify(config)}`);

    return {
      success: true,
      service: 'nav-online',
      config: newConfig,
    };
  }

  /**
   * Get NAV Online mock configuration
   */
  @Get('mock/nav-online/config')
  @ApiOperation({ summary: 'Get current NAV Online mock configuration' })
  @ApiResponse({ status: 200, description: 'Current mock configuration' })
  getNavOnlineMockConfig() {
    this.guardEnvironment();

    return {
      service: 'nav-online',
      config: this.mockConfigurations.get('nav-online') ?? {
        enabled: true,
        defaultResponse: 'ACCEPTED',
        simulateDelay: 0,
        autoAcceptAfter: 1000,
      },
    };
  }

  /**
   * Reset all mock configurations to defaults
   */
  @Post('mock/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all mock configurations to defaults' })
  @ApiResponse({ status: 200, description: 'All mock configurations reset' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  resetAllMocks() {
    this.guardEnvironment();

    this.mockConfigurations.clear();
    this.logger.log('All mock configurations reset to defaults');

    return {
      success: true,
      message: 'All mock configurations have been reset to defaults',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all mock configurations
   */
  @Get('mock/all')
  @ApiOperation({ summary: 'Get all mock configurations' })
  @ApiResponse({ status: 200, description: 'All mock configurations' })
  getAllMockConfigs() {
    this.guardEnvironment();

    const configs: Record<string, unknown> = {};
    this.mockConfigurations.forEach((value, key) => {
      configs[key] = value;
    });

    return {
      configurations: configs,
      services: ['szamlazz-hu', 'mypos', 'twenty-crm', 'nav-online'],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Simulate a specific service response for testing
   */
  @Post('mock/:service/simulate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate a specific service response' })
  @ApiResponse({ status: 200, description: 'Simulated response' })
  @ApiResponse({ status: 400, description: 'Unknown service' })
  @ApiResponse({ status: 403, description: 'Test API not available' })
  simulateServiceResponse(
    @Param('service') service: string,
    @Body() body: { action: string; data?: Record<string, unknown> }
  ) {
    this.guardEnvironment();

    const validServices = ['szamlazz-hu', 'mypos', 'twenty-crm', 'nav-online'];
    if (!validServices.includes(service)) {
      throw new BadRequestException(
        `Unknown service: ${service}. Valid services: ${validServices.join(', ')}`
      );
    }

    const config = this.mockConfigurations.get(service) ?? {};
    const defaultResponse = (config['defaultResponse'] as string) ?? 'SUCCESS';

    // Generate mock response based on service and action
    const response = this.generateMockResponse(service, body.action, defaultResponse, body.data);

    this.logger.log(`Simulated ${service} response for action ${body.action}`);

    return {
      service,
      action: body.action,
      response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate mock response based on service and action
   */
  private generateMockResponse(
    service: string,
    action: string,
    defaultResponse: string,
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    switch (service) {
      case 'szamlazz-hu':
        return this.generateSzamlazzHuResponse(action, defaultResponse, data);
      case 'mypos':
        return this.generateMyPosResponse(action, defaultResponse, data);
      case 'twenty-crm':
        return this.generateTwentyCrmResponse(action, defaultResponse, data);
      case 'nav-online':
        return this.generateNavOnlineResponse(action, defaultResponse, data);
      default:
        return { status: defaultResponse, message: 'Mock response' };
    }
  }

  private generateSzamlazzHuResponse(
    action: string,
    defaultResponse: string,
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    if (defaultResponse === 'ERROR') {
      return { success: false, error: 'Mock error', errorCode: 'MOCK_ERROR' };
    }
    if (defaultResponse === 'TIMEOUT') {
      return { success: false, error: 'Connection timeout', errorCode: 'TIMEOUT' };
    }

    switch (action) {
      case 'createInvoice':
        return {
          success: true,
          invoiceNumber: `MOCK-${Date.now()}`,
          pdfUrl: `https://mock.szamlazz.hu/pdf/${Date.now()}.pdf`,
          invoiceId: `inv-${Date.now()}`,
        };
      case 'cancelInvoice':
        return {
          success: true,
          stornoNumber: `MOCK-S-${Date.now()}`,
          originalInvoice: data?.['invoiceNumber'],
        };
      default:
        return { success: true, action, data };
    }
  }

  private generateMyPosResponse(
    action: string,
    defaultResponse: string,
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    if (defaultResponse === 'DECLINED') {
      return { approved: false, declineReason: 'Card declined', responseCode: '05' };
    }
    if (defaultResponse === 'TIMEOUT') {
      return { approved: false, error: 'Terminal timeout', responseCode: 'T1' };
    }
    if (defaultResponse === 'ERROR') {
      return { approved: false, error: 'Terminal error', responseCode: 'E1' };
    }

    switch (action) {
      case 'authorize':
        return {
          approved: true,
          transactionId: `TXN-${Date.now()}`,
          authCode: `AUTH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          amount: data?.['amount'] ?? 0,
          currency: 'HUF',
        };
      case 'capture':
        return {
          success: true,
          transactionId: data?.['transactionId'],
          capturedAmount: data?.['amount'] ?? 0,
        };
      case 'refund':
        return {
          success: true,
          refundId: `REF-${Date.now()}`,
          refundedAmount: data?.['amount'] ?? 0,
        };
      case 'preAuth':
        return {
          approved: true,
          preAuthId: `PRE-${Date.now()}`,
          reservedAmount: data?.['amount'] ?? 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };
      default:
        return { approved: true, action, data };
    }
  }

  private generateTwentyCrmResponse(
    action: string,
    defaultResponse: string,
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    if (defaultResponse === 'ERROR') {
      return { success: false, error: 'CRM API error', code: 500 };
    }
    if (defaultResponse === 'NOT_FOUND') {
      return { success: false, error: 'Resource not found', code: 404 };
    }

    switch (action) {
      case 'syncPartner':
        return {
          success: true,
          crmId: `crm-${Date.now()}`,
          syncedAt: new Date().toISOString(),
          partnerId: data?.['partnerId'],
        };
      case 'createDeal':
        return {
          success: true,
          dealId: `deal-${Date.now()}`,
          stage: 'NEW',
          value: data?.['value'] ?? 0,
        };
      case 'updateDeal':
        return {
          success: true,
          dealId: data?.['dealId'],
          updatedAt: new Date().toISOString(),
        };
      default:
        return { success: true, action, data };
    }
  }

  private generateNavOnlineResponse(
    action: string,
    defaultResponse: string,
    data?: Record<string, unknown>
  ): Record<string, unknown> {
    if (defaultResponse === 'REJECTED') {
      return {
        success: false,
        status: 'REJECTED',
        errors: [{ code: 'INVALID_DATA', message: 'Mock rejection' }],
      };
    }
    if (defaultResponse === 'ERROR') {
      return { success: false, status: 'ERROR', error: 'NAV API error' };
    }
    if (defaultResponse === 'PENDING') {
      return {
        success: true,
        status: 'PENDING',
        transactionId: `NAV-${Date.now()}`,
        message: 'Invoice pending review',
      };
    }

    switch (action) {
      case 'reportInvoice':
        return {
          success: true,
          status: 'ACCEPTED',
          transactionId: `NAV-${Date.now()}`,
          invoiceNumber: data?.['invoiceNumber'],
          acceptedAt: new Date().toISOString(),
        };
      case 'queryStatus':
        return {
          success: true,
          status: 'ACCEPTED',
          transactionId: data?.['transactionId'],
          lastChecked: new Date().toISOString(),
        };
      case 'cancelReport':
        return {
          success: true,
          status: 'CANCELLED',
          transactionId: data?.['transactionId'],
        };
      default:
        return { success: true, status: 'ACCEPTED', action, data };
    }
  }
}
