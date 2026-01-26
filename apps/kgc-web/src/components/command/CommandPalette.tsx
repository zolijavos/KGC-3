/**
 * CommandPalette - Ctrl+K Quick Navigation
 * Epic 29: Story 29-5 - Command Palette integráció
 *
 * Uses cmdk library for keyboard-driven navigation
 * Integrates with favorites store and sidebar navigation
 */

import { selectSortedFavorites, useFavoritesStore } from '@kgc/ui';
import { Command } from 'cmdk';
import { Search, Star, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/** Navigation item structure */
interface NavItem {
  id: string;
  label: string;
  href: string;
  group: string;
  keywords?: string[];
  external?: boolean;
}

/** Flattened navigation items for search */
const NAV_ITEMS: NavItem[] = [
  // Dashboard
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    group: 'Navigáció',
    keywords: ['home', 'kezdo'],
  },

  // Bérlés
  {
    id: 'rental',
    label: 'Aktív bérlések',
    href: '/rental',
    group: 'Bérlés',
    keywords: ['berles', 'aktiv'],
  },
  {
    id: 'rental-new',
    label: 'Új bérlés',
    href: '/rental/new',
    group: 'Bérlés',
    keywords: ['uj', 'berles', 'inditas'],
  },
  {
    id: 'rental-return',
    label: 'Visszavétel',
    href: '/rental/return',
    group: 'Bérlés',
    keywords: ['vissza', 'lezaras'],
  },

  // Munkalap
  {
    id: 'worksheet',
    label: 'Munkalapok',
    href: '/worksheet',
    group: 'Munkalap',
    keywords: ['munkalap', 'szerviz'],
  },
  {
    id: 'worksheet-new',
    label: 'Új munkalap',
    href: '/worksheet/new',
    group: 'Munkalap',
    keywords: ['uj', 'munkalap'],
  },

  // Értékesítés
  {
    id: 'sales',
    label: 'Eladások',
    href: '/sales',
    group: 'Értékesítés',
    keywords: ['eladas', 'sales'],
  },
  {
    id: 'sales-pos',
    label: 'Pénztár (POS)',
    href: '/sales/new',
    group: 'Értékesítés',
    keywords: ['pos', 'penztar', 'kassza'],
  },

  // Készlet
  {
    id: 'inventory',
    label: 'Készletlista',
    href: '/inventory',
    group: 'Készlet',
    keywords: ['keszlet', 'raktar'],
  },
  {
    id: 'inventory-movements',
    label: 'Mozgások',
    href: '/inventory/movements',
    group: 'Készlet',
    keywords: ['mozgas', 'keszlet'],
  },
  {
    id: 'inventory-receive',
    label: 'Bevételezés',
    href: '/inventory/receive',
    group: 'Készlet',
    keywords: ['bevetelez', 'aru'],
  },

  // Törzsadatok
  {
    id: 'products',
    label: 'Cikkek',
    href: '/products',
    group: 'Törzsadatok',
    keywords: ['cikk', 'termek', 'product'],
  },
  {
    id: 'quotations',
    label: 'Árajánlatok',
    href: '/quotations',
    group: 'Törzsadatok',
    keywords: ['arajanl', 'quote'],
  },
  {
    id: 'contracts',
    label: 'Szerződések',
    href: '/contracts',
    group: 'Törzsadatok',
    keywords: ['szerzodes', 'contract'],
  },
  {
    id: 'invoices',
    label: 'Számlák',
    href: '/invoices',
    group: 'Törzsadatok',
    keywords: ['szamla', 'invoice'],
  },

  // Partnerek
  {
    id: 'partners',
    label: 'Partnerlista',
    href: '/partners',
    group: 'Partnerek',
    keywords: ['partner', 'ugyfel', 'vevo'],
  },
  {
    id: 'partners-new',
    label: 'Új partner',
    href: '/partners/new',
    group: 'Partnerek',
    keywords: ['uj', 'partner'],
  },

  // Járművek
  {
    id: 'vehicles-rental',
    label: 'Bérgép járművek',
    href: '/vehicles/rental',
    group: 'Járművek',
    keywords: ['jarmú', 'bergep', 'auto'],
  },
  {
    id: 'vehicles-company',
    label: 'Céges járművek',
    href: '/vehicles/company',
    group: 'Járművek',
    keywords: ['ceges', 'jarmu'],
  },
  {
    id: 'vehicles-expiring',
    label: 'Lejáró dokumentumok',
    href: '/vehicles/expiring',
    group: 'Járművek',
    keywords: ['lejaro', 'muszaki'],
  },

  // Chat & Reports
  {
    id: 'chat',
    label: 'Chat',
    href: '/chat',
    group: 'Kommunikáció',
    keywords: ['chat', 'uzenet', 'message'],
  },
  {
    id: 'reports',
    label: 'Riportok',
    href: '/reports',
    group: 'Riportok',
    keywords: ['riport', 'report', 'statisztika'],
  },
  {
    id: 'tasks',
    label: 'Feladatok',
    href: '/tasks',
    group: 'Feladatok',
    keywords: ['feladat', 'task', 'todo'],
  },

  // Integrációk
  {
    id: 'integrations-crm',
    label: 'CRM (Twenty)',
    href: '/integrations/crm',
    group: 'Integrációk',
    keywords: ['crm', 'twenty'],
  },
  {
    id: 'integrations-hr',
    label: 'HR (Horilla)',
    href: '/integrations/hr',
    group: 'Integrációk',
    keywords: ['hr', 'horilla'],
  },

  // Admin
  {
    id: 'users',
    label: 'Felhasználók',
    href: '/users',
    group: 'Admin',
    keywords: ['user', 'felhasznalo'],
  },
  {
    id: 'users-roles',
    label: 'Jogosultságok',
    href: '/users/roles',
    group: 'Admin',
    keywords: ['role', 'jogosultsag', 'rbac'],
  },
  {
    id: 'tenant',
    label: 'Tenant Admin',
    href: '/tenant',
    group: 'Admin',
    keywords: ['tenant', 'uzlet'],
  },
  {
    id: 'feature-flags',
    label: 'Feature Flags',
    href: '/feature-flags',
    group: 'Admin',
    keywords: ['feature', 'flag'],
  },

  // Beállítások
  {
    id: 'settings',
    label: 'Beállítások',
    href: '/settings',
    group: 'Beállítások',
    keywords: ['beallitas', 'config'],
  },
  {
    id: 'myforgeos',
    label: 'MyForgeOS',
    href: '/myforgeos',
    group: 'Beállítások',
    keywords: ['forge', 'os'],
  },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const favorites = useFavoritesStore(selectSortedFavorites);
  const { addFavorite, removeFavorite, isFavorite } = useFavoritesStore();

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset search when closing
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const handleSelect = useCallback(
    (href: string, external?: boolean) => {
      if (external) {
        window.open(href, '_blank', 'noopener,noreferrer');
      } else {
        navigate(href);
      }
      onOpenChange(false);
    },
    [navigate, onOpenChange]
  );

  const toggleFavorite = useCallback(
    (e: React.MouseEvent, itemId: string, label: string) => {
      e.stopPropagation();
      if (isFavorite(itemId)) {
        removeFavorite(itemId);
      } else {
        addFavorite(itemId, label);
      }
    },
    [addFavorite, removeFavorite, isFavorite]
  );

  // Get favorite items
  const favoriteItems = favorites
    .map(fav => {
      const navItem = NAV_ITEMS.find(item => item.id === fav.menuItemId);
      return navItem ? { ...navItem, favoriteLabel: fav.label } : null;
    })
    .filter((item): item is NavItem & { favoriteLabel?: string } => item !== null);

  // Group regular items
  const groupedItems = NAV_ITEMS.reduce(
    (acc, item) => {
      if (!acc[item.group]) {
        acc[item.group] = [];
      }
      acc[item.group].push(item);
      return acc;
    },
    {} as Record<string, NavItem[]>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Dialog */}
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-2xl"
          loop
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-white/10 px-4">
            <Search className="mr-2 h-4 w-4 shrink-0 text-white/50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Keresés oldalak között..."
              className="flex h-12 w-full bg-transparent text-white placeholder:text-white/40 outline-none"
            />
            <button
              onClick={() => onOpenChange(false)}
              className="ml-2 rounded p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Results */}
          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-white/50">
              Nincs találat.
            </Command.Empty>

            {/* Favorites Group */}
            {favoriteItems.length > 0 && (
              <Command.Group heading="Kedvencek" className="mb-2">
                <div className="px-2 py-1.5 text-xs font-semibold text-kgc-accent">Kedvencek</div>
                {favoriteItems.map(item => (
                  <Command.Item
                    key={`fav-${item.id}`}
                    value={`fav-${item.label} ${item.favoriteLabel ?? ''}`}
                    onSelect={() => handleSelect(item.href, item.external)}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-white/80 outline-none data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                  >
                    <Star className="h-4 w-4 fill-kgc-accent text-kgc-accent" />
                    <span className="flex-1">{item.favoriteLabel ?? item.label}</span>
                    <span className="text-xs text-white/30">{item.group}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* All Navigation Groups */}
            {Object.entries(groupedItems).map(([group, items]) => (
              <Command.Group key={group} heading={group}>
                <div className="px-2 py-1.5 text-xs font-semibold text-white/40">{group}</div>
                {items.map(item => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(' ') ?? ''} ${item.group}`}
                    onSelect={() => handleSelect(item.href, item.external)}
                    className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-white/80 outline-none data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                  >
                    <span className="flex-1">{item.label}</span>
                    <button
                      onClick={e => toggleFavorite(e, item.id, item.label)}
                      className={`rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 ${
                        isFavorite(item.id)
                          ? 'text-kgc-accent'
                          : 'text-white/30 hover:text-white/60'
                      }`}
                      title={
                        isFavorite(item.id)
                          ? 'Eltávolítás a kedvencekből'
                          : 'Hozzáadás a kedvencekhez'
                      }
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${isFavorite(item.id) ? 'fill-current' : ''}`}
                      />
                    </button>
                    {item.external && <span className="text-xs text-white/30">↗</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/40">
            <div className="flex items-center gap-4">
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5">↑↓</kbd> navigáció
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5">Enter</kbd> megnyitás
              </span>
              <span>
                <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd> bezárás
              </span>
            </div>
            <span>Ctrl+K</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
