import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type {
  RecurringIssuesResponseDto,
  ServiceHistoryResponseDto,
} from './dto/recurring-issues.dto';
import {
  RecurringIssuesQueryDto,
  RecurringIssuesResponseSwagger,
  ServiceHistoryResponseSwagger,
} from './dto/recurring-issues.dto';
import type {
  ServiceRevenueResponseDto,
  ServiceSummaryResponseDto,
  ServiceWorkloadResponseDto,
  WarrantyRatioResponseDto,
} from './dto/service-response.dto';
import {
  ServiceRevenueResponseSwagger,
  ServiceSummaryResponseSwagger,
  ServiceWorkloadResponseSwagger,
  WarrantyRatioResponseSwagger,
} from './dto/service-response.dto';
import { RecurringIssuesService } from './recurring-issues.service';
import { ServiceDashboardService } from './service.service';

/**
 * Service Dashboard Controller (Story 35-5)
 *
 * Service/Worksheet dashboard endpoints for widgets
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: STORE_MANAGER, ADMIN roles (enforced at route level)
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/service')
export class ServiceDashboardController {
  constructor(
    private readonly serviceDashboardService: ServiceDashboardService,
    private readonly recurringIssuesService: RecurringIssuesService
  ) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get Service Summary (Munkalap osszesites)',
    description: 'Returns worksheet counts by status for service dashboard',
  })
  @ApiResponse({ status: 200, type: ServiceSummaryResponseSwagger })
  async getSummary(): Promise<{ data: ServiceSummaryResponseDto }> {
    const data = await this.serviceDashboardService.getSummary();
    return { data };
  }

  @Get('workload')
  @ApiOperation({
    summary: 'Get Technician Workload (Szerelo terheles)',
    description: 'Returns active worksheets per technician with capacity utilization',
  })
  @ApiResponse({ status: 200, type: ServiceWorkloadResponseSwagger })
  async getWorkload(): Promise<{ data: ServiceWorkloadResponseDto }> {
    const data = await this.serviceDashboardService.getWorkload();
    return { data };
  }

  @Get('revenue')
  @ApiOperation({
    summary: 'Get Service Revenue (Szerviz bevetel)',
    description: 'Returns service revenue breakdown (labor + parts) with trend',
  })
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month'],
    required: false,
    description: 'Period for revenue aggregation',
  })
  @ApiResponse({ status: 200, type: ServiceRevenueResponseSwagger })
  async getRevenue(
    @Query('period') period?: 'day' | 'week' | 'month'
  ): Promise<{ data: ServiceRevenueResponseDto }> {
    const data = await this.serviceDashboardService.getRevenue(period ?? 'week');
    return { data };
  }

  @Get('warranty-ratio')
  @ApiOperation({
    summary: 'Get Warranty Ratio (Garancialis vs Fizetos arany)',
    description: 'Returns warranty vs paid service ratio with 6-month trend (Story 49-1)',
  })
  @ApiQuery({
    name: 'period',
    enum: ['day', 'week', 'month'],
    required: false,
    description: 'Period for ratio aggregation',
  })
  @ApiResponse({ status: 200, type: WarrantyRatioResponseSwagger })
  async getWarrantyRatio(
    @Query('period') period?: 'day' | 'week' | 'month'
  ): Promise<{ data: WarrantyRatioResponseDto }> {
    const data = await this.serviceDashboardService.getWarrantyRatio(period ?? 'month');
    return { data };
  }

  @Get('recurring-issues')
  @ApiOperation({
    summary: 'Get Recurring Issues (Visszatero hiba tracking)',
    description: 'Returns equipment with recurring service issues (Story 49-2)',
  })
  @ApiQuery({
    name: 'threshold',
    type: Number,
    required: false,
    description: 'Minimum number of services to be considered recurring (default: 3)',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: 'Number of days to look back for service history (default: 90)',
  })
  @ApiResponse({ status: 200, type: RecurringIssuesResponseSwagger })
  async getRecurringIssues(
    @Query() query: RecurringIssuesQueryDto
  ): Promise<{ data: RecurringIssuesResponseDto }> {
    const data = await this.recurringIssuesService.getRecurringIssues(
      query.threshold ?? 3,
      query.days ?? 90
    );
    return { data };
  }

  @Get('equipment/:id/service-history')
  @ApiOperation({
    summary: 'Get Equipment Service History (Gep szerviz elozmeny)',
    description: 'Returns detailed service history for a specific equipment (Story 49-2)',
  })
  @ApiParam({
    name: 'id',
    description: 'Equipment ID',
    example: 'eq-001',
  })
  @ApiResponse({ status: 200, type: ServiceHistoryResponseSwagger })
  @ApiResponse({ status: 404, description: 'Equipment not found' })
  async getServiceHistory(@Param('id') id: string): Promise<{ data: ServiceHistoryResponseDto }> {
    const data = await this.recurringIssuesService.getServiceHistory(id);
    if (!data) {
      throw new NotFoundException(`Equipment with id ${id} not found`);
    }
    return { data };
  }
}
