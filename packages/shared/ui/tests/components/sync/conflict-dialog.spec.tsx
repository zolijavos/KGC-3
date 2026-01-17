import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictDialog } from '../../../src/components/sync/conflict-dialog';
import type { ConflictInfo, SyncOperation } from '../../../src/lib/sync';

const createTestConflict = (): ConflictInfo => ({
  operation: {
    id: 'test-op-1',
    type: 'rental',
    method: 'PUT',
    url: '/api/rentals/1',
    payload: { name: 'Client Version', price: 100 },
    status: 'conflict',
    retryCount: 0,
    maxRetries: 3,
    priority: 'normal',
    createdAt: 1705400000000,
  } as SyncOperation,
  clientData: { name: 'Client Version', price: 100 },
  serverData: { name: 'Server Version', price: 150 },
  clientTimestamp: 1705400000000,
  serverTimestamp: 1705400001000,
});

describe('ConflictDialog component', () => {
  describe('rendering', () => {
    it('should render nothing when not open', () => {
      const { container } = render(
        <ConflictDialog
          open={false}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('should render dialog when open', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should show conflict title', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // "conflict" appears in title and description
      expect(screen.getAllByText(/conflict/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('data display', () => {
    it('should display client data', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // Client data appears both as label and in JSON
      expect(screen.getAllByText(/client version/i).length).toBeGreaterThanOrEqual(1);
    });

    it('should display server data', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // Server data appears both as label and in JSON
      expect(screen.getAllByText(/server version/i).length).toBeGreaterThanOrEqual(1);
    });

    it('should show timestamps', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      // Should show both timestamps in some format (hungarian locale)
      expect(screen.getAllByText(/2024|jan|márc|ápr|máj|jún|júl|aug|szept|okt|nov|dec/i).length).toBeGreaterThan(0);
    });
  });

  describe('resolution buttons', () => {
    it('should have keep local button', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /keep.*local|client/i })).toBeInTheDocument();
    });

    it('should have use server button', () => {
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /use.*server/i })).toBeInTheDocument();
    });

    it('should call onResolve with client-wins when keep local clicked', () => {
      const onResolve = vi.fn();
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={onResolve}
          onClose={vi.fn()}
        />
      );

      const keepLocalButton = screen.getByRole('button', { name: /keep.*local|client/i });
      fireEvent.click(keepLocalButton);

      expect(onResolve).toHaveBeenCalledWith('client-wins');
    });

    it('should call onResolve with server-wins when use server clicked', () => {
      const onResolve = vi.fn();
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={onResolve}
          onClose={vi.fn()}
        />
      );

      const useServerButton = screen.getByRole('button', { name: /use.*server/i });
      fireEvent.click(useServerButton);

      expect(onResolve).toHaveBeenCalledWith('server-wins');
    });
  });

  describe('close behavior', () => {
    it('should call onClose when cancel button clicked', () => {
      const onClose = vi.fn();
      render(
        <ConflictDialog
          open={true}
          conflict={createTestConflict()}
          onResolve={vi.fn()}
          onClose={onClose}
        />
      );

      // Click the Cancel button
      const cancelButton = screen.getByRole('button', { name: /^cancel$/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('custom labels', () => {
    it('should use custom entity type label', () => {
      const conflict = createTestConflict();
      render(
        <ConflictDialog
          open={true}
          conflict={conflict}
          onResolve={vi.fn()}
          onClose={vi.fn()}
          entityLabel="Rental Record"
        />
      );
      expect(screen.getByText(/rental record/i)).toBeInTheDocument();
    });
  });
});
