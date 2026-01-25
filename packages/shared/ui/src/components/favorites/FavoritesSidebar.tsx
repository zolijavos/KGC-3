/**
 * FavoritesSidebar Component
 * Epic 29-3: Collapsible favorites section with drag-and-drop reordering
 */

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronDown, ChevronRight, GripVertical, Star, X } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useFavorites, type UserFavorite } from '../../hooks/use-favorites';
import { cn } from '../../lib/utils';

export interface FavoritesSidebarProps {
  /** Callback when a favorite is clicked */
  onNavigate?: (menuItemId: string) => void;
  /** Additional class names */
  className?: string;
  /** Initially collapsed */
  defaultCollapsed?: boolean;
  /** Menu item icon resolver */
  getIcon?: (menuItemId: string) => React.ReactNode;
  /** Menu item label resolver */
  getLabel?: (menuItemId: string, storedLabel?: string) => string;
}

interface SortableFavoriteItemProps {
  favorite: UserFavorite;
  onRemove: (menuItemId: string) => void;
  onNavigate?: ((menuItemId: string) => void) | undefined;
  getIcon?: ((menuItemId: string) => React.ReactNode) | undefined;
  getLabel?: ((menuItemId: string, storedLabel?: string) => string) | undefined;
}

function SortableFavoriteItem({
  favorite,
  onRemove,
  onNavigate,
  getIcon,
  getLabel,
}: SortableFavoriteItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favorite.menuItemId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = getLabel
    ? getLabel(favorite.menuItemId, favorite.label)
    : (favorite.label ?? favorite.menuItemId);

  const icon = getIcon ? getIcon(favorite.menuItemId) : null;

  const handleClick = useCallback(() => {
    onNavigate?.(favorite.menuItemId);
  }, [favorite.menuItemId, onNavigate]);

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove(favorite.menuItemId);
    },
    [favorite.menuItemId, onRemove]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
        'hover:bg-accent transition-colors duration-150',
        isDragging && 'opacity-50 bg-accent shadow-lg z-50'
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className={cn(
          'p-0.5 rounded cursor-grab active:cursor-grabbing',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'hover:bg-muted focus-visible:opacity-100'
        )}
        {...attributes}
        {...listeners}
        aria-label="Húzd az átrendezéshez"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Content - clickable */}
      <button
        type="button"
        onClick={handleClick}
        className="flex-1 flex items-center gap-2 text-left min-w-0"
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span className="truncate text-sm">{label}</span>
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={handleRemove}
        className={cn(
          'p-0.5 rounded hover:bg-destructive/10 hover:text-destructive',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          'focus-visible:opacity-100'
        )}
        aria-label="Eltávolítás a kedvencekből"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function FavoritesSidebar({
  onNavigate,
  className,
  defaultCollapsed = false,
  getIcon,
  getLabel,
}: FavoritesSidebarProps) {
  const { favorites, removeFavorite, reorderFavorites, isLoading } = useFavorites();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = favorites.findIndex(f => f.menuItemId === active.id);
        const newIndex = favorites.findIndex(f => f.menuItemId === over.id);

        const newOrder = arrayMove(favorites, oldIndex, newIndex);
        reorderFavorites(newOrder.map(f => f.menuItemId));
      }
    },
    [favorites, reorderFavorites]
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Don't render if no favorites
  if (favorites.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn('mb-2', className)}>
      {/* Header */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium',
          'text-muted-foreground hover:text-foreground transition-colors',
          'rounded-md hover:bg-accent'
        )}
        aria-expanded={!isCollapsed}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        <span className="uppercase tracking-wider text-xs">Gyorselérés</span>
        <span className="ml-auto text-xs text-muted-foreground">{favorites.length}</span>
      </button>

      {/* Favorites list */}
      {!isCollapsed && (
        <div className="mt-1 space-y-0.5">
          {isLoading ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">Betöltés...</div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={favorites.map(f => f.menuItemId)}
                strategy={verticalListSortingStrategy}
              >
                {favorites.map(favorite => (
                  <SortableFavoriteItem
                    key={favorite.menuItemId}
                    favorite={favorite}
                    onRemove={removeFavorite}
                    onNavigate={onNavigate}
                    getIcon={getIcon}
                    getLabel={getLabel}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}
    </div>
  );
}

FavoritesSidebar.displayName = 'FavoritesSidebar';
