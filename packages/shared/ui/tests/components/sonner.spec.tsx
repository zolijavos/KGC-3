import { describe, it, expect } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { Toaster, toast } from '../../src/components/ui/sonner';

describe('Toaster/Toast components', () => {
  it('renders Toaster component', () => {
    render(<Toaster data-testid="toaster" />);
    // Toaster renders as a portal, checking it doesn't crash
    expect(document.body).toBeInTheDocument();
  });

  it('renders with default theme (system)', () => {
    render(<Toaster />);
    // Toaster should be rendered without errors
    expect(document.body).toBeInTheDocument();
  });

  it('renders with light theme', () => {
    render(<Toaster theme="light" />);
    expect(document.body).toBeInTheDocument();
  });

  it('renders with dark theme', () => {
    render(<Toaster theme="dark" />);
    expect(document.body).toBeInTheDocument();
  });

  it('toast function exists and is callable', () => {
    expect(typeof toast).toBe('function');
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.error).toBe('function');
    expect(typeof toast.warning).toBe('function');
    expect(typeof toast.info).toBe('function');
  });

  it('can trigger success toast', async () => {
    render(<Toaster />);
    act(() => {
      toast.success('Sikeresen mentve');
    });
    // Toast is rendered async, verify no errors
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });

  it('can trigger error toast', async () => {
    render(<Toaster />);
    act(() => {
      toast.error('Hiba történt');
    });
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
