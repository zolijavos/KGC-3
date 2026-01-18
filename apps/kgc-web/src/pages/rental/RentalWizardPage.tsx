import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DetailsStep, EquipmentStep, PartnerStep, SummaryStep } from './steps';
import { useWizardStore } from './wizard-store';

const STEPS = [
  { id: 0, title: 'Partner', description: 'Bérlő kiválasztása' },
  { id: 1, title: 'Bérgép', description: 'Gép kiválasztása' },
  { id: 2, title: 'Részletek', description: 'Időszak és ár' },
  { id: 3, title: 'Összegzés', description: 'Véglegesítés' },
];

export function RentalWizardPage() {
  const navigate = useNavigate();
  const { step, nextStep, prevStep, canProceed, reset, partner, equipment, pricing } =
    useWizardStore();

  // Reset wizard when mounting
  useEffect(() => {
    return () => {
      // Cleanup on unmount - optional, depends on UX preference
      // reset();
    };
  }, []);

  const handleComplete = () => {
    // In real app, this would call API to create rental
    alert(
      `Bérlés sikeresen létrehozva!\n\nPartner: ${partner?.name}\nGép: ${equipment?.name}\nÖsszeg: ${pricing?.totalAmount?.toLocaleString()} Ft`
    );
    reset();
    navigate('/dashboard');
  };

  const handleCancel = () => {
    if (confirm('Biztosan megszakítja a bérlés indítását?')) {
      reset();
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen kgc-bg">
      {/* Header */}
      <header className="shadow-sm kgc-card-bg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: 'var(--text-tertiary)' }}
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
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Bérlés indítása
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Új bérlés létrehozása
              </p>
            </div>
          </div>

          <Button variant="ghost" onClick={handleCancel}>
            Mégsem
          </Button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b kgc-card-bg border-gray-200 dark:border-slate-600">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-center">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center">
                {/* Step indicator */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors',
                      step > s.id && 'bg-green-500 text-white',
                      step === s.id && 'bg-kgc-primary text-white',
                      step < s.id && 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                    )}
                  >
                    {step > s.id ? (
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      s.id + 1
                    )}
                  </div>
                  <div className="mt-2 hidden text-center sm:block">
                    <p
                      className="text-sm font-medium"
                      style={{
                        color: step >= s.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {s.title}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {s.description}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 w-12 sm:w-24',
                      step > s.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'
                    )}
                  />
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Card className="p-6">
          {step === 0 && <PartnerStep />}
          {step === 1 && <EquipmentStep />}
          {step === 2 && <DetailsStep />}
          {step === 3 && <SummaryStep />}
        </Card>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t shadow-lg kgc-card-bg border-gray-200 dark:border-slate-600">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Button variant="outline" onClick={prevStep} disabled={step === 0}>
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Vissza
          </Button>

          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {step + 1} / {STEPS.length}
          </div>

          {step < 3 ? (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Tovább
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="ml-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          ) : (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Bérlés véglegesítése
            </Button>
          )}
        </div>
      </footer>

      {/* Spacer for fixed footer */}
      <div className="h-24" />
    </div>
  );
}
