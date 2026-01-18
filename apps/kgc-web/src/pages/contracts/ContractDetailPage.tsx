import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useNavigate, useParams } from 'react-router-dom';
import { CONTRACT_STATUSES, CONTRACT_TYPES, MOCK_CONTRACTS } from './mock-data';
import type { ContractStatus, ContractType } from './types';

export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const contract = MOCK_CONTRACTS.find(c => c.id === id);

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Szerződés nem található
          </h1>
          <Button onClick={() => navigate('/contracts')} className="mt-4">
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

  const getStatusBadge = (status: ContractStatus) => {
    const config = CONTRACT_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getTypeBadge = (type: ContractType) => {
    const config = CONTRACT_TYPES.find(t => t.value === type);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? type}
      </span>
    );
  };

  const handlePrintPDF = () => {
    alert(`PDF generálás: ${contract.contractNumber}\n\nA szerződés PDF-je letöltésre kerül...`);
  };

  const handleOpenRental = () => {
    if (contract.rentalId) {
      navigate(`/rental/${contract.rentalId}`);
    }
  };

  const canSign = contract.status === 'draft';
  const isActive = contract.status === 'active';

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/contracts')}>
                ← Vissza
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {contract.contractNumber}
                  </h1>
                  {getTypeBadge(contract.type)}
                  {getStatusBadge(contract.status)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {contract.partnerName}
                  {contract.rentalNumber && ` • Bérlés: ${contract.rentalNumber}`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrintPDF}>
                📄 PDF letöltés
              </Button>
              {canSign && (
                <Button className="bg-kgc-primary hover:bg-kgc-primary/90">✍️ Aláírás</Button>
              )}
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
                    <p className="text-gray-900 dark:text-gray-100">{contract.partnerName}</p>
                  </div>
                  {contract.partnerAddress && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Cím
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">{contract.partnerAddress}</p>
                    </div>
                  )}
                  {contract.partnerPhone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Telefon
                      </label>
                      <p className="text-gray-900 dark:text-gray-100">
                        <a
                          href={`tel:${contract.partnerPhone}`}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {contract.partnerPhone}
                        </a>
                      </p>
                    </div>
                  )}
                  {contract.partnerIdNumber && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Személyi ig. szám
                      </label>
                      <p className="text-gray-900 dark:text-gray-100 font-mono">
                        {contract.partnerIdNumber}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Contract period */}
            <Card>
              <CardHeader>
                <CardTitle>Szerződés időtartama</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Kezdete
                    </label>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(contract.startDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Várható vége
                    </label>
                    <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(contract.expectedEndDate)}
                    </p>
                  </div>
                  {contract.actualEndDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tényleges vége
                      </label>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        {formatDate(contract.actualEndDate)}
                      </p>
                    </div>
                  )}
                </div>
                {isActive && (
                  <div className="mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      🔄 Aktív szerződés - visszavétel folyamatban
                    </p>
                  </div>
                )}
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
                          Napi díj
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Összesen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {contract.items.map(item => (
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
                            {item.quantity} db
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                            {item.dailyRate ? formatPrice(item.dailyRate) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600">
                      <tr>
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-gray-100"
                        >
                          Összesen:
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-gray-900 dark:text-gray-100">
                          {formatPrice(contract.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Terms & Notes */}
            {(contract.terms || contract.notes) && (
              <Card>
                <CardHeader>
                  <CardTitle>Feltételek és megjegyzések</CardTitle>
                </CardHeader>
                <CardContent>
                  {contract.terms && (
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Szerződési feltételek
                      </label>
                      <p className="mt-1 text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {contract.terms}
                      </p>
                    </div>
                  )}
                  {contract.notes && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                      <label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Megjegyzés
                      </label>
                      <p className="mt-1 text-blue-800 dark:text-blue-200">{contract.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & signatures */}
            <Card>
              <CardHeader>
                <CardTitle>Státusz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">Állapot:</span>
                    {getStatusBadge(contract.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Létrehozva:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatDateTime(contract.createdAt)}
                    </span>
                  </div>
                  {contract.signedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Aláírva:</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatDateTime(contract.signedAt)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-4 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Aláírások:
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={contract.signedByPartner ? 'text-green-600' : 'text-gray-400'}
                        >
                          {contract.signedByPartner ? '✓' : '○'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">Partner aláírása</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={contract.signedByStaff ? 'text-green-600' : 'text-gray-400'}
                        >
                          {contract.signedByStaff ? '✓' : '○'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">Munkatárs aláírása</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between border-t pt-4 dark:border-slate-700">
                    <span className="text-gray-500 dark:text-gray-400">Készítette:</span>
                    <span className="text-gray-900 dark:text-gray-100">{contract.createdBy}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposit */}
            <Card
              className={
                contract.depositPaid
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
              }
            >
              <CardContent className="pt-4">
                <div className="text-center">
                  <p
                    className={`text-sm ${contract.depositPaid ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}`}
                  >
                    Kaució {contract.depositPaid ? '(Befizetve)' : '(Nincs befizetve)'}
                  </p>
                  <p
                    className={`text-3xl font-bold ${contract.depositPaid ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}
                  >
                    {formatPrice(contract.depositAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-blue-600 dark:text-blue-300">Szerződés összege</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                    {formatPrice(contract.totalAmount)}
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
                    onClick={() => window.print()}
                  >
                    🖨️ Nyomtatás
                  </Button>
                  {contract.rentalId && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={handleOpenRental}
                    >
                      🔧 Bérlés megnyitása
                    </Button>
                  )}
                  {canSign && (
                    <>
                      <hr className="my-2 dark:border-slate-700" />
                      <Button className="w-full bg-kgc-primary hover:bg-kgc-primary/90">
                        ✍️ Aláírás rögzítése
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
