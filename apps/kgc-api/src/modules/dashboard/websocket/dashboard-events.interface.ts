/**
 * Dashboard WebSocket Events Interface
 * Story 35-7: WebSocket Real-Time Events
 *
 * Defines event types and payloads for real-time dashboard updates.
 */

/**
 * Server-to-client event types
 */
export enum DashboardServerEvent {
  // Stock events (AC2)
  STOCK_ALERT = 'dashboard:stock_alert',

  // Payment events (AC3)
  PAYMENT_ERROR = 'dashboard:payment_error',

  // Rental events (AC4)
  RENTAL_CREATED = 'dashboard:rental_created',

  // Connection status
  CONNECTION_STATUS = 'dashboard:connection_status',

  // Error notification
  ERROR = 'dashboard:error',
}

/**
 * Client-to-server event types
 */
export enum DashboardClientEvent {
  // Room subscription
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',

  // Missed events request (AC6)
  GET_MISSED_EVENTS = 'get_missed_events',
}

/**
 * User roles for event filtering (AC5)
 */
export enum DashboardUserRole {
  OPERATOR = 'OPERATOR',
  STORE_MANAGER = 'STORE_MANAGER',
  ADMIN = 'ADMIN',
}

/**
 * Stock Alert Event Payload (AC2)
 * Sent when inventory drops below threshold
 */
export interface StockAlertEvent {
  eventId: string;
  timestamp: string;
  type: 'stock_alert';
  data: {
    productId: string;
    productName: string;
    currentQuantity: number;
    threshold: number;
    locationId: string;
    locationName: string;
    severity: 'CRITICAL' | 'WARNING';
  };
}

/**
 * Payment Error Event Payload (AC3)
 * Sent when payment transaction fails
 */
export interface PaymentErrorEvent {
  eventId: string;
  timestamp: string;
  type: 'payment_error';
  data: {
    transactionId: string;
    errorCode: string;
    errorMessage: string;
    partnerId: string;
    partnerName: string;
    amount: number;
    currency: 'HUF';
  };
}

/**
 * Rental Created Event Payload (AC4)
 * Sent when a new rental is successfully created
 */
export interface RentalCreatedEvent {
  eventId: string;
  timestamp: string;
  type: 'rental_created';
  data: {
    rentalId: string;
    partnerId: string;
    partnerName: string;
    equipmentCount: number;
    totalValue: number;
    currency: 'HUF';
  };
}

/**
 * Union type for all dashboard events
 */
export type DashboardEvent = StockAlertEvent | PaymentErrorEvent | RentalCreatedEvent;

/**
 * Event visibility by role (AC5)
 * stock_alert: ALL roles
 * payment_error: STORE_MANAGER, ADMIN only
 * rental_created: STORE_MANAGER, ADMIN only
 */
export const EVENT_ROLE_VISIBILITY: Record<DashboardEvent['type'], DashboardUserRole[]> = {
  stock_alert: [
    DashboardUserRole.OPERATOR,
    DashboardUserRole.STORE_MANAGER,
    DashboardUserRole.ADMIN,
  ],
  payment_error: [DashboardUserRole.STORE_MANAGER, DashboardUserRole.ADMIN],
  rental_created: [DashboardUserRole.STORE_MANAGER, DashboardUserRole.ADMIN],
};

/**
 * Socket room naming convention
 *
 * /ws/dashboard
 * ├── tenant:{tenantId}:all          # All events for tenant
 * ├── tenant:{tenantId}:operators    # Stock alerts only
 * └── tenant:{tenantId}:managers     # All events (managers + admins)
 */
export function getTenantRoom(tenantId: string): string {
  return `tenant:${tenantId}:all`;
}

export function getOperatorRoom(tenantId: string): string {
  return `tenant:${tenantId}:operators`;
}

export function getManagerRoom(tenantId: string): string {
  return `tenant:${tenantId}:managers`;
}

/**
 * Get appropriate room based on user role
 */
export function getRoomForRole(tenantId: string, role: DashboardUserRole): string[] {
  const rooms = [getTenantRoom(tenantId)];

  if (role === DashboardUserRole.OPERATOR) {
    rooms.push(getOperatorRoom(tenantId));
  } else {
    // STORE_MANAGER and ADMIN get all events
    rooms.push(getManagerRoom(tenantId));
  }

  return rooms;
}

/**
 * Authenticated socket interface for dashboard
 */
export interface DashboardAuthenticatedSocket {
  id: string;
  data: {
    userId: string;
    tenantId: string;
    role: DashboardUserRole;
  };
  join(room: string): Promise<void>;
  leave(room: string): Promise<void>;
  emit(event: string, data: unknown): boolean;
  disconnect(): void;
}

/**
 * User connection tracking
 */
export interface DashboardUserConnection {
  socketId: string;
  userId: string;
  tenantId: string;
  role: DashboardUserRole;
  connectedAt: Date;
  lastActivityAt: Date;
}

/**
 * Missed events request payload (AC6)
 */
export interface GetMissedEventsRequest {
  since: string; // ISO timestamp
}

/**
 * Missed events response
 */
export interface MissedEventsResponse {
  events: DashboardEvent[];
  hasMore: boolean;
}
