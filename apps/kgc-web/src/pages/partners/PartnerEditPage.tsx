/**
 * Partner Edit Page
 * Partner adatok szerkesztése
 */

import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MOCK_PARTNERS, PARTNER_CATEGORIES, PARTNER_TYPES } from './mock-data';
import type { Partner, PartnerCategory, PartnerType } from './types';

interface FormData {
  type: PartnerType;
  categories: PartnerCategory[];
  name: string;
  shortName: string;
  taxNumber: string;
  registrationNumber: string;
  email: string;
  phone: string;
  website: string;
  postalCode: string;
  city: string;
  street: string;
  building: string;
  paymentTermDays: number;
  creditLimit: string;
  discountPercent: string;
  rentalDepositPercent: string;
  notes: string;
}

function partnerToFormData(partner: Partner): FormData {
  const billingAddress = partner.addresses.find(a => a.type === 'billing');
  return {
    type: partner.type,
    categories: partner.categories,
    name: partner.name,
    shortName: partner.shortName ?? '',
    taxNumber: partner.taxNumber ?? '',
    registrationNumber: partner.registrationNumber ?? '',
    email: partner.email ?? '',
    phone: partner.phone ?? '',
    website: partner.website ?? '',
    postalCode: billingAddress?.postalCode ?? '',
    city: billingAddress?.city ?? '',
    street: billingAddress?.street ?? '',
    building: billingAddress?.building ?? '',
    paymentTermDays: partner.paymentTermDays ?? 8,
    creditLimit: partner.creditLimit?.toString() ?? '',
    discountPercent: partner.discountPercent?.toString() ?? '',
    rentalDepositPercent: partner.rentalDepositPercent?.toString() ?? '30',
    notes: partner.notes ?? '',
  };
}

export function PartnerEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    type: 'company',
    categories: [],
    name: '',
    shortName: '',
    taxNumber: '',
    registrationNumber: '',
    email: '',
    phone: '',
    website: '',
    postalCode: '',
    city: '',
    street: '',
    building: '',
    paymentTermDays: 8,
    creditLimit: '',
    discountPercent: '',
    rentalDepositPercent: '30',
    notes: '',
  });

  useEffect(() => {
    const found = MOCK_PARTNERS.find(p => p.id === id);
    if (found) {
      setPartner(found);
      setFormData(partnerToFormData(found));
    }
    setIsLoading(false);
  }, [id]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category: PartnerCategory) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('A név megadása kötelező!');
      return;
    }

    if (formData.categories.length === 0) {
      alert('Legalább egy kategóriát válasszon ki!');
      return;
    }

    alert(`Partner frissítve!\nKód: ${partner?.code}\nNév: ${formData.name}`);
    navigate(`/partners/${id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Partner nem található.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white shadow-sm dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/partners/${id}`)}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Partner szerkesztése
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {partner.code} - {partner.name}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} className="bg-kgc-primary hover:bg-kgc-primary/90">
            Mentés
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type & Categories */}
          <Card>
            <CardHeader>
              <CardTitle>Típus és kategória</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Partner típusa *
                  </label>
                  <div className="flex gap-4">
                    {PARTNER_TYPES.map(type => (
                      <label key={type.value} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="type"
                          value={type.value}
                          checked={formData.type === type.value}
                          onChange={e => updateField('type', e.target.value as PartnerType)}
                          className="h-4 w-4"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kategóriák * (legalább egy)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PARTNER_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => toggleCategory(cat.value)}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                          formData.categories.includes(cat.value)
                            ? cat.color
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle>Alapadatok</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.type === 'company' ? 'Cégnév' : 'Teljes név'} *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={e => updateField('name', e.target.value)}
                    placeholder={formData.type === 'company' ? 'Példa Kft.' : 'Kovács János'}
                    required
                  />
                </div>

                {formData.type === 'company' && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Rövid név
                      </label>
                      <Input
                        value={formData.shortName}
                        onChange={e => updateField('shortName', e.target.value)}
                        placeholder="Példa"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Adószám
                      </label>
                      <Input
                        value={formData.taxNumber}
                        onChange={e => updateField('taxNumber', e.target.value)}
                        placeholder="12345678-2-42"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cégjegyzékszám
                      </label>
                      <Input
                        value={formData.registrationNumber}
                        onChange={e => updateField('registrationNumber', e.target.value)}
                        placeholder="01-09-123456"
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Elérhetőségek</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="info@example.hu"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Telefon
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="+36 30 123 4567"
                  />
                </div>
                {formData.type === 'company' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Weboldal
                    </label>
                    <Input
                      value={formData.website}
                      onChange={e => updateField('website', e.target.value)}
                      placeholder="https://example.hu"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Számlázási cím</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Irányítószám
                  </label>
                  <Input
                    value={formData.postalCode}
                    onChange={e => updateField('postalCode', e.target.value)}
                    placeholder="1134"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Város
                  </label>
                  <Input
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                    placeholder="Budapest"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Utca, házszám
                  </label>
                  <Input
                    value={formData.street}
                    onChange={e => updateField('street', e.target.value)}
                    placeholder="Váci út 35."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Emelet/ajtó
                  </label>
                  <Input
                    value={formData.building}
                    onChange={e => updateField('building', e.target.value)}
                    placeholder="3. em."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial */}
          <Card>
            <CardHeader>
              <CardTitle>Pénzügyi beállítások</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Fizetési határidő (nap)
                  </label>
                  <Input
                    type="number"
                    value={formData.paymentTermDays}
                    onChange={e => updateField('paymentTermDays', Number(e.target.value))}
                    min={0}
                    max={90}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Hitelkeret (Ft)
                  </label>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={e => updateField('creditLimit', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Kedvezmény %
                  </label>
                  <Input
                    type="number"
                    value={formData.discountPercent}
                    onChange={e => updateField('discountPercent', e.target.value)}
                    placeholder="0"
                    min={0}
                    max={50}
                  />
                </div>
                {formData.categories.includes('rental') && (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Bérlési kaució %
                    </label>
                    <Input
                      type="number"
                      value={formData.rentalDepositPercent}
                      onChange={e => updateField('rentalDepositPercent', e.target.value)}
                      min={0}
                      max={100}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Megjegyzések</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={formData.notes}
                onChange={e => updateField('notes', e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white p-3 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                rows={4}
                placeholder="Opcionális megjegyzés a partnerről..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(`/partners/${id}`)}>
              Mégse
            </Button>
            <Button type="submit" className="bg-kgc-primary hover:bg-kgc-primary/90">
              Változtatások mentése
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
