import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  useWebSocketEvents,
  type ConnectionStatus,
  type DashboardEvent,
  type DashboardUserRole,
} from '../../../hooks/useWebSocketEvents';

/**
 * WebSocket Context Value
 */
interface WebSocketContextValue {
  /** Current connection status */
  connectionStatus: ConnectionStatus;
  /** Last received event */
  lastEvent: DashboardEvent | null;
  /** Total events received */
  eventCount: number;
  /** Check if connected */
  isConnected: boolean;
  /** Check if reconnecting */
  isReconnecting: boolean;
  /** Manual reconnect trigger */
  reconnect: () => void;
  /** Manual disconnect */
  disconnect: () => void;
}

/**
 * WebSocket Provider Props
 */
interface WebSocketProviderProps {
  /** User ID for authentication */
  userId: string;
  /** Tenant ID for multi-tenancy */
  tenantId: string;
  /** User role for event filtering */
  role: DashboardUserRole;
  /** Child components */
  children: ReactNode;
  /** Enable WebSocket (default: true) */
  enabled?: boolean;
  /** WebSocket server URL (optional) */
  wsUrl?: string;
  /** Show toast notifications (default: true) */
  showToasts?: boolean;
  /** Custom event handler */
  onEvent?: (event: DashboardEvent) => void;
}

/**
 * Default context value (no connection)
 */
const defaultContextValue: WebSocketContextValue = {
  connectionStatus: 'disconnected',
  lastEvent: null,
  eventCount: 0,
  isConnected: false,
  isReconnecting: false,
  reconnect: () => {},
  disconnect: () => {},
};

/**
 * WebSocket Context
 */
const WebSocketContext = createContext<WebSocketContextValue>(defaultContextValue);

/**
 * WebSocket Provider Component
 * Story 35-7: WebSocket Real-Time Events
 *
 * Provides WebSocket connection state to dashboard components.
 * Should be placed at the dashboard layout level.
 */
export function WebSocketProvider({
  userId,
  tenantId,
  role,
  children,
  enabled = true,
  wsUrl,
  showToasts = true,
  onEvent,
}: WebSocketProviderProps) {
  const websocket = useWebSocketEvents({
    userId: enabled ? userId : '',
    tenantId: enabled ? tenantId : '',
    role: enabled ? role : 'OPERATOR',
    wsUrl,
    showToasts,
    onEvent,
    autoReconnect: enabled,
  });

  const value = useMemo<WebSocketContextValue>(
    () => ({
      connectionStatus: enabled ? websocket.connectionStatus : 'disconnected',
      lastEvent: websocket.lastEvent,
      eventCount: websocket.eventCount,
      isConnected: enabled && websocket.isConnected,
      isReconnecting: websocket.isReconnecting,
      reconnect: websocket.reconnect,
      disconnect: websocket.disconnect,
    }),
    [enabled, websocket]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

/**
 * Hook to access WebSocket context
 *
 * @throws Error if used outside WebSocketProvider
 */
export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }

  return context;
}

/**
 * Hook to get WebSocket connection status only
 * Lighter alternative when full context not needed
 */
export function useWebSocketStatus(): ConnectionStatus {
  return useWebSocket().connectionStatus;
}

/**
 * Hook to check if WebSocket is connected
 */
export function useIsWebSocketConnected(): boolean {
  return useWebSocket().isConnected;
}

export default WebSocketProvider;
