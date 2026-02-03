import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPanel } from './NotificationPanel';

// Mock notification data
const mockNotifications = [
  {
    id: '1',
    type: 'critical' as const,
    title: 'Készlethiány',
    message: 'MAKITA DHP484 készlet kritikus szinten (< 50%)',
    timestamp: new Date('2025-01-20T10:30:00Z').toISOString(),
    isRead: false,
    actionUrl: '/dashboard/inventory',
    metadata: { productId: 'prod-123' },
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'Fizetési figyelmeztetés',
    message: 'Partner XYZ havi zárása lejárt',
    timestamp: new Date('2025-01-20T09:15:00Z').toISOString(),
    isRead: false,
    actionUrl: '/dashboard/finance',
  },
  {
    id: '3',
    type: 'info' as const,
    title: 'Új munkalap',
    message: 'Új munkalap (#ML-2025-001) létrehozva',
    timestamp: new Date('2025-01-19T14:00:00Z').toISOString(),
    isRead: true,
  },
];

describe('NotificationPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnClearAll = vi.fn();
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no notifications', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    expect(screen.getByText('Nincs értesítés')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // CheckCircle icon
  });

  it('renders notification list when notifications exist', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    expect(screen.getByText('Készlethiány')).toBeInTheDocument();
    expect(screen.getByText('Fizetési figyelmeztetés')).toBeInTheDocument();
    expect(screen.getByText('Új munkalap')).toBeInTheDocument();
  });

  it('displays notifications in chronological order (newest first)', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    const titles = screen.getAllByRole('heading', { level: 4 });
    expect(titles[0]).toHaveTextContent('Készlethiány'); // Newest (10:30)
    expect(titles[1]).toHaveTextContent('Fizetési figyelmeztetés'); // Middle (09:15)
    expect(titles[2]).toHaveTextContent('Új munkalap'); // Oldest (yesterday)
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    const closeButton = screen.getByRole('button', { name: /bezárás/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClearAll when "Clear all" button is clicked', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    const clearAllButton = screen.getByRole('button', { name: /összes törlése/i });
    fireEvent.click(clearAllButton);

    expect(mockOnClearAll).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh when refresh button is clicked', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    const refreshButton = screen.getByRole('button', { name: /frissítés/i });
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('disables "Clear all" button when no notifications', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    const clearAllButton = screen.queryByRole('button', { name: /összes törlése/i });
    expect(clearAllButton).not.toBeInTheDocument(); // Should not show in empty state
  });

  it('shows loading state when isLoading is true', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={true}
      />
    );

    expect(screen.getByText(/betöltés/i)).toBeInTheDocument();
  });

  it('has proper ARIA labels for accessibility', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Értesítések');
  });

  it('slides in from the right side', () => {
    const { container } = render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    // Check that the Sheet is positioned on the right
    const sheet = container.querySelector('[data-side="right"]');
    expect(sheet).toBeInTheDocument();
  });

  it('passes notification data to child components', () => {
    render(
      <NotificationPanel
        isOpen={true}
        onClose={mockOnClose}
        notifications={[mockNotifications[0]]}
        onMarkAsRead={mockOnMarkAsRead}
        onClearAll={mockOnClearAll}
        onRefresh={mockOnRefresh}
        isLoading={false}
      />
    );

    // Verify that notification content is rendered
    expect(screen.getByText(mockNotifications[0]!.title)).toBeInTheDocument();
    expect(screen.getByText(/MAKITA DHP484 készlet/)).toBeInTheDocument();
  });
});
