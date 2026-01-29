import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorksheet, useWorksheetMutations } from '@/hooks/use-worksheets';
import { useNavigate, useParams } from 'react-router-dom';
import { PRIORITY_LABELS, STATUS_LABELS, TYPE_LABELS, WorksheetStatus } from './types';

// Utility functions
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('hu-HU');
};

const formatDateTime = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('hu-HU');
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
};

export function WorksheetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { worksheet, isLoading, error, refetch } = useWorksheet(id);
  const { changeStatus, isLoading: isMutating } = useWorksheetMutations();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Munkalap betöltése...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-500 mb-4">Hiba: {error}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => refetch()}>Újrapróbálás</Button>
                <Button variant="outline" onClick={() => navigate('/worksheet')}>
                  Vissza a listához
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not found state
  if (!worksheet) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">Munkalap nem található</p>
              <Button onClick={() => navigate('/worksheet')}>Vissza a listához</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: WorksheetStatus) => {
    try {
      await changeStatus(worksheet.id, newStatus);
      refetch();
    } catch (err) {
      console.error('Status change failed:', err);
    }
  };

  const getStatusColor = (status: WorksheetStatus) => {
    switch (status) {
      case WorksheetStatus.FELVEVE:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
      case WorksheetStatus.FOLYAMATBAN:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
      case WorksheetStatus.VARHATO:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300';
      case WorksheetStatus.KESZ:
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case WorksheetStatus.SZAMLAZANDO:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
      case WorksheetStatus.LEZART:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case WorksheetStatus.TOROLVE:
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/worksheet')}>
                ← Vissza
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {worksheet.worksheetNumber}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Partner ID: {worksheet.partnerId}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(worksheet.status as WorksheetStatus)}`}
              >
                {STATUS_LABELS[worksheet.status as WorksheetStatus] || worksheet.status}
              </span>
            </div>
            <div className="flex gap-2">
              {worksheet.status === 'KESZ' && (
                <Button
                  onClick={() => handleStatusChange(WorksheetStatus.SZAMLAZANDO)}
                  disabled={isMutating}
                >
                  Számlázás
                </Button>
              )}
              {worksheet.status === 'FELVEVE' && (
                <Button
                  onClick={() => handleStatusChange(WorksheetStatus.FOLYAMATBAN)}
                  disabled={isMutating}
                >
                  Munka indítása
                </Button>
              )}
              {(worksheet.status === 'FELVEVE' ||
                worksheet.status === 'FOLYAMATBAN' ||
                worksheet.status === 'VARHATO') && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/worksheet/${worksheet.id}/edit`)}
                >
                  Szerkesztés
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate(`/quotations/new?worksheetId=${worksheet.id}`)}
              >
                Árajánlat
              </Button>
              <Button variant="outline">Nyomtatás</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Gép/Termék */}
            <Card>
              <CardHeader>
                <CardTitle>Gép / Termék</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Megnevezés</p>
                    <p className="font-medium">{worksheet.deviceName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Gyári szám</p>
                    <p className="font-medium font-mono">{worksheet.deviceSerialNumber || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hiba leírás */}
            <Card>
              <CardHeader>
                <CardTitle>Hiba leírás</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {worksheet.faultDescription}
                </p>
              </CardContent>
            </Card>

            {/* Diagnózis és munka */}
            {(worksheet.diagnosis || worksheet.workPerformed) && (
              <Card>
                <CardHeader>
                  <CardTitle>Diagnózis és elvégzett munka</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {worksheet.diagnosis && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Diagnózis</p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {worksheet.diagnosis}
                      </p>
                    </div>
                  )}
                  {worksheet.workPerformed && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Elvégzett munka
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {worksheet.workPerformed}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Belső megjegyzés */}
            {worksheet.internalNote && (
              <Card>
                <CardHeader>
                  <CardTitle>Megjegyzések</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium mb-1">
                      Belső megjegyzés
                    </p>
                    <p className="text-yellow-800 dark:text-yellow-200">{worksheet.internalNote}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Munkalap adatok */}
            <Card>
              <CardHeader>
                <CardTitle>Munkalap adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Típus</p>
                  <p className="font-medium">
                    {TYPE_LABELS[worksheet.type as keyof typeof TYPE_LABELS] || worksheet.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Prioritás</p>
                  <p className="font-medium">
                    {PRIORITY_LABELS[worksheet.priority as keyof typeof PRIORITY_LABELS] ||
                      worksheet.priority}
                  </p>
                </div>
                {worksheet.costLimit && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Költséghatár</p>
                    <p className="font-medium">{formatCurrency(worksheet.costLimit)}</p>
                  </div>
                )}
                {worksheet.assignedToId && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Felelős ID</p>
                    <p className="font-medium text-sm font-mono">{worksheet.assignedToId}</p>
                  </div>
                )}
                {worksheet.estimatedCompletionDate && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Várható elkészülés</p>
                    <p className="font-medium">{formatDate(worksheet.estimatedCompletionDate)}</p>
                  </div>
                )}
                {worksheet.queuePosition !== undefined && worksheet.queuePosition !== null && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sorban</p>
                    <p className="font-medium">{worksheet.queuePosition}. helyen</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Storage info */}
            {(worksheet.storageDailyFee || worksheet.storageTotalFee) && (
              <Card>
                <CardHeader>
                  <CardTitle>Tárolási díj</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {worksheet.storageStartDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tárolás kezdete</span>
                      <span className="font-medium">{formatDate(worksheet.storageStartDate)}</span>
                    </div>
                  )}
                  {worksheet.storageDailyFee && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Napi díj</span>
                      <span className="font-medium">
                        {formatCurrency(worksheet.storageDailyFee)}
                      </span>
                    </div>
                  )}
                  {worksheet.storageTotalFee && (
                    <div className="flex justify-between border-t pt-2">
                      <span className="font-medium">Összes díj</span>
                      <span className="font-bold">{formatCurrency(worksheet.storageTotalFee)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Dátumok */}
            <Card>
              <CardHeader>
                <CardTitle>Időpontok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Felvéve</span>
                  <span>{formatDateTime(worksheet.receivedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Létrehozva</span>
                  <span>{formatDateTime(worksheet.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Módosítva</span>
                  <span>{formatDateTime(worksheet.updatedAt)}</span>
                </div>
                {worksheet.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Befejezve</span>
                    <span className="text-green-600">{formatDateTime(worksheet.completedAt)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-500">Létrehozó ID</span>
                  <span className="font-mono text-xs">{worksheet.createdBy}</span>
                </div>
              </CardContent>
            </Card>

            {/* Rental link */}
            {worksheet.rentalId && (
              <Card>
                <CardHeader>
                  <CardTitle>Kapcsolódó bérlés</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate(`/rental/${worksheet.rentalId}`)}
                  >
                    Bérlés megtekintése
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
