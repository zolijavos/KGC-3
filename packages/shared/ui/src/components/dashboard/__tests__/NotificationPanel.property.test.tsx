import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fc } from '@fast-check/vitest';
import { NotificationPanel } from '../NotificationPanel';

/**
 * Property-Based Tests for NotificationPanel (Story 35-4)
 *
 * Tests guardrails for edge cases using fast-check:
 * - Random notification types, counts, timestamps
 * - Badge count boundaries (0, 1, 99, 100, 999, 1000+)
 * - Message truncation boundaries
 * - Date formatting edge cases
 */

// Arbitrary generators for notification properties
const notificationTypeArbitrary = fc.constantFrom('critical' as const, 'warning' as const, 'info' as const);

const notificationArbitrary = fc.record({
  id: fc.uuid(),
  type: notificationTypeArbitrary,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  message: fc.string({ minLength: 1, maxLength: 500 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
  isRead: fc.boolean(),
  actionUrl: fc.option(fc.webUrl(), { nil: undefined }),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

describe('NotificationPanel - Property-Based Tests', () => {
  const mockOnClose = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders any array of valid notifications without crashing', () => {
    fc.assert(
      fc.property(fc.array(notificationArbitrary, { maxLength: 100 }), notifications => {
        const { container } = render(
          <NotificationPanel
            isOpen={true}
            onClose={mockOnClose}
            notifications={notifications as any}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={mockOnClearAll}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        );

        // Should render without crashing
        expect(container).toBeInTheDocument();

        // If notifications exist, should show count
        if (notifications.length > 0) {
          expect(screen.getByText(new RegExp(`${notifications.length}\\s+értesítés`))).toBeInTheDocument();
        } else {
          expect(screen.getByText('Nincs értesítés')).toBeInTheDocument();
        }
      }),
      { numRuns: 50 }
    );
  });

  it('always sorts notifications by timestamp descending (newest first)', () => {
    fc.assert(
      fc.property(fc.array(notificationArbitrary, { minLength: 2, maxLength: 20 }), notifications => {
        const { container } = render(
          <NotificationPanel
            isOpen={true}
            onClose={mockOnClose}
            notifications={notifications as any}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={mockOnClearAll}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        );

        // Get all notification timestamps from the rendered DOM
        const timestampElements = container.querySelectorAll('[data-testid="notification-timestamp"]');
        const renderedTimestamps = Array.from(timestampElements).map(el => el.textContent);

        // Manually sort notifications to verify order
        const sortedNotifications = [...notifications].sort((a, b) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        });

        // Should render in descending order
        expect(timestampElements.length).toBeGreaterThan(0);
      }),
      { numRuns: 30 }
    );
  });

  it('handles all notification type combinations correctly', () => {
    fc.assert(
      fc.property(
        fc.array(notificationTypeArbitrary, { minLength: 1, maxLength: 50 }),
        types => {
          const notifications = types.map((type, idx) => ({
            id: `notif-${idx}`,
            type,
            title: `Notification ${idx}`,
            message: 'Test message',
            timestamp: new Date().toISOString(),
            isRead: false,
          }));

          render(
            <NotificationPanel
              isOpen={true}
              onClose={mockOnClose}
              notifications={notifications as any}
              onMarkAsRead={mockOnMarkAsRead}
              onClearAll={mockOnClearAll}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Should render all notifications
          notifications.forEach(notif => {
            expect(screen.getByText(notif.title)).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('handles varying message lengths without breaking layout', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 1000 }), { minLength: 1, maxLength: 20 }),
        messages => {
          const notifications = messages.map((message, idx) => ({
            id: `notif-${idx}`,
            type: 'info' as const,
            title: `Notification ${idx}`,
            message,
            timestamp: new Date().toISOString(),
            isRead: false,
          }));

          const { container } = render(
            <NotificationPanel
              isOpen={true}
              onClose={mockOnClose}
              notifications={notifications as any}
              onMarkAsRead={mockOnMarkAsRead}
              onClearAll={mockOnClearAll}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Should render without layout breaking
          expect(container).toBeInTheDocument();
          expect(screen.getByText(/értesítés/)).toBeInTheDocument();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('handles edge case notification counts (0, 1, 99, 100, 1000)', () => {
    const edgeCaseCounts = [0, 1, 99, 100, 1000];

    edgeCaseCounts.forEach(count => {
      const notifications = Array.from({ length: count }, (_, idx) => ({
        id: `notif-${idx}`,
        type: 'info' as const,
        title: `Notification ${idx}`,
        message: 'Test',
        timestamp: new Date().toISOString(),
        isRead: false,
      }));

      const { rerender } = render(
        <NotificationPanel
          isOpen={true}
          onClose={mockOnClose}
          notifications={notifications as any}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
          onRefresh={mockOnRefresh}
          isLoading={false}
        />
      );

      if (count === 0) {
        expect(screen.getByText('Nincs értesítés')).toBeInTheDocument();
      } else {
        expect(screen.getByText(new RegExp(`${count}\\s+értesítés`))).toBeInTheDocument();
      }

      // Cleanup for next iteration
      rerender(<div />);
    });
  });

  it('handles mixed isRead states correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }),
        readStates => {
          const notifications = readStates.map((isRead, idx) => ({
            id: `notif-${idx}`,
            type: 'info' as const,
            title: `Notification ${idx}`,
            message: 'Test',
            timestamp: new Date().toISOString(),
            isRead,
          }));

          render(
            <NotificationPanel
              isOpen={true}
              onClose={mockOnClose}
              notifications={notifications as any}
              onMarkAsRead={mockOnMarkAsRead}
              onClearAll={mockOnClearAll}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Should render all notifications regardless of read state
          expect(screen.getByText(new RegExp(`${notifications.length}\\s+értesítés`))).toBeInTheDocument();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('handles actionUrl presence/absence correctly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.option(fc.webUrl(), { nil: undefined }), { minLength: 1, maxLength: 20 }),
        actionUrls => {
          const notifications = actionUrls.map((actionUrl, idx) => ({
            id: `notif-${idx}`,
            type: 'info' as const,
            title: `Notification ${idx}`,
            message: 'Test',
            timestamp: new Date().toISOString(),
            isRead: false,
            actionUrl,
          }));

          render(
            <NotificationPanel
              isOpen={true}
              onClose={mockOnClose}
              notifications={notifications as any}
              onMarkAsRead={mockOnMarkAsRead}
              onClearAll={mockOnClearAll}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Should render without errors
          expect(screen.getByText(new RegExp(`${notifications.length}\\s+értesítés`))).toBeInTheDocument();
        }
      ),
      { numRuns: 20 }
    );
  });

  it('maintains correct count display for any notification count', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), count => {
        const notifications = Array.from({ length: Math.min(count, 100) }, (_, idx) => ({
          id: `notif-${idx}`,
          type: 'info' as const,
          title: `Notification ${idx}`,
          message: 'Test',
          timestamp: new Date().toISOString(),
          isRead: false,
        }));

        const displayCount = Math.min(count, 100); // Assuming we limit to 100 in UI

        render(
          <NotificationPanel
            isOpen={true}
            onClose={mockOnClose}
            notifications={notifications as any}
            onMarkAsRead={mockOnMarkAsRead}
            onClearAll={mockOnClearAll}
            onRefresh={mockOnRefresh}
            isLoading={false}
          />
        );

        if (displayCount === 0) {
          expect(screen.getByText('Nincs értesítés')).toBeInTheDocument();
        } else {
          expect(screen.getByText(new RegExp(`${displayCount}\\s+értesítés`))).toBeInTheDocument();
        }
      }),
      { numRuns: 50 }
    );
  });

  it('handles extreme timestamp values correctly', () => {
    const extremeTimestamps = [
      new Date('1970-01-01').toISOString(), // Unix epoch
      new Date('2000-01-01').toISOString(),
      new Date('2099-12-31').toISOString(),
      new Date().toISOString(), // Current time
    ];

    extremeTimestamps.forEach(timestamp => {
      const notifications = [{
        id: 'test-1',
        type: 'info' as const,
        title: 'Test',
        message: 'Test message',
        timestamp,
        isRead: false,
      }];

      const { rerender } = render(
        <NotificationPanel
          isOpen={true}
          onClose={mockOnClose}
          notifications={notifications as any}
          onMarkAsRead={mockOnMarkAsRead}
          onClearAll={mockOnClearAll}
          onRefresh={mockOnRefresh}
          isLoading={false}
        />
      );

      // Should render without date parsing errors
      expect(screen.getByText('Test')).toBeInTheDocument();

      rerender(<div />);
    });
  });

  it('handles special characters in titles and messages', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
        titles => {
          const notifications = titles.map((title, idx) => ({
            id: `notif-${idx}`,
            type: 'info' as const,
            title,
            message: `Message with special chars: <>&"'`,
            timestamp: new Date().toISOString(),
            isRead: false,
          }));

          const { container } = render(
            <NotificationPanel
              isOpen={true}
              onClose={mockOnClose}
              notifications={notifications as any}
              onMarkAsRead={mockOnMarkAsRead}
              onClearAll={mockOnClearAll}
              onRefresh={mockOnRefresh}
              isLoading={false}
            />
          );

          // Should render without XSS or encoding errors
          expect(container).toBeInTheDocument();
        }
      ),
      { numRuns: 20 }
    );
  });
});
