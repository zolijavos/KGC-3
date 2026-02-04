import { TooltipProvider } from '@kgc/ui';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import WarrantyRatioPlaceholder from '../WarrantyRatioPlaceholder';

/**
 * WarrantyRatioPlaceholder Tests (Story 35-5)
 *
 * Component tests for warranty ratio placeholder widget
 * Priority: P2 (Medium - placeholder widget)
 */
describe('WarrantyRatioPlaceholder', () => {
  const renderWidget = () => {
    return render(
      <TooltipProvider>
        <WarrantyRatioPlaceholder />
      </TooltipProvider>
    );
  };

  describe('Display', () => {
    it('[P1] should render widget title "Garanciális arány"', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      renderWidget();

      // THEN: Title is displayed
      expect(screen.getByText('Garanciális arány')).toBeInTheDocument();
    });

    it('[P1] should render "Hamarosan..." text', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      renderWidget();

      // THEN: Coming soon text is displayed
      expect(screen.getByText('Hamarosan...')).toBeInTheDocument();
    });

    it('[P1] should render Epic 38 reference text', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      renderWidget();

      // THEN: Epic reference is displayed
      expect(screen.getByText(/Epic 38/)).toBeInTheDocument();
    });

    it('[P2] should have opacity-75 class for placeholder styling', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      const { container } = renderWidget();

      // THEN: Placeholder has reduced opacity
      const card = container.querySelector('.warranty-ratio-placeholder');
      expect(card).toHaveClass('opacity-75');
    });
  });

  describe('Tooltip', () => {
    it('[P1] should have info icon for tooltip', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      renderWidget();

      // THEN: Info icon is present (cursor-help indicates tooltip trigger)
      const infoIcon = document.querySelector('.cursor-help');
      expect(infoIcon).toBeInTheDocument();
    });

    it('[P1] should have tooltip with AC text', async () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget and triggering tooltip
      renderWidget();
      const infoIcon = document.querySelector('.cursor-help');
      if (infoIcon) {
        fireEvent.focus(infoIcon);
      }

      // THEN: Tooltip content exists in DOM (rendered via Portal)
      await waitFor(
        () => {
          const elements = screen.getAllByText(/Garanciális vs fizetős arány/);
          expect(elements.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Icons', () => {
    it('[P2] should render Shield icon in header', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      const { container } = renderWidget();

      // THEN: Shield icon is present (lucide-react renders SVG)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThan(0);
    });

    it('[P2] should render Clock icon in content', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      const { container } = renderWidget();

      // THEN: Multiple SVG icons are present (Shield, Clock, Info)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Structure', () => {
    it('[P2] should have Card component structure', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      const { container } = renderWidget();

      // THEN: Card structure is present
      const card = container.querySelector('[class*="card"]');
      expect(card).toBeInTheDocument();
    });

    it('[P2] should have centered content layout', () => {
      // GIVEN: Widget is rendered

      // WHEN: Rendering the widget
      const { container } = renderWidget();

      // THEN: Content is centered (flex, items-center, justify-center classes)
      const centeredContent = container.querySelector('.flex.flex-col.items-center.justify-center');
      expect(centeredContent).toBeInTheDocument();
    });
  });
});
