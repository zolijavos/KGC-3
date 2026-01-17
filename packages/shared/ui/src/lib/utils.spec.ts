import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn() utility', () => {
  it('should merge multiple class strings', () => {
    expect(cn('px-4', 'py-2')).toBe('px-4 py-2');
  });

  it('should handle conditional classes with boolean', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should dedupe conflicting Tailwind classes (tailwind-merge)', () => {
    expect(cn('px-4', 'px-2')).toBe('px-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle undefined and null values', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it('should handle empty string', () => {
    expect(cn('base', '', 'active')).toBe('base active');
  });

  it('should handle array of classes', () => {
    expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
  });

  it('should handle object syntax for conditional classes', () => {
    expect(cn({ 'bg-primary': true, 'bg-secondary': false })).toBe('bg-primary');
  });

  it('should handle mixed inputs', () => {
    const isActive = true;
    const isDisabled = false;
    expect(
      cn(
        'base-class',
        isActive && 'active',
        isDisabled && 'disabled',
        { 'has-error': false },
        ['extra', 'classes']
      )
    ).toBe('base-class active extra classes');
  });

  it('should handle complex Tailwind class conflicts', () => {
    expect(cn('p-4', 'p-2', 'px-6')).toBe('p-2 px-6');
    expect(cn('bg-red-500 hover:bg-red-600', 'bg-blue-500')).toBe('hover:bg-red-600 bg-blue-500');
  });

  it('should return empty string for no valid inputs', () => {
    expect(cn(undefined, null, false, '')).toBe('');
  });
});
