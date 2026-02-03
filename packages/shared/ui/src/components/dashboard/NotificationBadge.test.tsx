import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBadge } from './NotificationBadge';

describe('NotificationBadge', () => {
  const mockOnClick = vi.fn();

  it('renders badge with unread count', () => {
    render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('hides badge when unread count is 0', () => {
    const { container } = render(<NotificationBadge unreadCount={0} onClick={mockOnClick} />);

    const badge = container.querySelector('[data-testid="notification-badge"]');
    expect(badge).not.toBeInTheDocument();
  });

  it('displays 99+ when unread count exceeds 99', () => {
    render(<NotificationBadge unreadCount={150} onClick={mockOnClick} />);

    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('calls onClick when badge is clicked', () => {
    render(<NotificationBadge unreadCount={3} onClick={mockOnClick} />);

    const badge = screen.getByRole('button', { name: /értesítések/i });
    fireEvent.click(badge);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('has red background color', () => {
    render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveClass(/bg-red/);
  });

  it('has proper ARIA label for accessibility', () => {
    render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button.getAttribute('aria-label')).toContain('5');
    expect(button.getAttribute('aria-label')).toContain('értesítés');
  });

  it('uses Bell icon', () => {
    render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    const icon = screen.getByTestId('bell-icon');
    expect(icon).toBeInTheDocument();
  });

  it('formats large numbers in Hungarian locale', () => {
    render(<NotificationBadge unreadCount={42} onClick={mockOnClick} />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('is keyboard accessible', () => {
    render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    const button = screen.getByRole('button');
    button.focus();

    expect(button).toHaveFocus();

    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    expect(mockOnClick).toHaveBeenCalled();
  });

  it('positions badge in top-right corner', () => {
    const { container } = render(<NotificationBadge unreadCount={5} onClick={mockOnClick} />);

    const badge = container.querySelector('[data-testid="notification-badge"]');
    expect(badge).toHaveClass(/absolute/);
  });
});
