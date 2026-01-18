import { useState } from 'react';

type ReportType = 'overview' | 'sales' | 'rentals' | 'inventory' | 'financial';
type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportCard {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
}

const OVERVIEW_CARDS: ReportCard[] = [
  {
    title: 'Összes bevétel',
    value: '12 450 000 Ft',
    change: 12.5,
    changeLabel: 'előző hónaphoz képest',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    title: 'Aktív bérlések',
    value: '47',
    change: 8.3,
    changeLabel: 'előző hónaphoz képest',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    title: 'Értékesítések',
    value: '156',
    change: -3.2,
    changeLabel: 'előző hónaphoz képest',
    icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    title: 'Munkalapok',
    value: '28',
    change: 15.7,
    changeLabel: 'előző hónaphoz képest',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
];

const SALES_DATA = [
  { category: 'Kisgépek', amount: 4250000, count: 45 },
  { category: 'Alkatrészek', amount: 1850000, count: 312 },
  { category: 'Szerszámok', amount: 2150000, count: 89 },
  { category: 'Védőfelszerelés', amount: 650000, count: 156 },
  { category: 'Egyéb', amount: 450000, count: 78 },
];

const RENTAL_DATA = [
  { equipment: 'Makita HR2470 fúrókalapács', rentals: 23, revenue: 920000, utilization: 85 },
  { equipment: 'Bosch GBH 2-26 fúrókalapács', rentals: 18, revenue: 720000, utilization: 72 },
  { equipment: 'DeWalt DWE4057 sarokcsiszoló', rentals: 31, revenue: 465000, utilization: 91 },
  { equipment: 'Makita GA5030 sarokcsiszoló', rentals: 27, revenue: 405000, utilization: 78 },
  { equipment: 'Kärcher K5 magasnyomású mosó', rentals: 15, revenue: 600000, utilization: 65 },
];

const INVENTORY_DATA = [
  { category: 'Fúrógépek', inStock: 45, reserved: 12, lowStock: 3 },
  { category: 'Sarokcsiszolók', inStock: 38, reserved: 8, lowStock: 0 },
  { category: 'Akkumulátoros gépek', inStock: 62, reserved: 15, lowStock: 5 },
  { category: 'Kompresszorok', inStock: 12, reserved: 4, lowStock: 2 },
  { category: 'Generátorok', inStock: 8, reserved: 3, lowStock: 1 },
];

export function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const reportTabs = [
    {
      id: 'overview' as ReportType,
      label: 'Áttekintés',
      icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
    },
    {
      id: 'sales' as ReportType,
      label: 'Értékesítés',
      icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
    },
    {
      id: 'rentals' as ReportType,
      label: 'Bérlések',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      id: 'inventory' as ReportType,
      label: 'Készlet',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    },
    {
      id: 'financial' as ReportType,
      label: 'Pénzügyi',
      icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
    },
  ];

  const dateRangeOptions = [
    { id: 'today' as DateRange, label: 'Ma' },
    { id: 'week' as DateRange, label: 'Hét' },
    { id: 'month' as DateRange, label: 'Hónap' },
    { id: 'quarter' as DateRange, label: 'Negyedév' },
    { id: 'year' as DateRange, label: 'Év' },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OVERVIEW_CARDS.map(card => (
          <div
            key={card.title}
            className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-kgc-primary/10 p-2">
                <svg
                  className="h-6 w-6 text-kgc-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={card.icon}
                  />
                </svg>
              </div>
              <span
                className={`flex items-center text-sm font-medium ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {card.change >= 0 ? '+' : ''}
                {card.change}%
                <svg
                  className={`ml-1 h-4 w-4 ${card.change < 0 ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
            </div>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">{card.changeLabel}</p>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Bevétel trend
          </h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <p className="mt-2">Vonaldiagram - Bevétel</p>
            </div>
          </div>
        </div>

        <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Kategóriák megoszlása
          </h3>
          <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
                />
              </svg>
              <p className="mt-2">Kördiagram - Kategóriák</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSalesReport = () => (
    <div className="space-y-6">
      <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Értékesítés kategóriánként
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kategória
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Összeg
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Darab
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Átlag/db
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Arány
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {SALES_DATA.map(item => {
                const total = SALES_DATA.reduce((sum, s) => sum + s.amount, 0);
                const percentage = ((item.amount / total) * 100).toFixed(1);
                return (
                  <tr key={item.category} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                      {item.category}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                      {item.amount.toLocaleString('hu-HU')} Ft
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                      {item.count}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                      {Math.round(item.amount / item.count).toLocaleString('hu-HU')} Ft
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-full rounded-full bg-kgc-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span>{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Összesen
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {SALES_DATA.reduce((sum, s) => sum + s.amount, 0).toLocaleString('hu-HU')} Ft
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {SALES_DATA.reduce((sum, s) => sum + s.count, 0)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  -
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Sales chart placeholder */}
      <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Napi értékesítés
        </h3>
        <div className="flex h-64 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
          <div className="text-center text-gray-500 dark:text-gray-400">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="mt-2">Oszlopdiagram - Napi értékesítés</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRentalsReport = () => (
    <div className="space-y-6">
      <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Top bérlések - gépkihasználtság
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Gép
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Bérlések
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Bevétel
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kihasználtság
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {RENTAL_DATA.map(item => (
                <tr key={item.equipment} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {item.equipment}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {item.rentals}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {item.revenue.toLocaleString('hu-HU')} Ft
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full rounded-full ${
                            item.utilization >= 80
                              ? 'bg-green-500'
                              : item.utilization >= 60
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${item.utilization}%` }}
                        />
                      </div>
                      <span
                        className={`font-medium ${
                          item.utilization >= 80
                            ? 'text-green-600'
                            : item.utilization >= 60
                              ? 'text-yellow-600'
                              : 'text-red-600'
                        }`}
                      >
                        {item.utilization}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rental metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Átlagos bérlési idő</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">4.2 nap</div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Késedelmes visszavételek</div>
          <div className="mt-1 text-2xl font-bold text-red-600">7</div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Átlagos kaució</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">45 000 Ft</div>
        </div>
      </div>
    </div>
  );

  const renderInventoryReport = () => (
    <div className="space-y-6">
      <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Készletállapot kategóriánként
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Kategória
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Készleten
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Foglalt
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Elérhető
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Alacsony készlet
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {INVENTORY_DATA.map(item => (
                <tr key={item.category} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {item.category}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {item.inStock}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-300">
                    {item.reserved}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-green-600 font-medium">
                    {item.inStock - item.reserved}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    {item.lowStock > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {item.lowStock} termék
                      </span>
                    ) : (
                      <span className="text-green-600">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Összesen
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {INVENTORY_DATA.reduce((sum, i) => sum + i.inStock, 0)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                  {INVENTORY_DATA.reduce((sum, i) => sum + i.reserved, 0)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-green-600">
                  {INVENTORY_DATA.reduce((sum, i) => sum + (i.inStock - i.reserved), 0)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-semibold text-red-600">
                  {INVENTORY_DATA.reduce((sum, i) => sum + i.lowStock, 0)} termék
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );

  const renderFinancialReport = () => (
    <div className="space-y-6">
      {/* Financial summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Bruttó bevétel</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">15 850 000 Ft</div>
          <div className="mt-2 text-xs text-green-600">+8.3% előző hónaphoz</div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">ÁFA befizetés</div>
          <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">3 365 250 Ft</div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">27% ÁFA kulcs</div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Kintlévőségek</div>
          <div className="mt-1 text-2xl font-bold text-yellow-600">2 450 000 Ft</div>
          <div className="mt-2 text-xs text-red-600">12 lejárt számla</div>
        </div>
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-5 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">Nettó eredmény</div>
          <div className="mt-1 text-2xl font-bold text-green-600">4 250 000 Ft</div>
          <div className="mt-2 text-xs text-green-600">+12.1% előző hónaphoz</div>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Bevétel megoszlása
        </h3>
        <div className="space-y-4">
          {[
            { label: 'Termékértékesítés', amount: 9350000, percentage: 59 },
            { label: 'Bérleti díjak', amount: 4250000, percentage: 27 },
            { label: 'Szerviz munkadíj', amount: 1850000, percentage: 12 },
            { label: 'Egyéb', amount: 400000, percentage: 2 },
          ].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {item.amount.toLocaleString('hu-HU')} Ft
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-kgc-primary"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
              <div className="mt-0.5 text-right text-xs text-gray-500 dark:text-gray-400">
                {item.percentage}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeReport) {
      case 'overview':
        return renderOverview();
      case 'sales':
        return renderSalesReport();
      case 'rentals':
        return renderRentalsReport();
      case 'inventory':
        return renderInventoryReport();
      case 'financial':
        return renderFinancialReport();
    }
  };

  return (
    <div className="kgc-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Riportok</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Üzleti jelentések és statisztikák
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Exportálás
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Nyomtatás
          </button>
        </div>
      </div>

      {/* Report tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeReport === tab.id
                ? 'border-kgc-primary text-kgc-primary'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date range filter */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Időszak:</span>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {dateRangeOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setDateRange(option.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === option.id
                  ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button className="ml-auto inline-flex items-center gap-1 text-sm text-kgc-primary hover:underline">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          Egyéni időszak
        </button>
      </div>

      {/* Report content */}
      {renderContent()}
    </div>
  );
}
