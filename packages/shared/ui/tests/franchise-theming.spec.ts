import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Franchise theming (data-tenant)', () => {
  beforeEach(() => {
    // Reset document state
    document.documentElement.removeAttribute('data-tenant');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-tenant');
    document.documentElement.classList.remove('dark');
  });

  describe('tenant attribute handling', () => {
    it('should allow setting data-tenant attribute on html element', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-a');

      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-a');
    });

    it('should allow changing tenant at runtime', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-a');
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-a');

      document.documentElement.setAttribute('data-tenant', 'franchise-b');
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-b');
    });

    it('should allow removing tenant attribute', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-a');
      expect(document.documentElement.hasAttribute('data-tenant')).toBe(true);

      document.documentElement.removeAttribute('data-tenant');
      expect(document.documentElement.hasAttribute('data-tenant')).toBe(false);
    });
  });

  describe('CSS selector matching', () => {
    it('should match [data-tenant="franchise-a"] selector', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-a');

      const matches = document.documentElement.matches('[data-tenant="franchise-a"]');
      expect(matches).toBe(true);
    });

    it('should match [data-tenant="franchise-b"] selector', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-b');

      const matches = document.documentElement.matches('[data-tenant="franchise-b"]');
      expect(matches).toBe(true);
    });

    it('should match [data-tenant="franchise-c"] selector', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-c');

      const matches = document.documentElement.matches('[data-tenant="franchise-c"]');
      expect(matches).toBe(true);
    });

    it('should not match other tenant selectors', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-a');

      expect(document.documentElement.matches('[data-tenant="franchise-a"]')).toBe(true);
      expect(document.documentElement.matches('[data-tenant="franchise-b"]')).toBe(false);
      expect(document.documentElement.matches('[data-tenant="franchise-c"]')).toBe(false);
    });
  });

  describe('dark mode + tenant combination', () => {
    it('should support both dark class and tenant attribute simultaneously', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-tenant', 'franchise-a');

      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-a');
    });

    it('should match combined .dark[data-tenant] selector', () => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-tenant', 'franchise-a');

      const matches = document.documentElement.matches('.dark[data-tenant="franchise-a"]');
      expect(matches).toBe(true);
    });

    it('should allow toggling dark mode while keeping tenant', () => {
      document.documentElement.setAttribute('data-tenant', 'franchise-b');

      // Light mode
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-b');

      // Switch to dark mode
      document.documentElement.classList.add('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-b');

      // Switch back to light mode
      document.documentElement.classList.remove('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-b');
    });
  });

  describe('tenant initialization helper (usage pattern)', () => {
    it('should demonstrate correct tenant initialization pattern', () => {
      // This test documents the correct usage pattern for consumers

      // Pattern: Initialize tenant from backend response
      const initializeTenant = (tenantId: string | null) => {
        if (tenantId) {
          document.documentElement.setAttribute('data-tenant', tenantId);
        } else {
          document.documentElement.removeAttribute('data-tenant');
        }
      };

      // Set tenant
      initializeTenant('franchise-a');
      expect(document.documentElement.getAttribute('data-tenant')).toBe('franchise-a');

      // Clear tenant (logout)
      initializeTenant(null);
      expect(document.documentElement.hasAttribute('data-tenant')).toBe(false);
    });
  });
});
