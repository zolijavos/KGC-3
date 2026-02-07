/**
 * Revenue Forecast Dashboard Module
 * Epic 41: Story 41-2 - Havi Várható Bevétel Dashboard
 */

import { Module } from '@nestjs/common';
import { RevenueForecastController } from './revenue.controller';
import { RevenueForecastDashboardService } from './revenue.service';

@Module({
  controllers: [RevenueForecastController],
  providers: [RevenueForecastDashboardService],
  exports: [RevenueForecastDashboardService],
})
export class RevenueForecastModule {}
