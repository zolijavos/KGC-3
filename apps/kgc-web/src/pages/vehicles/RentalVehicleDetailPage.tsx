/**
 * Rental Vehicle Detail Page
 * Epic 34: Járműnyilvántartás (ADR-027)
 */

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  History,
  Pencil,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

type VehicleType = 'trailer' | 'aggregator' | 'platform' | 'other';
type VehicleStatus = 'active' | 'rented' | 'maintenance' | 'inactive';

interface RentalVehicle {
  id: string;
  licensePlate: string;
  type: VehicleType;
  name: string;
  brand: string;
  model: string;
  status: VehicleStatus;
  technicalExpiryDate: string;
  registrationExpiryDate: string;
  insuranceExpiryDate: string;
  currentRentalId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RentalHistoryItem {
  id: string;
  rentalNumber: string;
  partnerName: string;
  startDate: string;
  endDate: string;
  status: 'completed' | 'active';
}

// Mock data
const MOCK_VEHICLE: RentalVehicle = {
  id: '1',
  licensePlate: 'ABC-123',
  type: 'trailer',
  name: 'Utánfutó 1',
  brand: 'Böckmann',
  model: 'Cargo 2500',
  status: 'active',
  technicalExpiryDate: '2025-06-15',
  registrationExpiryDate: '2025-12-01',
  insuranceExpiryDate: '2025-03-20',
  notes: 'Karbantartva 2024.11.15-én. Új gumiabroncsok.',
  createdAt: '2024-01-15T10:30:00Z',
  updatedAt: '2024-11-15T14:20:00Z',
};

const MOCK_RENTAL_HISTORY: RentalHistoryItem[] = [
  {
    id: '1',
    rentalNumber: 'R-2024-0125',
    partnerName: 'Kovács István',
    startDate: '2024-11-20',
    endDate: '2024-11-25',
    status: 'completed',
  },
  {
    id: '2',
    rentalNumber: 'R-2024-0098',
    partnerName: 'Nagy Építő Kft.',
    startDate: '2024-10-05',
    endDate: '2024-10-12',
    status: 'completed',
  },
  {
    id: '3',
    rentalNumber: 'R-2024-0067',
    partnerName: 'Szabó Péter',
    startDate: '2024-09-01',
    endDate: '2024-09-03',
    status: 'completed',
  },
];

const TYPE_LABELS: Record<VehicleType, string> = {
  trailer: 'Utánfutó',
  aggregator: 'Aggregátor',
  platform: 'Platform',
  other: 'Egyéb',
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
  rented: {
    label: 'Kiadva',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Clock,
  },
  maintenance: {
    label: 'Karbantartás',
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
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  return date <= thirtyDaysFromNow && date > now;
}

function isExpired(dateStr: string): boolean {
  return new Date(dateStr) <= new Date();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ExpiryBadge({ date, label }: { date: string; label: string }) {
  const expired = isExpired(date);
  const expiringSoon = isExpiringSoon(date);

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p
          className={`font-medium ${
            expired
              ? 'text-red-600 dark:text-red-400'
              : expiringSoon
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-900 dark:text-white'
          }`}
        >
          {formatDate(date)}
        </p>
      </div>
      {(expired || expiringSoon) && (
        <div
          className={`rounded-full p-1 ${
            expired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
          }`}
        >
          <AlertTriangle
            className={`h-4 w-4 ${
              expired ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
            }`}
          />
        </div>
      )}
    </div>
  );
}

export function RentalVehicleDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<RentalVehicle | null>(null);
  const [rentalHistory, setRentalHistory] = useState<RentalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch vehicle data from API
    // For now, use mock data
    setVehicle(MOCK_VEHICLE);
    setRentalHistory(MOCK_RENTAL_HISTORY);
    setIsLoading(false);
  }, [id]);

  const handleDelete = () => {
    if (vehicle && confirm(`Biztosan törölni szeretné a járművet: ${vehicle.name}?`)) {
      // TODO: API call
      console.log('Delete vehicle:', id);
      navigate('/vehicles/rental');
    }
  };

  if (isLoading) {
    return (
      <div className="kgc-bg flex min-h-screen items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Betöltés...</div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="kgc-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">Jármű nem található.</p>
          <button
            onClick={() => navigate('/vehicles/rental')}
            className="mt-4 text-kgc-primary hover:underline"
          >
            Vissza a listához
          </button>
        </div>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[vehicle.status].icon;

  return (
    <div className="kgc-bg min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/vehicles/rental')}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
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
              {vehicle.name} • {vehicle.brand} {vehicle.model}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/vehicles/rental/${id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Pencil className="h-4 w-4" />
            Szerkesztés
          </Link>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Törlés
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-kgc-primary/10 p-2">
                <Truck className="h-5 w-5 text-kgc-primary" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Alapadatok</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Rendszám</p>
                <p className="font-medium text-gray-900 dark:text-white">{vehicle.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Típus</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {TYPE_LABELS[vehicle.type]}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Megnevezés</p>
                <p className="font-medium text-gray-900 dark:text-white">{vehicle.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Márka / Modell</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {vehicle.brand} {vehicle.model}
                </p>
              </div>
            </div>
            {vehicle.notes && (
              <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Megjegyzések</p>
                <p className="mt-1 text-gray-700 dark:text-gray-300">{vehicle.notes}</p>
              </div>
            )}
          </div>

          {/* Rental History */}
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Bérlési előzmények
              </h2>
            </div>
            {rentalHistory.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nincs bérlési előzmény.</p>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {rentalHistory.map(rental => (
                  <div key={rental.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link
                        to={`/rental/${rental.id}`}
                        className="font-medium text-kgc-primary hover:underline"
                      >
                        {rental.rentalNumber}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {rental.partnerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(rental.startDate)} - {formatDate(rental.endDate)}
                      </p>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          rental.status === 'active'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {rental.status === 'active' ? 'Aktív' : 'Lezárt'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Expiry Dates Card */}
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2 dark:bg-orange-900/30">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lejárati dátumok
              </h2>
            </div>
            <div className="space-y-3">
              <ExpiryBadge date={vehicle.technicalExpiryDate} label="Műszaki vizsga" />
              <ExpiryBadge date={vehicle.registrationExpiryDate} label="Forgalmi engedély" />
              <ExpiryBadge date={vehicle.insuranceExpiryDate} label="Biztosítás" />
            </div>
          </div>

          {/* Metadata Card */}
          <div className="kgc-card-bg rounded-lg border border-gray-200 p-6 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rekord adatok</h2>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Létrehozva</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDateTime(vehicle.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Utoljára módosítva</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDateTime(vehicle.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
