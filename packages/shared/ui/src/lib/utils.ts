import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-primary', className)
 * cn('text-red-500', 'text-blue-500') // => 'text-blue-500'
 * cn({ 'bg-primary': true, 'bg-secondary': false })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
