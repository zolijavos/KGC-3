/**
 * Session Suspend Modal
 * Modal for suspending an active cash register session
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useResumeSession, useSuspendSession } from '@/hooks/pos';
import type { CashRegisterSession } from '@/types/pos.types';
import { useState } from 'react';

interface SessionSuspendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: CashRegisterSession;
  onSessionUpdated: () => void;
}

export function SessionSuspendModal({
  open,
  onOpenChange,
  session,
  onSessionUpdated,
}: SessionSuspendModalProps) {
  const [reason, setReason] = useState<string>('');
  const suspendSession = useSuspendSession();
  const resumeSession = useResumeSession();

  const isSuspended = session?.status === 'SUSPENDED';

  const handleSuspend = async () => {
    if (!session) return;
    try {
      await suspendSession.mutateAsync({
        sessionId: session.id,
        dto: reason ? { reason } : undefined,
      });
      onSessionUpdated();
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to suspend session:', error);
    }
  };

  const handleResume = async () => {
    if (!session) return;
    try {
      await resumeSession.mutateAsync(session.id);
      onSessionUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to resume session:', error);
    }
  };

  const isPending = suspendSession.isPending || resumeSession.isPending;

  // Common suspend reasons
  const quickReasons = ['Ebédszünet', 'Szünet', 'Műszakváltás', 'Technikai probléma'];

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSuspended ? 'Kassza folytatása' : 'Kassza felfüggesztése'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Session:</span>
                <span className="font-medium">{session.sessionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Státusz:</span>
                <span
                  className={`font-medium ${isSuspended ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {isSuspended ? 'FELFÜGGESZTVE' : 'AKTÍV'}
                </span>
              </div>
            </div>
          </div>

          {/* Suspend form */}
          {!isSuspended && (
            <>
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Felfüggesztés oka (opcionális)
                </label>
                <Input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Pl. ebédszünet, műszakváltás..."
                />
              </div>

              {/* Quick reason buttons */}
              <div className="flex flex-wrap gap-2">
                {quickReasons.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`rounded px-3 py-1 text-sm ${
                      reason === r ? 'bg-yellow-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Resume info */}
          {isSuspended && (
            <div className="rounded-lg bg-yellow-50 p-4 text-sm text-yellow-700">
              <p className="font-medium">A kassza jelenleg felfüggesztve van.</p>
              <p className="mt-1">
                Kattintson a &quot;Folytatás&quot; gombra a kassza újraaktiválásához.
              </p>
            </div>
          )}

          {/* Error display */}
          {(suspendSession.isError || resumeSession.isError) && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {(suspendSession.error || resumeSession.error) instanceof Error
                ? (suspendSession.error || resumeSession.error)?.message
                : 'Hiba történt'}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isPending}
            >
              Mégse
            </Button>
            {isSuspended ? (
              <Button
                type="button"
                onClick={handleResume}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isPending}
              >
                {resumeSession.isPending ? 'Folytatás...' : 'Kassza folytatása'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSuspend}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600"
                disabled={isPending}
              >
                {suspendSession.isPending ? 'Felfüggesztés...' : 'Felfüggesztés'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
