import { Button, Card, CardContent, Input } from '@/components/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { INVOICE_STATUSES, INVOICE_TYPES, MOCK_INVOICES } from './mock-data';
import type { InvoiceListFilters, InvoiceStatus, InvoiceType } from './types';

export function InvoiceListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<InvoiceListFilters>({
    search: '',
    status: 'all',
    type: 'all',
  });

  const filteredInvoices = useMemo(() => {
    return MOCK_INVOICES.filter(invoice => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          invoice.invoiceNumber.toLowerCase().includes(search) ||
          invoice.partnerName.toLowerCase().includes(search) ||
          (invoice.partnerTaxNumber?.toLowerCase().includes(search) ?? false);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status !== 'all' && invoice.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && invoice.type !== filters.type) {
        return false;
      }

      return true;
    });
  }, [filters]);

  const stats = useMemo(() => {
    const all = MOCK_INVOICES;
    return {
      total: all.length,
      draft: all.filter(i => i.status === 'draft').length,
      issued: all.filter(i => i.status === 'issued').length,
      paid: all.filter(i => i.status === 'paid').length,
      overdue: all.filter(i => i.status === 'overdue').length,
      totalRevenue: all.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.grossTotal, 0),
      unpaidTotal: all
        .filter(i => i.status === 'issued' || i.status === 'overdue')
        .reduce((sum, i) => sum + i.remainingAmount, 0),
    };
  }, []);

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
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    const labels: Record<string, string> = {
      pending: 'NAV: Függő',
      sent: 'NAV: Küldve',
      accepted: 'NAV: OK',
      rejected: 'NAV: Hiba',
    };
    return (
      <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${colors[navStatus] ?? ''}`}>
        {labels[navStatus] ?? navStatus}
      </span>
    );
  };

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
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-green-600 dark:text-green-300">Befizetett bevétel</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-200">
                  {formatPrice(stats.totalRevenue)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-blue-600 dark:text-blue-300">Kiállítva / Függőben</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                  {stats.issued}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-4">
              <div className="text-center">
                <p className="text-sm text-red-600 dark:text-red-300">Lejárt tartozás</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-200">
                  {formatPrice(stats.unpaidTotal)}
                </p>
                <p className="text-xs text-red-500 dark:text-red-400">{stats.overdue} számla</p>
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
                  setFilters(f => ({ ...f, status: e.target.value as InvoiceStatus | 'all' }))
                }
              >
                <option value="all">Minden státusz</option>
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
                  setFilters(f => ({ ...f, type: e.target.value as InvoiceType | 'all' }))
                }
              >
                <option value="all">Minden típus</option>
                {INVOICE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List */}
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
                  {filteredInvoices.map(invoice => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                          {invoice.invoiceNumber}
                        </span>
                        {invoice.correctionOf && (
                          <span className="ml-2 text-xs text-gray-500">(sztornó)</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {invoice.partnerName}
                        </p>
                        {invoice.partnerTaxNumber && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {invoice.partnerTaxNumber}
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
                            invoice.status === 'overdue'
                              ? 'text-red-600 font-medium dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-300'
                          }
                        >
                          {formatDate(invoice.dueDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-medium ${invoice.grossTotal < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}
                        >
                          {formatPrice(invoice.grossTotal)}
                        </span>
                        {invoice.remainingAmount > 0 && invoice.status !== 'draft' && (
                          <p className="text-xs text-orange-600 dark:text-orange-400">
                            Hátralék: {formatPrice(invoice.remainingAmount)}
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
                          →
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredInvoices.length === 0 && (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Nincs találat a megadott szűrőkkel
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
