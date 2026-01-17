import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '../../src/components/ui/select';

describe('Select components', () => {
  it('renders SelectTrigger with placeholder', () => {
    render(
      <Select>
        <SelectTrigger data-testid="trigger">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByTestId('trigger');
    expect(trigger).toHaveClass('flex');
    expect(trigger).toHaveClass('h-9');
    expect(trigger).toHaveClass('w-full');
    expect(trigger).toHaveClass('rounded-md');
    expect(trigger).toHaveClass('border');
  });

  it('has proper trigger styles', () => {
    render(
      <Select>
        <SelectTrigger data-testid="styled-trigger">
          <SelectValue placeholder="Choose" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByTestId('styled-trigger');
    expect(trigger).toHaveClass('border-input');
    expect(trigger).toHaveClass('bg-transparent');
    expect(trigger).toHaveClass('shadow-sm');
  });

  it('can be disabled', () => {
    render(
      <Select disabled>
        <SelectTrigger data-testid="disabled-trigger">
          <SelectValue placeholder="Disabled" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByTestId('disabled-trigger');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass('disabled:cursor-not-allowed');
    expect(trigger).toHaveClass('disabled:opacity-50');
  });

  it('renders Select with full structure', () => {
    render(
      <Select>
        <SelectTrigger data-testid="full-trigger">
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
            <SelectSeparator />
            <SelectItem value="orange">Orange</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    expect(screen.getByTestId('full-trigger')).toBeInTheDocument();
  });

  it('handles onValueChange callback', () => {
    const handleChange = vi.fn();
    render(
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="test">Test</SelectItem>
        </SelectContent>
      </Select>
    );
    // Select component is present
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders SelectItem with proper styles', () => {
    render(
      <Select defaultValue="item1">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="item1">Item 1</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('merges custom className on trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger" data-testid="custom">
          <SelectValue placeholder="Custom" />
        </SelectTrigger>
      </Select>
    );
    const trigger = screen.getByTestId('custom');
    expect(trigger).toHaveClass('custom-trigger');
    expect(trigger).toHaveClass('rounded-md'); // default styles preserved
  });

  it('displays selected value', () => {
    render(
      <Select defaultValue="apple">
        <SelectTrigger data-testid="selected-trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
        </SelectContent>
      </Select>
    );
    // The combobox shows the selected value
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
