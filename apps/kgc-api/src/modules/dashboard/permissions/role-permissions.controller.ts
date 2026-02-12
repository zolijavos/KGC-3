import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminPermissionsService } from './admin-permissions.service';
import { WidgetRoleEnum } from './dto/admin-permissions.dto';

/**
 * Role Widget Permissions Response DTO
 */
interface RolePermissionsResponseDto {
  widgets: string[];
}

/**
 * Role Permissions Controller (Story 45-1 - AC5)
 *
 * Provides endpoint for frontend to fetch visible widgets for a specific role.
 * Used by dynamic-permissions.ts on the frontend.
 *
 * Endpoint:
 * - GET /dashboard/permissions/role/:role - Get widgets for role
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: All authenticated users (role is path parameter, not self-limiting)
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/permissions/role')
export class RolePermissionsController {
  constructor(private readonly adminPermissionsService: AdminPermissionsService) {}

  /**
   * Get visible widget IDs for a specific role (AC5)
   *
   * Returns list of widget IDs that the specified role can access.
   * Merges database permissions with hardcoded defaults.
   *
   * @param role - The role to get permissions for (OPERATOR, STORE_MANAGER, ADMIN)
   */
  @Get(':role')
  @ApiOperation({
    summary: 'Get Widgets for Role',
    description:
      'Returns list of widget IDs that the specified role can access. ' +
      'Used by frontend for dynamic permission loading.',
  })
  @ApiParam({
    name: 'role',
    enum: WidgetRoleEnum,
    description: 'User role (OPERATOR, STORE_MANAGER, ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of accessible widget IDs',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            widgets: {
              type: 'array',
              items: { type: 'string' },
              example: ['revenue-kpi', 'stock-summary', 'notification-panel'],
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid role parameter',
  })
  async getPermissionsForRole(
    @Param('role') roleParam: string
  ): Promise<{ data: RolePermissionsResponseDto }> {
    // Validate and convert role parameter
    const role = this.validateRole(roleParam);

    // Use default tenant for now - in production this would come from auth context
    // TODO: Get tenantId from auth context when integrated
    const tenantId = 'default-tenant';

    const widgets = await this.adminPermissionsService.getPermissionsForRole(tenantId, role);

    return {
      data: {
        widgets,
      },
    };
  }

  /**
   * Validate role parameter and convert to enum
   */
  private validateRole(roleParam: string): WidgetRoleEnum {
    const upperRole = roleParam.toUpperCase();

    if (upperRole === 'OPERATOR') return WidgetRoleEnum.OPERATOR;
    if (upperRole === 'STORE_MANAGER') return WidgetRoleEnum.STORE_MANAGER;
    if (upperRole === 'ADMIN') return WidgetRoleEnum.ADMIN;

    // Default to OPERATOR for invalid roles (graceful degradation)
    return WidgetRoleEnum.OPERATOR;
  }
}
