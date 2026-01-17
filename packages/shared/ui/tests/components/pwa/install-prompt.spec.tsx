import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../../../src/components/pwa/install-prompt';

// Mock useInstallPrompt hook
vi.mock('../../../src/hooks/use-install-prompt', () => ({
  useInstallPrompt: vi.fn(() => ({
    canInstall: true,
    isInstalled: false,
    isPromptShowing: false,
    promptInstall: vi.fn().mockResolvedValue('accepted'),
    platforms: ['web'],
  })),
}));

import { useInstallPrompt } from '../../../src/hooks/use-install-prompt';

describe('InstallPrompt component', () => {
  beforeEach(() => {
    vi.mocked(useInstallPrompt).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      isPromptShowing: false,
      promptInstall: vi.fn().mockResolvedValue('accepted'),
      platforms: ['web'],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render when canInstall is true and not installed', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when isInstalled is true', () => {
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: true,
        isInstalled: true,
        isPromptShowing: false,
        promptInstall: vi.fn(),
        platforms: [],
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });

    it('should not render when canInstall is false', () => {
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: false,
        isInstalled: false,
        isPromptShowing: false,
        promptInstall: vi.fn(),
        platforms: [],
      });

      const { container } = render(<InstallPrompt />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('content', () => {
    it('should display default title', () => {
      render(<InstallPrompt />);

      expect(screen.getByText('Alkalmazás telepítése')).toBeInTheDocument();
    });

    it('should display custom title', () => {
      render(<InstallPrompt title="Install App" />);

      expect(screen.getByText('Install App')).toBeInTheDocument();
    });

    it('should display default description', () => {
      render(<InstallPrompt />);

      expect(
        screen.getByText('Telepítse az alkalmazást a kezdőképernyőre a gyorsabb elérésért!')
      ).toBeInTheDocument();
    });

    it('should display custom description', () => {
      render(<InstallPrompt description="Install for faster access" />);

      expect(screen.getByText('Install for faster access')).toBeInTheDocument();
    });

    it('should display default install button text', () => {
      render(<InstallPrompt />);

      expect(screen.getByText('Telepítés')).toBeInTheDocument();
    });

    it('should display custom install button text', () => {
      render(<InstallPrompt installButtonText="Install Now" />);

      expect(screen.getByText('Install Now')).toBeInTheDocument();
    });

    it('should display download icon', () => {
      render(<InstallPrompt data-testid="prompt" />);

      const prompt = screen.getByTestId('prompt');
      expect(prompt.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('close button', () => {
    it('should show close button by default', () => {
      render(<InstallPrompt />);

      expect(screen.getByLabelText('Bezárás')).toBeInTheDocument();
    });

    it('should hide close button when showCloseButton is false', () => {
      render(<InstallPrompt showCloseButton={false} />);

      expect(screen.queryByLabelText('Bezárás')).not.toBeInTheDocument();
    });

    it('should hide prompt when close button is clicked', () => {
      render(<InstallPrompt />);

      fireEvent.click(screen.getByLabelText('Bezárás'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<InstallPrompt onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Bezárás'));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('install action', () => {
    it('should call promptInstall when install button is clicked', async () => {
      const mockPromptInstall = vi.fn().mockResolvedValue('accepted');
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isPromptShowing: false,
        promptInstall: mockPromptInstall,
        platforms: ['web'],
      });

      render(<InstallPrompt />);

      fireEvent.click(screen.getByText('Telepítés'));

      await waitFor(() => {
        expect(mockPromptInstall).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onInstallSuccess when install is accepted', async () => {
      const onInstallSuccess = vi.fn();
      const mockPromptInstall = vi.fn().mockResolvedValue('accepted');
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isPromptShowing: false,
        promptInstall: mockPromptInstall,
        platforms: ['web'],
      });

      render(<InstallPrompt onInstallSuccess={onInstallSuccess} />);

      fireEvent.click(screen.getByText('Telepítés'));

      await waitFor(() => {
        expect(onInstallSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onInstallDismissed when install is dismissed', async () => {
      const onInstallDismissed = vi.fn();
      const mockPromptInstall = vi.fn().mockResolvedValue('dismissed');
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isPromptShowing: false,
        promptInstall: mockPromptInstall,
        platforms: ['web'],
      });

      render(<InstallPrompt onInstallDismissed={onInstallDismissed} />);

      fireEvent.click(screen.getByText('Telepítés'));

      await waitFor(() => {
        expect(onInstallDismissed).toHaveBeenCalledTimes(1);
      });
    });

    it('should disable install button when prompt is showing', () => {
      vi.mocked(useInstallPrompt).mockReturnValue({
        canInstall: true,
        isInstalled: false,
        isPromptShowing: true,
        promptInstall: vi.fn(),
        platforms: ['web'],
      });

      render(<InstallPrompt />);

      expect(screen.getByText('Telepítés')).toBeDisabled();
    });
  });

  describe('positioning', () => {
    it('should position at bottom by default', () => {
      render(<InstallPrompt data-testid="prompt" />);

      expect(screen.getByTestId('prompt')).toHaveClass('bottom-4');
    });

    it('should position at top when specified', () => {
      render(<InstallPrompt data-testid="prompt" position="top" />);

      expect(screen.getByTestId('prompt')).toHaveClass('top-4');
    });
  });

  describe('accessibility', () => {
    it('should have role="dialog"', () => {
      render(<InstallPrompt />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-labelledby pointing to title', () => {
      render(<InstallPrompt />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'install-prompt-title');
    });

    it('should have aria-describedby pointing to description', () => {
      render(<InstallPrompt />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'install-prompt-description');
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(<InstallPrompt data-testid="prompt" className="custom-class" />);

      expect(screen.getByTestId('prompt')).toHaveClass('custom-class');
    });

    it('should have fixed positioning', () => {
      render(<InstallPrompt data-testid="prompt" />);

      expect(screen.getByTestId('prompt')).toHaveClass('fixed');
    });
  });
});
