import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetError } from './WidgetError';

describe('WidgetError', () => {
  it('renders error message', () => {
    const error = new Error('Test error message');
    render(<WidgetError error={error} onRetry={() => {}} />);
    expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
  });

  it('renders retry button', () => {
    render(<WidgetError error={new Error('Test')} onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /retry|újra/i })).toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', () => {
    const onRetry = vi.fn();
    render(<WidgetError error={new Error('Test')} onRetry={onRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry|újra/i });
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders with default error message if error is undefined', () => {
    render(<WidgetError error={undefined} onRetry={() => {}} />);
    expect(screen.getByText(/hiba történt/i)).toBeInTheDocument();
  });
});
