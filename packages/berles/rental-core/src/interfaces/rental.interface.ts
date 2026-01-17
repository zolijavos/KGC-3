/**
 * Rental Interface - Epic 14: Rental Operations
 * Covers: FR11-FR21, FR101-FR106
 */

/**
 * Rental status lifecycle - Story 14-7
 * DRAFT → ACTIVE → RETURNED (happy path)
 * DRAFT → CANCELLED (cancelled before pickup)
 * ACTIVE → OVERDUE → RETURNED (late return)
 * ACTIVE → EXTENDED → ACTIVE (extension)
 */
export enum RentalStatus {
  /** Rental created but not yet picked up */
  DRAFT = 'DRAFT',
  /** Equipment picked up, rental active */
  ACTIVE = 'ACTIVE',
  /** Rental extended (intermediate state) */
  EXTENDED = 'EXTENDED',
  /** Past expected return date */
  OVERDUE = 'OVERDUE',
  /** Equipment returned, rental complete */
  RETURNED = 'RETURNED',
  /** Rental cancelled before pickup */
  CANCELLED = 'CANCELLED',
  /** Disputed - requires resolution */
  DISPUTED = 'DISPUTED',
}

/**
 * Pricing tier for rate calculation - Story 14-2
 */
export enum PricingTier {
  /** 1-6 days: daily rate */
  DAILY = 'DAILY',
  /** 7-29 days: weekly rate */
  WEEKLY = 'WEEKLY',
  /** 30+ days: monthly rate */
  MONTHLY = 'MONTHLY',
}

/**
 * Discount type - Story 14-3
 */
export enum DiscountType {
  /** Role-based discount (employee, VIP, etc.) */
  ROLE_BASED = 'ROLE_BASED',
  /** Volume discount for multiple items */
  VOLUME = 'VOLUME',
  /** Promotional code */
  PROMO_CODE = 'PROMO_CODE',
  /** Loyalty/frequent renter discount */
  LOYALTY = 'LOYALTY',
  /** Contract-based discount */
  CONTRACT = 'CONTRACT',
  /** Manual manager override */
  MANUAL = 'MANUAL',
}

/**
 * Rental event type for audit - Story 14-7
 */
export enum RentalEventType {
  CREATED = 'CREATED',
  PICKED_UP = 'PICKED_UP',
  EXTENDED = 'EXTENDED',
  BECAME_OVERDUE = 'BECAME_OVERDUE',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
  DISCOUNT_APPLIED = 'DISCOUNT_APPLIED',
  DISCOUNT_REMOVED = 'DISCOUNT_REMOVED',
  LATE_FEE_APPLIED = 'LATE_FEE_APPLIED',
  LATE_FEE_WAIVED = 'LATE_FEE_WAIVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  DEPOSIT_COLLECTED = 'DEPOSIT_COLLECTED',
  DEPOSIT_RETURNED = 'DEPOSIT_RETURNED',
  DEPOSIT_RETAINED = 'DEPOSIT_RETAINED',
  NOTE_ADDED = 'NOTE_ADDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  PRICE_ADJUSTED = 'PRICE_ADJUSTED',
}

/**
 * Core Rental entity - Story 14-1, 14-4, 14-7
 */
export interface Rental {
  id: string;
  tenantId: string;
  locationId: string;

  /** Rental number (human-readable) */
  rentalNumber: string;

  /** Customer/Partner ID */
  customerId: string;

  /** Customer name (denormalized for display) */
  customerName: string;

  /** Equipment being rented */
  equipmentId: string;

  /** Equipment name (denormalized) */
  equipmentName: string;

  /** Current status */
  status: RentalStatus;

  /** Rental start date (pickup) */
  startDate: Date;

  /** Expected return date */
  expectedReturnDate: Date;

  /** Actual return date */
  actualReturnDate?: Date | undefined;

  /** Original expected return (before extensions) */
  originalReturnDate: Date;

  /** Number of extensions applied */
  extensionCount: number;

  /** Pricing details */
  pricing: RentalPricing;

