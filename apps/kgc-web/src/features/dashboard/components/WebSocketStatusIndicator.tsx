import { Tooltip, TooltipContent, TooltipTrigger } from '@kgc/ui';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionStatus } from '../../../hooks/useWebSocketEvents';

/**
 * WebSocket Status Indicator Props
 */
interface WebSocketStatusIndicatorProps {
  /** Current connection status */
  status: ConnectionStatus;
  /** Reconnect attempt handler */
  onReconnect?: () => void;
  /** Show text label (default: false, tooltip only) */
  showLabel?: boolean;
}

/**
 * Status configuration for visual display
 */
const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    color: string;
    bgColor: string;
    label: string;
    icon: typeof Wifi;
    animate?: boolean;
  }
> = {
  connected: {
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'WebSocket: Csatlakozva',
    icon: Wifi,
  },
  connecting: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'WebSocket: Csatlakozás...',
    icon: Wifi,
    animate: true,
  },
  reconnecting: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    label: 'WebSocket: Újracsatlakozás...',
    icon: RefreshCw,
    animate: true,
  },
  disconnected: {
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'WebSocket: Offline',
    icon: WifiOff,
  },
};

/**
 * WebSocket Connection Status Indicator
 * Story 35-7: Task 8 - Connection status indicator
 *
 * Displays WebSocket connection status in the header:
 * - Green (connected): Active connection
 * - Yellow (reconnecting): Attempting to reconnect
 * - Red (disconnected): No connection
 */
export function WebSocketStatusIndicator({
  status,
  onReconnect,
  showLabel = false,
}: WebSocketStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const handleClick = () => {
    if (status === 'disconnected' && onReconnect) {
      onReconnect();
    }
  };

  const content = (
    <button
      type="button"
      onClick={handleClick}
      disabled={status !== 'disconnected'}
      className={`
        inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium
        ${config.bgColor} ${config.color}
        ${status === 'disconnected' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        transition-colors duration-200
      `}
      aria-label={config.label}
    >
      <Icon className={`h-4 w-4 ${config.animate ? 'animate-pulse' : ''}`} aria-hidden="true" />
      {showLabel && <span>{config.label}</span>}
    </button>
  );

  // Wrap with tooltip if no label shown
  if (!showLabel) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{config.label}</p>
          {status === 'disconnected' && onReconnect && (
            <p className="text-xs text-muted-foreground mt-1">Kattints az újracsatlakozáshoz</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export default WebSocketStatusIndicator;
