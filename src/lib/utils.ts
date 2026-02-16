import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a token count for display.
 * e.g., 340 → "~340", 2100 → "~2.1K", 15000 → "~15K"
 */
export function formatTokens(n: number): string {
  if (n < 1000) return `~${n}`;
  if (n < 10000) return `~${(n / 1000).toFixed(1)}K`;
  return `~${Math.round(n / 1000)}K`;
}
