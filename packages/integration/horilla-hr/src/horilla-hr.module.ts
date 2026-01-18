/**
 * @kgc/horilla-hr - Horilla HR Integration Module
 * Epic 30: Horilla HR Integration
 */

import { Module } from '@nestjs/common';
import { EmployeeSyncService } from './services/employee-sync.service';

@Module({
  providers: [EmployeeSyncService],
  exports: [EmployeeSyncService],
})
export class HorillaHrModule {}
