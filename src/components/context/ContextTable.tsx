import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/utils";
import type { PromptFile, SkillItem, MCPItem, MCPToolsResult, SourceTool } from "@/types";

interface ContextTableProps {
  prompts: PromptFile[];
  skills: SkillItem[];
  mcps: MCPItem[];
  mcpTools: Map<string, MCPToolsResult>;
  activeTool: SourceTool | null;
}

interface ContextRow {
  name: string;
  type: "rule" | "skill" | "mcp";
  sourceTool: SourceTool;
  scope: string;
  idleTokens: number;
  activeTokens: number | null;
  isConditional: boolean;
  isShadowed: boolean;
}

type SortField = "name" | "type" | "idleTokens" | "activeTokens";
type SortDir = "asc" | "desc";

/** Normalize scope labels: "global" → "user" for consistent display */
function normalizeScope(scope: string): string {
  if (scope === "global") return "user";
  return scope;
}

export function ContextTable({ prompts, skills, mcps, mcpTools, activeTool }: ContextTableProps) {
  const [sortField, setSortField] = useState<SortField>("idleTokens");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = useMemo(() => {
    const result: ContextRow[] = [];

    // Rules
    for (const p of prompts) {
      if (!p.exists) continue;
      if (activeTool && p.sourceTool !== activeTool) continue;
      result.push({
        name: p.name,
        type: "rule",
        sourceTool: p.sourceTool,
        scope: normalizeScope(p.scope),
        idleTokens: p.tokens,
        activeTokens: null,
        isConditional: p.isScoped,
        isShadowed: false,
      });
    }

    // Skills
    for (const s of skills) {
      if (activeTool && s.sourceTool !== activeTool) continue;
      result.push({
        name: s.name,
        type: "skill",
        sourceTool: s.sourceTool,
        scope: normalizeScope(s.scope),
        idleTokens: s.idleTokens,
        activeTokens: s.activeTokens,
        isConditional: false,
        isShadowed: s.isShadowed,
      });
    }

    // MCPs (from fetched tool definitions)
    for (const mcp of mcps) {
      if (activeTool && !mcp.configuredIn.includes(activeTool)) continue;
      const tools = mcpTools.get(mcp.name);
      if (!tools) continue;
      result.push({
        name: mcp.name,
        type: "mcp",
        sourceTool: mcp.configuredIn[0],
        scope: normalizeScope(mcp.scope),
        idleTokens: tools.idleTokens,
        activeTokens: null,
        isConditional: false,
        isShadowed: false,
      });
    }

    return result;
  }, [prompts, skills, mcps, mcpTools, activeTool]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "idleTokens":
          cmp = a.idleTokens - b.idleTokens;
          break;
        case "activeTokens":
          cmp = (a.activeTokens ?? 0) - (b.activeTokens ?? 0);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? (
      <ChevronDown className="h-3 w-3" />
    ) : (
      <ChevronUp className="h-3 w-3" />
    );
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "rule":
        return "Rule";
      case "skill":
        return "Skill";
      case "mcp":
        return "MCP";
      default:
        return type;
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "rule":
        return "text-amber-500";
      case "skill":
        return "text-purple-500";
      case "mcp":
        return "text-cyan-500";
      default:
        return "text-muted-foreground";
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No items found for the selected tool.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left">
              <button
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("name")}
              >
                Name <SortIcon field="name" />
              </button>
            </th>
            <th className="px-4 py-2 text-left">
              <button
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
                onClick={() => handleSort("type")}
              >
                Type <SortIcon field="type" />
              </button>
            </th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              Scope
            </th>
            <th className="px-4 py-2 text-right">
              <button
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => handleSort("idleTokens")}
              >
                Idle Tokens <SortIcon field="idleTokens" />
              </button>
            </th>
            <th className="px-4 py-2 text-right">
              <button
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground ml-auto"
                onClick={() => handleSort("activeTokens")}
              >
                Active Tokens <SortIcon field="activeTokens" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row, i) => (
            <tr
              key={`${row.type}-${row.name}-${i}`}
              className={cn(
                "border-b border-border last:border-b-0",
                row.isShadowed && "opacity-50"
              )}
            >
              <td className="px-4 py-2 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  {row.name}
                  {row.isConditional && (
                    <span title="Conditionally loaded">
                      <Crosshair className="h-3 w-3 text-teal-500" />
                    </span>
                  )}
                  {row.isShadowed && (
                    <span className="text-[10px] text-muted-foreground">(shadowed)</span>
                  )}
                </div>
              </td>
              <td className={cn("px-4 py-2 text-xs font-medium", typeColor(row.type))}>
                {typeLabel(row.type)}
              </td>
              <td className="px-4 py-2 text-xs text-muted-foreground">
                {row.scope}
              </td>
              <td className="px-4 py-2 text-right text-xs tabular-nums">
                {formatTokens(row.idleTokens)}
              </td>
              <td className="px-4 py-2 text-right text-xs tabular-nums text-muted-foreground">
                {row.activeTokens !== null ? formatTokens(row.activeTokens) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
