/**
 * Company Vehicle Detail Page
 * Epic 34: Járműnyilvántartás (ADR-027)
 */

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Fuel,
  Gauge,
  Pencil,
  Shield,
  Ticket,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type VehicleType = 'car' | 'van' | 'truck';
type VehicleStatus = 'active' | 'in_use' | 'maintenance' | 'inactive';

interface CompanyVehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  year: number;
  status: VehicleStatus;
  assignedTo?: string;
  assignedTenantName?: string;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  kgfbExpiryDate: string;
  cascoExpiryDate?: string;
  highwayPassExpiryDate?: string;
  fuelType: string;
  mileage: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const MOCK_VEHICLE: CompanyVehicle = {
  id: '1',
  licensePlate: 'ABC-001',
  type: 'car',
  name: 'Szolgálati autó 1',
  brand: 'Škoda',
  model: 'Octavia',
  year: 2022,
  status: 'active',
  technicalExpiryDate: '2025-08-15',
  registrationExpiryDate: '2025-12-01',
  kgfbExpiryDate: '2025-04-20',
  cascoExpiryDate: '2025-04-20',
  highwayPassExpiryDate: '2025-12-31',
  fuelType: 'diesel',
  mileage: 45230,
  notes: 'Rendszeres szervizek elvégezve. Téli gumi cserélve 2024.11.01.',
  createdAt: '2022-06-15T10:30:00Z',
  updatedAt: '2024-11-20T14:20:00Z',
};

const TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Személyautó',
  van: 'Furgon',
  truck: 'Tehergépkocsi',
};
const FUEL_LABELS: Record<string, string> = {
  petrol: 'Benzin',
  diesel: 'Dízel',
  electric: 'Elektromos',
  hybrid: 'Hibrid',
};
const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; color: string; icon: typeof CheckCircle }
> = {
  active: {
    label: 'Elérhető',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  in_use: {
    label: 'Használatban',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
  },
  maintenance: {
    label: 'Szervizben',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: AlertTriangle,
  },
  inactive: {
    label: 'Inaktív',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: XCircle,
  },
};

function isExpiringSoon(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return date <= thirtyDays && date > now;
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) <= new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU');
}

function ExpiryCard({
  date,
  label,
  icon: Icon,
}: {
  date: string;
  label: string;
  icon: typeof Shield;
}) {
  const expired = isExpired(date);
  const expiring = isExpiringSoon(date);
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-3 ${expired ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20' : expiring ? 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-900/20' : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'}`}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${expired ? 'text-red-600' : expiring ? 'text-orange-600' : 'text-gray-500'}`}
        />
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p
            className={`font-medium ${expired ? 'text-red-600' : expiring ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}
          >
            {formatDate(date)}
          </p>
        </div>
      </div>
      {(expired || expiring) && (
        <AlertTriangle className={`h-4 w-4 ${expired ? 'text-red-600' : 'text-orange-600'}`} />
      )}
    </div>
  );
}

export function CompanyVehicleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<CompanyVehicle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setVehicle(MOCK_VEHICLE);
    setIsLoading(false);
  }, [id]);

  const handleDelete = () => {
    if (vehicle && confirm(`Biztosan törölni szeretné: ${vehicle.name}?`)) {
      navigate('/vehicles/company');
    }
  };

  if (isLoading)
    return (
      <div className="kgc-bg flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Betöltés...</p>
      </div>
    );
  if (!vehicle)
    return (
      <div className="kgc-bg flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Jármű nem található.</p>
      </div>
    );

  const StatusIcon = STATUS_CONFIG[vehicle.status].icon;

  return (
    <div className="kgc-bg min-h-screen p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vehicles/company')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {vehicle.licensePlate}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CONFIG[vehicle.status].color}`}
              >
                <StatusIcon className="h-3 w-3" />
                {STATUS_CONFIG[vehicle.status].label}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {vehicle.name} • {vehicle.brand} {vehicle.model} ({vehicle.year})
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/vehicles/company/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          >
            <Pencil className="h-4 w-4" /> Szerkesztés
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
          >
            <Trash2 className="h-4 w-4" /> Törlés
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-kgc-primary/10 p-2">
                <Car className="h-5 w-5 text-kgc-primary" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alapadatok</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Rendszám</p>
                <p className="font-medium text-gray-900 dark:text-white">{vehicle.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Típus</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {TYPE_LABELS[vehicle.type]}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Márka / Modell</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {vehicle.brand} {vehicle.model}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Évjárat</p>
                <p className="font-medium text-gray-900 dark:text-white">{vehicle.year}</p>
              </div>
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Üzemanyag</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {FUEL_LABELS[vehicle.fuelType]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Kilométeróra</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {vehicle.mileage.toLocaleString('hu-HU')} km
                  </p>
                </div>
              </div>
            </div>
            {vehicle.assignedTo && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Hozzárendelve: <strong>{vehicle.assignedTo}</strong> ({vehicle.assignedTenantName}
                  )
                </p>
              </div>
            )}
            {vehicle.notes && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">Megjegyzések</p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{vehicle.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lejáratok & Biztosítások
              </h2>
            </div>
            <div className="space-y-3">
              <ExpiryCard
                date={vehicle.technicalExpiryDate}
                label="Műszaki vizsga"
                icon={Calendar}
              />
              <ExpiryCard
                date={vehicle.registrationExpiryDate}
                label="Forgalmi engedély"
                icon={Calendar}
              />
              <ExpiryCard date={vehicle.kgfbExpiryDate} label="KGFB biztosítás" icon={Shield} />
              {vehicle.cascoExpiryDate && (
                <ExpiryCard date={vehicle.cascoExpiryDate} label="CASCO biztosítás" icon={Shield} />
              )}
              {vehicle.highwayPassExpiryDate && (
                <ExpiryCard
                  date={vehicle.highwayPassExpiryDate}
                  label="Autópálya matrica"
                  icon={Ticket}
                />
              )}
            </div>
          </div>

          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Rekord adatok
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-gray-500">Létrehozva</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(vehicle.createdAt).toLocaleString('hu-HU')}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Módosítva</p>
                <p className="text-gray-700 dark:text-gray-300">
                  {new Date(vehicle.updatedAt).toLocaleString('hu-HU')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
