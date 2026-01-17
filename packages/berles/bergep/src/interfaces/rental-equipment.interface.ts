/**
 * Rental Equipment Interface - Epic 13: Bérgép Management
 * Covers: FR49-FR51
 */

/**
 * Equipment status lifecycle - Story 13.2
 */
export enum EquipmentStatus {
  /** Equipment is in warehouse, available for rent */
  AVAILABLE = 'AVAILABLE',
  /** Equipment is currently rented out */
  RENTED = 'RENTED',
  /** Equipment is in service/repair */
  IN_SERVICE = 'IN_SERVICE',
  /** Equipment is reserved for upcoming rental */
  RESERVED = 'RESERVED',
  /** Equipment is decommissioned/scrapped */
  DECOMMISSIONED = 'DECOMMISSIONED',
  /** Equipment needs maintenance before next use */
  MAINTENANCE_REQUIRED = 'MAINTENANCE_REQUIRED',
}

/**
 * Equipment category
 */
export enum EquipmentCategory {
  /** Power tools (drills, saws, etc.) */
  POWER_TOOL = 'POWER_TOOL',
  /** Garden equipment (mowers, trimmers, etc.) */
  GARDEN = 'GARDEN',
  /** Construction equipment (concrete mixers, etc.) */
  CONSTRUCTION = 'CONSTRUCTION',
  /** Cleaning equipment (pressure washers, etc.) */
  CLEANING = 'CLEANING',
  /** Small machinery */
  MACHINERY = 'MACHINERY',
  /** Hand tools */
  HAND_TOOL = 'HAND_TOOL',
  /** Measurement tools */
  MEASUREMENT = 'MEASUREMENT',
  /** Safety equipment */
  SAFETY = 'SAFETY',
}

/**
 * Equipment condition
 */
export enum EquipmentCondition {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  NEEDS_REPAIR = 'NEEDS_REPAIR',
}

/**
 * Core Rental Equipment entity - Story 13.1
 */
export interface RentalEquipment {
  id: string;
  tenantId: string;
  locationId: string;

  /** Link to product catalog (cikk) */
  productId?: string;

  /** Equipment serial number - Story 13.3 */
  serialNumber: string;

  /** Internal inventory code */
  inventoryCode: string;

  /** QR code for scanning - Story 13.3 */
  qrCode: string;

  /** Equipment name/title */
  name: string;

  /** Detailed description */
  description?: string;

  /** Category */
  category: EquipmentCategory;

  /** Brand/manufacturer */
  brand?: string;

  /** Model name/number */
  model?: string;

  /** Current status */
  status: EquipmentStatus;

  /** Current condition */
  condition: EquipmentCondition;

  /** Daily rental price */
  dailyRate: number;

  /** Weekly rental price */
  weeklyRate: number;

  /** Monthly (30-day) rental price */
  monthlyRate: number;

  /** Deposit amount */
  depositAmount: number;

  /** Purchase date */
  purchaseDate?: Date;

  /** Purchase price */
  purchasePrice?: number;

  /** Warranty expiry date */
  warrantyExpiry?: Date;

  /** Last maintenance date */
  lastMaintenanceDate?: Date;

  /** Next scheduled maintenance */
  nextMaintenanceDate?: Date;

  /** Maintenance interval in days */
  maintenanceIntervalDays?: number;

  /** Total rental count */
  totalRentals: number;

  /** Total revenue generated */
  totalRevenue: number;

  /** Notes */
  notes?: string;

  /** Is active (soft delete) */
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Equipment Accessory - Story 13.4
 */
export interface EquipmentAccessory {
  id: string;
  equipmentId: string;

  /** Accessory name */
  name: string;

  /** Description */
  description?: string;

  /** Quantity (how many of this accessory) */
  quantity: number;

  /** Is this accessory mandatory for rental? */
  isMandatory: boolean;

  /** Replacement cost if lost/damaged */
  replacementCost: number;

  /** Current condition */
  condition: EquipmentCondition;

  /** Notes */
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Equipment History Entry - Story 13.5
 */
export interface EquipmentHistoryEntry {
  id: string;
  equipmentId: string;

  /** Type of history event */
  eventType: EquipmentEventType;

  /** Previous status (for status changes) */
  previousStatus?: EquipmentStatus;

  /** New status (for status changes) */
  newStatus?: EquipmentStatus;

  /** Related rental ID (if applicable) */
  rentalId?: string;

  /** Related service/repair ID (if applicable) */
  serviceId?: string;

  /** User who performed the action */
  performedBy: string;

  /** Event description */
  description: string;

  /** Additional notes */
  notes?: string;

