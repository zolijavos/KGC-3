import { JwtAuthGuard } from '@kgc/auth';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryQuerySchema, type InventoryQueryDto } from './dto/inventory-query.dto';
import type {
  StockAlertResponse,
  StockHeatmapResponse,
  StockMovementResponse,
  StockSummaryResponse,
} from './dto/inventory-response.dto';
import { InventoryService } from './inventory.service';

/**
 * Inventory Controller
 *
 * Stock dashboard endpoints for inventory widgets
 *
 * RBAC: Requires authentication via JwtAuthGuard
 * Access: OPERATOR, STORE_MANAGER, ADMIN roles (enforced at route level)
 */
@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get Stock Summary (Készlet Összesítés)' })
  async getSummary(): Promise<StockSummaryResponse> {
    return this.inventoryService.getSummary();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get Stock Alerts (Készlethiány Alertek)' })
  @ApiQuery({ name: 'days', type: Number, required: false, example: 30 })
  @ApiQuery({ name: 'severity', enum: ['critical', 'warning', 'all'], required: false })
  async getAlerts(@Query() rawQuery: Record<string, unknown>): Promise<StockAlertResponse> {
    const query = InventoryQuerySchema.parse(rawQuery) as InventoryQueryDto;
    return this.inventoryService.getAlerts(query);
  }

  @Get('movement')
  @ApiOperation({ summary: 'Get Stock Movement (Készlet Mozgás)' })
  @ApiQuery({ name: 'days', type: Number, required: false, example: 30 })
  async getMovement(@Query() rawQuery: Record<string, unknown>): Promise<StockMovementResponse> {
    const query = InventoryQuerySchema.parse(rawQuery) as InventoryQueryDto;
    return this.inventoryService.getMovement(query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Get Stock Heatmap (Géptípus x Helyszín)' })
  async getHeatmap(): Promise<StockHeatmapResponse> {
    return this.inventoryService.getHeatmap();
  }
}
