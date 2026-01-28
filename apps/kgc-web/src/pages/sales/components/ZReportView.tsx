/**
 * Z-Report View
 * Displays the Z-report summary after session close
 */

import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import type { ZReport } from '@/types/pos.types';

interface ZReportViewProps {
  report: ZReport;
  isOpen: boolean;
  onClose: () => void;
}

export function ZReportView({ report, isOpen, onClose }: ZReportViewProps) {
  if (!isOpen) return null;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Stub - would call API to get PDF
    alert('PDF letöltés funkció hamarosan elérhető');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:bg-white">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto print:max-h-none print:shadow-none">
        <CardHeader className="border-b print:border-none">
          <CardTitle className="flex items-center justify-between">
            <span>Z-Jelentés</span>
            <span className="text-sm font-normal text-gray-500">{report.sessionNumber}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Session Info */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">KASSZA INFORMÁCIÓ</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Nyitás:</span>
                <span>{formatDateTime(report.openedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Zárás:</span>
                <span>{formatDateTime(report.closedAt)}</span>
              </div>
            </div>
          </section>

          {/* Cash Balance */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">KÉSZPÉNZ EGYENLEG</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Nyitó egyenleg:</span>
                <span>{formatPrice(report.openingBalance)}</span>
              </div>
              <div className="flex justify-between">
                <span>Várt egyenleg:</span>
                <span>{formatPrice(report.expectedBalance)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Záró egyenleg:</span>
                <span>{formatPrice(report.closingBalance)}</span>
              </div>
              <div
                className={`flex justify-between font-bold ${
                  report.variance === 0 ? 'text-green-600' : 'text-yellow-600'
                }`}
              >
                <span>Eltérés:</span>
                <span>
                  {report.variance > 0 ? '+' : ''}
                  {formatPrice(report.variance)}
                </span>
              </div>
              {report.varianceNote && (
                <div className="mt-2 rounded bg-yellow-50 p-2 text-xs text-yellow-700">
                  <span className="font-medium">Megjegyzés:</span> {report.varianceNote}
                </div>
              )}
            </div>
          </section>

          {/* Transaction Summary */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">TRANZAKCIÓK</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Összes tranzakció:</span>
                <span>{report.totalTransactions}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Befejezett:</span>
                <span>{report.completedTransactions}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Sztornózott:</span>
                <span>{report.voidedTransactions}</span>
              </div>
            </div>
          </section>

          {/* Payment Methods */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">FIZETÉSI MÓDOK</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>💵 Készpénz:</span>
                <span>{formatPrice(report.cashTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>💳 Bankkártya:</span>
                <span>{formatPrice(report.cardTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>🏦 Átutalás:</span>
                <span>{formatPrice(report.transferTotal)}</span>
              </div>
              {report.voucherTotal > 0 && (
                <div className="flex justify-between">
                  <span>🎟️ Utalvány:</span>
                  <span>{formatPrice(report.voucherTotal)}</span>
                </div>
              )}
              {report.creditTotal > 0 && (
                <div className="flex justify-between">
                  <span>📋 Hitel:</span>
                  <span>{formatPrice(report.creditTotal)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Sales Summary */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-gray-500">FORGALOM</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Bruttó eladás:</span>
                <span>{formatPrice(report.grossSales)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Kedvezmények:</span>
                <span>-{formatPrice(report.discounts)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Nettó eladás:</span>
                <span>{formatPrice(report.netSales)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>ÁFA összeg:</span>
                <span>{formatPrice(report.taxCollected)}</span>
              </div>
            </div>
          </section>

          {/* Change Given */}
          <section className="rounded-lg bg-gray-50 p-3">
            <div className="flex justify-between text-sm">
              <span>Visszaadott készpénz:</span>
              <span className="font-medium">{formatPrice(report.changeGiven)}</span>
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-2 pt-4 print:hidden">
            <Button type="button" variant="outline" onClick={handlePrint} className="flex-1">
              🖨️ Nyomtatás
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadPdf} className="flex-1">
              📄 PDF letöltés
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-kgc-primary hover:bg-kgc-primary/90"
            >
              Bezárás
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
