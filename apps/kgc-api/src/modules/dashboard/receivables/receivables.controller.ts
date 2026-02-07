/**
 * Receivables Dashboard Controller
 * Epic 41: Story 41-1 - Kintlévőség Aging Report
 *
 * Endpoints:
 * - GET /dashboard/receivables/aging - Aging report (30/60/90/90+ buckets)
 *
 * RBAC: @Roles('STORE_MANAGER', 'ADMIN', 'ACCOUNTANT') - requires role check
 * TODO: Add JwtAuthGuard + RolesGuard when auth module integrated
 */

import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AgingReportQueryDto, AgingReportResponseDto } from './dto/receivables-aging.dto';
import { ReceivablesDashboardService } from './receivables.service';

@ApiTags('dashboard')
@Controller('dashboard/receivables')
export class ReceivablesDashboardController {
  constructor(private readonly service: ReceivablesDashboardService) {}

  @Get('aging')
  @ApiOperation({
    summary: 'Get Receivables Aging Report (Kintlévőség Aging Report)',
    description:
      'Returns receivables grouped by aging buckets (0-30, 31-60, 61-90, 90+ days). ' +
      'Includes invoice counts, amounts, and top 5 debtors.',
  })
  @ApiQuery({
    name: 'partnerId',
    type: String,
    required: false,
    description: 'Filter by specific partner ID',
  })
  async getAgingReport(@Query() query: AgingReportQueryDto): Promise<AgingReportResponseDto> {
    // TODO: Extract tenantId from JWT context (ADR-001)
    const tenantId = 'default-tenant';

    const data = await this.service.getAgingReport(
      tenantId,
      query.partnerId ? { partnerId: query.partnerId } : undefined
    );

    return { data };
  }
}
