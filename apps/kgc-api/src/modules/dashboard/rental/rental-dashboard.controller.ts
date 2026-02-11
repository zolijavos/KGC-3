/**
 * Rental Dashboard Controller
 * Epic 48: Story 48-1 - Berlesi Statisztika Widget
 *
 * Endpoints:
 * - GET /dashboard/rental/stats - Average rental days and metrics
 * - GET /dashboard/rental/popular - Top equipment by rental count
 * - GET /dashboard/rental/seasonality - Monthly trend data
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: STORE_MANAGER, ADMIN roles (enforced at route level)
 */

import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type {
  PopularEquipmentResponse,
  RentalStatsResponse,
  SeasonalityResponse,
} from './dto/rental-dashboard.dto';
import { RentalDashboardService } from './rental-dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/rental')
export class RentalDashboardController {
  constructor(private readonly service: RentalDashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Get Rental Statistics (Berlesi Statisztika)',
    description:
      'Returns rental statistics including average rental days, ' +
      'total rentals, active rentals, and overdue rentals.',
  })
  async getStats(): Promise<RentalStatsResponse> {
    return this.service.getStats();
  }

  @Get('popular')
  @ApiOperation({
    summary: 'Get Popular Equipment (Nepszeru Gepek)',
    description: 'Returns top N equipment sorted by rental count descending.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 5,
    description: 'Number of equipment to return (default: 5, max: 20)',
  })
  async getPopularEquipment(@Query('limit') limit?: string): Promise<PopularEquipmentResponse> {
    const parsedLimit = limit ? parseInt(limit, 10) : 5;
    const safeLimit = Number.isNaN(parsedLimit) ? 5 : Math.min(parsedLimit, 20);
    return this.service.getPopularEquipment(safeLimit);
  }

  @Get('seasonality')
  @ApiOperation({
    summary: 'Get Seasonality Data (Szezonalis Trend)',
    description: 'Returns monthly rental counts and revenue for trend analysis.',
  })
  @ApiQuery({
    name: 'months',
    type: Number,
    required: false,
    example: 12,
    description: 'Number of months to return (default: 12, max: 24)',
  })
  async getSeasonality(@Query('months') months?: string): Promise<SeasonalityResponse> {
    const parsedMonths = months ? parseInt(months, 10) : 12;
    const safeMonths = Number.isNaN(parsedMonths) ? 12 : Math.min(parsedMonths, 24);
    return this.service.getSeasonality(safeMonths);
  }
}
