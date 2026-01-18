import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_PARTNERS, PARTNER_CATEGORIES, PARTNER_STATUSES, PARTNER_TYPES } from './mock-data';
import type { PartnerCategory, PartnerStatus } from './types';

type TabType = 'overview' | 'addresses' | 'contacts' | 'financial' | 'history';

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const partner = MOCK_PARTNERS.find(p => p.id === id);

  if (!partner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Partner nem található</h1>
          <Button onClick={() => navigate('/partners')} className="mt-4">
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('hu-HU');
  };

  const getStatusBadge = (status: PartnerStatus) => {
    const config = PARTNER_STATUSES.find(s => s.value === status);
    return (
      <span className={`rounded-full px-3 py-1 text-sm font-medium ${config?.color ?? ''}`}>
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
          className={`rounded-full px-2 py-1 text-xs font-medium ${config?.color ?? ''}`}
        >
          {config?.label ?? cat}
        </span>
      );
    });
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Áttekintés' },
    { id: 'addresses', label: 'Címek' },
    { id: 'contacts', label: 'Kapcsolattartók' },
    { id: 'financial', label: 'Pénzügyek' },
    { id: 'history', label: 'Előzmények' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/partners')}>
                ← Vissza
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-gray-900">{partner.name}</h1>
                  {getStatusBadge(partner.status)}
                </div>
                <p className="text-sm text-gray-500">
                  {partner.code} • {partner.type === 'company' ? 'Cég' : 'Magánszemély'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Mégse
                  </Button>
                  <Button
                    className="bg-kgc-primary hover:bg-kgc-primary/90"
                    onClick={() => setIsEditing(false)}
                  >
                    Mentés
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Szerkesztés
                  </Button>
                  <Button
                    className="bg-kgc-primary hover:bg-kgc-primary/90"
                    onClick={() => navigate('/rental/new')}
                  >
                    + Új bérlés
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-kgc-primary text-kgc-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic info */}
              <Card>
                <CardHeader>
                  <CardTitle>Alapadatok</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Név</label>
                      <p className="text-gray-900">{partner.name}</p>
                    </div>
                    {partner.shortName && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Rövid név</label>
                        <p className="text-gray-900">{partner.shortName}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500">Típus</label>
                      <p className="text-gray-900">
                        {PARTNER_TYPES.find(t => t.value === partner.type)?.label}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Kategóriák</label>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {getCategoryBadges(partner.categories)}
                      </div>
                    </div>
                    {partner.taxNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Adószám</label>
                        <p className="text-gray-900">{partner.taxNumber}</p>
                      </div>
                    )}
                    {partner.registrationNumber && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Cégjegyzékszám</label>
                        <p className="text-gray-900">{partner.registrationNumber}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Contact info */}
              <Card>
                <CardHeader>
                  <CardTitle>Elérhetőségek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {partner.email && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-gray-900">
                          <a
                            href={`mailto:${partner.email}`}
                            className="text-blue-600 hover:underline"
                          >
                            {partner.email}
                          </a>
                        </p>
                      </div>
                    )}
                    {partner.phone && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Telefon</label>
                        <p className="text-gray-900">
                          <a
                            href={`tel:${partner.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {partner.phone}
                          </a>
                        </p>
                      </div>
                    )}
                    {partner.website && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Weboldal</label>
                        <p className="text-gray-900">
                          <a
                            href={partner.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {partner.website}
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {(partner.notes || partner.internalNotes) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Megjegyzések</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {partner.notes && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-gray-500">
                          Publikus megjegyzés
                        </label>
                        <p className="mt-1 text-gray-900">{partner.notes}</p>
                      </div>
                    )}
                    {partner.internalNotes && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">
                          Belső megjegyzés
                        </label>
                        <p className="mt-1 text-red-600">{partner.internalNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column - Stats & Quick actions */}
            <div className="space-y-6">
              {/* Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Statisztikák</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Összes forgalom:</span>
                      <span className="font-bold text-gray-900">
                        {formatPrice(partner.stats.totalRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rendelések:</span>
                      <span className="font-medium">{partner.stats.totalOrders} db</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bérlések:</span>
                      <span className="font-medium">{partner.stats.totalRentals} db</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Szerviz megrendelések:</span>
                      <span className="font-medium">{partner.stats.totalServiceOrders} db</span>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Utolsó rendelés:</span>
                        <span className="font-medium">
                          {formatDate(partner.stats.lastOrderDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Utolsó bérlés:</span>
                        <span className="font-medium">
                          {formatDate(partner.stats.lastRentalDate)}
                        </span>
                      </div>
                    </div>
                    {partner.stats.outstandingBalance > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex justify-between">
                          <span className="font-medium text-red-600">Tartozás:</span>
                          <span className="font-bold text-red-600">
                            {formatPrice(partner.stats.outstandingBalance)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Gyors műveletek</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/rental/new')}
                    >
                      🔧 Új bérlés
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/sales/new')}
                    >
                      🛒 Új értékesítés
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/worksheet/new')}
                    >
                      📋 Új munkalap
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Rental settings */}
              {partner.categories.includes('rental') && (
                <Card>
                  <CardHeader>
                    <CardTitle>Bérlési beállítások</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Kaució %:</span>
                        <span className="font-medium">{partner.rentalDepositPercent ?? 30}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bérlés státusz:</span>
                        {partner.rentalBlocked ? (
                          <span className="font-medium text-red-600">🚫 Tiltva</span>
                        ) : (
                          <span className="font-medium text-green-600">✅ Engedélyezve</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'addresses' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Címek</CardTitle>
              <Button variant="outline" size="sm">
                + Új cím
              </Button>
            </CardHeader>
            <CardContent>
              {partner.addresses.length === 0 ? (
                <p className="text-gray-500">Nincs rögzített cím.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {partner.addresses.map(addr => (
                    <div key={addr.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-medium">
                          {addr.type === 'billing'
                            ? '📄 Számlázási'
                            : addr.type === 'shipping'
                              ? '📦 Szállítási'
                              : '📍 Egyéb'}
                        </span>
                        {addr.isDefault && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                            Alapértelmezett
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900">
                        {addr.postalCode} {addr.city}
                      </p>
                      <p className="text-gray-900">{addr.street}</p>
                      {addr.building && <p className="text-gray-500">{addr.building}</p>}
                      <p className="text-gray-500">{addr.country}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'contacts' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Kapcsolattartók</CardTitle>
              <Button variant="outline" size="sm">
                + Új kapcsolattartó
              </Button>
            </CardHeader>
            <CardContent>
              {partner.contacts.length === 0 ? (
                <p className="text-gray-500">Nincs rögzített kapcsolattartó.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {partner.contacts.map(contact => (
                    <div key={contact.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="font-medium">{contact.name}</span>
                        {contact.isPrimary && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                            Elsődleges
                          </span>
                        )}
                      </div>
                      {contact.position && (
                        <p className="text-sm text-gray-500">{contact.position}</p>
                      )}
                      {contact.email && (
                        <p className="mt-2">
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {contact.email}
                          </a>
                        </p>
                      )}
                      {contact.phone && (
                        <p>
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {contact.phone}
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'financial' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pénzügyi beállítások</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fizetési határidő</label>
                    <p className="text-lg font-medium text-gray-900">
                      {partner.paymentTermDays} nap
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Hitelkeret</label>
                    <p className="text-lg font-medium text-gray-900">
                      {partner.creditLimit ? formatPrice(partner.creditLimit) : 'Nincs'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Alapkedvezmény</label>
                    <p className="text-lg font-medium text-gray-900">
                      {partner.discountPercent ?? 0}%
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Árlista</label>
                    <p className="text-lg font-medium text-gray-900">
                      {partner.priceListId ?? 'Alap'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tartozások</CardTitle>
              </CardHeader>
              <CardContent>
                {partner.stats.outstandingBalance > 0 ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <p className="text-lg font-bold text-red-600">
                      Nyitott tartozás: {formatPrice(partner.stats.outstandingBalance)}
                    </p>
                    <p className="text-sm text-red-500">
                      Kérjük, egyeztessen az ügyfélszolgálattal.
                    </p>
                  </div>
                ) : (
                  <p className="text-green-600">Nincs nyitott tartozás.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardHeader>
              <CardTitle>Előzmények</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{formatDate(partner.updatedAt)}</p>
                  <p className="font-medium">Partner adatok frissítve</p>
                </div>
                {partner.stats.lastOrderDate && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">
                      {formatDate(partner.stats.lastOrderDate)}
                    </p>
                    <p className="font-medium">Utolsó rendelés</p>
                  </div>
                )}
                {partner.stats.lastRentalDate && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-gray-500">
                      {formatDate(partner.stats.lastRentalDate)}
                    </p>
                    <p className="font-medium">Utolsó bérlés</p>
                  </div>
                )}
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-gray-500">{formatDate(partner.createdAt)}</p>
                  <p className="font-medium">Partner létrehozva ({partner.createdBy})</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
