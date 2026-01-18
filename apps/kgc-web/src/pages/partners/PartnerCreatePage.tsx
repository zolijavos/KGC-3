import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTNER_CATEGORIES, PARTNER_TYPES } from './mock-data';
import type { PartnerCategory, PartnerType } from './types';

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
  // Address
  postalCode: string;
  city: string;
  street: string;
  building: string;
  // Financial
  paymentTermDays: number;
  creditLimit: string;
  discountPercent: string;
  rentalDepositPercent: string;
  // Notes
  notes: string;
}

export function PartnerCreatePage() {
  const navigate = useNavigate();
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

    // In real app, this would call API
    const newCode = `P-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    alert(`Partner létrehozva!\nKód: ${newCode}\nNév: ${formData.name}`);
    navigate('/partners');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/partners')}>
              ← Vissza
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Új partner</h1>
              <p className="text-sm text-gray-500">Partner adatok rögzítése</p>
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
                  <label className="mb-2 block text-sm font-medium">Partner típusa *</label>
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
                        <span>{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">
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
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                  <label className="mb-2 block text-sm font-medium">
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
                      <label className="mb-2 block text-sm font-medium">Rövid név</label>
                      <Input
                        value={formData.shortName}
                        onChange={e => updateField('shortName', e.target.value)}
                        placeholder="Példa"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Adószám</label>
                      <Input
                        value={formData.taxNumber}
                        onChange={e => updateField('taxNumber', e.target.value)}
                        placeholder="12345678-2-42"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Cégjegyzékszám</label>
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
                  <label className="mb-2 block text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    placeholder="info@example.hu"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Telefon</label>
                  <Input
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                    placeholder="+36 30 123 4567"
                  />
                </div>
                {formData.type === 'company' && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">Weboldal</label>
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
                  <label className="mb-2 block text-sm font-medium">Irányítószám</label>
                  <Input
                    value={formData.postalCode}
                    onChange={e => updateField('postalCode', e.target.value)}
                    placeholder="1134"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-2 block text-sm font-medium">Város</label>
                  <Input
                    value={formData.city}
                    onChange={e => updateField('city', e.target.value)}
                    placeholder="Budapest"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="mb-2 block text-sm font-medium">Utca, házszám</label>
                  <Input
                    value={formData.street}
                    onChange={e => updateField('street', e.target.value)}
                    placeholder="Váci út 35."
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Emelet/ajtó</label>
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
                  <label className="mb-2 block text-sm font-medium">Fizetési határidő (nap)</label>
                  <Input
                    type="number"
                    value={formData.paymentTermDays}
                    onChange={e => updateField('paymentTermDays', Number(e.target.value))}
                    min={0}
                    max={90}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Hitelkeret (Ft)</label>
                  <Input
                    type="number"
                    value={formData.creditLimit}
                    onChange={e => updateField('creditLimit', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Kedvezmény %</label>
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
                    <label className="mb-2 block text-sm font-medium">Bérlési kaució %</label>
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
                className="w-full rounded-md border p-3"
                rows={4}
                placeholder="Opcionális megjegyzés a partnerről..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/partners')}>
              Mégse
            </Button>
            <Button type="submit" className="bg-kgc-primary hover:bg-kgc-primary/90">
              Partner létrehozása
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
