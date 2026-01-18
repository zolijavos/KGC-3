import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { INVOICE_STATUSES, INVOICE_TYPES, MOCK_INVOICES, PAYMENT_METHODS } from './mock-data';
import type { Invoice, InvoiceStatus, InvoiceType, PaymentMethod } from './types';

export function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const invoice = MOCK_INVOICES.find(i => i.id === id);

  if (!invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Számla nem található
          </h1>
          <Button onClick={() => navigate('/invoices')} className="mt-4">
            Vissza a listához
          </Button>
        </div>
      </div>
    );
  }

  return <InvoiceDetail invoice={invoice} navigate={navigate} />;
}

function InvoiceDetail({
  invoice,
  navigate,
}: {
  invoice: Invoice;
  navigate: ReturnType<typeof useNavigate>;
}) {
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

  const getStatusBadge = (status: InvoiceStatus) => {
    const config = INVOICE_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getTypeBadge = (type: InvoiceType) => {
    const config = INVOICE_TYPES.find(t => t.value === type);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? type}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: PaymentMethod) => {
    const config = PAYMENT_METHODS.find(m => m.value === method);
    return config?.label ?? method;
  };

  const getNavStatusBadge = (navStatus?: string) => {
    if (!navStatus) return <span className="text-gray-400">-</span>;
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, string> = {
      pending: 'Függőben',
      sent: 'Elküldve',
      accepted: 'Elfogadva',
      rejected: 'Elutasítva',
    };
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${colors[navStatus] ?? ''}`}>
        {labels[navStatus] ?? navStatus}
      </span>
    );
  };

  const handlePrintPDF = () => {
    alert(`PDF generálás: ${invoice.invoiceNumber}\n\nA számla PDF-je letöltésre kerül...`);
  };

  const handleSendEmail = () => {
    alert(
      `Email küldés: ${invoice.invoiceNumber}\n\nA számla elküldésre kerül a partner email címére...`
    );
  };

  const handleResendToNAV = () => {
    alert(
      `NAV újraküldés: ${invoice.invoiceNumber}\n\nA számla újra elküldésre kerül a NAV Online rendszerbe...`
    );
  };

  const handleMarkPaid = () => {
    alert(`Fizetve jelölés: ${invoice.invoiceNumber}\n\nA számla kifizettnek jelölve.`);
  };

  const handleCreateCorrection = () => {
    navigate(`/invoices/new?correction=${invoice.id}`);
  };

  const isOverdue = invoice.status === 'overdue';
  const daysOverdue = useMemo(() => {
    if (!isOverdue) return 0;
    const now = new Date();
    const dueDate = new Date(invoice.dueDate);
    return Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [isOverdue, invoice.dueDate]);

  const canMarkPaid = invoice.status === 'issued' || invoice.status === 'overdue';
  const canCorrect =
    invoice.status !== 'draft' && invoice.status !== 'cancelled' && invoice.type !== 'cancellation';

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/invoices')}>
                ← Vissza
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {invoice.invoiceNumber}
                  </h1>
                  {getTypeBadge(invoice.type)}
                  {getStatusBadge(invoice.status)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {invoice.partnerName}
                  {invoice.rentalNumber && ` • Bérlés: ${invoice.rentalNumber}`}
                  {invoice.worksheetNumber && ` • Munkalap: ${invoice.worksheetNumber}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintPDF}>
                📄 PDF
              </Button>
              <Button variant="outline" onClick={handleSendEmail}>
                📧 Email
              </Button>
              {canMarkPaid && (
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleMarkPaid}>
                  ✓ Fizetve
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Overdue warning */}
      {isOverdue && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4">
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  Lejárt számla! {daysOverdue} napja esedékes.
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Hátralék: {formatPrice(invoice.remainingAmount)}
                </p>
              </div>
              <Button size="sm" className="ml-auto bg-red-600 hover:bg-red-700">
                📞 Fizetési felszólítás
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Partner info */}
            <Card>
              <CardHeader>
                <CardTitle>Vevő adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Név
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{invoice.partnerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Cím
                    </label>
                    <p className="text-gray-900 dark:text-gray-100">{invoice.partnerAddress}</p>
                  </div>
                  {invoice.partnerTaxNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Adószám
                      </label>
                      <p className="font-mono text-gray-900 dark:text-gray-100">
                        {invoice.partnerTaxNumber}
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
                          Nettó
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Bruttó
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {invoice.items.map(item => (
                        <tr key={item.id}>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {item.description}
                            </p>
                            {item.productId && (
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Cikk: {item.productId}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {formatPrice(item.unitPrice)}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                            {item.vatRate}%
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {formatPrice(item.netAmount)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(item.grossAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600">
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-right text-gray-600 dark:text-gray-400"
                        >
                          Nettó összesen:
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(invoice.netTotal)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-right text-gray-600 dark:text-gray-400"
                        >
                          ÁFA összesen:
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatPrice(invoice.vatTotal)}
                        </td>
                        <td></td>
                      </tr>
                      <tr className="text-lg">
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100"
                        >
                          Fizetendő:
                        </td>
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-right font-bold text-gray-900 dark:text-gray-100"
                        >
                          {formatPrice(invoice.grossTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {invoice.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Megjegyzés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-blue-800 dark:text-blue-200">{invoice.notes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status card */}
            <Card>
              <CardHeader>
                <CardTitle>Számla adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Státusz:</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Típus:</span>
                    {getTypeBadge(invoice.type)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Kiállítás:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDate(invoice.issueDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Fizetési határidő:</span>
                    <span
                      className={
                        isOverdue
                          ? 'text-red-600 font-medium dark:text-red-400'
                          : 'text-gray-900 dark:text-gray-100'
                      }
                    >
                      {formatDate(invoice.dueDate)}
                    </span>
                  </div>
                  {invoice.paidAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Fizetve:</span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatDateTime(invoice.paidAt)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-4 dark:border-slate-700">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Fizetési mód:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {getPaymentMethodLabel(invoice.paymentMethod)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-4 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-gray-400">Készítette:</span>
                    <span className="text-gray-900 dark:text-gray-100">{invoice.createdBy}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* NAV status */}
            <Card>
              <CardHeader>
                <CardTitle>NAV Online</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Státusz:</span>
                    {getNavStatusBadge(invoice.navStatus)}
                  </div>
                  {invoice.navTransactionId && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Tranzakció ID:</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">
                        {invoice.navTransactionId}
                      </span>
                    </div>
                  )}
                  {invoice.navStatus === 'rejected' && (
                    <Button variant="outline" className="w-full" onClick={handleResendToNAV}>
                      🔄 Újraküldés NAV-nak
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment status */}
            <Card
              className={
                invoice.remainingAmount === 0
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
              }
            >
              <CardContent className="pt-4">
                <div className="text-center">
                  <p
                    className={`text-sm ${invoice.remainingAmount === 0 ? 'text-green-600 dark:text-green-300' : 'text-orange-600 dark:text-orange-300'}`}
                  >
                    {invoice.remainingAmount === 0 ? 'Teljes összeg kifizetve' : 'Hátralék'}
                  </p>
                  <p
                    className={`text-3xl font-bold ${invoice.remainingAmount === 0 ? 'text-green-700 dark:text-green-200' : 'text-orange-700 dark:text-orange-200'}`}
                  >
                    {invoice.remainingAmount === 0 ? '✓' : formatPrice(invoice.remainingAmount)}
                  </p>
                  {invoice.paidAmount > 0 && invoice.remainingAmount > 0 && (
                    <p className="text-xs text-orange-500 dark:text-orange-400 mt-1">
                      Eddig fizetve: {formatPrice(invoice.paidAmount)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-300">Számla végösszeg</p>
                  <p
                    className={`text-3xl font-bold ${invoice.grossTotal < 0 ? 'text-red-700 dark:text-red-200' : 'text-blue-700 dark:text-blue-200'}`}
                  >
                    {formatPrice(invoice.grossTotal)}
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
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSendEmail}
                  >
                    📧 Küldés emailben
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => window.print()}
                  >
                    🖨️ Nyomtatás
                  </Button>
                  {invoice.rentalId && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate(`/rental/${invoice.rentalId}`)}
                    >
                      🔧 Bérlés megnyitása
                    </Button>
                  )}
                  {invoice.worksheetId && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate(`/worksheet/${invoice.worksheetId}`)}
                    >
                      📋 Munkalap megnyitása
                    </Button>
                  )}
                  {invoice.contractId && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate(`/contracts/${invoice.contractId}`)}
                    >
                      📝 Szerződés megnyitása
                    </Button>
                  )}
                  {canCorrect && (
                    <>
                      <hr className="my-2 dark:border-slate-700" />
                      <Button
                        variant="outline"
                        className="w-full justify-start text-orange-600 hover:text-orange-700 dark:text-orange-400"
                        onClick={handleCreateCorrection}
                      >
                        ⚠️ Helyesbítő/Sztornó
                      </Button>
                    </>
                  )}
                  {canMarkPaid && (
                    <>
                      <hr className="my-2 dark:border-slate-700" />
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleMarkPaid}
                      >
                        ✓ Fizetve jelölés
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
