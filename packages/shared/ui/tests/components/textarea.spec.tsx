import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '../../src/components/ui/textarea';

describe('Textarea component', () => {
  it('should render with placeholder', () => {
    render(<Textarea placeholder="Írd be az üzenetet" />);
    expect(screen.getByPlaceholderText('Írd be az üzenetet')).toBeInTheDocument();
  });

  it('should have proper base styles', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('min-h-[60px]');
    expect(textarea).toHaveClass('rounded-md');
    expect(textarea).toHaveClass('border');
  });

  it('should handle value changes', () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    fireEvent.change(textarea, { target: { value: 'Test content' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should merge custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-class');
    expect(textarea).toHaveClass('rounded-md'); // base style preserved
  });

  it('should render with default value', () => {
    render(<Textarea defaultValue="Default text" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Default text');
  });

  it('should set rows attribute', () => {
    render(<Textarea rows={5} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('should be resizable', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    // Check that resize is not disabled (default browser behavior)
    expect(textarea.style.resize).not.toBe('none');
  });
});
