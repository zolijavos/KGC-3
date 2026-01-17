import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Separator } from '../../src/components/ui/separator';

describe('Separator component', () => {
  it('renders horizontal separator by default', () => {
    render(<Separator data-testid="sep" />);
    const separator = screen.getByTestId('sep');
    expect(separator).toHaveClass('h-[1px]');
    expect(separator).toHaveClass('w-full');
    expect(separator).toHaveClass('bg-border');
  });

  it('renders vertical separator', () => {
    render(<Separator orientation="vertical" data-testid="vsep" />);
    const separator = screen.getByTestId('vsep');
    expect(separator).toHaveClass('h-full');
    expect(separator).toHaveClass('w-[1px]');
  });

  it('has proper base styles', () => {
    render(<Separator data-testid="base" />);
    const separator = screen.getByTestId('base');
    expect(separator).toHaveClass('shrink-0');
    expect(separator).toHaveClass('bg-border');
  });

  it('is decorative by default', () => {
    render(<Separator data-testid="decorative" />);
    const separator = screen.getByTestId('decorative');
    expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  });

  it('merges custom className', () => {
    render(<Separator className="my-4" data-testid="custom" />);
    const separator = screen.getByTestId('custom');
    expect(separator).toHaveClass('my-4');
    expect(separator).toHaveClass('bg-border'); // default styles preserved
  });
});
