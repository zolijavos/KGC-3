/**
 * Worksheet Edit Page
 * Munkalap szerkesztése
 */

import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  WorksheetPriority,
  WorksheetStatus,
} from '@/api/worksheets';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useWorksheet, useWorksheetMutations } from '@/hooks/use-worksheets';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

interface FormData {
  diagnosis: string;
  workPerformed: string;
  internalNote: string;
  priority: WorksheetPriority;
  estimatedCompletionDate: string;
  costLimit: number | undefined;
  deviceName: string;
  deviceSerialNumber: string;
  faultDescription: string;
}

export function WorksheetEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { worksheet, isLoading, error, refetch } = useWorksheet(id);
  const { updateWorksheet, changeStatus, isLoading: isSaving } = useWorksheetMutations();
  const [formData, setFormData] = useState<FormData>({
    diagnosis: '',
    workPerformed: '',
    internalNote: '',
    priority: WorksheetPriority.NORMAL,
    estimatedCompletionDate: '',
    costLimit: undefined,
    deviceName: '',
    deviceSerialNumber: '',
    faultDescription: '',
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form when worksheet loads
  useEffect(() => {
    if (worksheet) {
      setFormData({
        diagnosis: worksheet.diagnosis || '',
        workPerformed: worksheet.workPerformed || '',
        internalNote: worksheet.internalNote || '',
        priority: worksheet.priority as WorksheetPriority,
        estimatedCompletionDate: worksheet.estimatedCompletionDate || '',
        costLimit: worksheet.costLimit,
        deviceName: worksheet.deviceName,
        deviceSerialNumber: worksheet.deviceSerialNumber || '',
        faultDescription: worksheet.faultDescription,
      });
    }
  }, [worksheet]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worksheet) return;

    setSaveError(null);
    try {
      await updateWorksheet(worksheet.id, {
        deviceName: formData.deviceName,
        deviceSerialNumber: formData.deviceSerialNumber || undefined,
        faultDescription: formData.faultDescription,
        diagnosis: formData.diagnosis || undefined,
        workPerformed: formData.workPerformed || undefined,
        priority: formData.priority,
        costLimit: formData.costLimit,
        estimatedCompletionDate: formData.estimatedCompletionDate || undefined,
        internalNote: formData.internalNote || undefined,
      });
      navigate(`/worksheet/${id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Hiba történt a mentés során');
    }
  };

  const handleStatusChange = async (newStatus: WorksheetStatus) => {
    if (!worksheet) return;
    try {
      await changeStatus(worksheet.id, newStatus);
      refetch();
    } catch (err) {
      console.error('Status change failed:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 ml-3">Betöltés...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <Card className="p-6 text-center">
          <p className="text-red-500 mb-4">Hiba: {error}</p>
          <Button onClick={() => refetch()}>Újrapróbálás</Button>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!worksheet) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <Card className="p-6 text-center">
          <p className="text-gray-500 mb-4">Munkalap nem található.</p>
          <Button onClick={() => navigate('/worksheet')}>Vissza a listához</Button>
        </Card>
      </div>
    );
  }

  const isEditable = !['LEZART', 'TOROLVE'].includes(worksheet.status);

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/worksheet/${id}`)}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Munkalap szerkesztése
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {worksheet.worksheetNumber}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                worksheet.status === 'FELVEVE'
                  ? 'bg-blue-100 text-blue-800'
                  : worksheet.status === 'FOLYAMATBAN'
                    ? 'bg-yellow-100 text-yellow-800'
                    : worksheet.status === 'KESZ'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
              }`}
            >
              {STATUS_LABELS[worksheet.status as WorksheetStatus] || worksheet.status}
            </span>
          </div>
          {isEditable && (
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="bg-kgc-primary hover:bg-kgc-primary/90"
            >
              {isSaving ? 'Mentés...' : 'Mentés'}
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {!isEditable && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/30">
            <p className="text-amber-800 dark:text-amber-200">
              Ez a munkalap{' '}
              {STATUS_LABELS[worksheet.status as WorksheetStatus]?.toLowerCase() ||
                worksheet.status}{' '}
              státuszban van, ezért nem szerkeszthető.
            </p>
          </div>
        )}

        {saveError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/30">
            <p className="text-red-800 dark:text-red-200">{saveError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Device Info */}
          <Card>
            <CardHeader>
              <CardTitle>Gép adatai</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gép megnevezése *
                  </label>
                  <Input
                    value={formData.deviceName}
                    onChange={e => updateField('deviceName', e.target.value)}
                    disabled={!isEditable}
                    placeholder="pl. Makita DLX2220"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gyári szám
                  </label>
                  <Input
                    value={formData.deviceSerialNumber}
                    onChange={e => updateField('deviceSerialNumber', e.target.value)}
                    disabled={!isEditable}
                    placeholder="pl. SN123456789"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Munkalap beállítások</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Prioritás
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => updateField('priority', e.target.value as WorksheetPriority)}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Várható elkészülés
                  </label>
                  <Input
                    type="date"
                    value={formData.estimatedCompletionDate}
                    onChange={e => updateField('estimatedCompletionDate', e.target.value)}
                    disabled={!isEditable}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Költséghatár (Ft)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.costLimit ?? ''}
                    onChange={e =>
                      updateField('costLimit', e.target.value ? Number(e.target.value) : undefined)
                    }
                    disabled={!isEditable}
                    placeholder="pl. 50000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fault Description */}
          <Card>
            <CardHeader>
              <CardTitle>Hiba leírás</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.faultDescription}
                onChange={e => updateField('faultDescription', e.target.value)}
                rows={4}
                disabled={!isEditable}
                className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Mit tapasztal az ügyfél?"
                required
              />
            </CardContent>
          </Card>

          {/* Diagnosis & Work */}
          <Card>
            <CardHeader>
              <CardTitle>Diagnózis és elvégzett munka</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Diagnózis
                  </label>
                  <textarea
                    value={formData.diagnosis}
                    onChange={e => updateField('diagnosis', e.target.value)}
                    rows={4}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Mi a hiba oka?"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Elvégzett munka
                  </label>
                  <textarea
                    value={formData.workPerformed}
                    onChange={e => updateField('workPerformed', e.target.value)}
                    rows={4}
                    disabled={!isEditable}
                    className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    placeholder="Milyen munkákat végeztünk el?"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Belső megjegyzés</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.internalNote}
                onChange={e => updateField('internalNote', e.target.value)}
                rows={3}
                disabled={!isEditable}
                className="w-full rounded-md border border-gray-300 bg-white p-3 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Belső feljegyzések (az ügyfél nem látja)..."
              />
            </CardContent>
          </Card>

          {/* Status Actions */}
          {isEditable && (
            <Card>
              <CardHeader>
                <CardTitle>Státusz változtatás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {worksheet.status === 'FELVEVE' && (
                    <Button
                      type="button"
                      onClick={() => handleStatusChange(WorksheetStatus.FOLYAMATBAN)}
                      disabled={isSaving}
                    >
                      Munka indítása
                    </Button>
                  )}
                  {worksheet.status === 'FOLYAMATBAN' && (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(WorksheetStatus.VARHATO)}
                        variant="outline"
                        disabled={isSaving}
                      >
                        Várakozó
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(WorksheetStatus.KESZ)}
                        disabled={isSaving}
                      >
                        Kész
                      </Button>
                    </>
                  )}
                  {worksheet.status === 'VARHATO' && (
                    <>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(WorksheetStatus.FOLYAMATBAN)}
                        variant="outline"
                        disabled={isSaving}
                      >
                        Folytatás
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handleStatusChange(WorksheetStatus.KESZ)}
                        disabled={isSaving}
                      >
                        Kész
                      </Button>
                    </>
                  )}
                  {worksheet.status === 'KESZ' && (
                    <Button
                      type="button"
                      onClick={() => handleStatusChange(WorksheetStatus.SZAMLAZANDO)}
                      disabled={isSaving}
                    >
                      Számlázásra
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {isEditable && (
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate(`/worksheet/${id}`)}>
                Mégse
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-kgc-primary hover:bg-kgc-primary/90"
              >
                {isSaving ? 'Mentés...' : 'Változtatások mentése'}
              </Button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
