import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** User-level config directory names that aren't real project workspaces */
const USER_CONFIG_DIRS = new Set([".claude", ".codex", ".gemini"]);

/**
 * Match paths inside hidden dot-directory extension folders.
 * Catches ~/.vscode/extensions/*, ~/.cursor/extensions/*, ~/.antigravity/extensions/*, etc.
 */
const DOT_DIR_EXTENSIONS_RE = /\/\.[^/]+\/extensions\//;

/**
 * Filter out user-level config directories and editor extension directories
 * from discovered workspaces. Directories like ~/.claude, ~/.codex, ~/.gemini
 * contain AI tool configs but aren't real project workspaces. Similarly,
 * VS Code/Cursor extension directories contain config files but aren't projects.
 */
export function isRealWorkspace(ws: { name: string; path?: string }): boolean {
  if (USER_CONFIG_DIRS.has(ws.name)) return false;
  if (ws.path && DOT_DIR_EXTENSIONS_RE.test(ws.path)) return false;
  return true;
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
