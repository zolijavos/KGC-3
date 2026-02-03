import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { KpiService } from './kpi.service';
import { KpiQuerySchema, type KpiQueryDto } from './dto/kpi-query.dto';
import type { KpiResponseDto } from './dto/kpi-response.dto';

/**
 * KPI Controller
 *
 * Financial KPI endpoints for dashboard widgets
 *
 * RBAC: @Roles('STORE_MANAGER', 'ADMIN') - requires role check
 * TODO: Add JwtAuthGuard + RolesGuard when auth module integrated
 */
@ApiTags('dashboard')
@Controller('api/v1/dashboard/kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('revenue')
  @ApiOperation({ summary: 'Get Revenue KPI (Bruttó Bevétel)' })
  @ApiQuery({ name: 'dateFrom', type: String, example: '2026-02-01T00:00:00Z' })
  @ApiQuery({ name: 'dateTo', type: String, example: '2026-02-03T23:59:59Z' })
  @ApiQuery({ name: 'period', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: false })
  @ApiQuery({ name: 'comparison', type: Boolean, required: false })
  @ApiQuery({ name: 'groupBy', enum: ['location', 'service', 'partner'], required: false })
  async getRevenue(@Query() rawQuery: Record<string, unknown>): Promise<KpiResponseDto> {
    const query = KpiQuerySchema.parse(rawQuery) as KpiQueryDto;
    return this.kpiService.getRevenue(query);
  }

  @Get('net-revenue')
  @ApiOperation({ summary: 'Get Net Revenue KPI (Nettó Bevétel)' })
  async getNetRevenue(@Query() rawQuery: Record<string, unknown>): Promise<KpiResponseDto> {
    const query = KpiQuerySchema.parse(rawQuery) as KpiQueryDto;
    return this.kpiService.getNetRevenue(query);
  }

  @Get('receivables')
  @ApiOperation({ summary: 'Get Receivables KPI (Kintlévőség)' })
  async getReceivables(@Query() rawQuery: Record<string, unknown>): Promise<KpiResponseDto> {
    const query = KpiQuerySchema.parse(rawQuery) as KpiQueryDto;
    return this.kpiService.getReceivables(query);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Get Payments KPI (Befizetések)' })
  async getPayments(@Query() rawQuery: Record<string, unknown>): Promise<KpiResponseDto> {
    const query = KpiQuerySchema.parse(rawQuery) as KpiQueryDto;
    return this.kpiService.getPayments(query);
  }
}
