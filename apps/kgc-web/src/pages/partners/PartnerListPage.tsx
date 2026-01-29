import { Button, Card, CardContent, Input } from '@/components/ui';
import { usePartners, usePartnerStats } from '@/hooks/use-partners';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTNER_CATEGORIES, PARTNER_STATUSES, PARTNER_TYPES } from './mock-data';
import type { PartnerCategory, PartnerStatus, PartnerType } from './types';

export function PartnerListPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<PartnerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<PartnerStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<PartnerCategory | 'all'>('all');

  // Build API filters from UI filters
  const apiFilters = useMemo(() => {
    const filters: {
      type?: 'INDIVIDUAL' | 'COMPANY';
      status?: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
      search?: string;
    } = {};
    if (typeFilter !== 'all') {
      filters.type = typeFilter === 'individual' ? 'INDIVIDUAL' : 'COMPANY';
    }
    if (statusFilter !== 'all') {
      const statusMap: Record<string, 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED'> = {
        active: 'ACTIVE',
        inactive: 'INACTIVE',
        blocked: 'BLACKLISTED',
      };
      filters.status = statusMap[statusFilter];
    }
    if (searchTerm) {
      filters.search = searchTerm;
    }
    return filters;
  }, [typeFilter, statusFilter, searchTerm]);

  const { partners, isLoading, error } = usePartners(apiFilters);
  const { stats } = usePartnerStats();

  // Client-side category filter (since API doesn't support it)
  const filteredPartners = useMemo(() => {
    if (categoryFilter === 'all') return partners;
    return partners.filter(partner => partner.categories.includes(categoryFilter));
  }, [partners, categoryFilter]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: PartnerStatus) => {
    const config = PARTNER_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}>
        {config?.label ?? status}
      </span>
    );
  };

  const getCategoryBadges = (categories: PartnerCategory[]) => {
    return categories.map(cat => {
      const config = PARTNER_CATEGORIES.find(c => c.value === cat);
      return (
        <span
          key={cat}
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${config?.color ?? ''}`}
        >
          {config?.label ?? cat}
        </span>
      );
    });
  };

  // Stats from API (fallback to computed if not loaded)
  const displayStats = stats ?? {
    total: partners.length,
    active: partners.filter(p => p.status === 'active').length,
    companies: partners.filter(p => p.type === 'company').length,
    withBalance: partners.filter(p => p.stats.outstandingBalance > 0).length,
    totalBalance: partners.reduce((sum, p) => sum + p.stats.outstandingBalance, 0),
  };

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Partnerek</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vevők, beszállítók és alvállalkozók kezelése
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/partners/new')}
            className="bg-kgc-primary hover:bg-kgc-primary/90"
          >
            + Új partner
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Error state */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <CardContent className="pt-4">
              <p className="text-red-800 dark:text-red-200">Hiba: {error}</p>
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {displayStats.total}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Összes partner</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {displayStats.active}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Aktív</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {displayStats.companies}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Cég</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {displayStats.withBalance}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tartozással</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatPrice(displayStats.totalBalance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Össz. tartozás</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-[250px] flex-1">
                <Input
                  placeholder="Keresés név, kód, email, telefon, adószám..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as PartnerType | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden típus</option>
                {PARTNER_TYPES.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as PartnerStatus | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden státusz</option>
                {PARTNER_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value as PartnerCategory | 'all')}
                className="rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Minden kategória</option>
                {PARTNER_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Partners list */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-kgc-primary border-r-transparent"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400">Betöltés...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Partner
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Típus
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Kategóriák
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                        Kapcsolat
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Forgalom
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                        Tartozás
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        Státusz
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-700">
                    {filteredPartners.map(partner => (
                      <tr
                        key={partner.id}
                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        onClick={() => navigate(`/partners/${partner.id}`)}
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {partner.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {partner.code}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {partner.type === 'company' ? '🏢 Cég' : '👤 Magánszemély'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {getCategoryBadges(partner.categories)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm">
                            {partner.email && (
                              <p className="text-gray-600 dark:text-gray-300">{partner.email}</p>
                            )}
                            {partner.phone && (
                              <p className="text-gray-500 dark:text-gray-400">{partner.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {formatPrice(partner.stats.totalRevenue)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {partner.stats.totalOrders} rendelés
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {partner.stats.outstandingBalance > 0 ? (
                            <p className="font-medium text-red-600 dark:text-red-400">
                              {formatPrice(partner.stats.outstandingBalance)}
                            </p>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500">-</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(partner.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              navigate(`/partners/${partner.id}`);
                            }}
                          >
                            Részletek →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredPartners.length === 0 && !isLoading && (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    <p>Nincs találat a szűrési feltételeknek megfelelően.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {filteredPartners.length} partner megjelenítve
        </p>
      </main>
    </div>
  );
}
