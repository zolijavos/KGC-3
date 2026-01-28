/**
 * Session Status Badge
 * Displays the current session status with color coding
 */

import type { CashRegisterSession, CashRegisterStatus } from '@/types/pos.types';

interface SessionStatusBadgeProps {
  session: CashRegisterSession | null;
  onClick?: () => void;
}

const statusConfig: Record<CashRegisterStatus, { label: string; className: string; icon: string }> =
  {
    OPEN: {
      label: 'AKTÍV',
      className: 'bg-green-100 text-green-700 border-green-300',
      icon: '●',
    },
    SUSPENDED: {
      label: 'FELFÜGGESZTVE',
      className: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: '⏸',
    },
    CLOSED: {
      label: 'ZÁRVA',
      className: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '○',
    },
  };

export function SessionStatusBadge({ session, onClick }: SessionStatusBadgeProps) {
  if (!session) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
      >
        <span>○</span>
        <span>NINCS AKTÍV KASSZA</span>
      </button>
    );
  }

  const config = statusConfig[session.status];

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('hu-HU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium hover:opacity-80 ${config.className}`}
    >
      <span>{config.icon}</span>
      <div className="flex flex-col items-start">
        <span>{config.label}</span>
        <span className="text-xs opacity-70">
          {session.sessionNumber} | {formatTime(session.openedAt)}
        </span>
      </div>
    </button>
  );
}
