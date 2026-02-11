import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type {
  PartnerActivityResponseDto,
  PartnerOverviewResponseDto,
  TopPartnersResponseDto,
} from './dto/partner-response.dto';
import {
  PartnerActivityResponseSwagger,
  PartnerOverviewResponseSwagger,
  TopPartnersResponseSwagger,
} from './dto/partner-response.dto';
import { PartnerDashboardService } from './partner.service';

/**
 * Partner Dashboard Controller (Story 35-6)
 *
 * Partner dashboard endpoints for widgets
 *
 * RBAC: @Roles('STORE_MANAGER', 'ADMIN') - requires role check
 * TODO: Add JwtAuthGuard + RolesGuard when auth module integrated
 */
@ApiTags('dashboard')
@Controller('dashboard/partner')
export class PartnerDashboardController {
  constructor(private readonly partnerDashboardService: PartnerDashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get Partner Overview (Partner összesítés)',
    description: 'Returns active partners count by category with new partners in last 30 days',
  })
  @ApiResponse({ status: 200, type: PartnerOverviewResponseSwagger })
  async getOverview(): Promise<{ data: PartnerOverviewResponseDto }> {
    const data = await this.partnerDashboardService.getOverview();
    return { data };
  }

  @Get('top')
  @ApiOperation({
    summary: 'Get Top Partners (Top partnerek)',
    description: 'Returns top 10 partners by revenue with breakdown by type',
  })
  @ApiQuery({
    name: 'period',
    enum: ['month', 'quarter', 'year'],
    required: false,
    description: 'Period for revenue aggregation',
  })
  @ApiResponse({ status: 200, type: TopPartnersResponseSwagger })
  async getTopPartners(
    @Query('period') period?: 'month' | 'quarter' | 'year'
  ): Promise<{ data: TopPartnersResponseDto }> {
    const data = await this.partnerDashboardService.getTopPartners(period ?? 'month');
    return { data };
  }

  @Get('activity')
  @ApiOperation({
    summary: 'Get Partner Activity (Partner aktivitás)',
    description: 'Returns daily transaction counts for the specified period',
  })
  @ApiQuery({
    name: 'days',
    type: Number,
    required: false,
    description: 'Number of days to include (default: 30)',
  })
  @ApiResponse({ status: 200, type: PartnerActivityResponseSwagger })
  async getActivity(@Query('days') days?: string): Promise<{ data: PartnerActivityResponseDto }> {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.partnerDashboardService.getActivity(daysNum);
    return { data };
  }
}
