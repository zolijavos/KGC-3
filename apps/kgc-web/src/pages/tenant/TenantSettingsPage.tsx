import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import {
  DAY_LABELS,
  MOCK_FRANCHISE_STATS,
  MOCK_FRANCHISE_TENANTS,
  MOCK_TENANT_SETTINGS,
} from './mock-data';
import type { FranchiseTenant, TenantSettings } from './types';

type TabType = 'company' | 'franchise';

export function TenantSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('company');
  const [settings, setSettings] = useState<TenantSettings>(MOCK_TENANT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');

  const isFranchiseOwner = true; // Mock: would come from user role

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU');
  };

  const getStatusBadge = (status: FranchiseTenant['status']) => {
    const config: Record<string, { label: string; color: string }> = {
      active: {
        label: 'Aktív',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      },
      inactive: {
        label: 'Inaktív',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      },
      suspended: {
        label: 'Felfüggesztett',
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      },
    };
    const { label, color } = config[status] ?? config['inactive']!;
    return <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>{label}</span>;
  };

  const handleSaveSettings = () => {
    alert('Beállítások mentve!\n\nA változtatások sikeresen elmentve.');
  };

  const filteredTenants = MOCK_FRANCHISE_TENANTS.filter(
    t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tenant Admin</h1>
              <p className="text-gray-500 dark:text-gray-400">Cégadatok és franchise kezelés</p>
            </div>
            {activeTab === 'company' && (
              <Button
                onClick={handleSaveSettings}
                className="bg-kgc-primary hover:bg-kgc-primary/90"
              >
                Mentés
              </Button>
            )}
          </div>

          {/* Tabs */}
          {isFranchiseOwner && (
            <div className="mt-4 flex gap-1 border-b dark:border-slate-700">
              <button
                onClick={() => setActiveTab('company')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'company'
                    ? 'border-kgc-primary text-kgc-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Cég beállítások
              </button>
              <button
                onClick={() => setActiveTab('franchise')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'franchise'
                    ? 'border-kgc-primary text-kgc-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Franchise áttekintés
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'company' ? (
          <div className="space-y-6">
            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle>Alapadatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bolt/telephely neve
                    </label>
                    <Input
                      value={settings.name}
                      onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Hivatalos cégnév
                    </label>
                    <Input
                      value={settings.legalName}
                      onChange={e => setSettings(s => ({ ...s, legalName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Adószám
                    </label>
                    <Input
                      value={settings.taxNumber}
                      onChange={e => setSettings(s => ({ ...s, taxNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cégjegyzékszám
                    </label>
                    <Input
                      value={settings.registrationNumber ?? ''}
                      onChange={e =>
                        setSettings(s => ({ ...s, registrationNumber: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bankszámlaszám
                    </label>
                    <Input
                      value={settings.bankAccount}
                      onChange={e => setSettings(s => ({ ...s, bankAccount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bank neve
                    </label>
                    <Input
                      value={settings.bankName}
                      onChange={e => setSettings(s => ({ ...s, bankName: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Elérhetőségek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cím
                    </label>
                    <Input
                      value={settings.address}
                      onChange={e => setSettings(s => ({ ...s, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Város
                    </label>
                    <Input
                      value={settings.city}
                      onChange={e => setSettings(s => ({ ...s, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Irányítószám
                    </label>
                    <Input
                      value={settings.postalCode}
                      onChange={e => setSettings(s => ({ ...s, postalCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Telefon
                    </label>
                    <Input
                      value={settings.phone}
                      onChange={e => setSettings(s => ({ ...s, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={settings.email}
                      onChange={e => setSettings(s => ({ ...s, email: e.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Weboldal
                    </label>
                    <Input
                      value={settings.website ?? ''}
                      onChange={e => setSettings(s => ({ ...s, website: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card>
              <CardHeader>
                <CardTitle>Nyitvatartás</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(
                    Object.keys(settings.businessHours) as Array<
                      keyof typeof settings.businessHours
                    >
                  ).map(day => (
                    <div key={day} className="flex items-center gap-4">
                      <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {DAY_LABELS[day]}
                      </span>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!settings.businessHours[day].closed}
                          onChange={e =>
                            setSettings(s => ({
                              ...s,
                              businessHours: {
                                ...s.businessHours,
                                [day]: { ...s.businessHours[day], closed: !e.target.checked },
                              },
                            }))
                          }
                          className="rounded border-gray-300 dark:border-slate-600"
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Nyitva</span>
                      </label>
                      {!settings.businessHours[day].closed && (
                        <>
                          <Input
                            type="time"
                            value={settings.businessHours[day].open}
                            onChange={e =>
                              setSettings(s => ({
                                ...s,
                                businessHours: {
                                  ...s.businessHours,
                                  [day]: { ...s.businessHours[day], open: e.target.value },
                                },
                              }))
                            }
                            className="w-28"
                          />
                          <span className="text-gray-500">-</span>
                          <Input
                            type="time"
                            value={settings.businessHours[day].close}
                            onChange={e =>
                              setSettings(s => ({
                                ...s,
                                businessHours: {
                                  ...s.businessHours,
                                  [day]: { ...s.businessHours[day], close: e.target.value },
                                },
                              }))
                            }
                            className="w-28"
                          />
                        </>
                      )}
                      {settings.businessHours[day].closed && (
                        <span className="text-sm text-gray-400 dark:text-gray-500">Zárva</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Branding */}
            <Card>
              <CardHeader>
                <CardTitle>Megjelenés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Logo
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700">
                        <span className="text-2xl">📷</span>
                      </div>
                      <Button variant="outline" size="sm">
                        Feltöltés
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Fő szín
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.primaryColor}
                        onChange={e => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={settings.primaryColor}
                        onChange={e => setSettings(s => ({ ...s, primaryColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Kiemelő szín
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accentColor}
                        onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                        className="h-10 w-10 cursor-pointer rounded border"
                      />
                      <Input
                        value={settings.accentColor}
                        onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Rendszer beállítások</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pénznem
                    </label>
                    <select
                      value={settings.currency}
                      onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="HUF">HUF - Magyar Forint</option>
                      <option value="EUR">EUR - Euró</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Időzóna
                    </label>
                    <select
                      value={settings.timezone}
                      onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="Europe/Budapest">Europe/Budapest</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nyelv
                    </label>
                    <select
                      value={settings.language}
                      onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                      className="w-full rounded-md border px-3 py-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="hu">Magyar</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      ÁFA kulcs (%)
                    </label>
                    <Input
                      type="number"
                      value={settings.vatRate}
                      onChange={e =>
                        setSettings(s => ({ ...s, vatRate: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Franchise Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Összes telephely</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {MOCK_FRANCHISE_STATS.totalTenants}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-green-600 dark:text-green-300">Aktív</p>
                    <p className="text-3xl font-bold text-green-700 dark:text-green-200">
                      {MOCK_FRANCHISE_STATS.activeTenants}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-blue-600 dark:text-blue-300">Havi bevétel</p>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-200">
                      {formatPrice(MOCK_FRANCHISE_STATS.totalRevenue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Alkalmazottak</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {MOCK_FRANCHISE_STATS.totalEmployees}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktív bérlések</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {MOCK_FRANCHISE_STATS.totalRentals}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Aktív munkalapok</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {MOCK_FRANCHISE_STATS.totalWorksheets}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <Card>
              <CardContent className="pt-4">
                <Input
                  type="search"
                  placeholder="Keresés telephelyre, városra, tulajdonosra..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Tenant List */}
            <Card>
              <CardHeader>
                <CardTitle>Telephelyek ({filteredTenants.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b bg-gray-50 dark:bg-slate-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                          Telephely
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                          Tulajdonos
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          Státusz
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 dark:text-gray-400">
                          Havi bevétel
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          Bérlések
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                          Munkalapok
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-400">
                          Utolsó aktivitás
                        </th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                      {filteredTenants.map(tenant => (
                        <tr key={tenant.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {tenant.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {tenant.city} • {tenant.employeeCount} fő
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-gray-900 dark:text-gray-100">{tenant.ownerName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {tenant.ownerEmail}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">{getStatusBadge(tenant.status)}</td>
                          <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                            {tenant.monthlyRevenue > 0 ? formatPrice(tenant.monthlyRevenue) : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">
                            {tenant.activeRentals}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900 dark:text-gray-100">
                            {tenant.activeWorksheets}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {formatDateTime(tenant.lastActivityAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="ghost" size="sm">
                              Részletek →
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
