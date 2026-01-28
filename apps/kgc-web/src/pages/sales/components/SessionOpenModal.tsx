/**
 * Session Open Modal
 * Modal for opening a new cash register session with opening balance
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useOpenSession } from '@/hooks/pos';
import type { CashRegisterSession } from '@/types/pos.types';
import { useState } from 'react';

interface SessionOpenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionOpened: (session: CashRegisterSession) => void;
  locationId?: string;
}

export function SessionOpenModal({
  open,
  onOpenChange,
  onSessionOpened,
  locationId = 'location-1',
}: SessionOpenModalProps) {
  const [openingBalance, setOpeningBalance] = useState<string>('');
  const openSession = useOpenSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const balance = parseFloat(openingBalance) || 0;

    try {
      const session = await openSession.mutateAsync({
        locationId,
        openingBalance: balance,
      });
      onSessionOpened(session);
      setOpeningBalance('');
      onOpenChange(false);
    } catch (error) {
      // Error is handled by React Query
      console.error('Failed to open session:', error);
    }
  };

  const handleClose = () => {
    if (!openSession.isPending) {
      setOpeningBalance('');
      onOpenChange(false);
    }
  };

  const formatPrice = (value: string) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Quick amount buttons
  const quickAmounts = [10000, 20000, 50000, 100000];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kassza nyitás</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Nyitó egyenleg (Ft)</label>
              <Input
                type="number"
                value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder="0"
                min="0"
                step="1"
                autoFocus
                className="text-lg"
              />
              {openingBalance && (
                <p className="mt-1 text-sm text-gray-500">{formatPrice(openingBalance)}</p>
              )}
            </div>

            {/* Quick amount buttons */}
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map(amount => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setOpeningBalance(String(amount))}
                  className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                >
                  {formatPrice(String(amount))}
                </button>
              ))}
            </div>

            {/* Error display */}
            {openSession.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {openSession.error instanceof Error
                  ? openSession.error.message
                  : 'Hiba történt a kassza nyitásakor'}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={openSession.isPending}
              >
                Mégse
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={openSession.isPending}
              >
                {openSession.isPending ? 'Nyitás...' : 'Kassza nyitása'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
