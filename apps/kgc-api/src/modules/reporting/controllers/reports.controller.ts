/**
 * Reports Controller - REST API for Report Generation
 * Epic 27: Story 27-2 - Részletes Riportok
 * Epic 27: Story 27-3 - Cross-Tenant Riportok
 *
 * Endpoints:
 * - GET /reports - List available reports
 * - GET /reports/:type - Get report definition
 * - POST /reports/generate - Generate report
 * - GET /reports/:type/export/:format - Export report
 * - POST /reports/cross-tenant - Generate cross-tenant report
 * - GET /reports/cross-tenant/tenants - List accessible tenants
 * - POST /reports/cross-tenant/compare - Compare tenants
 */

import {
  CrossTenantReportDto,
  CrossTenantReportService,
  GenerateReportDto,
  ICrossReportResult,
  IReportDefinition,
  IReportResult,
  ReportFormat,
  ReportService,
  ReportType,
} from '@kgc/reporting';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportService: ReportService,
    private readonly crossTenantService: CrossTenantReportService
  ) {}

  /**
   * List available reports for tenant
   */
  @Get()
  @ApiOperation({ summary: 'List available reports' })
  @ApiResponse({ status: 200, description: 'Returns list of available reports' })
  @ApiQuery({ name: 'tenantId', required: true })
  async listReports(@Query('tenantId') tenantId: string): Promise<IReportDefinition[]> {
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    return this.reportService.getAvailableReports(tenantId);
  }

  /**
   * Get report definition by type
   */
  @Get(':type')
  @ApiOperation({ summary: 'Get report definition' })
  @ApiResponse({ status: 200, description: 'Returns report definition' })
  @ApiResponse({ status: 404, description: 'Report type not found' })
  @ApiParam({ name: 'type', description: 'Report type' })
  async getReportDefinition(@Param('type') type: string): Promise<IReportDefinition> {
    const reportType = type as ReportType;
    const definition = await this.reportService.getReportDefinition(reportType);

    if (!definition) {
      throw new NotFoundException(`Report type ${type} not found`);
    }

    return definition;
  }

  /**
   * Generate a report
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a report' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Report generation parameters' })
  async generateReport(
    @Body() input: GenerateReportDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<IReportResult | void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      const result = await this.reportService.generateReport(input, tenantId, userId);

      // If result is a Buffer (exported file), set headers and send
      if (Buffer.isBuffer(result)) {
        const format = input.format ?? 'JSON';
        const contentTypes: Record<string, string> = {
          CSV: 'text/csv',
          PDF: 'application/pdf',
          EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        const extensions: Record<string, string> = {
          CSV: 'csv',
          PDF: 'pdf',
          EXCEL: 'xlsx',
        };

        res.set({
          'Content-Type': contentTypes[format] ?? 'application/octet-stream',
          'Content-Disposition': `attachment; filename="report-${input.reportType}.${extensions[format] ?? 'bin'}"`,
        });
        res.send(result);
        return;
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Validation')) {
        throw new BadRequestException(message);
      }
      if (message.includes('Unknown report type')) {
        throw new NotFoundException(message);
      }
      throw error;
    }
  }

  /**
   * Export report to specific format
   */
  @Get(':type/export/:format')
  @ApiOperation({ summary: 'Export report to file format' })
  @ApiResponse({ status: 200, description: 'Report exported' })
  @ApiParam({ name: 'type', description: 'Report type' })
  @ApiParam({ name: 'format', description: 'Export format (csv, pdf, excel)' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'dateRange', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async exportReport(
    @Param('type') type: string,
    @Param('format') format: string,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string,
    @Query('dateRange') dateRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Res() res?: Response
  ): Promise<void> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    const formatMap: Record<string, ReportFormat> = {
      csv: ReportFormat.CSV,
      pdf: ReportFormat.PDF,
      excel: ReportFormat.EXCEL,
    };

    const reportFormat = formatMap[format.toLowerCase()];
    if (!reportFormat) {
      throw new BadRequestException(`Invalid format: ${format}. Use csv, pdf, or excel.`);
    }

    const input: GenerateReportDto = {
      reportType: type as GenerateReportDto['reportType'],
      dateRange: (dateRange as GenerateReportDto['dateRange']) ?? 'THIS_MONTH',
      format: reportFormat as GenerateReportDto['format'],
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      limit: 10000,
      offset: 0,
    };

    try {
      const result = await this.reportService.generateReport(input, tenantId, userId);

      if (Buffer.isBuffer(result) && res) {
        const contentTypes: Record<ReportFormat, string> = {
          [ReportFormat.CSV]: 'text/csv',
          [ReportFormat.PDF]: 'application/pdf',
          [ReportFormat.EXCEL]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          [ReportFormat.JSON]: 'application/json',
        };
        const extensions: Record<ReportFormat, string> = {
          [ReportFormat.CSV]: 'csv',
          [ReportFormat.PDF]: 'pdf',
          [ReportFormat.EXCEL]: 'xlsx',
          [ReportFormat.JSON]: 'json',
        };

        res.set({
          'Content-Type': contentTypes[reportFormat],
          'Content-Disposition': `attachment; filename="report-${type}.${extensions[reportFormat]}"`,
        });
        res.send(result);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Unknown report type')) {
        throw new NotFoundException(message);
      }
      throw error;
    }
  }

  // ========================
  // Cross-Tenant Report Endpoints (Story 27-3)
  // ========================

  /**
   * Generate cross-tenant report
   */
  @Post('cross-tenant')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate cross-tenant report (holding/franchise)' })
  @ApiResponse({ status: 200, description: 'Cross-tenant report generated' })
  @ApiResponse({ status: 403, description: 'Access denied to one or more tenants' })
  @ApiQuery({ name: 'tenantId', required: true, description: "User's tenant ID" })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({ description: 'Cross-tenant report parameters' })
  async generateCrossTenantReport(
    @Body() input: CrossTenantReportDto,
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<ICrossReportResult> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.crossTenantService.generateCrossReport(input, userId, tenantId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      if (message.includes('not found')) {
        throw new NotFoundException(message);
      }
      if (message.includes('Validation')) {
        throw new BadRequestException(message);
      }
      throw error;
    }
  }

  /**
   * List accessible tenants for cross-tenant reporting
   */
  @Get('cross-tenant/tenants')
  @ApiOperation({ summary: 'List accessible tenants for cross-tenant reports' })
  @ApiResponse({ status: 200, description: 'Returns list of accessible tenants' })
  @ApiQuery({ name: 'userId', required: true })
  async listAccessibleTenants(
    @Query('userId') userId: string
  ): Promise<{ id: string; name: string }[]> {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return this.crossTenantService.getAccessibleTenantsList(userId);
  }

  /**
   * Compare tenants
   */
  @Post('cross-tenant/compare')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Compare tenant metrics' })
  @ApiResponse({ status: 200, description: 'Tenant comparison generated' })
  @ApiQuery({ name: 'tenantId', required: true })
  @ApiQuery({ name: 'userId', required: true })
  @ApiBody({
    description: 'Comparison parameters',
    schema: {
      type: 'object',
      properties: {
        tenantIds: { type: 'array', items: { type: 'string' } },
        reportType: { type: 'string' },
        dateRange: { type: 'string' },
        startDate: { type: 'string' },
        endDate: { type: 'string' },
      },
    },
  })
  async compareTenants(
    @Body()
    input: {
      tenantIds: string[];
      reportType: string;
      dateRange: string;
      startDate?: string;
      endDate?: string;
    },
    @Query('tenantId') tenantId: string,
    @Query('userId') userId: string
  ): Promise<{
    tenants: { id: string; name: string }[];
    comparison: Record<string, Record<string, number>>;
  }> {
    if (!tenantId || !userId) {
      throw new BadRequestException('tenantId and userId are required');
    }

    try {
      return await this.crossTenantService.compareTenants(
        input.tenantIds,
        input.reportType as ReportType,
        input.dateRange,
        userId,
        tenantId,
        input.startDate ? new Date(input.startDate) : undefined,
        input.endDate ? new Date(input.endDate) : undefined
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('Access denied')) {
        throw new ForbiddenException(message);
      }
      throw error;
    }
  }
}
