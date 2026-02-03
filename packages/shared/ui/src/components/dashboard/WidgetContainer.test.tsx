import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetContainer } from './WidgetContainer';

describe('WidgetContainer', () => {
  it('renders children', () => {
    render(
      <WidgetContainer title="Test Widget">
        <div>Widget Content</div>
      </WidgetContainer>
    );
    expect(screen.getByText('Widget Content')).toBeInTheDocument();
  });

  it('renders title in card header', () => {
    render(
      <WidgetContainer title="Test Widget Title">
        <div>Content</div>
      </WidgetContainer>
    );
    expect(screen.getByText('Test Widget Title')).toBeInTheDocument();
  });

  it('renders refresh button when onRefresh provided', () => {
    const onRefresh = vi.fn();
    render(
      <WidgetContainer title="Test" onRefresh={onRefresh}>
        <div>Content</div>
      </WidgetContainer>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it('calls onRefresh when refresh button clicked', () => {
    const onRefresh = vi.fn();
    render(
      <WidgetContainer title="Test" onRefresh={onRefresh}>
        <div>Content</div>
      </WidgetContainer>
    );

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not render refresh button when onRefresh not provided', () => {
    render(
      <WidgetContainer title="Test">
        <div>Content</div>
      </WidgetContainer>
    );

    expect(screen.queryByRole('button', { name: /refresh/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <WidgetContainer title="Test" className="custom-class">
        <div>Content</div>
      </WidgetContainer>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
