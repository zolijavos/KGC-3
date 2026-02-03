import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { InventoryQuerySchema, type InventoryQueryDto } from './dto/inventory-query.dto';
import type {
  StockSummaryResponse,
  StockAlertResponse,
  StockMovementResponse,
  StockHeatmapResponse,
} from './dto/inventory-response.dto';

/**
 * Inventory Controller
 *
 * Stock dashboard endpoints for inventory widgets
 *
 * RBAC: @Roles('OPERATOR', 'STORE_MANAGER', 'ADMIN') - requires role check
 * TODO: Add JwtAuthGuard + RolesGuard when auth module integrated
 */
@ApiTags('dashboard')
@Controller('api/v1/dashboard/inventory')
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
