import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../../src/components/ui/skeleton';

describe('Skeleton component', () => {
  it('renders with default styles', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');
    expect(skeleton).toHaveClass('animate-pulse');
    expect(skeleton).toHaveClass('rounded-md');
    expect(skeleton).toHaveClass('bg-primary/10');
  });

  it('merges custom className', () => {
    render(<Skeleton className="w-full h-12" data-testid="custom" />);
    const skeleton = screen.getByTestId('custom');
    expect(skeleton).toHaveClass('w-full');
    expect(skeleton).toHaveClass('h-12');
    expect(skeleton).toHaveClass('animate-pulse'); // default styles preserved
  });

  it('passes through additional props', () => {
    render(<Skeleton data-testid="props" aria-label="Loading" />);
    const skeleton = screen.getByTestId('props');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading');
  });
});
