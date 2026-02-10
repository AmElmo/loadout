import { Filter, Server } from "lucide-react";
import type { MCPItem } from "@/types";
import { MCPCard } from "./MCPCard";

interface MCPListProps {
  mcps: MCPItem[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function MCPList({ mcps, hasActiveFilters, onClearFilters }: MCPListProps) {
  if (mcps.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Filter className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-medium">No Matching MCPs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No MCP servers match the current filters.
          </p>
          {onClearFilters && (
            <button
              onClick={onClearFilters}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Server className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium">No MCP Servers Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No MCP servers are configured in Claude Code, Codex CLI, or Gemini
          CLI.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Add MCPs to:
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">~/.claude.json</code> for
            Claude Code
          </li>
          <li>
            <code className="rounded bg-muted px-1">~/.codex/config.toml</code>{" "}
            for Codex CLI
          </li>
          <li>
            <code className="rounded bg-muted px-1">
              ~/.gemini/settings.json
            </code>{" "}
            for Gemini CLI
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {mcps.map((mcp) => (
        <MCPCard key={mcp.id} mcp={mcp} />
      ))}
    </div>
  );
}
