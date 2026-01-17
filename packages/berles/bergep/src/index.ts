/**
 * @kgc/bergep - Rental Equipment Module
 * Epic 13: Bérgép törzs, státusz lifecycle, tartozék kezelés
 */

// Interfaces
export * from './interfaces/rental-equipment.interface';

// DTOs
export * from './dto/rental-equipment.dto';

// Services
export { RentalEquipmentService } from './services/rental-equipment.service';
export type { EquipmentPermissionContext } from './services/rental-equipment.service';
