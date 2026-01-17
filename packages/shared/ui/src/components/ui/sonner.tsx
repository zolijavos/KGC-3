import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

interface ToasterComponentProps extends Omit<ToasterProps, 'theme'> {
  /**
   * Theme for the toaster. Defaults to 'system'.
   * Pass 'light', 'dark', or 'system' to control the theme.
   */
  theme?: 'light' | 'dark' | 'system';
}

/**
 * Toast notification container component.
 * Place this component once at the root of your application.
 *
 * @example
 * // In your app root
 * <Toaster />
 *
 * // Then use toast anywhere
 * import { toast } from '@kgc/ui';
 * toast.success('Sikeresen mentve');
 * toast.error('Hiba történt');
 */
const Toaster = ({ theme = 'system', ...props }: ToasterComponentProps) => {
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
