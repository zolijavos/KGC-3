/**
 * @kgc/bergep-szerviz - Equipment-Service Integration Module
 * Epic 25: Equipment-Service Integration
 */

import { Module } from '@nestjs/common';
import { EquipmentDispatchService } from './services/equipment-dispatch.service';
import { ServiceReturnService } from './services/service-return.service';

@Module({
  providers: [EquipmentDispatchService, ServiceReturnService],
  exports: [EquipmentDispatchService, ServiceReturnService],
})
export class BergepSzervizModule {}
