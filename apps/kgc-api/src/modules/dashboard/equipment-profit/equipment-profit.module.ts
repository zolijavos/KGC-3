/**
 * Equipment Profit Dashboard Module
 * Epic 40: Story 40-4 - Bérgép megtérülés dashboard widget
 */

import { Module } from '@nestjs/common';
import { EquipmentProfitDashboardController } from './equipment-profit.controller';
import { EquipmentProfitDashboardService } from './equipment-profit.service';

@Module({
  controllers: [EquipmentProfitDashboardController],
  providers: [EquipmentProfitDashboardService],
  exports: [EquipmentProfitDashboardService],
})
export class EquipmentProfitDashboardModule {}
