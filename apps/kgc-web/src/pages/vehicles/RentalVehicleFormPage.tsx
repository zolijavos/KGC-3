/**
 * Rental Vehicle Form Page (Create/Edit)
 * Epic 34: Járműnyilvántartás (ADR-027)
 */

import { ArrowLeft, Save, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type VehicleType = 'trailer' | 'aggregator' | 'platform' | 'other';
type VehicleStatus = 'active' | 'rented' | 'maintenance' | 'inactive';

interface VehicleFormData {
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  insuranceExpiryDate: string;
  notes: string;
}

const INITIAL_FORM_DATA: VehicleFormData = {
  licensePlate: '',
  type: 'trailer',
  name: '',
  brand: '',
  model: '',
  status: 'active',
  technicalExpiryDate: '',
  registrationExpiryDate: '',
  insuranceExpiryDate: '',
  notes: '',
};

const TYPE_OPTIONS: { value: VehicleType; label: string }[] = [
  { value: 'trailer', label: 'Utánfutó' },
  { value: 'aggregator', label: 'Aggregátor' },
  { value: 'platform', label: 'Platform' },
  { value: 'other', label: 'Egyéb' },
];

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'active', label: 'Elérhető' },
  { value: 'rented', label: 'Kiadva' },
  { value: 'maintenance', label: 'Karbantartás' },
  { value: 'inactive', label: 'Inaktív' },
];

// Mock data for editing
const MOCK_VEHICLE = {
  id: '1',
  licensePlate: 'ABC-123',
  type: 'trailer' as VehicleType,
  name: 'Utánfutó 1',
  brand: 'Böckmann',
  model: 'Cargo 2500',
  status: 'active' as VehicleStatus,
  technicalExpiryDate: '2025-06-15',
  registrationExpiryDate: '2025-12-01',
  insuranceExpiryDate: '2025-03-20',
  notes: '',
};

export function RentalVehicleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState<VehicleFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof VehicleFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      // TODO: Fetch vehicle data from API
      // For now, use mock data
      setFormData({
        licensePlate: MOCK_VEHICLE.licensePlate,
        type: MOCK_VEHICLE.type,
        name: MOCK_VEHICLE.name,
        brand: MOCK_VEHICLE.brand,
        model: MOCK_VEHICLE.model,
        status: MOCK_VEHICLE.status,
        technicalExpiryDate: MOCK_VEHICLE.technicalExpiryDate,
        registrationExpiryDate: MOCK_VEHICLE.registrationExpiryDate,
        insuranceExpiryDate: MOCK_VEHICLE.insuranceExpiryDate,
        notes: MOCK_VEHICLE.notes,
      });
    }
  }, [isEditing, id]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof VehicleFormData, string>> = {};

    if (!formData.licensePlate.trim()) {
      newErrors.licensePlate = 'Rendszám megadása kötelező';
    } else if (!/^[A-Z]{3}-\d{3}$/.test(formData.licensePlate.toUpperCase())) {
      newErrors.licensePlate = 'Érvénytelen rendszám formátum (pl. ABC-123)';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Megnevezés megadása kötelező';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Márka megadása kötelező';
    }

    if (!formData.technicalExpiryDate) {
      newErrors.technicalExpiryDate = 'Műszaki lejárat megadása kötelező';
    }

    if (!formData.registrationExpiryDate) {
      newErrors.registrationExpiryDate = 'Forgalmi lejárat megadása kötelező';
    }

    if (!formData.insuranceExpiryDate) {
      newErrors.insuranceExpiryDate = 'Biztosítás lejárat megadása kötelező';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: API call to save vehicle
      console.log('Saving vehicle:', formData);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      navigate('/vehicles/rental');
    } catch (error) {
      console.error('Error saving vehicle:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when field is changed
    if (errors[name as keyof VehicleFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <div className="kgc-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/vehicles/rental')}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Jármű szerkesztése' : 'Új jármű hozzáadása'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {isEditing ? 'Jármű adatainak módosítása' : 'Új bérgép jármű rögzítése'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
          {/* Basic Info Section */}
          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="rounded-lg bg-kgc-primary/10 p-2">
              <Truck className="h-5 w-5 text-kgc-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alapadatok</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* License Plate */}
            <div>
              <label
                htmlFor="licensePlate"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Rendszám *
              </label>
              <input
                type="text"
                id="licensePlate"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                placeholder="ABC-123"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.licensePlate
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.licensePlate && (
                <p className="mt-1 text-sm text-red-500">{errors.licensePlate}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="type"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Típus *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Megnevezés *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="pl. Utánfutó 1"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Status */}
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Státusz *
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label
                htmlFor="brand"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Márka *
              </label>
              <input
                type="text"
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="pl. Böckmann"
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 ${
                  errors.brand
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
            </div>

            {/* Model */}
            <div>
              <label
                htmlFor="model"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Modell
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="pl. Cargo 2500"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>

          {/* Expiry Dates Section */}
          <div className="mb-6 mt-8 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Lejárati dátumok
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Technical Expiry */}
            <div>
              <label
                htmlFor="technicalExpiryDate"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Műszaki vizsga lejárat *
              </label>
              <input
                type="date"
                id="technicalExpiryDate"
                name="technicalExpiryDate"
                value={formData.technicalExpiryDate}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white ${
                  errors.technicalExpiryDate
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.technicalExpiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.technicalExpiryDate}</p>
              )}
            </div>

            {/* Registration Expiry */}
            <div>
              <label
                htmlFor="registrationExpiryDate"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Forgalmi lejárat *
              </label>
              <input
                type="date"
                id="registrationExpiryDate"
                name="registrationExpiryDate"
                value={formData.registrationExpiryDate}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white ${
                  errors.registrationExpiryDate
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.registrationExpiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.registrationExpiryDate}</p>
              )}
            </div>

            {/* Insurance Expiry */}
            <div>
              <label
                htmlFor="insuranceExpiryDate"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Biztosítás lejárat *
              </label>
              <input
                type="date"
                id="insuranceExpiryDate"
                name="insuranceExpiryDate"
                value={formData.insuranceExpiryDate}
                onChange={handleChange}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 dark:bg-gray-800 dark:text-white ${
                  errors.insuranceExpiryDate
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-kgc-primary focus:ring-kgc-primary dark:border-gray-600'
                }`}
              />
              {errors.insuranceExpiryDate && (
                <p className="mt-1 text-sm text-red-500">{errors.insuranceExpiryDate}</p>
              )}
            </div>
          </div>

          {/* Notes Section */}
          <div className="mt-8">
            <label
              htmlFor="notes"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Megjegyzések
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="További információk a járműről..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-kgc-primary focus:outline-none focus:ring-1 focus:ring-kgc-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          {/* Form Actions */}
          <div className="mt-8 flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate('/vehicles/rental')}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Mégse
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-kgc-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-kgc-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
