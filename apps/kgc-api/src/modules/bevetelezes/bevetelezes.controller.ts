/**
 * @kgc/bevetelezes - BevetelezesController
 * Epic 21: Goods Receipt Management API
 *
 * Stories:
 *   - 21-1: Avizo kezelés
 *   - 21-2: Bevételezés workflow
 *   - 21-3: Eltérés kezelés
 */

import {
  AvizoService,
  CreateAvizoDto,
  CreateDiscrepancyDto,
  CreateReceiptDto,
  DiscrepancyService,
  ReceiptService,
  ResolveDiscrepancyDto,
  UpdateAvizoDto,
} from '@kgc/bevetelezes';
import { CurrentTenant, CurrentUser, JwtAuthGuard, type JwtPayload } from '@kgc/common';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

// ============================================
// AVIZO CONTROLLER (Story 21-1)
// ============================================

@ApiTags('avizo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('avizo')
export class AvizoController {
  constructor(private readonly avizoService: AvizoService) {}

  @Post()
  @ApiOperation({ summary: 'Create new avizo (expected delivery notification)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supplierId', 'supplierName', 'expectedDate', 'items'],
      properties: {
        supplierId: { type: 'string', format: 'uuid' },
        supplierName: { type: 'string' },
        expectedDate: { type: 'string', format: 'date' },
        notes: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', format: 'uuid' },
              productCode: { type: 'string' },
              productName: { type: 'string' },
              expectedQuantity: { type: 'number' },
              unitPrice: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Avizo created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createAvizo(
    @Body() dto: CreateAvizoDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.avizoService.createAvizo(dto, tenantId, user.sub);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending avizos' })
  @ApiResponse({ status: 200, description: 'List of pending avizos' })
  async getPendingAvizos(@CurrentTenant() tenantId: string) {
    return this.avizoService.getPendingAvizos(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get avizo by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Avizo details' })
  @ApiResponse({ status: 404, description: 'Avizo not found' })
  async getAvizo(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.avizoService.getAvizoById(id, tenantId);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get avizo items' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of avizo items' })
  async getAvizoItems(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.avizoService.getAvizoItems(id, tenantId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update avizo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        expectedDate: { type: 'string', format: 'date' },
        notes: { type: 'string' },
        pdfUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Avizo updated' })
  async updateAvizo(
    @Param('id') id: string,
    @Body() dto: UpdateAvizoDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.avizoService.updateAvizo(id, dto, tenantId, user.sub);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel avizo' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Avizo cancelled' })
  async cancelAvizo(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.avizoService.cancelAvizo(id, tenantId, user.sub);
  }
}

// ============================================
// RECEIPT CONTROLLER (Story 21-2)
// ============================================

@ApiTags('receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) {}

  @Post()
  @ApiOperation({ summary: 'Create goods receipt (bevételezés)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['supplierId', 'supplierName', 'items'],
      properties: {
        avizoId: { type: 'string', format: 'uuid', description: 'Optional link to avizo' },
        supplierId: { type: 'string', format: 'uuid' },
        supplierName: { type: 'string' },
        notes: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              avizoItemId: { type: 'string', format: 'uuid' },
              productId: { type: 'string', format: 'uuid' },
              productCode: { type: 'string' },
              productName: { type: 'string' },
              expectedQuantity: { type: 'number' },
              receivedQuantity: { type: 'number' },
              unitPrice: { type: 'number' },
              locationCode: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Receipt created' })
  async createReceipt(
    @Body() dto: CreateReceiptDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.receiptService.createReceipt(dto, tenantId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receipt by ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Receipt details' })
  async getReceipt(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.receiptService.getReceiptById(id, tenantId);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get receipt items' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'List of receipt items' })
  async getReceiptItems(@Param('id') id: string, @CurrentTenant() tenantId: string) {
    return this.receiptService.getReceiptItems(id, tenantId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete receipt and update inventory' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Receipt completed, inventory updated' })
  @ApiResponse({ status: 400, description: 'Cannot complete - has unresolved discrepancies' })
  async completeReceipt(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.receiptService.completeReceipt(id, tenantId, user.sub);
  }
}

// ============================================
// DISCREPANCY CONTROLLER (Story 21-3)
// ============================================

@ApiTags('discrepancies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts/:receiptId/discrepancies')
export class DiscrepancyController {
  constructor(private readonly discrepancyService: DiscrepancyService) {}

  @Post()
  @ApiOperation({ summary: 'Report discrepancy for receipt item' })
  @ApiParam({ name: 'receiptId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['receiptItemId', 'type', 'expectedQuantity', 'actualQuantity'],
      properties: {
        receiptItemId: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['SHORTAGE', 'SURPLUS', 'DAMAGED', 'WRONG_ITEM'] },
        expectedQuantity: { type: 'number' },
        actualQuantity: { type: 'number' },
        reason: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Discrepancy created' })
  async createDiscrepancy(
    @Param('receiptId') receiptId: string,
    @Body() dto: CreateDiscrepancyDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.discrepancyService.createDiscrepancy(receiptId, dto, tenantId, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all discrepancies for receipt' })
  @ApiParam({ name: 'receiptId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'unresolvedOnly', type: 'boolean', required: false })
  @ApiResponse({ status: 200, description: 'List of discrepancies' })
  async getDiscrepancies(
    @Param('receiptId') receiptId: string,
    @Query('unresolvedOnly') unresolvedOnly: string,
    @CurrentTenant() tenantId: string
  ) {
    if (unresolvedOnly === 'true') {
      return this.discrepancyService.getUnresolvedDiscrepancies(receiptId, tenantId);
    }
    return this.discrepancyService.getDiscrepanciesByReceipt(receiptId, tenantId);
  }

  @Post(':discrepancyId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve discrepancy' })
  @ApiParam({ name: 'receiptId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'discrepancyId', type: 'string', format: 'uuid' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resolutionNote'],
      properties: {
        resolutionNote: { type: 'string' },
        notifySupplier: { type: 'boolean', default: false },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Discrepancy resolved' })
  async resolveDiscrepancy(
    @Param('discrepancyId') discrepancyId: string,
    @Body() dto: ResolveDiscrepancyDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: JwtPayload
  ) {
    return this.discrepancyService.resolveDiscrepancy(discrepancyId, dto, tenantId, user.sub);
  }
}
