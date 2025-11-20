import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    const millions = num / 1000000;
    // Remove trailing zeros and decimal point if not needed
    return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
  }
  if (num >= 1000) {
    const thousands = num / 1000;
    // Remove trailing zeros and decimal point if not needed
    return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
  }
  return num.toLocaleString(); // Add comma separators for numbers under 1000
}

export function getResourceColor(resourceType: 'gold' | 'elixir'): string {
  return resourceType === 'gold' ? 'text-gold' : 'text-elixir';
}
