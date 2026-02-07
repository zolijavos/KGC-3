/**
 * Equipment Profit Dashboard Controller
 * Epic 40: Story 40-4 - Bérgép megtérülés dashboard widget
 *
 * Endpoints:
 * - GET /dashboard/equipment-profit/summary - Fleet-wide profit summary
 * - GET /dashboard/equipment-profit/top - Top 5 most profitable equipment
 * - GET /dashboard/equipment-profit/:id - Single equipment profit detail
 *
 * RBAC: @Roles('STORE_MANAGER', 'ADMIN') - requires role check
 * TODO: Add JwtAuthGuard + RolesGuard when auth module integrated
 */

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type {
  EquipmentProfitDetailResponse,
  FleetProfitSummaryResponse,
  TopEquipmentResponse,
} from './dto/equipment-profit-dashboard.dto';
import { EquipmentProfitDashboardService } from './equipment-profit.service';

@ApiTags('dashboard')
@Controller('dashboard/equipment-profit')
export class EquipmentProfitDashboardController {
  constructor(private readonly service: EquipmentProfitDashboardService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get Fleet Profit Summary (Flotta Megtérülés Összesítés)',
    description:
      'Returns aggregated profit data for the entire equipment fleet. ' +
      'Includes total revenue, costs, profit, and equipment counts.',
  })
  async getSummary(): Promise<FleetProfitSummaryResponse> {
    return this.service.getSummary();
  }

  @Get('top')
  @ApiOperation({
    summary: 'Get Top Profitable Equipment (Top Jövedelmező Gépek)',
    description: 'Returns top N most profitable equipment sorted by profit descending.',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    example: 5,
    description: 'Number of equipment to return (default: 5, max: 20)',
  })
  async getTopEquipment(@Query('limit') limit?: string): Promise<TopEquipmentResponse> {
    const parsedLimit = limit ? Math.min(parseInt(limit, 10), 20) : 5;
    return this.service.getTopEquipment(parsedLimit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Equipment Profit Detail (Gép Megtérülés Részletek)',
    description:
      'Returns detailed profit information for a specific equipment. ' +
      'Includes purchase price, revenue, costs, profit, ROI, and rental history.',
  })
  @ApiParam({ name: 'id', description: 'Equipment ID' })
  async getEquipmentDetail(@Param('id') id: string): Promise<EquipmentProfitDetailResponse | null> {
    return this.service.getEquipmentDetail(id);
  }
}
