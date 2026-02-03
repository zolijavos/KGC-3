import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangePicker } from './DateRangePicker';

describe('DateRangePicker', () => {
  it('should render period selector with default value', () => {
    render(<DateRangePicker defaultPeriod="monthly" />);

    expect(screen.getByText('Időszak:')).toBeInTheDocument();
  });

  it('should render all preset buttons', () => {
    render(<DateRangePicker />);

    expect(screen.getByRole('button', { name: /Ma/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tegnap/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ez a hét/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Előző hét/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ez a hónap/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Előző hónap/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ez az év/ })).toBeInTheDocument();
  });

  it('should render comparison toggle', () => {
    render(<DateRangePicker />);

    expect(screen.getByText('Összehasonlítás előző időszakkal')).toBeInTheDocument();
  });

  it('should call onChange when preset button is clicked', () => {
    const mockOnChange = vi.fn();
    render(<DateRangePicker onChange={mockOnChange} />);

    const todayButton = screen.getByRole('button', { name: /Ma/ });
    fireEvent.click(todayButton);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      'daily',
      false,
    );
  });
});
