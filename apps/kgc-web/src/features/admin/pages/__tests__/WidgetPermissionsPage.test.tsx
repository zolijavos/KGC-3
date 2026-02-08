import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WidgetPermissionsPage } from '../WidgetPermissionsPage';

// Mock the API client
vi.mock('@/api/client', () => ({
  api: {
    get: vi.fn(),
    request: vi.fn(),
  },
}));

import { api } from '@/api/client';

/**
 * WidgetPermissionsPage Tests (Story 45-1)
 *
 * Integration tests for the admin widget permissions page
 */
describe('WidgetPermissionsPage', () => {
  let queryClient: QueryClient;

  const mockPermissionsData = {
    data: {
      widgets: [
        {
          id: 'revenue-kpi',
          name: 'Bevétel KPI',
          category: 'finance',
          roles: { OPERATOR: false, STORE_MANAGER: true, ADMIN: true },
        },
        {
          id: 'stock-summary',
          name: 'Készlet összesítő',
          category: 'inventory',
          roles: { OPERATOR: true, STORE_MANAGER: true, ADMIN: true },
        },
      ],
    },
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WidgetPermissionsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Page Structure', () => {
    it('should render page title', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      expect(screen.getByText('Dashboard Widget Jogosultságok')).toBeInTheDocument();
    });

    it('should render page description', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      expect(
        screen.getByText('Állítsd be, melyik szerepkör melyik dashboard widgetet láthassa')
      ).toBeInTheDocument();
    });

    it('should render back link', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      const backLink = screen.getByRole('link');
      expect(backLink).toHaveAttribute('href', '/settings');
    });

    it('should render action buttons', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Visszaállítás alapértelmezettre')).toBeInTheDocument();
      });

      expect(screen.getByText('Mentés')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state initially', () => {
      vi.mocked(api.get).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderPage();

      expect(screen.getByText('Betöltés...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message on API failure', async () => {
      // Mock all retries to fail (hook has retry: 2)
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      renderPage();

      await waitFor(
        () => {
          expect(screen.getByText('Hiba történt a betöltés során')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should show retry button on error', async () => {
      // Mock all retries to fail
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      renderPage();

      await waitFor(
        () => {
          expect(screen.getByText('Újrapróbálás')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should retry fetch on retry button click', async () => {
      // First: fail all retries (initial + 2 retries = 3 calls)
      // Then: succeed on manual retry
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(
        () => {
          expect(screen.getByText('Újrapróbálás')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Get current call count before retry
      const callsBefore = vi.mocked(api.get).mock.calls.length;

      fireEvent.click(screen.getByText('Újrapróbálás'));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(callsBefore + 1);
      });
    });
  });

  describe('Permission Matrix Integration', () => {
    it('should display widgets from API', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      expect(screen.getByText('Készlet összesítő')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should have Save button disabled when no changes', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      expect(screen.getByText('Mentés')).toBeDisabled();
    });

    it('should enable Save button when checkbox is toggled', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle a checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);

      expect(screen.getByText('Mentés')).toBeEnabled();
    });

    it('should show pending changes count', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle a checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);

      expect(screen.getByText('1 módosítás mentésre vár')).toBeInTheDocument();
    });

    it('should show Cancel button when there are pending changes', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle a checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);

      expect(screen.getByText('Mégse')).toBeInTheDocument();
    });

    it('should clear pending changes on Cancel click', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle a checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);

      expect(screen.getByText('1 módosítás mentésre vár')).toBeInTheDocument();

      // Click Cancel
      fireEvent.click(screen.getByText('Mégse'));

      expect(screen.queryByText('1 módosítás mentésre vár')).not.toBeInTheDocument();
      expect(screen.getByText('Mentés')).toBeDisabled();
    });

    it('should save changes on Save click', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 1,
          message: '1 jogosultság sikeresen mentve',
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle a checkbox
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);

      // Click Save
      fireEvent.click(screen.getByText('Mentés'));

      await waitFor(() => {
        expect(api.request).toHaveBeenCalledWith('/dashboard/permissions/admin', {
          method: 'PUT',
          body: expect.any(String),
        });
      });
    });

    it('should show success message after save', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 1,
          message: '1 jogosultság sikeresen mentve',
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Toggle and save
      const checkbox = screen.getByRole('checkbox', { name: /Bevétel KPI - Operátor/ });
      fireEvent.click(checkbox);
      fireEvent.click(screen.getByText('Mentés'));

      await waitFor(() => {
        expect(screen.getByText('1 jogosultság sikeresen mentve')).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('should open confirmation dialog on Reset click', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Click Reset button
      fireEvent.click(screen.getByText('Visszaállítás alapértelmezettre'));

      // Dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Visszaállítás megerősítése')).toBeInTheDocument();
      });
    });

    it('should close dialog on Cancel click', async () => {
      vi.mocked(api.get).mockResolvedValueOnce(mockPermissionsData);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Open dialog
      fireEvent.click(screen.getByText('Visszaállítás alapértelmezettre'));

      await waitFor(() => {
        expect(screen.getByText('Visszaállítás megerősítése')).toBeInTheDocument();
      });

      // Click Mégse in dialog
      const dialogCancelButtons = screen.getAllByText('Mégse');
      const dialogCancelButton = dialogCancelButtons[dialogCancelButtons.length - 1];
      fireEvent.click(dialogCancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Visszaállítás megerősítése')).not.toBeInTheDocument();
      });
    });

    it('should reset permissions on confirm', async () => {
      vi.mocked(api.get).mockResolvedValue(mockPermissionsData);
      vi.mocked(api.request).mockResolvedValueOnce({
        data: {
          success: true,
          updatedCount: 5,
          message: 'Jogosultságok visszaállítva az alapértelmezettekre',
        },
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Bevétel KPI')).toBeInTheDocument();
      });

      // Open dialog and confirm
      fireEvent.click(screen.getByText('Visszaállítás alapértelmezettre'));

      await waitFor(() => {
        expect(screen.getByText('Visszaállítás megerősítése')).toBeInTheDocument();
      });

      // Click Visszaállítás in dialog (destructive button)
      const resetButtons = screen.getAllByText('Visszaállítás');
      const confirmButton = resetButtons[resetButtons.length - 1];
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(api.request).toHaveBeenCalledWith('/dashboard/permissions/admin', {
          method: 'DELETE',
        });
      });
    });
  });
});
