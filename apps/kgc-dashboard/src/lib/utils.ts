import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('hu-HU');
}

export function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'DONE':
      return 'text-success-500';
    case 'IN_PROGRESS':
      return 'text-primary-500';
    default:
      return 'text-gray-500';
  }
}

export function getStatusIcon(status: string): string {
  switch (status) {
    case 'DONE':
      return '✅';
    case 'IN_PROGRESS':
      return '🔄';
    default:
      return '📋';
  }
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'severity-critical';
    case 'major':
      return 'severity-major';
    case 'minor':
      return 'severity-minor';
    case 'suggestion':
      return 'severity-suggestion';
    default:
      return '';
  }
}

export function getSeverityIcon(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'major':
      return '🟠';
    case 'minor':
      return '🟡';
    case 'suggestion':
      return '🔵';
    default:
      return '';
  }
}
