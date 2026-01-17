import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdatePrompt } from '../../../src/components/pwa/update-prompt';

describe('UpdatePrompt component', () => {
  describe('visibility', () => {
    it('should render when isVisible is true', () => {
      render(<UpdatePrompt isVisible={true} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should not render when isVisible is false', () => {
      const { container } = render(<UpdatePrompt isVisible={false} />);

      expect(container.firstChild).toBeNull();
    });

    it('should render by default (isVisible defaults to true)', () => {
      render(<UpdatePrompt />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('content', () => {
    it('should display default message', () => {
      render(<UpdatePrompt />);

      expect(screen.getByText('Új verzió elérhető')).toBeInTheDocument();
    });

    it('should display custom message', () => {
      render(<UpdatePrompt message="New version available!" />);

      expect(screen.getByText('New version available!')).toBeInTheDocument();
    });

    it('should display update button with default text', () => {
      render(<UpdatePrompt onUpdate={() => {}} />);

      expect(screen.getByText('Frissítés')).toBeInTheDocument();
    });

    it('should display update button with custom text', () => {
      render(<UpdatePrompt onUpdate={() => {}} updateButtonText="Update Now" />);

      expect(screen.getByText('Update Now')).toBeInTheDocument();
    });

    it('should display dismiss button with default text', () => {
      render(<UpdatePrompt onDismiss={() => {}} />);

      expect(screen.getByText('Később')).toBeInTheDocument();
    });

    it('should display dismiss button with custom text', () => {
      render(<UpdatePrompt onDismiss={() => {}} dismissButtonText="Later" />);

      expect(screen.getByText('Later')).toBeInTheDocument();
    });

    it('should display refresh icon', () => {
      render(<UpdatePrompt data-testid="prompt" />);

      const prompt = screen.getByTestId('prompt');
      expect(prompt.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onUpdate when update button is clicked', () => {
      const onUpdate = vi.fn();
      render(<UpdatePrompt onUpdate={onUpdate} />);

      fireEvent.click(screen.getByText('Frissítés'));

      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    it('should call onDismiss when dismiss button is clicked', () => {
      const onDismiss = vi.fn();
      render(<UpdatePrompt onDismiss={onDismiss} />);

      fireEvent.click(screen.getByText('Később'));

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('button visibility', () => {
    it('should not show update button when onUpdate is not provided', () => {
      render(<UpdatePrompt />);

      expect(screen.queryByText('Frissítés')).not.toBeInTheDocument();
    });

    it('should not show dismiss button when onDismiss is not provided', () => {
      render(<UpdatePrompt />);

      expect(screen.queryByText('Később')).not.toBeInTheDocument();
    });

    it('should show both buttons when both callbacks are provided', () => {
      render(<UpdatePrompt onUpdate={() => {}} onDismiss={() => {}} />);

      expect(screen.getByText('Frissítés')).toBeInTheDocument();
      expect(screen.getByText('Később')).toBeInTheDocument();
    });
  });

  describe('positioning', () => {
    it('should position at bottom by default', () => {
      render(<UpdatePrompt data-testid="prompt" />);

      expect(screen.getByTestId('prompt')).toHaveClass('bottom-4');
    });

    it('should position at top when specified', () => {
      render(<UpdatePrompt data-testid="prompt" position="top" />);

      expect(screen.getByTestId('prompt')).toHaveClass('top-4');
    });
  });

  describe('accessibility', () => {
    it('should have role="alert"', () => {
      render(<UpdatePrompt />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have aria-live="polite"', () => {
      render(<UpdatePrompt />);

      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<UpdatePrompt data-testid="prompt" className="custom-class" />);

      expect(screen.getByTestId('prompt')).toHaveClass('custom-class');
    });

    it('should have fixed positioning', () => {
      render(<UpdatePrompt data-testid="prompt" />);

      expect(screen.getByTestId('prompt')).toHaveClass('fixed');
    });
  });
});
