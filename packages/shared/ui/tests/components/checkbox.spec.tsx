import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '../../src/components/ui/checkbox';

describe('Checkbox component', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox aria-label="Accept terms" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('renders checked when checked prop is true', () => {
    render(<Checkbox checked aria-label="Checked" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('has proper base styles', () => {
    render(<Checkbox data-testid="cb" />);
    const checkbox = screen.getByTestId('cb');
    expect(checkbox).toHaveClass('h-4');
    expect(checkbox).toHaveClass('w-4');
    expect(checkbox).toHaveClass('rounded-sm');
    expect(checkbox).toHaveClass('border');
  });

  it('handles onCheckedChange callback', () => {
    const handleChange = vi.fn();
    render(<Checkbox onCheckedChange={handleChange} aria-label="Toggle" />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Checkbox disabled aria-label="Disabled" />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox).toHaveClass('disabled:cursor-not-allowed');
  });

  it('shows checked state styles', () => {
    render(<Checkbox checked data-testid="checked-cb" />);
    const checkbox = screen.getByTestId('checked-cb');
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });

  it('merges custom className', () => {
    render(<Checkbox className="custom-cb" data-testid="custom" />);
    const checkbox = screen.getByTestId('custom');
    expect(checkbox).toHaveClass('custom-cb');
    expect(checkbox).toHaveClass('rounded-sm'); // default styles preserved
  });
});
