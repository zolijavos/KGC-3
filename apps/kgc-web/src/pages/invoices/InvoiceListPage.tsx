import { Button, Card, CardContent, Input } from '@/components/ui';
import { useInvoices, useInvoiceStats } from '@/hooks/use-invoices';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INVOICE_STATUSES, INVOICE_TYPES, NAV_STATUSES } from './mock-data';
import type { InvoiceStatus, InvoiceType } from './types';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    search: '',
    status: 'ALL' as InvoiceStatus | 'ALL',
    type: 'ALL' as InvoiceType | 'ALL',
  });

  // API hooks
  const { invoices, isLoading, error } = useInvoices({
    search: filters.search || undefined,
    status: filters.status !== 'ALL' ? filters.status : undefined,
    type: filters.type !== 'ALL' ? filters.type : undefined,
  });

  const { stats } = useInvoiceStats();

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

  const getStatusBadge = (status: InvoiceStatus) => {
    const config = INVOICE_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
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

  const getNavStatusBadge = (navStatus?: string) => {
    if (!navStatus) return null;
    const config = NAV_STATUSES.find(s => s.value === navStatus.toUpperCase());
    return (
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? navStatus}
      </span>
    );
  };

  // Calculate display stats from stats hook or fallback to invoices
  const displayStats = useMemo(() => {
    if (stats) {
      return stats;
    }
    // Fallback: calculate from current invoices
    const safeInvoices = invoices ?? [];
    return {
      total: safeInvoices.length,
      draft: safeInvoices.filter(i => i.status === 'DRAFT').length,
      sent: safeInvoices.filter(i => i.status === 'SENT').length,
      paid: safeInvoices.filter(i => i.status === 'PAID').length,
      overdue: safeInvoices.filter(i => i.status === 'OVERDUE').length,
      totalRevenue: safeInvoices
        .filter(i => i.status === 'PAID')
        .reduce((sum, i) => sum + Number(i.totalAmount), 0),
      unpaidTotal: safeInvoices
        .filter(i => i.status === 'SENT' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID')
        .reduce((sum, i) => sum + Number(i.balanceDue), 0),
    };
  }, [stats, invoices]);

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Számlák</h1>
              <p className="text-gray-500 dark:text-gray-400">Számlák és díjbekérők kezelése</p>
            </div>
            <Button
              onClick={() => navigate('/invoices/new')}
              className="bg-kgc-primary hover:bg-kgc-primary/90"
            >
              + Új számla
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">Összes számla</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {displayStats.total}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-600 dark:text-green-300">Befizetett bevétel</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">
                  {formatPrice(displayStats.totalRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-blue-600 dark:text-blue-300">Kiállítva / Függőben</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                  {displayStats.sent}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-red-600 dark:text-red-300">Lejárt tartozás</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-200">
                  {formatPrice(displayStats.unpaidTotal)}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400">
                  {displayStats.overdue} számla
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  type="search"
                  placeholder="Keresés (számlaszám, partner, adószám)..."
                  value={filters.search}
                  onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                />
              </div>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100"
                value={filters.status}
                onChange={e =>
                  setFilters(f => ({ ...f, status: e.target.value as InvoiceStatus | 'ALL' }))
                }
              >
                <option value="ALL">Minden státusz</option>
                {INVOICE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border border-gray-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-gray-100"
                value={filters.type}
                onChange={e =>
                  setFilters(f => ({ ...f, type: e.target.value as InvoiceType | 'ALL' }))
                }
              >
                <option value="ALL">Minden típus</option>
                {INVOICE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500 dark:text-gray-400">
                Számlák betöltése...
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="py-4">
              <div className="text-center text-red-600 dark:text-red-400">
                Hiba történt: {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice List */}
        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Számlaszám
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Partner
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Típus
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Kiállítás
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Fizetési határidő
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Összeg
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        Státusz
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        NAV
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {(invoices ?? []).map(invoice => (
                      <tr
                        key={invoice.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                            {invoice.invoiceNumber}
                          </span>
                          {invoice.voidedInvoiceId && (
                            <span className="ml-2 text-xs text-gray-500">(sztornó)</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {invoice.partner?.name ?? '-'}
                          </p>
                          {invoice.partner?.taxNumber && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {invoice.partner.taxNumber}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">{getTypeBadge(invoice.type)}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              invoice.status === 'OVERDUE'
                                ? 'text-red-600 font-medium dark:text-red-400'
                                : 'text-gray-600 dark:text-gray-300'
                            }
                          >
                            {formatDate(invoice.dueDate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`font-medium ${Number(invoice.totalAmount) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
                          >
                            {formatPrice(Number(invoice.totalAmount))}
                          </span>
                          {Number(invoice.balanceDue) > 0 && invoice.status !== 'DRAFT' && (
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                              Hátralék: {formatPrice(Number(invoice.balanceDue))}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(invoice.status)}</td>
                        <td className="px-4 py-3 text-center">
                          {getNavStatusBadge(invoice.navStatus)}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/invoices/${invoice.id}`);
                            }}
                          >
                            &rarr;
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(invoices ?? []).length === 0 && (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                  Nincs találat a megadott szűrőkkel
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
