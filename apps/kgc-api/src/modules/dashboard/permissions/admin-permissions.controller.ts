import { Body, Controller, Delete, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminPermissionsService } from './admin-permissions.service';
import type {
  AdminPermissionsResponseDto,
  UpdatePermissionsResponseDto,
} from './dto/admin-permissions.dto';
import {
  AdminPermissionsResponseSwagger,
  UpdatePermissionsDto,
  UpdatePermissionsResponseSwagger,
} from './dto/admin-permissions.dto';
import { AdminOnlyGuard } from './guards/admin-only.guard';

/**
 * Request with authenticated user and tenant context
 * TODO: Replace with actual auth types when integrated
 */
interface AuthenticatedRequest {
  user?: {
    id?: string;
    tenantId?: string;
    roles?: string[];
  };
}

/**
 * Admin Widget Permissions Controller (Story 45-1)
 *
 * REST API for managing dashboard widget permissions through admin UI.
 *
 * Endpoints:
 * - GET  /dashboard/permissions/admin - Get permission matrix (AC1)
 * - PUT  /dashboard/permissions/admin - Update permissions (AC2)
 * - DELETE /dashboard/permissions/admin - Reset to defaults
 *
 * RBAC: Only ADMIN role can access these endpoints
 * Protected by AdminOnlyGuard (placeholder until @kgc/auth integration)
 */
@ApiTags('dashboard-admin')
@UseGuards(AdminOnlyGuard)
@Controller('dashboard/permissions/admin')
export class AdminPermissionsController {
  constructor(private readonly adminPermissionsService: AdminPermissionsService) {}

  /**
   * Get all widget permissions for admin matrix view (AC1)
   *
   * Returns:
   * - All widgets with their ID, name, category
   * - Role permissions for each widget (OPERATOR, STORE_MANAGER, ADMIN)
   * - Merges database settings with hardcoded defaults
   */
  @Get()
  @ApiOperation({
    summary: 'Get Widget Permission Matrix',
    description:
      'Returns all widgets with their permission settings for each role. ' +
      'ADMIN role always has access and cannot be disabled. ' +
      'Custom permissions from database are merged with hardcoded defaults.',
  })
  @ApiResponse({
    status: 200,
    description: 'Widget permission matrix',
    type: AdminPermissionsResponseSwagger,
  })
  async getAdminPermissions(
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: AdminPermissionsResponseDto }> {
    // Get tenant ID from authenticated user
    // TODO: Use actual tenant context when auth integrated
    const tenantId = req.user?.tenantId ?? 'default-tenant';

    const data = await this.adminPermissionsService.getAdminPermissions(tenantId);
    return { data };
  }

  /**
   * Update widget permissions (AC2)
   *
   * Accepts array of permission updates and saves to database.
   * Creates audit log entry for compliance.
   * ADMIN role permissions cannot be modified (always has access).
   */
  @Put()
  @ApiOperation({
    summary: 'Update Widget Permissions',
    description:
      'Updates widget permissions for roles. ' +
      'ADMIN role permissions cannot be modified. ' +
      'Changes are saved to database and audit logged.',
  })
  @ApiBody({ type: UpdatePermissionsDto })
  @ApiResponse({
    status: 200,
    description: 'Permissions updated successfully',
    type: UpdatePermissionsResponseSwagger,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request body',
  })
  @ApiResponse({
    status: 403,
    description: 'User is not authorized to modify permissions',
  })
  async updatePermissions(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdatePermissionsDto
  ): Promise<{ data: UpdatePermissionsResponseDto }> {
    // Get tenant and user from authenticated context
    // TODO: Use actual context when auth integrated
    const tenantId = req.user?.tenantId ?? 'default-tenant';
    const userId = req.user?.id ?? 'system';

    const data = await this.adminPermissionsService.updatePermissions(
      tenantId,
      userId,
      updateDto.permissions
    );

    return { data };
  }

  /**
   * Reset permissions to hardcoded defaults
   *
   * Deletes all custom permissions for the tenant,
   * reverting to the application's default configuration.
   */
  @Delete()
  @ApiOperation({
    summary: 'Reset Permissions to Defaults',
    description:
      'Deletes all custom permission settings for the tenant. ' +
      'After reset, all widgets will use hardcoded default permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Permissions reset to defaults',
    type: UpdatePermissionsResponseSwagger,
  })
  async resetToDefaults(
    @Req() req: AuthenticatedRequest
  ): Promise<{ data: UpdatePermissionsResponseDto }> {
    const tenantId = req.user?.tenantId ?? 'default-tenant';
    const userId = req.user?.id ?? 'system';

    const data = await this.adminPermissionsService.resetToDefaults(tenantId, userId);
    return { data };
  }
}