  /** Applied discounts */
  discounts: AppliedDiscount[];

  /** Late fee if applicable */
  lateFee?: LateFeeDetails | undefined;

  /** Deposit amount */
  depositAmount: number;

  /** Deposit status */
  depositStatus: DepositStatus;

  /** Accessory checklist verified at pickup */
  pickupChecklistVerified: boolean;

  /** Accessory checklist verified at return */
  returnChecklistVerified: boolean;

  /** Notes */
  notes?: string | undefined;

  /** Staff who created the rental */
  createdBy: string;

  /** Staff who processed pickup */
  pickedUpBy?: string | undefined;

  /** Staff who processed return */
  returnedBy?: string | undefined;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rental pricing breakdown - Story 14-2
 */
export interface RentalPricing {
  /** Applied pricing tier */
  tier: PricingTier;

  /** Base daily rate */
  dailyRate: number;

  /** Base weekly rate */
  weeklyRate: number;

  /** Base monthly rate */
  monthlyRate: number;

  /** Rental duration in days */
  durationDays: number;

  /** Gross amount before discounts */
  grossAmount: number;

  /** Total discount amount */
  discountAmount: number;

  /** Net amount after discounts */
  netAmount: number;

  /** VAT rate (e.g., 0.27 for 27%) */
  vatRate: number;

  /** VAT amount */
  vatAmount: number;

  /** Total amount including VAT */
  totalAmount: number;

  /** Late fee amount */
  lateFeeAmount: number;

