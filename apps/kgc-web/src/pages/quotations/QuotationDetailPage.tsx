import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_QUOTATIONS, QUOTATION_STATUSES } from './mock-data';
import type { QuotationStatus } from './types';

export function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const quotation = MOCK_QUOTATIONS.find(q => q.id === id);

  if (!quotation) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Árajánlat nem található
          </h1>
          <Button onClick={() => navigate('/quotations')} className="mt-4">
            Vissza a listához
          </Button>
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU');
  };

  const getStatusBadge = (status: QuotationStatus) => {
    const config = QUOTATION_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const handleSendEmail = () => {
    alert(
      `Email küldése: ${quotation.partnerEmail}\nTárgy: Árajánlat - ${quotation.quotationNumber}`
    );
  };

  const handlePrintPDF = () => {
    alert(`PDF generálás: ${quotation.quotationNumber}`);
  };

  const handleConvertToWorksheet = () => {
    if (quotation.worksheetId) {
      navigate(`/worksheet/${quotation.worksheetId}`);
    } else {
      alert('Ez az árajánlat nincs munkalaphoz kapcsolva.');
    }
  };

  const canEdit = quotation.status === 'draft';
  const canSend = quotation.status === 'draft';
  const canAccept = quotation.status === 'sent';

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/quotations')}>
                ← Vissza
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {quotation.quotationNumber}
                  </h1>
                  {getStatusBadge(quotation.status)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {quotation.partnerName}
                  {quotation.worksheetNumber && ` • Munkalap: ${quotation.worksheetNumber}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintPDF}>
                📄 PDF
              </Button>
              {quotation.partnerEmail && (
                <Button variant="outline" onClick={handleSendEmail}>
                  ✉️ Email
                </Button>
              )}
              {canEdit && (
                <Button className="bg-kgc-primary hover:bg-kgc-primary/90">Szerkesztés</Button>
              )}
              {canSend && <Button className="bg-blue-600 hover:bg-blue-700">Elküldés</Button>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Partner info */}
            <Card>
              <CardHeader>
                <CardTitle>Partner adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Partner neve
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{quotation.partnerName}</p>
                  </div>
                  {quotation.partnerEmail && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">
                        <a
                          href={`mailto:${quotation.partnerEmail}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {quotation.partnerEmail}
                        </a>
                      </p>
                    </div>
                  )}
                  {quotation.partnerPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Telefon
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">
                        <a
                          href={`tel:${quotation.partnerPhone}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {quotation.partnerPhone}
                        </a>
                      </p>
                    </div>
                  )}
                  {quotation.worksheetNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Kapcsolódó munkalap
                      </label>
                      <p>
                        <button
                          onClick={handleConvertToWorksheet}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {quotation.worksheetNumber} →
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Tételek</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                          Megnevezés
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Mennyiség
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Egységár
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          ÁFA
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Összesen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {quotation.items.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {item.description}
                            </p>
                            {item.productId && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Cikkszám: {item.productId}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {formatPrice(item.unitPriceNet)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                            {item.vatRate}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatPrice(item.totalGross)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              nettó: {formatPrice(item.totalNet)}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300"
                        >
                          Nettó összesen:
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(quotation.subtotalNet)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-right text-gray-600 dark:text-gray-300"
                        >
                          ÁFA összesen:
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                          {formatPrice(quotation.vatAmount)}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
                        >
                          Bruttó összesen:
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(quotation.totalGross)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {(quotation.notes || quotation.internalNotes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Megjegyzések</CardTitle>
                </CardHeader>
                <CardContent>
                  {quotation.notes && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Megjegyzés az ügyfélnek
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">{quotation.notes}</p>
                    </div>
                  )}
                  {quotation.internalNotes && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                      <label className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Belső megjegyzés (nem látja az ügyfél)
                      </label>
                      <p className="mt-1 text-orange-800 dark:text-orange-200">
                        {quotation.internalNotes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & dates */}
            <Card>
              <CardHeader>
                <CardTitle>Státusz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Állapot:</span>
                    {getStatusBadge(quotation.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Létrehozva:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDateTime(quotation.createdAt)}
                    </span>
                  </div>
                  {quotation.sentAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Elküldve:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDateTime(quotation.sentAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Érvényes:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(quotation.validUntil)}
                    </span>
                  </div>
                  {quotation.respondedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Válasz dátum:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDateTime(quotation.respondedAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-4 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-gray-400">Készítette:</span>
                    <span className="text-gray-900 dark:text-gray-100">{quotation.createdBy}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-green-600 dark:text-green-300">Árajánlat összege</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-200">
                    {formatPrice(quotation.totalGross)}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    (nettó: {formatPrice(quotation.subtotalNet)})
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Műveletek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handlePrintPDF}
                  >
                    📄 PDF letöltés
                  </Button>
                  {quotation.partnerEmail && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleSendEmail}
                    >
                      ✉️ Email küldés
                    </Button>
                  )}
                  {quotation.worksheetId && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleConvertToWorksheet}
                    >
                      📋 Munkalap megnyitása
                    </Button>
                  )}
                  {canAccept && (
                    <>
                      <hr className="my-2 dark:border-slate-700" />
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        ✓ Elfogadás rögzítése
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        ✗ Elutasítás rögzítése
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
