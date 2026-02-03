import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardNotificationsService } from './dashboard-notifications.service';
import { DashboardNotificationsController } from './notifications.controller';

/**
 * Dashboard Module (Epic 35: Dashboard Foundation)
 *
 * Provides dashboard functionality:
 * - Notifications (Story 35-4)
 * - KPIs (Story 35-2)
 * - Inventory widgets (Story 35-3)
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardNotificationsController],
  providers: [DashboardNotificationsService],
  exports: [DashboardNotificationsService],
})
export class DashboardModule {}