  /** Grand total (totalAmount + lateFeeAmount) */
  grandTotal: number;
}

/**
 * Applied discount - Story 14-3
 */
export interface AppliedDiscount {
  id: string;
  type: DiscountType;
  name: string;
  /** Discount percentage (0-100) */
  percentage?: number | undefined;
  /** Fixed discount amount */
  fixedAmount?: number | undefined;
  /** Calculated discount value */
  calculatedAmount: number;
  /** Who applied this discount */
  appliedBy: string;
  /** Reason/notes */
  reason?: string | undefined;
  appliedAt: Date;
}

/**
 * Discount rule definition - Story 14-3
 */
export interface DiscountRule {
  id: string;
  tenantId: string;
  type: DiscountType;
  name: string;
  description?: string | undefined;
  /** Percentage discount (0-100) */
  percentage?: number | undefined;
  /** Fixed amount discount */
  fixedAmount?: number | undefined;
  /** Minimum rental days to apply */
  minDays?: number | undefined;
  /** Maximum discount amount cap */
  maxDiscountAmount?: number | undefined;
  /** Required role for role-based discounts */
  requiredRole?: string | undefined;
  /** Promo code for promo discounts */
  promoCode?: string | undefined;
  /** Promo code valid from */
  validFrom?: Date | undefined;
  /** Promo code valid until */
  validUntil?: Date | undefined;
  /** Is active */
  isActive: boolean;
  /** Can be combined with other discounts */
  stackable: boolean;
  /** Priority (lower = applied first) */
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Late fee details - Story 14-6
 */
export interface LateFeeDetails {
  /** Days overdue */
  daysOverdue: number;
  /** Daily late fee rate */
  dailyLateFeeRate: number;
  /** Calculated late fee amount */
  amount: number;
  /** Maximum late fee cap */
  maxLateFee?: number;
  /** Is fee waived */
  isWaived: boolean;
  /** Waiver reason */
  waiverReason?: string;
  /** Waived by (staff ID) */
  waivedBy?: string;
  calculatedAt: Date;
}

/**
 * Late fee configuration - Story 14-6
 */
export interface LateFeeConfig {
  /** Daily late fee as percentage of daily rate */
  dailyFeePercentage: number;
  /** Or fixed daily amount */
  dailyFeeFixed?: number;
  /** Maximum late fee as percentage of rental amount */
  maxFeePercentage: number;
  /** Grace period in hours before late fee applies */
  gracePeriodHours: number;
  /** Roles that can waive late fees */
  waiverRoles: string[];
}

/**
 * Deposit status
 */
export enum DepositStatus {
  /** Not yet collected */
  PENDING = 'PENDING',
  /** Collected (cash or card pre-auth) */
  COLLECTED = 'COLLECTED',
  /** Returned to customer */
  RETURNED = 'RETURNED',
  /** Partially retained (damage) */
  PARTIALLY_RETAINED = 'PARTIALLY_RETAINED',
  /** Fully retained (damage/loss) */
  FULLY_RETAINED = 'FULLY_RETAINED',
}

/**
 * Rental extension - Story 14-5
 */
export interface RentalExtension {
  id: string;
  rentalId: string;
  /** Previous expected return date */
  previousReturnDate: Date;
  /** New expected return date */
  newReturnDate: Date;
  /** Additional days */
  additionalDays: number;
  /** Additional amount */
  additionalAmount: number;
  /** Reason for extension */
  reason?: string | undefined;
  /** Requested by customer (self-service) */
  selfService: boolean;
  /** Approved by (if requires approval) */
  approvedBy?: string | undefined;
  /** Extension payment status */
  paymentStatus: 'PENDING' | 'PAID' | 'WAIVED';
  createdAt: Date;
}

/**
 * Rental history entry - Story 14-7
 */
export interface RentalHistoryEntry {
  id: string;
  rentalId: string;
  eventType: RentalEventType;
  /** Previous status (for status changes) */
  previousStatus?: RentalStatus | undefined;
  /** New status (for status changes) */
  newStatus?: RentalStatus | undefined;
  /** Previous value (for amount changes) */
  previousValue?: string | undefined;
  /** New value (for amount changes) */
  newValue?: string | undefined;
  /** Staff who performed action */
  performedBy: string;
  /** Event description */
  description: string;
  /** Additional metadata */
  metadata?: Record<string, unknown> | undefined;
  performedAt: Date;
}

/**
 * Rental checkout request - Story 14-1
 */
export interface RentalCheckoutInput {
  customerId: string;
  equipmentId: string;
  startDate: Date;
  expectedReturnDate: Date;
  depositAmount: number;
  notes?: string;
}

/**
 * Rental return request - Story 14-4
 */
export interface RentalReturnInput {
  rentalId: string;
  returnDate: Date;
  accessoryChecklistVerified: boolean;
  equipmentCondition: string;
  damageNotes?: string;
  depositAction: 'RETURN' | 'RETAIN_PARTIAL' | 'RETAIN_FULL';
  retainedAmount?: number;
  retentionReason?: string;
}

/**
 * Extension request - Story 14-5
 */
export interface RentalExtensionInput {
  rentalId: string;
  newReturnDate: Date;
  reason?: string;
  selfService: boolean;
}

/**
 * Price calculation request - Story 14-2
 */
export interface PriceCalculationInput {
  equipmentId: string;
  startDate: Date;
  endDate: Date;
  customerId?: string;
  promoCode?: string;
  manualDiscounts?: Array<{
    type: DiscountType;
    percentage?: number;
    fixedAmount?: number;
    reason: string;
  }>;
}

/**
 * Price calculation result - Story 14-2
 */
export interface PriceCalculationResult {
  pricing: RentalPricing;
  appliedDiscounts: Array<{
    name: string;
    type: DiscountType;
    amount: number;
  }>;
  breakdown: {
    baseDays: number;
    baseRate: number;
    tier: PricingTier;
    tierExplanation: string;
  };
}

/**
 * Rental list result
 */
export interface RentalListResult {
  rentals: Rental[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Rental filter options
 */
export interface RentalFilterOptions {
  status?: RentalStatus;
  customerId?: string;
  equipmentId?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  overdueOnly?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Rental statistics
 */
export interface RentalStatistics {
  totalRentals: number;
  activeRentals: number;
  overdueRentals: number;
  returnedToday: number;
  dueTodayCount: number;
  totalRevenue: number;
  averageRentalDays: number;
  averageRentalValue: number;
  topEquipment: Array<{ equipmentId: string; equipmentName: string; rentalCount: number }>;
  byStatus: Record<RentalStatus, number>;
}
