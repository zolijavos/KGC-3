import { DynamicModule, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
// TODO: Re-enable after PrismaService setup - Story 35-4/35-7 deferred
// import { DashboardNotificationsService } from './dashboard-notifications.service';
import { EquipmentProfitDashboardController } from './equipment-profit/equipment-profit.controller';
import { EquipmentProfitDashboardService } from './equipment-profit/equipment-profit.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { KpiController } from './kpi/kpi.controller';
import { KpiService } from './kpi/kpi.service';
// import { DashboardNotificationsController } from './notifications.controller';
import { PartnerDashboardController } from './partner/partner.controller';
import { PartnerDashboardService } from './partner/partner.service';
import { AdminPermissionsController } from './permissions/admin-permissions.controller';
import { AdminPermissionsService } from './permissions/admin-permissions.service';
import { DashboardPermissionsController } from './permissions/dashboard-permissions.controller';
import { DashboardPermissionsService } from './permissions/dashboard-permissions.service';
import { RolePermissionsController } from './permissions/role-permissions.controller';
import { ReceivablesDashboardController } from './receivables/receivables.controller';
import { ReceivablesDashboardService } from './receivables/receivables.service';
// Epic 48: Rental Dashboard (Story 48-1, 48-2, 48-3)
import { RentalDashboardController } from './rental/rental-dashboard.controller';
import { RentalDashboardService } from './rental/rental-dashboard.service';
import { RevenueForecastController } from './revenue/revenue.controller';
import { RevenueForecastDashboardService } from './revenue/revenue.service';
import { RecurringIssuesService } from './service/recurring-issues.service';
import { ServiceDashboardController } from './service/service.controller';
import { ServiceDashboardService } from './service/service.service';
// TODO: Re-enable WebSocket after socket.io dependency setup - Story 35-7 deferred
// import { DashboardEventsService } from './websocket/dashboard-events.service';
// import { DashboardGateway } from './websocket/dashboard.gateway';

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
 * - RBAC Permissions (Story 35-8)
 * - Admin Widget Permissions (Story 45-1)
 * - Equipment Profit widgets (Story 40-4)
 * - Receivables Aging Report (Story 41-1)
 * - Revenue Forecast (Story 41-2)
 * - Rental Dashboard (Epic 48: Story 48-1, 48-2, 48-3)
 */
@Module({})
export class DashboardModule {
  static forRoot(prisma: PrismaClient): DynamicModule {
    return {
      module: DashboardModule,
      controllers: [
        // DashboardNotificationsController, // TODO: Story 35-4 deferred
        KpiController,
        InventoryController,
        ServiceDashboardController,
        PartnerDashboardController,
        DashboardPermissionsController,
        AdminPermissionsController, // Story 45-1
        RolePermissionsController, // Story 45-1 - AC5 endpoint
        EquipmentProfitDashboardController,
        ReceivablesDashboardController,
        RevenueForecastController,
        RentalDashboardController, // Epic 48: Story 48-1, 48-2, 48-3
      ],
      providers: [
        {
          provide: 'PRISMA_CLIENT',
          useValue: prisma,
        },
        // DashboardNotificationsService, // TODO: Story 35-4 deferred
        KpiService,
        InventoryService,
        ServiceDashboardService,
        RecurringIssuesService, // Story 49-2
        PartnerDashboardService,
        // RBAC Permissions (Story 35-8)
        DashboardPermissionsService,
        // Admin Permissions (Story 45-1)
        AdminPermissionsService,
        // Equipment Profit (Story 40-4)
        EquipmentProfitDashboardService,
        // Receivables Aging (Story 41-1)
        ReceivablesDashboardService,
        // Revenue Forecast (Story 41-2)
        RevenueForecastDashboardService,
        // Rental Dashboard (Epic 48)
        RentalDashboardService,
        // WebSocket (Story 35-7) - TODO: Deferred until socket.io setup
        // DashboardEventsService,
        // DashboardGateway,
      ],
      exports: [
        // DashboardNotificationsService, // TODO: Story 35-4 deferred
        KpiService,
        InventoryService,
        ServiceDashboardService,
        RecurringIssuesService, // Story 49-2
        PartnerDashboardService,
        DashboardPermissionsService,
        AdminPermissionsService, // Story 45-1
        EquipmentProfitDashboardService,
        ReceivablesDashboardService,
        RevenueForecastDashboardService,
        RentalDashboardService, // Epic 48
        // WebSocket exports - TODO: Story 35-7 deferred
        // DashboardEventsService,
        // DashboardGateway,
      ],
    };
  }
}
