import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WidgetSkeleton } from './WidgetSkeleton';

describe('WidgetSkeleton', () => {
  it('renders skeleton with small size', () => {
    const { container } = render(<WidgetSkeleton size="small" />);
    expect(container.firstChild).toHaveClass('widget-skeleton-small');
  });

  it('renders skeleton with medium size', () => {
    const { container } = render(<WidgetSkeleton size="medium" />);
    expect(container.firstChild).toHaveClass('widget-skeleton-medium');
  });

  it('renders skeleton with large size', () => {
    const { container } = render(<WidgetSkeleton size="large" />);
    expect(container.firstChild).toHaveClass('widget-skeleton-large');
  });

  it('renders skeleton with xlarge size', () => {
    const { container } = render(<WidgetSkeleton size="xlarge" />);
    expect(container.firstChild).toHaveClass('widget-skeleton-xlarge');
  });

  it('applies custom className', () => {
    const { container } = render(<WidgetSkeleton size="small" className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has shimmer animation class', () => {
    const { container } = render(<WidgetSkeleton size="medium" />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});
