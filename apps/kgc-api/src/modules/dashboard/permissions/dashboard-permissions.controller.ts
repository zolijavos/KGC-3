import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardPermissionsService } from './dashboard-permissions.service';
import type { DashboardPermissionsResponseDto } from './dto/dashboard-permissions.dto';
import { DashboardPermissionsResponseSwagger } from './dto/dashboard-permissions.dto';

/**
 * User interface for request with user info
 * TODO: Replace with actual auth user type when auth module integrated
 */
interface RequestWithUser {
  user?: {
    id?: string;
    roles?: string[];
  };
}

/**
 * Dashboard Permissions Controller (Story 35-8)
 *
 * Endpoint to get user's visible widgets and sections based on RBAC
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: All authenticated users can access their own permissions
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/permissions')
export class DashboardPermissionsController {
  constructor(private readonly permissionsService: DashboardPermissionsService) {}

  /**
   * Get dashboard permissions for current user
   *
   * Returns:
   * - List of visible widgets with access levels
   * - Section visibility status
   * - Role-specific preset configuration
   * - Total widget count
   */
  @Get()
  @ApiOperation({
    summary: 'Get Dashboard Permissions',
    description:
      'Returns visible widgets and sections for the current user based on their roles. ' +
      'Also includes role-specific preset configuration for initial dashboard layout.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard permissions for current user',
    type: DashboardPermissionsResponseSwagger,
  })
  async getPermissions(
    @Req() req: RequestWithUser
  ): Promise<{ data: DashboardPermissionsResponseDto }> {
    // Extract roles from user (default to empty array if not authenticated)
    // TODO: When auth is integrated, this will come from JWT token
    const userRoles = req.user?.roles ?? [];

    // For development/testing: if no roles, provide a default role
    // This allows testing the endpoint without full auth setup
    const effectiveRoles = userRoles.length > 0 ? userRoles : ['ROLE_FRANCHISE_EMP'];

    const data = await this.permissionsService.getPermissions(effectiveRoles);
    return { data };
  }
}
