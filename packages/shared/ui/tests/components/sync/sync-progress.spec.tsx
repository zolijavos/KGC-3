import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncProgress } from '../../../src/components/sync/sync-progress';
import type { SyncProgress as SyncProgressType } from '../../../src/lib/sync';

describe('SyncProgress component', () => {
  const defaultProgress: SyncProgressType = {
    total: 0,
    completed: 0,
    failed: 0,
    conflicts: 0,
    isSyncing: false,
  };

  describe('rendering', () => {
    it('should render nothing when not syncing and no pending', () => {
      const { container } = render(
        <SyncProgress progress={defaultProgress} pendingCount={0} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render pending count when there are pending items', () => {
      render(<SyncProgress progress={defaultProgress} pendingCount={5} />);
      expect(screen.getByText(/5/)).toBeInTheDocument();
    });

    it('should render syncing state', () => {
      const progress: SyncProgressType = {
        ...defaultProgress,
        total: 10,
        completed: 3,
        isSyncing: true,
      };
      render(<SyncProgress progress={progress} pendingCount={7} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('progress display', () => {
    it('should show progress percentage', () => {
      const progress: SyncProgressType = {
        ...defaultProgress,
        total: 10,
        completed: 5,
        isSyncing: true,
      };
      render(<SyncProgress progress={progress} pendingCount={5} />);
      // Progress bar should show 50%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should show failed count when there are failures', () => {
      const progress: SyncProgressType = {
        ...defaultProgress,
        total: 10,
        completed: 7,
        failed: 2,
        isSyncing: false,
      };
      render(<SyncProgress progress={progress} pendingCount={1} />);
      expect(screen.getByText(/2.*failed/i)).toBeInTheDocument();
    });

    it('should show conflicts count when there are conflicts', () => {
      const progress: SyncProgressType = {
        ...defaultProgress,
        total: 10,
        completed: 8,
        conflicts: 1,
        isSyncing: false,
      };
      render(<SyncProgress progress={progress} pendingCount={1} />);
      expect(screen.getByText(/1.*conflict/i)).toBeInTheDocument();
    });
  });

  describe('online/offline state', () => {
    it('should show offline indicator when offline', () => {
      render(
        <SyncProgress
          progress={defaultProgress}
          pendingCount={3}
          isOnline={false}
        />
      );
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should not show offline indicator when online', () => {
      render(
        <SyncProgress
          progress={defaultProgress}
          pendingCount={3}
          isOnline={true}
        />
      );
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('should apply custom className', () => {
      render(
        <SyncProgress
          progress={defaultProgress}
          pendingCount={1}
          className="custom-class"
        />
      );
      const container = screen.getByTestId('sync-progress');
      expect(container).toHaveClass('custom-class');
    });
  });
});
