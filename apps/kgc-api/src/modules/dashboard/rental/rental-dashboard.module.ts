/**
 * Rental Dashboard Module
 * Epic 48: Story 48-1 - Bérlési Statisztika Widget
 */

import { Module } from '@nestjs/common';
import { RentalDashboardController } from './rental-dashboard.controller';
import { RentalDashboardService } from './rental-dashboard.service';

@Module({
  controllers: [RentalDashboardController],
  providers: [RentalDashboardService],
  exports: [RentalDashboardService],
})
export class RentalDashboardModule {}
