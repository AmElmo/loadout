import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** User-level config directory names that aren't real project workspaces */
const USER_CONFIG_DIRS = new Set([".claude", ".codex", ".gemini"]);

/**
 * Filter out user-level config directories from discovered workspaces.
 * Directories like ~/.claude, ~/.codex, ~/.gemini contain AI tool configs
 * but aren't real project workspaces.
 */
export function isRealWorkspace(ws: { name: string }): boolean {
  return !USER_CONFIG_DIRS.has(ws.name);
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
