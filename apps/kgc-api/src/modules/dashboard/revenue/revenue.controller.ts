/**
 * Revenue Forecast Dashboard Controller
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 *
 * REST API for revenue forecast dashboard.
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: STORE_MANAGER, ADMIN, ACCOUNTANT roles (enforced at route level)
 */

import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RevenueForecastQueryDto, RevenueForecastResponseDto } from './dto/revenue-forecast.dto';
import { RevenueForecastDashboardService } from './revenue.service';

@ApiTags('Dashboard - Revenue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/revenue')
export class RevenueForecastController {
  constructor(private readonly service: RevenueForecastDashboardService) {}

  /**
   * Get revenue forecast
   * @param query Optional month filter (YYYY-MM format)
   */
  @Get('forecast')
  @ApiOperation({
    summary: 'Get revenue forecast',
    description:
      'Returns forecasted revenue for the specified month with source breakdown and MoM comparison',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue forecast data',
    type: RevenueForecastResponseDto,
  })
  async getForecast(@Query() query: RevenueForecastQueryDto): Promise<RevenueForecastResponseDto> {
    // Parse month if provided
    let month: Date | undefined;
    if (query.month) {
      month = new Date(`${query.month}-01`);
    }

    // TODO: Get tenantId from request context (ADR-001)
    const tenantId = 'default-tenant';

    const data = await this.service.getForecast(tenantId, month);

    return { data };
  }
}
