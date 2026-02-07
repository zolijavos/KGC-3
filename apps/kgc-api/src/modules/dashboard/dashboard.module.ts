import { DynamicModule, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DashboardNotificationsService } from './dashboard-notifications.service';
import { EquipmentProfitDashboardController } from './equipment-profit/equipment-profit.controller';
import { EquipmentProfitDashboardService } from './equipment-profit/equipment-profit.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { KpiController } from './kpi/kpi.controller';
import { KpiService } from './kpi/kpi.service';
import { DashboardNotificationsController } from './notifications.controller';
import { PartnerDashboardController } from './partner/partner.controller';
import { PartnerDashboardService } from './partner/partner.service';
import { ReceivablesDashboardController } from './receivables/receivables.controller';
import { ReceivablesDashboardService } from './receivables/receivables.service';
import { RevenueForecastController } from './revenue/revenue.controller';
import { RevenueForecastDashboardService } from './revenue/revenue.service';
import { ServiceDashboardController } from './service/service.controller';
import { ServiceDashboardService } from './service/service.service';
import { DashboardEventsService } from './websocket/dashboard-events.service';
import { DashboardGateway } from './websocket/dashboard.gateway';

/**
 * Dashboard Module (Epic 35: Dashboard Foundation + Epic 41)
 *
 * Provides dashboard functionality:
 * - Notifications (Story 35-4)
 * - KPIs (Story 35-2)
 * - Inventory widgets (Story 35-3)
 * - Service widgets (Story 35-5)
 * - Partner widgets (Story 35-6)
 * - WebSocket Real-Time Events (Story 35-7)
 * - Equipment Profit widgets (Story 40-4)
 * - Receivables Aging Report (Story 41-1)
 * - Revenue Forecast (Story 41-2)
 */
@Module({})
export class DashboardModule {
  static forRoot(prisma: PrismaClient): DynamicModule {
    return {
      module: DashboardModule,
      controllers: [
        DashboardNotificationsController,
        KpiController,
        InventoryController,
        ServiceDashboardController,
        PartnerDashboardController,
        EquipmentProfitDashboardController,
        ReceivablesDashboardController,
        RevenueForecastController,
      ],
      providers: [
        {
          provide: 'PRISMA_CLIENT',
          useValue: prisma,
        },
        DashboardNotificationsService,
        KpiService,
        InventoryService,
        ServiceDashboardService,
        PartnerDashboardService,
        // Equipment Profit (Story 40-4)
        EquipmentProfitDashboardService,
        // Receivables Aging (Story 41-1)
        ReceivablesDashboardService,
        // Revenue Forecast (Story 41-2)
        RevenueForecastDashboardService,
        // WebSocket (Story 35-7)
        DashboardEventsService,
        DashboardGateway,
      ],
      exports: [
        DashboardNotificationsService,
        KpiService,
        InventoryService,
        ServiceDashboardService,
        PartnerDashboardService,
        EquipmentProfitDashboardService,
        ReceivablesDashboardService,
        RevenueForecastDashboardService,
        // WebSocket exports for other modules
        DashboardEventsService,
        DashboardGateway,
      ],
    };
  }
}
