// RentalDetailPage - Detailed view of a single rental
import { RentalStatus } from '@/api/rentals';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useRental } from '@/hooks/use-rentals';
import { useNavigate, useParams } from 'react-router-dom';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Vázlat',
  ACTIVE: 'Aktív',
  OVERDUE: 'Lejárt',
  RETURNED: 'Visszavéve',
  COMPLETED: 'Lezárt',
  CANCELLED: 'Lemondva',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
  ACTIVE: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
  OVERDUE: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
  RETURNED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
  COMPLETED: 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200',
  CANCELLED: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RentalDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Fetch rental from API
  const { rental, loading, error } = useRental(id);

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-kgc-primary border-r-transparent" />
          <p className="mt-2 text-gray-500 dark:text-gray-400">Betöltés...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Hiba történt</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={() => navigate('/rental')}>Vissza a bérlésekhez</Button>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!rental) {
    return (
      <div className="flex min-h-screen items-center justify-center kgc-bg">
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Bérlés nem található
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            A keresett bérlési szerződés nem létezik vagy törölve lett.
          </p>
          <Button onClick={() => navigate('/rental')}>Vissza a bérlésekhez</Button>
        </Card>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('hu-HU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysRemaining = () => {
    const endDate = new Date(rental.expectedReturnDate);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  // Timeline events
  const timelineEvents = [
    {
      date: rental.createdAt,
      icon: '📝',
      title: 'Szerződés létrehozva',
      description: rental.rentalCode,
    },
    {
      date: rental.startDate,
      icon: '🔧',
      title: 'Bérlés indítása',
      description: rental.equipmentName,
    },
    ...(rental.depositPaid > 0
      ? [
          {
            date: rental.createdAt,
            icon: '💰',
            title: 'Kaució befizetve',
            description: formatCurrency(rental.depositPaid),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/rental')}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {rental.rentalCode}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[rental.status] ?? STATUS_COLORS.ACTIVE}`}
                >
                  {STATUS_LABELS[rental.status] ?? rental.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{rental.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(rental.status === RentalStatus.ACTIVE || rental.status === RentalStatus.OVERDUE) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/rental/return?id=${rental.id}`)}
                >
                  Visszavétel
                </Button>
                <Button variant="outline">Hosszabbítás</Button>
              </>
            )}
            <Button variant="ghost" onClick={() => window.print()}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Status Alert */}
        {rental.status === RentalStatus.OVERDUE && (
          <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-medium text-red-800 dark:text-red-200">
                  A bérlési időszak lejárt {Math.abs(daysRemaining)} napja!
                </p>
                <p className="text-sm text-red-600 dark:text-red-300">
                  Késedelmi díj: {formatCurrency(rental.lateFeeAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

        {rental.status === RentalStatus.ACTIVE && daysRemaining <= 2 && daysRemaining >= 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {daysRemaining === 0
                    ? 'Ma jár le a bérlés!'
                    : `Még ${daysRemaining} nap a lejáratig`}
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  Lejárat: {formatDate(rental.expectedReturnDate)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Equipment Card */}
            <Card>
              <CardHeader>
                <CardTitle>Bérelt gép</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700 text-3xl">
                    🔧
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {rental.equipmentName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-gray-100 dark:bg-slate-700 px-2 py-1 text-xs text-gray-600 dark:text-gray-300">
                        ID: {rental.equipmentId.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Napi díj</p>
                    <p className="text-xl font-bold text-kgc-primary">
                      {formatCurrency(rental.dailyRate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Partner Card */}
            <Card>
              <CardHeader>
                <CardTitle>Partner adatok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Név</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {rental.customerName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Partner ID</p>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {rental.customerId.substring(0, 8)}...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle>Pénzügyi összesítő</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Rental period */}
                  <div className="flex items-center justify-between py-2 border-b dark:border-slate-600">
                    <span className="text-gray-600 dark:text-gray-300">Bérlési időszak</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(rental.startDate)} - {formatDate(rental.expectedReturnDate)}
                    </span>
                  </div>

                  {/* Pricing breakdown */}
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-700/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Napi díj</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {formatCurrency(rental.dailyRate)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-slate-600">
                      <span className="text-gray-900 dark:text-gray-100">Bérleti díj összesen</span>
                      <span className="text-kgc-primary">{formatCurrency(rental.totalAmount)}</span>
                    </div>
                  </div>

                  {/* Deposit */}
                  <div className="flex items-center justify-between py-2 border-b dark:border-slate-600">
                    <span className="text-gray-600 dark:text-gray-300">Kaució</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(rental.depositAmount)}
                    </span>
                  </div>

                  {/* Late fee */}
                  {rental.lateFeeAmount > 0 && (
                    <div className="flex items-center justify-between py-2 border-b dark:border-slate-600 text-red-600 dark:text-red-400">
                      <span>Késedelmi díj</span>
                      <span className="font-medium">{formatCurrency(rental.lateFeeAmount)}</span>
                    </div>
                  )}

                  {/* Payment status */}
                  <div className="mt-4 flex gap-4">
                    <div className="flex-1 rounded-lg bg-green-50 dark:bg-green-900/30 p-3 text-center">
                      <p className="text-sm text-green-600 dark:text-green-400">Bérleti díj</p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-300">
                        {formatCurrency(rental.totalAmount)}
                      </p>
                    </div>
                    <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3 text-center">
                      <p className="text-sm text-blue-600 dark:text-blue-400">Kaució befizetve</p>
                      <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(rental.depositPaid)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Gyors információk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kgc-primary/10 dark:bg-kgc-primary/20 text-kgc-primary">
                      📅
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Kezdés</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(rental.startDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-kgc-primary/10 dark:bg-kgc-primary/20 text-kgc-primary">
                      🏁
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Lejárat</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(rental.expectedReturnDate)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        daysRemaining < 0
                          ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                          : daysRemaining <= 2
                            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                            : 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                      }`}
                    >
                      ⏳
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {daysRemaining < 0 ? 'Lejárt' : 'Hátralévő'}
                      </p>
                      <p
                        className={`font-medium ${
                          daysRemaining < 0
                            ? 'text-red-600 dark:text-red-400'
                            : daysRemaining <= 2
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {daysRemaining < 0
                          ? `${Math.abs(daysRemaining)} napja`
                          : `${daysRemaining} nap`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Műveletek</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(rental.status === RentalStatus.ACTIVE ||
                    rental.status === RentalStatus.OVERDUE) && (
                    <>
                      <Button
                        className="w-full bg-kgc-primary hover:bg-kgc-primary/90"
                        onClick={() => navigate(`/rental/return?id=${rental.id}`)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Visszavétel
                      </Button>
                      <Button variant="outline" className="w-full">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Hosszabbítás
                      </Button>
                    </>
                  )}
                  <Button variant="outline" className="w-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Szerződés nyomtatása
                  </Button>
                  <Button variant="ghost" className="w-full">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Email küldése
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle>Előzmények</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timelineEvents.map((event, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 text-sm">
                        {event.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {event.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {event.description}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatDateTime(event.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {rental.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Megjegyzések</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-300 text-sm">{rental.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
