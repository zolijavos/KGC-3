import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../../src/components/ui/label';

describe('Label component', () => {
  it('renders with default styles', () => {
    render(<Label>Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-medium');
    expect(label).toHaveClass('leading-none');
  });

  it('associates with form input via htmlFor', () => {
    render(<Label htmlFor="email-input">Email</Label>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('has peer-disabled styles for accessibility', () => {
    render(<Label>Disabled field</Label>);
    const label = screen.getByText('Disabled field');
    expect(label).toHaveClass('peer-disabled:cursor-not-allowed');
    expect(label).toHaveClass('peer-disabled:opacity-70');
  });

  it('merges custom className', () => {
    render(<Label className="required-field">Required</Label>);
    const label = screen.getByText('Required');
    expect(label).toHaveClass('required-field');
    expect(label).toHaveClass('font-medium'); // default styles preserved
  });
});
