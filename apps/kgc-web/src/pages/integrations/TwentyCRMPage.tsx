import { Button } from '@/components/ui';
import { useState } from 'react';

const TWENTY_URL = 'https://crm-demo.mflerp.com';

export function TwentyCRMPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const openInNewTab = () => {
    window.open(TWENTY_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4 kgc-card-bg dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white font-bold">
            CRM
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Twenty CRM</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Ügyfélkapcsolat kezelés</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsLoading(true)}>
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Frissítés
          </Button>
          <Button size="sm" onClick={openInNewTab}>
            <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Megnyitás új ablakban
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-10">
            <div className="text-center">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto" />
              <p className="text-gray-600 dark:text-gray-400">Twenty CRM betöltése...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-slate-900 z-10">
            <div className="text-center max-w-md p-6">
              <div className="mb-4 text-6xl">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Nem sikerült betölteni
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                A Twenty CRM szolgáltatás nem elérhető, vagy a böngésző blokkolja az iframe
                betöltését.
              </p>
              <div className="space-y-2">
                <Button onClick={openInNewTab} className="w-full">
                  Megnyitás új ablakban
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHasError(false);
                    setIsLoading(true);
                  }}
                  className="w-full"
                >
                  Újrapróbálkozás
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          src={TWENTY_URL}
          title="Twenty CRM"
          className="h-full w-full border-0"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  );
}
