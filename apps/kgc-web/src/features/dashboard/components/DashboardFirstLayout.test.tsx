import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardFirstLayout } from './DashboardFirstLayout';

describe('DashboardFirstLayout', () => {
  it('renders widgets prop', () => {
    const widgets = [
      <div key="1" data-testid="widget-1">Widget 1</div>,
      <div key="2" data-testid="widget-2">Widget 2</div>,
    ];
    render(<DashboardFirstLayout widgets={widgets} />);

    expect(screen.getByTestId('widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-2')).toBeInTheDocument();
  });

  it('renders empty state when no widgets provided', () => {
    render(<DashboardFirstLayout widgets={[]} />);
    const container = screen.getByTestId('dashboard-first-layout');
    expect(container).toBeInTheDocument();
  });

  it('has responsive grid layout', () => {
    const widgets = [<div key="1">Widget</div>];
    const { container } = render(<DashboardFirstLayout widgets={widgets} />);

    // Check for responsive grid classes
    const layout = container.querySelector('[class*="grid"]');
    expect(layout).toBeInTheDocument();
    expect(layout).toHaveClass('md:grid-cols-2');
    expect(layout).toHaveClass('lg:grid-cols-3');
  });

  it('applies custom className', () => {
    const { container } = render(
      <DashboardFirstLayout widgets={[]} className="custom-dashboard-class" />
    );
    expect(container.firstChild).toHaveClass('custom-dashboard-class');
  });

  it('has dashboard-first data attribute', () => {
    render(<DashboardFirstLayout widgets={[]} />);
    const layout = screen.getByTestId('dashboard-first-layout');
    expect(layout).toHaveAttribute('data-layout', 'dashboard-first');
  });

  it('renders widgets in order', () => {
    const widgets = [
      <div key="1" data-testid="first">First</div>,
      <div key="2" data-testid="second">Second</div>,
      <div key="3" data-testid="third">Third</div>,
    ];
    const { container } = render(<DashboardFirstLayout widgets={widgets} />);

    const allWidgets = container.querySelectorAll('[data-testid]');
    expect(allWidgets[0]).toHaveAttribute('data-testid', 'dashboard-first-layout');
    expect(allWidgets[1]).toHaveAttribute('data-testid', 'first');
    expect(allWidgets[2]).toHaveAttribute('data-testid', 'second');
  });

  it('supports multiple widgets in grid', () => {
    const widgets = Array.from({ length: 6 }, (_, i) => (
      <div key={i} data-testid={`widget-${i}`}>Widget {i}</div>
    ));
    render(<DashboardFirstLayout widgets={widgets} />);

    widgets.forEach((_, i) => {
      expect(screen.getByTestId(`widget-${i}`)).toBeInTheDocument();
    });
  });
});
