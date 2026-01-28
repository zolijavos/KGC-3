/**
 * Session Close Modal
 * Modal for closing a cash register session with closing balance and Z-report display
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useCloseSession } from '@/hooks/pos';
import type { CashRegisterSession, ZReport } from '@/types/pos.types';
import { useState } from 'react';

interface SessionCloseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session?: CashRegisterSession;
  onSessionClosed: (zReport: ZReport) => void;
}

export function SessionCloseModal({
  open,
  onOpenChange,
  session,
  onSessionClosed,
}: SessionCloseModalProps) {
  const [closingBalance, setClosingBalance] = useState<string>('');
  const [varianceNote, setVarianceNote] = useState<string>('');
  const [showVarianceInput, setShowVarianceInput] = useState(false);
  const closeSession = useCloseSession();

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate expected balance (opening + estimated cash transactions)
  // In real app, this would come from the API
  const expectedBalance = (session?.openingBalance ?? 0) + 25000; // Mock expected

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const balance = parseFloat(closingBalance) || 0;
    const variance = balance - expectedBalance;

    // If there's variance and no note, show note input
    if (variance !== 0 && !varianceNote && !showVarianceInput) {
      setShowVarianceInput(true);
      return;
    }

    if (!session) return;

    try {
      const zReport = await closeSession.mutateAsync({
        sessionId: session.id,
        locationId: session.locationId,
        dto: {
          closingBalance: balance,
          varianceNote: varianceNote || undefined,
        },
      });
      onSessionClosed(zReport);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to close session:', error);
    }
  };

  const resetForm = () => {
    setClosingBalance('');
    setVarianceNote('');
    setShowVarianceInput(false);
  };

  const currentBalance = parseFloat(closingBalance) || 0;
  const variance = currentBalance - expectedBalance;

  if (!open || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kassza zárás</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Session:</span>
                  <span className="font-medium">{session.sessionNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nyitó egyenleg:</span>
                  <span className="font-medium">{formatPrice(session.openingBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Várt egyenleg:</span>
                  <span className="font-medium">{formatPrice(expectedBalance)}</span>
                </div>
              </div>
            </div>

            {/* Closing balance input */}
            <div>
              <label className="mb-2 block text-sm font-medium">Záró egyenleg (Ft)</label>
              <Input
                type="number"
                value={closingBalance}
                onChange={e => setClosingBalance(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                autoFocus
                className="text-lg"
              />
            </div>

            {/* Variance display */}
            {closingBalance && (
              <div
                className={`rounded-lg p-3 ${
                  variance === 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                <div className="flex justify-between">
                  <span>Eltérés:</span>
                  <span className="font-bold">
                    {variance > 0 ? '+' : ''}
                    {formatPrice(variance)}
                  </span>
                </div>
                {variance !== 0 && (
                  <p className="mt-1 text-xs">
                    {variance > 0 ? 'Többlet a kasszában' : 'Hiány a kasszában'}
                  </p>
                )}
              </div>
            )}

            {/* Variance note input */}
            {showVarianceInput && variance !== 0 && (
              <div>
                <label className="mb-2 block text-sm font-medium text-yellow-700">
                  Eltérés indoklása (kötelező)
                </label>
                <Input
                  type="text"
                  value={varianceNote}
                  onChange={e => setVarianceNote(e.target.value)}
                  placeholder="Adja meg az eltérés okát..."
                  className="border-yellow-300"
                />
              </div>
            )}

            {/* Error display */}
            {closeSession.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {closeSession.error instanceof Error
                  ? closeSession.error.message
                  : 'Hiba történt a kassza zárásakor'}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                className="flex-1"
                disabled={closeSession.isPending}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={
                  closeSession.isPending ||
                  !closingBalance ||
                  (showVarianceInput && variance !== 0 && !varianceNote)
                }
              >
                {closeSession.isPending ? 'Zárás...' : 'Kassza zárása'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
