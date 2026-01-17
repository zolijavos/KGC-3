/**
 * @kgc/inventory - Inventory Core module
 * FR4-FR10: Készlet nyilvántartás, K-P-D helykód, multi-warehouse
 */

// Interfaces
export * from './interfaces/inventory.interface';
export * from './interfaces/location.interface';
export * from './interfaces/warehouse.interface';
export * from './interfaces/movement.interface';
export * from './interfaces/tracking.interface';
export * from './interfaces/alert.interface';

// DTOs
export * from './dto/inventory.dto';
export * from './dto/location.dto';
export * from './dto/warehouse.dto';
export * from './dto/movement.dto';
export * from './dto/tracking.dto';
export * from './dto/alert.dto';

// Services
export { InventoryService } from './services/inventory.service';
export { LocationService } from './services/location.service';
export { WarehouseService } from './services/warehouse.service';
export { MovementService } from './services/movement.service';
export { TrackingService } from './services/tracking.service';
export { AlertService } from './services/alert.service';
