/**
 * Company Vehicle Form Page (Create/Edit)
 * Epic 34: Járműnyilvántartás (ADR-027)
 */

import { ArrowLeft, Car, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type VehicleType = 'car' | 'van' | 'truck';
type VehicleStatus = 'active' | 'in_use' | 'maintenance' | 'inactive';
type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';

interface VehicleFormData {
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  year: number;
  status: VehicleStatus;
  fuelType: FuelType;
  mileage: number;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  kgfbExpiryDate: string;
  cascoExpiryDate: string;
  highwayPassExpiryDate: string;
  assignedTenantId: string;
  notes: string;
}

const INITIAL_FORM_DATA: VehicleFormData = {
  licensePlate: '',
  type: 'car',
  name: '',
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  status: 'active',
  fuelType: 'petrol',
  mileage: 0,
  technicalExpiryDate: '',
  registrationExpiryDate: '',
  kgfbExpiryDate: '',
  cascoExpiryDate: '',
  highwayPassExpiryDate: '',
  assignedTenantId: '',
  notes: '',
};

const TYPE_OPTIONS = [
  { value: 'car', label: 'Személyautó' },
  { value: 'van', label: 'Furgon' },
  { value: 'truck', label: 'Tehergépkocsi' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Elérhető' },
  { value: 'in_use', label: 'Használatban' },
  { value: 'maintenance', label: 'Szervizben' },
  { value: 'inactive', label: 'Inaktív' },
];

const FUEL_OPTIONS = [
  { value: 'petrol', label: 'Benzin' },
  { value: 'diesel', label: 'Dízel' },
  { value: 'electric', label: 'Elektromos' },
  { value: 'hybrid', label: 'Hibrid' },
];

const MOCK_TENANTS = [
  { id: '', name: '-- Nincs hozzárendelés --' },
  { id: 't1', name: 'KGC Budapest' },
  { id: 't2', name: 'KGC Debrecen' },
  { id: 't3', name: 'KGC Szeged' },
];

export function CompanyVehicleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<VehicleFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // Mock data for editing
      setFormData({
        licensePlate: 'ABC-001',
        type: 'car',
        name: 'Szolgálati autó 1',
        brand: 'Škoda',
        model: 'Octavia',
        year: 2022,
        status: 'active',
        fuelType: 'diesel',
        mileage: 45230,
        technicalExpiryDate: '2025-08-15',
        registrationExpiryDate: '2025-12-01',
        kgfbExpiryDate: '2025-04-20',
        cascoExpiryDate: '2025-04-20',
        highwayPassExpiryDate: '2025-12-31',
        assignedTenantId: '',
        notes: '',
      });
    }
  }, [isEditing, id]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Rendszám megadása kötelező';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Megnevezés megadása kötelező';
    }
    if (!formData.brand.trim()) {
      newErrors.brand = 'Márka megadása kötelező';
    }
    if (!formData.kgfbExpiryDate) {
      newErrors.kgfbExpiryDate = 'KGFB lejárat megadása kötelező';
    }
    if (!formData.technicalExpiryDate) {
      newErrors.technicalExpiryDate = 'Műszaki lejárat megadása kötelező';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      console.log('Saving vehicle:', formData);
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/vehicles/company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof VehicleFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="kgc-bg min-h-screen p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/vehicles/company')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Céges jármű szerkesztése' : 'Új céges jármű'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEditing ? 'Jármű adatainak módosítása' : 'Új céges jármű rögzítése'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          {/* Basic Info */}
          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="rounded-lg bg-kgc-primary/10 p-2">
              <Car className="h-5 w-5 text-kgc-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alapadatok</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rendszám *
              </label>
              <input
                type="text"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                placeholder="ABC-123"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${errors.licensePlate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.licensePlate && (
                <p className="mt-1 text-sm text-red-500">{errors.licensePlate}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Típus *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Státusz *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Megnevezés *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="pl. Szolgálati autó 1"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Márka *
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="pl. Škoda"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${errors.brand ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Modell
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="pl. Octavia"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Évjárat
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleChange}
                min={1990}
                max={2030}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Üzemanyag
              </label>
              <select
                name="fuelType"
                value={formData.fuelType}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {FUEL_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kilométeróra állás
              </label>
              <input
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                min={0}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Hozzárendelt üzlet
              </label>
              <select
                name="assignedTenantId"
                value={formData.assignedTenantId}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {MOCK_TENANTS.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expiry Dates */}
          <div className="mb-6 mt-8 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lejárati dátumok és biztosítások
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Műszaki vizsga *
              </label>
              <input
                type="date"
                name="technicalExpiryDate"
                value={formData.technicalExpiryDate}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${errors.technicalExpiryDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.technicalExpiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.technicalExpiryDate}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Forgalmi engedély
              </label>
              <input
                type="date"
                name="registrationExpiryDate"
                value={formData.registrationExpiryDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                KGFB biztosítás *
              </label>
              <input
                type="date"
                name="kgfbExpiryDate"
                value={formData.kgfbExpiryDate}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-gray-800 dark:text-white ${errors.kgfbExpiryDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              />
              {errors.kgfbExpiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.kgfbExpiryDate}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                CASCO biztosítás
              </label>
              <input
                type="date"
                name="cascoExpiryDate"
                value={formData.cascoExpiryDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Autópálya matrica
              </label>
              <input
                type="date"
                name="highwayPassExpiryDate"
                value={formData.highwayPassExpiryDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="mt-8">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Megjegyzések
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="További információk..."
            />
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/vehicles/company')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white hover:bg-kgc-primary/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? 'Mentés...' : 'Mentés'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
