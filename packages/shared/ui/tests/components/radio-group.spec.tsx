import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioGroup, RadioGroupItem } from '../../src/components/ui/radio-group';
import { Label } from '../../src/components/ui/label';

describe('RadioGroup component', () => {
  it('should render radio group with items', () => {
    render(
      <RadioGroup defaultValue="option-1">
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-1" id="option-1" />
          <Label htmlFor="option-1">Option 1</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="option-2" id="option-2" />
          <Label htmlFor="option-2">Option 2</Label>
        </div>
      </RadioGroup>
    );

    expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
  });

  it('should have default value selected', () => {
    render(
      <RadioGroup defaultValue="option-2">
        <RadioGroupItem value="option-1" aria-label="Option 1" />
        <RadioGroupItem value="option-2" aria-label="Option 2" />
      </RadioGroup>
    );

    const option1 = screen.getByLabelText('Option 1');
    const option2 = screen.getByLabelText('Option 2');

    expect(option1).toHaveAttribute('data-state', 'unchecked');
    expect(option2).toHaveAttribute('data-state', 'checked');
  });

  it('should handle onValueChange callback', () => {
    const handleChange = vi.fn();
    render(
      <RadioGroup defaultValue="option-1" onValueChange={handleChange}>
        <RadioGroupItem value="option-1" aria-label="Option 1" />
        <RadioGroupItem value="option-2" aria-label="Option 2" />
      </RadioGroup>
    );

    const option2 = screen.getByLabelText('Option 2');
    fireEvent.click(option2);

    expect(handleChange).toHaveBeenCalledWith('option-2');
  });

  it('should have proper base styles', () => {
    render(
      <RadioGroup data-testid="radio-group">
        <RadioGroupItem value="option-1" data-testid="radio-item" />
      </RadioGroup>
    );

    const radioItem = screen.getByTestId('radio-item');
    expect(radioItem).toHaveClass('h-4');
    expect(radioItem).toHaveClass('w-4');
    expect(radioItem).toHaveClass('rounded-full');
    expect(radioItem).toHaveClass('border');
  });

  it('should disable items when disabled', () => {
    render(
      <RadioGroup disabled>
        <RadioGroupItem value="option-1" aria-label="Option 1" />
      </RadioGroup>
    );

    const option1 = screen.getByLabelText('Option 1');
    expect(option1).toBeDisabled();
  });

  it('should merge custom className', () => {
    render(
      <RadioGroup className="custom-group" data-testid="radio-group">
        <RadioGroupItem
          value="option-1"
          className="custom-item"
          data-testid="radio-item"
        />
      </RadioGroup>
    );

    const radioGroup = screen.getByTestId('radio-group');
    const radioItem = screen.getByTestId('radio-item');

    expect(radioGroup).toHaveClass('custom-group');
    expect(radioItem).toHaveClass('custom-item');
    expect(radioItem).toHaveClass('rounded-full'); // base style preserved
  });

  it('should render with controlled value', () => {
    const { rerender } = render(
      <RadioGroup value="option-1">
        <RadioGroupItem value="option-1" aria-label="Option 1" />
        <RadioGroupItem value="option-2" aria-label="Option 2" />
      </RadioGroup>
    );

    expect(screen.getByLabelText('Option 1')).toHaveAttribute('data-state', 'checked');
    expect(screen.getByLabelText('Option 2')).toHaveAttribute('data-state', 'unchecked');

    rerender(
      <RadioGroup value="option-2">
        <RadioGroupItem value="option-1" aria-label="Option 1" />
        <RadioGroupItem value="option-2" aria-label="Option 2" />
      </RadioGroup>
    );

    expect(screen.getByLabelText('Option 1')).toHaveAttribute('data-state', 'unchecked');
    expect(screen.getByLabelText('Option 2')).toHaveAttribute('data-state', 'checked');
  });
});
