import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WelcomeCard } from './WelcomeCard';

describe('WelcomeCard', () => {
  it('renders welcome message', () => {
    render(<WelcomeCard userName="Teszt Felhasználó" />);
    expect(screen.getByText(/üdvözöljük/i)).toBeInTheDocument();
  });

  it('renders user name', () => {
    render(<WelcomeCard userName="Kovács János" />);
    expect(screen.getByText(/Kovács János/)).toBeInTheDocument();
  });

  it('renders current date', () => {
    render(<WelcomeCard userName="Test User" />);
    // Check that some date text is present (could be formatted in various ways)
    expect(screen.getByTestId('welcome-date')).toBeInTheDocument();
  });

  it('renders default message when no userName provided', () => {
    render(<WelcomeCard />);
    expect(screen.getByText(/üdvözöljük/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WelcomeCard userName="Test" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders within a Card component', () => {
    const { container } = render(<WelcomeCard userName="Test" />);
    // shadcn/ui Card has specific structure
    const card = container.querySelector('[class*="rounded"]');
    expect(card).toBeInTheDocument();
  });
});
