import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Switch } from '../../src/components/ui/switch';

describe('Switch component', () => {
  it('should render unchecked by default', () => {
    render(<Switch aria-label="Toggle" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('data-state', 'unchecked');
  });

  it('should render checked when checked prop is true', () => {
    render(<Switch checked aria-label="Checked switch" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toHaveAttribute('data-state', 'checked');
  });

  it('should have proper base styles', () => {
    render(<Switch data-testid="switch" />);
    const switchEl = screen.getByTestId('switch');
    expect(switchEl).toHaveClass('h-5');
    expect(switchEl).toHaveClass('w-9');
    expect(switchEl).toHaveClass('rounded-full');
  });

  it('should handle onCheckedChange callback', () => {
    const handleChange = vi.fn();
    render(<Switch onCheckedChange={handleChange} aria-label="Toggle" />);
    const switchEl = screen.getByRole('switch');
    fireEvent.click(switchEl);
    expect(handleChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled aria-label="Disabled switch" />);
    const switchEl = screen.getByRole('switch');
    expect(switchEl).toBeDisabled();
    expect(switchEl).toHaveClass('disabled:cursor-not-allowed');
  });

  it('should merge custom className', () => {
    render(<Switch className="custom-switch" data-testid="switch" />);
    const switchEl = screen.getByTestId('switch');
    expect(switchEl).toHaveClass('custom-switch');
    expect(switchEl).toHaveClass('rounded-full'); // base style preserved
  });

  it('should toggle state on click', () => {
    render(<Switch aria-label="Toggle" />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('data-state', 'unchecked');
    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('data-state', 'checked');
    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('data-state', 'unchecked');
  });
});
