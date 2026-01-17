'use client';

import * as React from 'react';
import { Download, X } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useInstallPrompt } from '../../hooks/use-install-prompt';

export interface InstallPromptProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title text (default: 'Alkalmazás telepítése') */
  title?: string;
  /** Description text */
  description?: string;
  /** Install button text (default: 'Telepítés') */
  installButtonText?: string;
  /** Called when install is successful */
  onInstallSuccess?: () => void;
  /** Called when install is dismissed */
  onInstallDismissed?: () => void;
  /** Called when prompt is closed */
  onClose?: () => void;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
  /** Position of the prompt */
  position?: 'top' | 'bottom';
}

/**
 * Component that displays a prompt to install the PWA.
 * Automatically hides when the app is already installed or cannot be installed.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <>
 *       <InstallPrompt
 *         title="KGC ERP telepítése"
 *         description="Telepítse az alkalmazást a kezdőképernyőre!"
 *         onInstallSuccess={() => console.log('Installed!')}
 *       />
 *       <MainContent />
 *     </>
 *   );
 * }
 * ```
 */
export function InstallPrompt({
  className,
  title = 'Alkalmazás telepítése',
  description = 'Telepítse az alkalmazást a kezdőképernyőre a gyorsabb elérésért!',
  installButtonText = 'Telepítés',
  onInstallSuccess,
  onInstallDismissed,
  onClose,
  showCloseButton = true,
  position = 'bottom',
  ...props
}: InstallPromptProps) {
  const { canInstall, isInstalled, promptInstall, isPromptShowing } = useInstallPrompt();
  const [dismissed, setDismissed] = React.useState(false);

  // Don't show if already installed, can't install, or dismissed
  if (isInstalled || !canInstall || dismissed) {
    return null;
  }

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result === 'accepted') {
      onInstallSuccess?.();
    } else if (result === 'dismissed') {
      onInstallDismissed?.();
    }
  };

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      aria-describedby="install-prompt-description"
      className={cn(
        'fixed left-4 right-4 z-50 rounded-lg border bg-card p-4 shadow-lg',
        position === 'top' ? 'top-4' : 'bottom-4',
        'sm:left-auto sm:right-4 sm:max-w-sm',
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 id="install-prompt-title" className="font-semibold">
            {title}
          </h3>
          <p id="install-prompt-description" className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {showCloseButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleClose}
            aria-label="Bezárás"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleInstall} disabled={isPromptShowing}>
          {installButtonText}
        </Button>
      </div>
    </div>
  );
}
