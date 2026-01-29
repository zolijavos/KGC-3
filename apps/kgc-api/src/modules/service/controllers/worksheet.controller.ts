/**
 * Worksheet Controller - REST API for Worksheet/Munkalap Management
 * Epic 17: Munkalap CRUD
 *
 * Endpoints:
 * - GET    /worksheets          - List worksheets with filters
 * - GET    /worksheets/stats    - Get worksheet statistics
 * - GET    /worksheets/:id      - Get worksheet by ID
 * - POST   /worksheets          - Create new worksheet
 * - PATCH  /worksheets/:id      - Update worksheet
 * - PATCH  /worksheets/:id/status - Change worksheet status
 */

import { JwtAuthGuard } from '@kgc/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  IWorksheet,
  IWorksheetRepository,
  WORKSHEET_REPOSITORY,
  WorksheetFilterDto,
  WorksheetPriority,
  WorksheetStatus,
  WorksheetType,
} from '../repositories/prisma-worksheet.repository';

interface AuthenticatedRequest {
  user: {
    id: string;
    tenantId: string;
    role: string;
  };
}

interface WorksheetListResponse {
  data: IWorksheet[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

interface WorksheetStats {
  total: number;
  felveve: number;
  folyamatban: number;
  varhato: number;
  kesz: number;
  szamlazando: number;
  lezart: number;
}

@ApiTags('worksheets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('worksheets')
export class WorksheetController {
  constructor(
    @Inject(WORKSHEET_REPOSITORY)
    private readonly worksheetRepository: IWorksheetRepository
  ) {}

  @Get()
  @ApiOperation({ summary: 'List worksheets with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'partnerId', required: false })
  @ApiQuery({ name: 'assignedToId', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Worksheet list with pagination' })
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('partnerId') partnerId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string
  ): Promise<WorksheetListResponse> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

    const filter: WorksheetFilterDto = {
      offset: (pageNum - 1) * pageSizeNum,
      limit: pageSizeNum,
    };

    if (status) filter.status = status;
    if (type) filter.type = type as WorksheetType;
    if (partnerId) filter.partnerId = partnerId;
    if (assignedToId) filter.assignedToId = assignedToId;
    if (dateFrom) filter.dateFrom = new Date(dateFrom);
    if (dateTo) filter.dateTo = new Date(dateTo);
    if (search) filter.search = search;

    const [worksheets, total] = await Promise.all([
      this.worksheetRepository.findAll(req.user.tenantId, filter),
      this.worksheetRepository.countByTenant(req.user.tenantId, filter),
    ]);

    return {
      data: worksheets,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        hasMore: pageNum * pageSizeNum < total,
      },
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get worksheet statistics' })
  @ApiResponse({ status: 200, description: 'Worksheet statistics' })
  async getStats(@Req() req: AuthenticatedRequest): Promise<{ data: WorksheetStats }> {
    const tenantId = req.user.tenantId;

    // Get counts for each status
    const allStatuses = Object.values(WorksheetStatus);
    const statusCounts = await Promise.all(
      allStatuses.map(async status => ({
        status,
        count: await this.worksheetRepository.countByTenant(tenantId, { status }),
      }))
    );

    const total = await this.worksheetRepository.countByTenant(tenantId, {});

    const stats: WorksheetStats = {
      total,
      felveve: statusCounts.find(s => s.status === WorksheetStatus.FELVEVE)?.count ?? 0,
      folyamatban: statusCounts.find(s => s.status === WorksheetStatus.FOLYAMATBAN)?.count ?? 0,
      varhato: statusCounts.find(s => s.status === WorksheetStatus.VARHATO)?.count ?? 0,
      kesz: statusCounts.find(s => s.status === WorksheetStatus.KESZ)?.count ?? 0,
      szamlazando: statusCounts.find(s => s.status === WorksheetStatus.SZAMLAZANDO)?.count ?? 0,
      lezart: statusCounts.find(s => s.status === WorksheetStatus.LEZART)?.count ?? 0,
    };

    return { data: stats };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get worksheet by ID' })
  @ApiResponse({ status: 200, description: 'Worksheet details' })
  @ApiResponse({ status: 404, description: 'Worksheet not found' })
  async findById(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string
  ): Promise<{ data: IWorksheet } | { error: { code: string; message: string } }> {
    const worksheet = await this.worksheetRepository.findById(id, req.user.tenantId);

    if (!worksheet) {
      return { error: { code: 'NOT_FOUND', message: 'Munkalap nem található' } };
    }

    return { data: worksheet };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new worksheet' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['partnerId', 'deviceName', 'faultDescription'],
      properties: {
        partnerId: { type: 'string', format: 'uuid' },
        deviceName: { type: 'string' },
        deviceSerialNumber: { type: 'string' },
        faultDescription: { type: 'string' },
        type: { type: 'string', enum: ['FIZETOS', 'GARANCIALIS', 'BERLESI', 'KARBANTARTAS'] },
        priority: {
          type: 'string',
          enum: ['NORMAL', 'SURGOS', 'FELARAS', 'GARANCIALIS', 'FRANCHISE'],
        },
        costLimit: { type: 'number' },
        estimatedCompletionDate: { type: 'string', format: 'date' },
        internalNote: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Worksheet created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      partnerId: string;
      deviceName: string;
      deviceSerialNumber?: string;
      faultDescription: string;
      type?: WorksheetType;
      priority?: WorksheetPriority;
      costLimit?: number;
      estimatedCompletionDate?: string;
      internalNote?: string;
    }
  ): Promise<{ data: IWorksheet } | { error: { code: string; message: string } }> {
    try {
      // Generate worksheet number
      const year = new Date().getFullYear();
      const seq = await this.worksheetRepository.getNextSequence(req.user.tenantId, year);
      const worksheetNumber = `ML-${year}-${String(seq).padStart(5, '0')}`;

      const worksheetData: Partial<IWorksheet> = {
        tenantId: req.user.tenantId,
        worksheetNumber,
        partnerId: body.partnerId,
        deviceName: body.deviceName,
        faultDescription: body.faultDescription,
        type: body.type ?? WorksheetType.FIZETOS,
        priority: body.priority ?? WorksheetPriority.NORMAL,
        status: WorksheetStatus.FELVEVE,
        createdBy: req.user.id,
      };

      if (body.deviceSerialNumber) worksheetData.deviceSerialNumber = body.deviceSerialNumber;
      if (body.costLimit !== undefined) worksheetData.costLimit = body.costLimit;
      if (body.estimatedCompletionDate) {
        worksheetData.estimatedCompletionDate = new Date(body.estimatedCompletionDate);
      }
      if (body.internalNote) worksheetData.internalNote = body.internalNote;

      const worksheet = await this.worksheetRepository.create(worksheetData);

      return { data: worksheet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update worksheet' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        deviceName: { type: 'string' },
        deviceSerialNumber: { type: 'string' },
        faultDescription: { type: 'string' },
        diagnosis: { type: 'string' },
        workPerformed: { type: 'string' },
        priority: {
          type: 'string',
          enum: ['NORMAL', 'SURGOS', 'FELARAS', 'GARANCIALIS', 'FRANCHISE'],
        },
        costLimit: { type: 'number' },
        estimatedCompletionDate: { type: 'string', format: 'date' },
        internalNote: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Worksheet updated' })
  @ApiResponse({ status: 404, description: 'Worksheet not found' })
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      deviceName?: string;
      deviceSerialNumber?: string;
      faultDescription?: string;
      diagnosis?: string;
      workPerformed?: string;
      priority?: WorksheetPriority;
      costLimit?: number;
      estimatedCompletionDate?: string;
      internalNote?: string;
    }
  ): Promise<{ data: IWorksheet } | { error: { code: string; message: string } }> {
    try {
      const updateData: Partial<IWorksheet> = {};

      if (body.deviceName !== undefined) updateData.deviceName = body.deviceName;
      if (body.deviceSerialNumber !== undefined)
        updateData.deviceSerialNumber = body.deviceSerialNumber;
      if (body.faultDescription !== undefined) updateData.faultDescription = body.faultDescription;
      if (body.diagnosis !== undefined) updateData.diagnosis = body.diagnosis;
      if (body.workPerformed !== undefined) updateData.workPerformed = body.workPerformed;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.costLimit !== undefined) updateData.costLimit = body.costLimit;
      if (body.estimatedCompletionDate !== undefined) {
        updateData.estimatedCompletionDate = new Date(body.estimatedCompletionDate);
      }
      if (body.internalNote !== undefined) updateData.internalNote = body.internalNote;

      const worksheet = await this.worksheetRepository.update(id, req.user.tenantId, updateData);

      return { data: worksheet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      return { error: { code: 'VALIDATION_ERROR', message } };
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change worksheet status' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: {
          type: 'string',
          enum: ['FELVEVE', 'FOLYAMATBAN', 'VARHATO', 'KESZ', 'SZAMLAZANDO', 'LEZART', 'TOROLVE'],
        },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Status changed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Worksheet not found' })
  async changeStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status: WorksheetStatus; reason?: string }
  ): Promise<{ data: IWorksheet } | { error: { code: string; message: string } }> {
    try {
      const worksheet = await this.worksheetRepository.changeStatus(
        id,
        req.user.tenantId,
        body.status,
        req.user.id,
        body.reason
      );

      return { data: worksheet };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('nem található')) {
        return { error: { code: 'NOT_FOUND', message } };
      }
      if (message.includes('Érvénytelen')) {
        return { error: { code: 'INVALID_TRANSITION', message } };
      }
      return { error: { code: 'ERROR', message } };
    }
  }
}