  /** Event timestamp */
  performedAt: Date;
}

/**
 * Equipment event types - Story 13.5
 */
export enum EquipmentEventType {
  CREATED = 'CREATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  RENTED_OUT = 'RENTED_OUT',
  RETURNED = 'RETURNED',
  SENT_TO_SERVICE = 'SENT_TO_SERVICE',
  RETURNED_FROM_SERVICE = 'RETURNED_FROM_SERVICE',
  MAINTENANCE_PERFORMED = 'MAINTENANCE_PERFORMED',
  MAINTENANCE_SCHEDULED = 'MAINTENANCE_SCHEDULED',
  CONDITION_UPDATED = 'CONDITION_UPDATED',
  ACCESSORY_ADDED = 'ACCESSORY_ADDED',
  ACCESSORY_REMOVED = 'ACCESSORY_REMOVED',
  ACCESSORY_DAMAGED = 'ACCESSORY_DAMAGED',
  DECOMMISSIONED = 'DECOMMISSIONED',
  REACTIVATED = 'REACTIVATED',
  NOTES_UPDATED = 'NOTES_UPDATED',
}

/**
 * Maintenance record - Story 13.5
 */
export interface MaintenanceRecord {
  id: string;
  equipmentId: string;

  /** Type of maintenance */
  maintenanceType: MaintenanceType;

  /** Description of work done */
  description: string;

  /** Parts replaced */
  partsReplaced?: string[];

  /** Cost of maintenance */
  cost: number;

  /** Performed by (technician name/ID) */
  performedBy: string;

  /** Date performed */
  performedAt: Date;

  /** Next maintenance due */
  nextDueDate?: Date;

  /** Notes */
  notes?: string;

  createdAt: Date;
}

/**
 * Maintenance types - Story 13.5
 */
export enum MaintenanceType {
  ROUTINE = 'ROUTINE',
  REPAIR = 'REPAIR',
  INSPECTION = 'INSPECTION',
  CLEANING = 'CLEANING',
  PART_REPLACEMENT = 'PART_REPLACEMENT',
  CALIBRATION = 'CALIBRATION',
  WARRANTY_SERVICE = 'WARRANTY_SERVICE',
}

/**
 * Create equipment input - Story 13.1
 */
export interface CreateEquipmentInput {
  productId?: string;
  serialNumber: string;
  inventoryCode?: string;
  name: string;
  description?: string;
  category: EquipmentCategory;
  brand?: string;
  model?: string;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  depositAmount: number;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyExpiry?: Date;
  maintenanceIntervalDays?: number;
  notes?: string;
}

/**
 * Update equipment input
 */
export interface UpdateEquipmentInput {
  name?: string;
  description?: string;
  category?: EquipmentCategory;
  brand?: string;
  model?: string;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  depositAmount?: number;
  condition?: EquipmentCondition;
  warrantyExpiry?: Date;
  maintenanceIntervalDays?: number;
  notes?: string;
}

/**
 * Status change input - Story 13.2
 */
export interface ChangeEquipmentStatusInput {
  equipmentId: string;
  newStatus: EquipmentStatus;
  reason?: string;
  relatedId?: string; // rental ID or service ID
}

/**
 * Equipment filter options
 */
export interface EquipmentFilterOptions {
  status?: EquipmentStatus;
  category?: EquipmentCategory;
  condition?: EquipmentCondition;
  brand?: string;
  minDailyRate?: number;
  maxDailyRate?: number;
  availableOnly?: boolean;
  maintenanceDueSoon?: boolean;
  search?: string;
}

/**
 * Equipment list result
 */
export interface EquipmentListResult {
  equipment: RentalEquipment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Scan result - Story 13.3
 */
export interface EquipmentScanResult {
  equipment: RentalEquipment;
  accessories: EquipmentAccessory[];
  recentHistory: EquipmentHistoryEntry[];
  currentRental?: {
    rentalId: string;
    customerId: string;
    customerName: string;
    startDate: Date;
    expectedReturnDate: Date;
  };
  maintenanceStatus: {
    isDue: boolean;
    nextDueDate?: Date;
    daysSinceLastMaintenance?: number;
  };
}

/**
 * Accessory checklist item - Story 13.4
 */
export interface AccessoryChecklistItem {
  accessory: EquipmentAccessory;
  isPresent: boolean;
  condition: EquipmentCondition;
  notes?: string;
}

/**
 * Accessory checklist result - Story 13.4
 */
export interface AccessoryChecklistResult {
  equipmentId: string;
  items: AccessoryChecklistItem[];
  allPresent: boolean;
  missingMandatory: EquipmentAccessory[];
  warnings: string[];
}

/**
 * Maintenance alert - Story 13.5
 */
export interface MaintenanceAlert {
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  alertType: 'OVERDUE' | 'DUE_SOON' | 'SCHEDULED';
  dueDate?: Date;
  daysPastDue?: number;
  daysUntilDue?: number;
  lastMaintenanceDate?: Date;
}

/**
 * Equipment statistics
 */
export interface EquipmentStatistics {
  totalEquipment: number;
  byStatus: Record<EquipmentStatus, number>;
  byCategory: Record<EquipmentCategory, number>;
  byCondition: Record<EquipmentCondition, number>;
  availableCount: number;
  rentedCount: number;
  inServiceCount: number;
  maintenanceDueCount: number;
  totalRevenue: number;
  averageUtilization: number;
}
