import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationList } from './NotificationList';

const mockNotifications = [
  {
    id: '1',
    type: 'critical' as const,
    title: 'Készlethiány',
    message: 'MAKITA DHP484 készlet kritikus szinten (< 50%)',
    timestamp: new Date('2025-01-20T10:30:00Z').toISOString(),
    isRead: false,
    actionUrl: '/dashboard/inventory',
  },
  {
    id: '2',
    type: 'warning' as const,
    title: 'Fizetési figyelmeztetés',
    message: 'Partner XYZ havi zárása lejárt',
    timestamp: new Date('2025-01-20T09:15:00Z').toISOString(),
    isRead: false,
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

describe('NotificationList', () => {
  const mockOnMarkAsRead = vi.fn();

  it('renders all notifications', () => {
    render(
      <NotificationList
        notifications={mockNotifications}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    expect(screen.getByText('Készlethiány')).toBeInTheDocument();
    expect(screen.getByText('Fizetési figyelmeztetés')).toBeInTheDocument();
    expect(screen.getByText('Új munkalap')).toBeInTheDocument();
  });

  it('displays correct icon for critical type (AlertTriangle)', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    // AlertTriangle icon should be present for critical
    const icon = screen.getByTestId('icon-critical');
    expect(icon).toBeInTheDocument();
  });

  it('displays correct icon for warning type (AlertCircle)', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[1]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const icon = screen.getByTestId('icon-warning');
    expect(icon).toBeInTheDocument();
  });

  it('displays correct icon for info type (Info)', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[2]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const icon = screen.getByTestId('icon-info');
    expect(icon).toBeInTheDocument();
  });

  it('applies correct color scheme for critical type (red)', () => {
    const { container } = render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const notificationItem = container.querySelector('[data-type="critical"]');
    expect(notificationItem).toHaveClass(/border-red/);
  });

  it('applies correct color scheme for warning type (yellow)', () => {
    const { container } = render(
      <NotificationList
        notifications={[mockNotifications[1]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const notificationItem = container.querySelector('[data-type="warning"]');
    expect(notificationItem).toHaveClass(/border-yellow/);
  });

  it('applies correct color scheme for info type (blue)', () => {
    const { container } = render(
      <NotificationList
        notifications={[mockNotifications[2]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const notificationItem = container.querySelector('[data-type="info"]');
    expect(notificationItem).toHaveClass(/border-blue/);
  });

  it('truncates long messages to 100 characters with ellipsis', () => {
    const longMessage = 'A'.repeat(150);
    const notificationWithLongMessage = {
      ...mockNotifications[0]!,
      message: longMessage,
    };

    render(
      <NotificationList
        notifications={[notificationWithLongMessage]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const message = screen.getByText(/A{100}\.\.\./);
    expect(message.textContent?.length).toBeLessThanOrEqual(103); // 100 chars + "..."
  });

  it('shows full message in tooltip for truncated messages', () => {
    const longMessage = 'A'.repeat(150);
    const notificationWithLongMessage = {
      ...mockNotifications[0]!,
      message: longMessage,
    };

    render(
      <NotificationList
        notifications={[notificationWithLongMessage]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const messageElement = screen.getByText(/A{100}\.\.\./);
    expect(messageElement).toHaveAttribute('title', longMessage);
  });

  it('calls onMarkAsRead when mark as read button is clicked', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadButton = screen.getByRole('button', { name: /olvasottnak jelölés/i });
    fireEvent.click(markAsReadButton);

    expect(mockOnMarkAsRead).toHaveBeenCalledWith('1');
  });

  it('does not show mark as read button for already read notifications', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[2]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const markAsReadButton = screen.queryByRole('button', { name: /olvasottnak jelölés/i });
    expect(markAsReadButton).not.toBeInTheDocument();
  });

  it('displays read indicator for read notifications', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[2]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    expect(screen.getByText(/olvasva/i)).toBeInTheDocument();
  });

  it('formats timestamp in Hungarian locale', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    // Hungarian date format should be present
    const timestamp = screen.getByText(/2025\.\s*01\.\s*20\./);
    expect(timestamp).toBeInTheDocument();
  });

  it('has proper ARIA labels for accessibility', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('aria-label', 'Értesítések listája');
  });

  it('renders action link when actionUrl is provided', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[0]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const actionLink = screen.getByRole('link', { name: /részletek/i });
    expect(actionLink).toHaveAttribute('href', '/dashboard/inventory');
  });

  it('does not render action link when actionUrl is not provided', () => {
    render(
      <NotificationList
        notifications={[mockNotifications[1]!]}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    const actionLink = screen.queryByRole('link', { name: /részletek/i });
    expect(actionLink).not.toBeInTheDocument();
  });
});
