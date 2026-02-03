import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CriticalAlertToast } from './CriticalAlertToast';

describe('CriticalAlertToast', () => {
  const mockOnAction = vi.fn();
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders toast with critical type (red)', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Készlethiány"
        message="MAKITA DHP484 készlet kritikus szinten"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Készlethiány')).toBeInTheDocument();
    expect(screen.getByText('MAKITA DHP484 készlet kritikus szinten')).toBeInTheDocument();
  });

  it('renders toast with warning type (yellow)', () => {
    render(
      <CriticalAlertToast
        type="warning"
        title="Figyelmeztetés"
        message="Partner zárása lejárt"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Figyelmeztetés')).toBeInTheDocument();
  });

  it('renders toast with info type (blue)', () => {
    render(
      <CriticalAlertToast
        type="info"
        title="Információ"
        message="Új munkalap létrehozva"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Információ')).toBeInTheDocument();
  });

  it('applies correct color scheme for critical type', () => {
    const { container } = render(
      <CriticalAlertToast
        type="critical"
        title="Kritikus"
        message="Test"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const toast = container.querySelector('[data-type="critical"]');
    expect(toast).toHaveClass(/border-red/);
  });

  it('applies correct color scheme for warning type', () => {
    const { container } = render(
      <CriticalAlertToast
        type="warning"
        title="Figyelmeztetés"
        message="Test"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const toast = container.querySelector('[data-type="warning"]');
    expect(toast).toHaveClass(/border-yellow/);
  });

  it('applies correct color scheme for info type', () => {
    const { container } = render(
      <CriticalAlertToast
        type="info"
        title="Info"
        message="Test"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const toast = container.querySelector('[data-type="info"]');
    expect(toast).toHaveClass(/border-blue/);
  });

  it('displays action button with custom text', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        actionText="Megtekintés"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByRole('button', { name: 'Megtekintés' })).toBeInTheDocument();
  });

  it('displays default action button text "Részletek"', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByRole('button', { name: 'Részletek' })).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Részletek' });
    fireEvent.click(actionButton);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when close button is clicked', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const closeButton = screen.getByRole('button', { name: /bezárás/i });
    fireEvent.click(closeButton);

    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after 10 seconds', async () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
        autoDismiss={true}
      />
    );

    expect(mockOnDismiss).not.toHaveBeenCalled();

    // Fast-forward 10 seconds
    vi.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('does not auto-dismiss when autoDismiss is false', async () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
        autoDismiss={false}
      />
    );

    vi.advanceTimersByTime(15000); // Wait longer than 10 seconds

    expect(mockOnDismiss).not.toHaveBeenCalled();
  });

  it('plays sound when soundEnabled is true', () => {
    const mockPlay = vi.fn();
    global.Audio = vi.fn().mockImplementation(() => ({
      play: mockPlay,
    })) as unknown as typeof Audio;

    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
        soundEnabled={true}
      />
    );

    expect(mockPlay).toHaveBeenCalled();
  });

  it('does not play sound when soundEnabled is false', () => {
    const mockPlay = vi.fn();
    global.Audio = vi.fn().mockImplementation(() => ({
      play: mockPlay,
    })) as unknown as typeof Audio;

    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
        soundEnabled={false}
      />
    );

    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('uses correct icon for critical type (AlertTriangle)', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const icon = screen.getByTestId('icon-critical');
    expect(icon).toBeInTheDocument();
  });

  it('uses correct icon for warning type (AlertCircle)', () => {
    render(
      <CriticalAlertToast
        type="warning"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const icon = screen.getByTestId('icon-warning');
    expect(icon).toBeInTheDocument();
  });

  it('uses correct icon for info type (Info)', () => {
    render(
      <CriticalAlertToast
        type="info"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const icon = screen.getByTestId('icon-info');
    expect(icon).toBeInTheDocument();
  });

  it('has proper ARIA labels for accessibility', () => {
    render(
      <CriticalAlertToast
        type="critical"
        title="Test"
        message="Test message"
        onAction={mockOnAction}
        onDismiss={mockOnDismiss}
      />
    );

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
  });
});
