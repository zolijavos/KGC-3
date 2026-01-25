/**
 * FavoriteButton Component
 * Epic 29-3: Star icon toggle for adding/removing favorites
 */

import { Star } from 'lucide-react';
import React, { useCallback } from 'react';
import { useFavorites } from '../../hooks/use-favorites';
import { cn } from '../../lib/utils';

export interface FavoriteButtonProps {
  /** Menu item ID to toggle */
  menuItemId: string;
  /** Optional label for the favorite */
  label?: string;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show only on hover (controlled externally) */
  visible?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const buttonSizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export function FavoriteButton({
  menuItemId,
  label,
  className,
  size = 'md',
  visible = true,
  disabled = false,
}: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, canAddMore } = useFavorites();
  const isFav = isFavorite(menuItemId);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        toggleFavorite(menuItemId, label);
      }
    },
    [menuItemId, label, disabled, toggleFavorite]
  );

  // Don't show if not visible and not a favorite
  if (!visible && !isFav) {
    return null;
  }

  const isDisabled = disabled || (!isFav && !canAddMore);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-all duration-200',
        'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        buttonSizeClasses[size],
        isDisabled && 'opacity-50 cursor-not-allowed',
        !visible && !isFav && 'opacity-0 group-hover:opacity-100',
        className
      )}
      title={isFav ? 'Eltávolítás a kedvencekből' : 'Hozzáadás a kedvencekhez'}
      aria-label={isFav ? 'Eltávolítás a kedvencekből' : 'Hozzáadás a kedvencekhez'}
    >
      <Star
        className={cn(
          sizeClasses[size],
          'transition-all duration-200',
          isFav ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
        )}
      />
    </button>
  );
}

FavoriteButton.displayName = 'FavoriteButton';
