import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StockDetailsModal } from './StockDetailsModal';

// Mock stock alert data
const mockCriticalAlert = {
  id: 'machine-001',
  model: 'Makita DHP485',
  type: 'Fúrócsavarbelyegzőgép',
  serialNumber: 'MAK-2024-001',
  currentStock: 8,
  minimumThreshold: 15,
  severity: 'critical' as const,
  lastPurchase: '2026-01-15',
  lastPurchaseQuantity: 20,
  averageMonthlyUsage: 5,
};

const mockWarningAlert = {
  id: 'machine-002',
  model: 'DeWalt DCD795',
  type: 'Csavarbelyegzőgép',
  serialNumber: 'DEW-2024-002',
  currentStock: 22,
  minimumThreshold: 30,
  severity: 'warning' as const,
  lastPurchase: '2026-01-20',
  lastPurchaseQuantity: 30,
  averageMonthlyUsage: 8,
};

describe('StockDetailsModal', () => {
  it('should render when open is true', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Dialog should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Makita DHP485')).toBeInTheDocument();
  });

  it('should not render when open is false', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={false}
        onOpenChange={onOpenChange}
      />
    );

    // Dialog should not be visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should display critical alert information', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText('Makita DHP485')).toBeInTheDocument();
    expect(screen.getByText('Fúrócsavarbelyegzőgép')).toBeInTheDocument();
    expect(screen.getByText('MAK-2024-001')).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument(); // Current stock
    expect(screen.getByText(/15/)).toBeInTheDocument(); // Minimum threshold
  });

  it('should display warning alert information', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockWarningAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText('DeWalt DCD795')).toBeInTheDocument();
    expect(screen.getByText('Csavarbelyegzőgép')).toBeInTheDocument();
    expect(screen.getByText(/22/)).toBeInTheDocument(); // Current stock
    expect(screen.getByText(/30/)).toBeInTheDocument(); // Minimum threshold
  });

  it('should display purchasing recommendation for critical alert', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Recommendation text should exist
    expect(screen.getByText(/Javasolt beszerzés/i)).toBeInTheDocument();
    // Should show how many pieces to order (15 - 8 = 7)
    expect(screen.getByText(/7/)).toBeInTheDocument();
  });

  it('should display last purchase information', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/2026-01-15/i)).toBeInTheDocument();
    expect(screen.getByText(/20/)).toBeInTheDocument(); // Last purchase quantity
  });

  it('should call onOpenChange when close button is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Find and click close button
    const closeButton = screen.getByRole('button', { name: /bezár|close/i });
    fireEvent.click(closeButton);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should display average monthly usage', () => {
    const onOpenChange = vi.fn();
    render(
      <StockDetailsModal
        stockAlert={mockCriticalAlert}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    expect(screen.getByText(/5/)).toBeInTheDocument(); // Average monthly usage
    expect(screen.getByText(/átlagos felhasználás/i)).toBeInTheDocument();
  });
});
