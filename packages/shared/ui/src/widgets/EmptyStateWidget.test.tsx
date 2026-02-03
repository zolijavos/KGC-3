import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyStateWidget } from './EmptyStateWidget';

describe('EmptyStateWidget', () => {
  it('renders empty state icon', () => {
    render(<EmptyStateWidget />);
    // Check for icon presence (InboxIcon should be rendered)
    const icon = screen.getByTestId('empty-state-icon');
    expect(icon).toBeInTheDocument();
  });

  it('renders default empty state message', () => {
    render(<EmptyStateWidget />);
    expect(screen.getByText(/nincs megjeleníthető widget/i)).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<EmptyStateWidget message="Egyedi üzenet" />);
    expect(screen.getByText('Egyedi üzenet')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<EmptyStateWidget />);
    expect(screen.getByText(/adjon hozzá widget/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyStateWidget className="custom-empty-class" />
    );
    expect(container.firstChild).toHaveClass('custom-empty-class');
  });

  it('renders within a Card component', () => {
    const { container } = render(<EmptyStateWidget />);
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeInTheDocument();
  });

  it('has centered content layout', () => {
    const { container } = render(<EmptyStateWidget />);
    const content = container.querySelector('[class*="items-center"]');
    expect(content).toBeInTheDocument();
  });
});
