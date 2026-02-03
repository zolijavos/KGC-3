import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScannerFocusLayout } from './ScannerFocusLayout';

describe('ScannerFocusLayout', () => {
  it('renders widgets prop', () => {
    const widgets = [
      <div key="1" data-testid="widget-1">Widget 1</div>,
      <div key="2" data-testid="widget-2">Widget 2</div>,
    ];
    render(<ScannerFocusLayout widgets={widgets} />);

    expect(screen.getByTestId('widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-2')).toBeInTheDocument();
  });

  it('renders empty state when no widgets provided', () => {
    render(<ScannerFocusLayout widgets={[]} />);
    // Should render empty state or minimal UI
    const container = screen.getByTestId('scanner-focus-layout');
    expect(container).toBeInTheDocument();
  });

  it('has minimal single column layout', () => {
    const widgets = [<div key="1">Widget</div>];
    const { container } = render(<ScannerFocusLayout widgets={widgets} />);

    // Check for single column grid
    const layout = container.querySelector('[class*="grid-cols-1"]');
    expect(layout).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ScannerFocusLayout widgets={[]} className="custom-scanner-class" />
    );
    expect(container.firstChild).toHaveClass('custom-scanner-class');
  });

  it('has scanner-focus data attribute', () => {
    render(<ScannerFocusLayout widgets={[]} />);
    const layout = screen.getByTestId('scanner-focus-layout');
    expect(layout).toHaveAttribute('data-layout', 'scanner-focus');
  });

  it('renders widgets in order', () => {
    const widgets = [
      <div key="1" data-testid="first">First</div>,
      <div key="2" data-testid="second">Second</div>,
      <div key="3" data-testid="third">Third</div>,
    ];
    const { container } = render(<ScannerFocusLayout widgets={widgets} />);

    const allWidgets = container.querySelectorAll('[data-testid]');
    expect(allWidgets[0]).toHaveAttribute('data-testid', 'scanner-focus-layout');
    expect(allWidgets[1]).toHaveAttribute('data-testid', 'first');
    expect(allWidgets[2]).toHaveAttribute('data-testid', 'second');
  });
});
