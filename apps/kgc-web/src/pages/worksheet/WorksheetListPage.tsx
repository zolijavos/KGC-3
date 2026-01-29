// WorksheetListPage - List of worksheets with filtering
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  WorksheetPriority,
  WorksheetStatus,
} from '@/api/worksheets';
import { Button, Card, Input } from '@/components/ui';
import { useWorksheetMutations, useWorksheets, useWorksheetStats } from '@/hooks/use-worksheets';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS: Record<WorksheetStatus, string> = {
  [WorksheetStatus.FELVEVE]: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  [WorksheetStatus.FOLYAMATBAN]:
    'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
  [WorksheetStatus.VARHATO]:
    'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  [WorksheetStatus.KESZ]: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  [WorksheetStatus.SZAMLAZANDO]: 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200',
  [WorksheetStatus.LEZART]: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  [WorksheetStatus.TOROLVE]: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
};

export function WorksheetListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorksheetStatus | 'ALL'>('ALL');

  // API hooks
  const { worksheets, isLoading, error, refetch } = useWorksheets({
    search: search || undefined,
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
  });

  const { stats } = useWorksheetStats();
  const mutations = useWorksheetMutations();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const handleStartWork = async (id: string) => {
    try {
      await mutations.changeStatus(id, WorksheetStatus.FOLYAMATBAN);
      void refetch();
    } catch (err) {
      console.error('Failed to start work:', err);
    }
  };

  const handleMarkReady = async (id: string) => {
    try {
      await mutations.changeStatus(id, WorksheetStatus.SZAMLAZANDO);
      void refetch();
    } catch (err) {
      console.error('Failed to mark ready:', err);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await mutations.changeStatus(id, WorksheetStatus.LEZART);
      void refetch();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  };

  // Calculate stats from hook or fallback
  const displayStats = useMemo(() => {
    if (stats) {
      return stats;
    }
    return {
      total: worksheets.length,
      felveve: worksheets.filter(w => w.status === WorksheetStatus.FELVEVE).length,
      folyamatban: worksheets.filter(w => w.status === WorksheetStatus.FOLYAMATBAN).length,
      varhato: worksheets.filter(w => w.status === WorksheetStatus.VARHATO).length,
      kesz: worksheets.filter(w => w.status === WorksheetStatus.KESZ).length,
      szamlazando: worksheets.filter(w => w.status === WorksheetStatus.SZAMLAZANDO).length,
      lezart: worksheets.filter(w => w.status === WorksheetStatus.LEZART).length,
    };
  }, [stats, worksheets]);

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Munkalapok</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Szerviz munkalap kezelés</p>
            </div>
          </div>

          <Button onClick={() => navigate('/worksheet/new')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Új munkalap
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Felvéve</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {displayStats.felveve}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Folyamatban</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {displayStats.folyamatban}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Kész</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {displayStats.kesz}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Számlázandó</p>
            <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {displayStats.szamlazando}
            </p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              placeholder="Keresés munkalapszám, partner, gép vagy hiba alapján..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as WorksheetStatus | 'ALL')}
              className="rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary"
            >
              <option value="ALL">Minden státusz</option>
              {Object.values(WorksheetStatus).map(value => (
                <option key={value} value={value}>
                  {STATUS_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <Card className="p-4">
            <div className="text-center text-gray-500 dark:text-gray-400">
              Munkalapok betöltése...
            </div>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
            <div className="text-center text-red-600 dark:text-red-400">Hiba: {error}</div>
          </Card>
        )}

        {/* Worksheet list */}
        {!isLoading && !error && (
          <div className="space-y-4">
            {worksheets.map(worksheet => (
              <Card key={worksheet.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-medium text-kgc-primary">
                        {worksheet.worksheetNumber}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          STATUS_COLORS[worksheet.status]
                        )}
                      >
                        {STATUS_LABELS[worksheet.status]}
                      </span>
                      <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">
                        {TYPE_LABELS[worksheet.type]}
                      </span>
                      {worksheet.priority === WorksheetPriority.SURGOS && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          {PRIORITY_LABELS[worksheet.priority]}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                      Partner: {worksheet.partnerId.substring(0, 8)}...
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {worksheet.deviceName}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {worksheet.faultDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <div>
                      <p className="text-gray-400 dark:text-gray-500">Felvétel</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(worksheet.receivedAt)}
                      </p>
                    </div>
                    {worksheet.estimatedCompletionDate && (
                      <div>
                        <p className="text-gray-400 dark:text-gray-500">Határidő</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(worksheet.estimatedCompletionDate)}
                        </p>
                      </div>
                    )}
                    {worksheet.costLimit && worksheet.costLimit > 0 && (
                      <div>
                        <p className="text-gray-400 dark:text-gray-500">Limit</p>
                        <p className="font-medium text-kgc-primary">
                          {worksheet.costLimit.toLocaleString()} Ft
                        </p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {worksheet.status === WorksheetStatus.FELVEVE && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartWork(worksheet.id)}
                          disabled={mutations.isLoading}
                        >
                          Elkezdés
                        </Button>
                      )}
                      {worksheet.status === WorksheetStatus.KESZ && (
                        <Button
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700"
                          onClick={() => handleMarkReady(worksheet.id)}
                          disabled={mutations.isLoading}
                        >
                          Számlázás
                        </Button>
                      )}
                      {worksheet.status === WorksheetStatus.SZAMLAZANDO && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleClose(worksheet.id)}
                          disabled={mutations.isLoading}
                        >
                          Lezárás
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/worksheet/${worksheet.id}`)}
                      >
                        Részletek
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            {worksheets.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2">Nincs találat a keresési feltételekre.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
