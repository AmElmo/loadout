/**
 * Central tool configuration — single source of truth for all tool metadata.
 * Used by ToolLogo, ToolBadge, FilterBar, Home, sync dialogs, etc.
 */
import type React from "react";
import type { SourceTool } from "@/types";

export interface ToolConfig {
  label: string;
  color: string;        // Tailwind color name (e.g., "orange", "green")
  accentColor: string;  // Raw hex for inline styles (accent strips, bars)
  textClass: string;     // text-{color}-500 etc.
  badgeClass: string;    // bg-{color}/10 text-{color} border-{color}/20
  filterActiveClass: string;
  contextWindow: number; // Model context window size in tokens
}

export const TOOL_CONFIG: Record<SourceTool, ToolConfig> = {
  claude: {
    label: "Claude",
    color: "orange",
    accentColor: "#f97316",
    textClass: "text-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    filterActiveClass: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    contextWindow: 200_000,
  },
  codex: {
    label: "Codex",
    color: "green",
    accentColor: "#22c55e",
    textClass: "text-green-500",
    badgeClass: "bg-green-500/10 text-green-600 border-green-500/20",
    filterActiveClass: "bg-green-500/15 text-green-600 border-green-500/30",
    contextWindow: 200_000,
  },
  gemini: {
    label: "Gemini",
    color: "blue",
    accentColor: "#3b82f6",
    textClass: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    filterActiveClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    contextWindow: 1_000_000,
  },
  cursor: {
    label: "Cursor",
    color: "purple",
    accentColor: "#a855f7",
    textClass: "text-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    filterActiveClass: "bg-purple-500/15 text-purple-600 border-purple-500/30",
    contextWindow: 200_000,
  },
  copilot: {
    label: "Copilot",
    color: "sky",
    accentColor: "#0ea5e9",
    textClass: "text-sky-500",
    badgeClass: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    filterActiveClass: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    contextWindow: 200_000,
  },
  windsurf: {
    label: "Windsurf",
    color: "teal",
    accentColor: "#14b8a6",
    textClass: "text-teal-500",
    badgeClass: "bg-teal-500/10 text-teal-600 border-teal-500/20",
    filterActiveClass: "bg-teal-500/15 text-teal-600 border-teal-500/30",
    contextWindow: 200_000,
  },
  roo: {
    label: "Roo",
    color: "rose",
    accentColor: "#f43f5e",
    textClass: "text-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    filterActiveClass: "bg-rose-500/15 text-rose-600 border-rose-500/30",
    contextWindow: 200_000,
  },
  cline: {
    label: "Cline",
    color: "amber",
    accentColor: "#f59e0b",
    textClass: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    filterActiveClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    contextWindow: 200_000,
  },
  kilo: {
    label: "Kilo",
    color: "lime",
    accentColor: "#84cc16",
    textClass: "text-lime-500",
    badgeClass: "bg-lime-500/10 text-lime-600 border-lime-500/20",
    filterActiveClass: "bg-lime-500/15 text-lime-600 border-lime-500/30",
    contextWindow: 200_000,
  },
  opencode: {
    label: "OpenCode",
    color: "indigo",
    accentColor: "#6366f1",
    textClass: "text-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    filterActiveClass: "bg-indigo-500/15 text-indigo-600 border-indigo-500/30",
    contextWindow: 200_000,
  },
};

/** All tool IDs in display order */
export const ALL_TOOLS: SourceTool[] = Object.keys(TOOL_CONFIG) as SourceTool[];

/** Get label for a tool */
export function toolLabel(tool: SourceTool): string {
  return TOOL_CONFIG[tool]?.label ?? tool;
}

/** Get text color class for a tool */
export function toolTextColor(tool: SourceTool): string {
  return TOOL_CONFIG[tool]?.textClass ?? "text-muted-foreground";
}

/** Default context window used when no specific tool is selected */
export const DEFAULT_CONTEXT_WINDOW = 200_000;

/** Get context window size for a tool (or default when null) */
export function toolContextWindow(tool: SourceTool | null): number {
  if (!tool) return DEFAULT_CONTEXT_WINDOW;
  return TOOL_CONFIG[tool]?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
}

/** Get accent hex color for a single tool */
export function toolAccentColor(tool: SourceTool): string {
  return TOOL_CONFIG[tool]?.accentColor ?? "#3b82f6";
}

/** Build inline style for accent strip — gradient for multi-tool, solid for single */
export function toolsAccentStyle(tools: SourceTool[]): React.CSSProperties {
  if (tools.length === 0) return { background: "#3b82f6" };
  if (tools.length === 1) return { background: toolAccentColor(tools[0]) };
  const colors = tools.map((t) => toolAccentColor(t));
  return { background: `linear-gradient(to bottom, ${colors.join(", ")})` };
}
