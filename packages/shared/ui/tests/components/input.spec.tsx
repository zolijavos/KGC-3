import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../../src/components/ui/input';

describe('Input component', () => {
  it('renders with default styles', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('border-input');
    expect(input).toHaveClass('rounded-md');
  });

  it('accepts and displays value', () => {
    render(<Input value="test value" readOnly />);
    const input = screen.getByDisplayValue('test value');
    expect(input).toBeInTheDocument();
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled placeholder="Disabled" />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:cursor-not-allowed');
  });

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="email" />);
    expect(screen.getByTestId('email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" data-testid="password" />);
    expect(screen.getByTestId('password')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" data-testid="number" />);
    expect(screen.getByTestId('number')).toHaveAttribute('type', 'number');
  });

  it('merges custom className', () => {
    render(<Input className="custom-input" data-testid="custom" />);
    const input = screen.getByTestId('custom');
    expect(input).toHaveClass('custom-input');
    expect(input).toHaveClass('border-input'); // default styles still applied
  });

  it('handles focus and blur events', () => {
    const handleFocus = vi.fn();
    const handleBlur = vi.fn();
    render(<Input onFocus={handleFocus} onBlur={handleBlur} data-testid="input" />);
    const input = screen.getByTestId('input');

    fireEvent.focus(input);
    expect(handleFocus).toHaveBeenCalled();

    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  it('supports ref forwarding', () => {
    const ref = vi.fn();
    render(<Input ref={ref} data-testid="ref-input" />);
    expect(ref).toHaveBeenCalled();
  });
});
