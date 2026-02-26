import { useMemo, useState } from "react";
import {
  Unplug,
  Hammer,
  FileText,
  Anchor,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  FolderOpen,
  GitBranch,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn, isRealWorkspace } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { scanMCPs } from "@/lib/api/mcps";
import { scanSkills } from "@/lib/api/skills";
import { scanRules, scanHooks } from "@/lib/api/config";
import { discoverWorkspaces } from "@/lib/api/workspace";
import type {
  SourceTool,
  MCPItem,
  SkillItem,
  PromptFile,
  HookItem,
  DiscoveredWorkspace,
} from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { ALL_TOOLS, toolLabel, toolTextColor } from "@/config/tools";

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  count: number;
  isLoading: boolean;
  toolBreakdown: { tool: SourceTool; count: number }[];
  onClick: () => void;
}

function StatCard({
  icon: Icon,
  label,
  count,
  isLoading,
  toolBreakdown,
  onClick,
}: StatCardProps) {
  const nonZeroTools = toolBreakdown.filter((t) => t.count > 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col rounded-lg border border-border bg-card p-5 text-left transition-all",
        "hover:border-primary/30 hover:ring-1 hover:ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4.5 w-4.5 text-muted-foreground" />
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="mt-4">
        {isLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <span className="text-3xl font-semibold tracking-tight">
            {count}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">{label}</p>

      {!isLoading && nonZeroTools.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {nonZeroTools.map(({ tool, count: toolCount }) => (
            <span
              key={tool}
              className={cn("flex items-center gap-1 text-xs", toolTextColor(tool))}
            >
              <ToolLogo tool={tool} size={10} />
              <span className="text-muted-foreground">{toolCount}</span>
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Tool Coverage Row
// ---------------------------------------------------------------------------

interface ToolRowProps {
  tool: SourceTool;
  mcpCount: number;
  skillCount: number;
  ruleCount: number;
  hookCount: number;
}

function ToolRow({
  tool,
  mcpCount,
  skillCount,
  ruleCount,
  hookCount,
}: ToolRowProps) {
  const total = mcpCount + skillCount + ruleCount + hookCount;
  if (total === 0) return null;

  const segments = [
    { label: "MCP", count: mcpCount },
    { label: "skill", count: skillCount },
    { label: "rule", count: ruleCount },
    { label: "hook", count: hookCount },
  ].filter((s) => s.count > 0);

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50">
      <span className={cn("shrink-0", toolTextColor(tool))}>
        <ToolLogo tool={tool} size={14} />
      </span>
      <span className={cn("w-16 text-sm font-medium", toolTextColor(tool))}>
        {toolLabel(tool)}
      </span>
      <span className="text-sm text-muted-foreground">
        {segments
          .map((s) => `${s.count} ${s.label}${s.count !== 1 ? "s" : ""}`)
          .join(" \u00b7 ")}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspace Signal Helpers
// ---------------------------------------------------------------------------

function wsHasMCPs(ws: DiscoveredWorkspace): boolean {
  // Only specific MCP signals — not coarse has*Config flags
  return ws.signals.hasMcpJson || ws.signals.hasCursorMcps;
}

function wsHasSkills(ws: DiscoveredWorkspace): boolean {
  return ws.signals.hasClaudeSkills || ws.signals.hasCodexSkills || ws.signals.hasGeminiSkills;
}

function wsHasRules(ws: DiscoveredWorkspace): boolean {
  const s = ws.signals;
  return (
    s.hasClaudePrompt ||
    s.hasCodexPrompt ||
    s.hasGeminiPrompt ||
    s.hasCursorRules ||
    s.hasCopilotRules ||
    s.hasWindsurfRules ||
    s.hasRooRules ||
    s.hasClineRules ||
    s.hasKiloRules ||
    s.hasOpenCodeRules
  );
}

function countWorkspacesWithMCPs(workspaces: DiscoveredWorkspace[]): number {
  return workspaces.filter(wsHasMCPs).length;
}

function countWorkspacesWithSkills(workspaces: DiscoveredWorkspace[]): number {
  return workspaces.filter(wsHasSkills).length;
}

function countWorkspacesWithRules(workspaces: DiscoveredWorkspace[]): number {
  return workspaces.filter(wsHasRules).length;
}

/** Which tools are present in a workspace (for logo dots) */
function wsToolDots(ws: DiscoveredWorkspace): SourceTool[] {
  const s = ws.signals;
  const result: SourceTool[] = [];
  if (s.hasClaudeConfig || s.hasClaudePrompt || s.hasClaudeSkills) result.push("claude");
  if (s.hasCodexConfig || s.hasCodexPrompt || s.hasCodexSkills) result.push("codex");
  if (s.hasGeminiConfig || s.hasGeminiPrompt || s.hasGeminiSkills) result.push("gemini");
  if (s.hasCursorConfig) result.push("cursor");
  if (s.hasCopilotConfig) result.push("copilot");
  if (s.hasWindsurfConfig) result.push("windsurf");
  if (s.hasRooConfig) result.push("roo");
  if (s.hasClineConfig) result.push("cline");
  if (s.hasKiloConfig) result.push("kilo");
  if (s.hasOpenCodeConfig) result.push("opencode");
  return result;
}

/** Workspace has at least one meaningful project-level config (not just a .claude/ session dir) */
function wsHasAnyConfig(ws: DiscoveredWorkspace): boolean {
  return wsHasMCPs(ws) || wsHasSkills(ws) || wsHasRules(ws);
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function computeToolBreakdown(
  mcps: MCPItem[],
  skills: SkillItem[],
  rules: PromptFile[],
  hooks: HookItem[],
  tool: SourceTool
) {
  return {
    mcpCount: mcps.filter((m) => m.configuredIn.includes(tool)).length,
    skillCount: skills.filter((s) => s.sourceTool === tool).length,
    ruleCount: rules.filter((r) => r.sourceTool === tool).length,
    hookCount: hooks.filter((h) => h.sourceTool === tool).length,
  };
}

export function Home() {
  const { setActiveTab } = useWorkspaceStore();

  // Always scan user-level only (no workspace dependency)
  const {
    data: mcps,
    isLoading: mcpsLoading,
    error: mcpsError,
  } = useQuery({
    queryKey: ["mcps", null],
    queryFn: () => scanMCPs(undefined),
  });

  const {
    data: skillsResult,
    isLoading: skillsLoading,
    error: skillsError,
  } = useQuery({
    queryKey: ["skills", null],
    queryFn: () => scanSkills(undefined),
  });

  const {
    data: rulesResult,
    isLoading: rulesLoading,
    error: rulesError,
  } = useQuery({
    queryKey: ["rules", null],
    queryFn: () => scanRules(undefined),
  });

  const {
    data: hooksResult,
    isLoading: hooksLoading,
    error: hooksError,
  } = useQuery({
    queryKey: ["hooks", null],
    queryFn: () => scanHooks(undefined),
  });

  // Reuse the same discovery query as the sidebar (shared cache)
  const {
    data: discovery,
    isLoading: discoveryLoading,
  } = useQuery({
    queryKey: ["discover-workspaces"],
    queryFn: () => discoverWorkspaces(4),
    staleTime: 5 * 60 * 1000,
  });

  const mcpsList = mcps ?? [];
  const skills = skillsResult?.skills ?? [];
  const rules = (rulesResult?.prompts ?? []).filter((r) => r.exists);
  const hooks = hooksResult?.hooks ?? [];
  const workspaces = (discovery?.workspaces ?? []).filter(isRealWorkspace);

  const error = mcpsError || skillsError || rulesError || hooksError;

  // Tool breakdown for stat cards
  const mcpToolBreakdown = useMemo(
    () =>
      ALL_TOOLS.map((tool) => ({
        tool,
        count: mcpsList.filter((m) => m.configuredIn.includes(tool)).length,
      })),
    [mcpsList]
  );

  const skillToolBreakdown = useMemo(
    () =>
      ALL_TOOLS.map((tool) => ({
        tool,
        count: skills.filter((s) => s.sourceTool === tool).length,
      })),
    [skills]
  );

  const ruleToolBreakdown = useMemo(
    () =>
      ALL_TOOLS.map((tool) => ({
        tool,
        count: rules.filter((r) => r.sourceTool === tool).length,
      })),
    [rules]
  );

  const hookToolBreakdown = useMemo(
    () =>
      ALL_TOOLS.map((tool) => ({
        tool,
        count: hooks.filter((h) => h.sourceTool === tool).length,
      })),
    [hooks]
  );

  // Per-tool coverage
  const toolCoverage = useMemo(
    () =>
      ALL_TOOLS.map((tool) => ({
        tool,
        ...computeToolBreakdown(mcpsList, skills, rules, hooks, tool),
      })),
    [mcpsList, skills, rules, hooks]
  );

  const allItemsLoaded =
    !mcpsLoading && !skillsLoading && !rulesLoading && !hooksLoading;
  const hasAnyData =
    mcpsList.length > 0 ||
    skills.length > 0 ||
    rules.length > 0 ||
    hooks.length > 0;

  // Workspace filter state
  const [wsFilter, setWsFilter] = useState<"all" | "mcps" | "rules" | "skills">("all");

  // Workspace signal counts
  const wsWithMCPs = useMemo(
    () => countWorkspacesWithMCPs(workspaces),
    [workspaces]
  );
  const wsWithSkills = useMemo(
    () => countWorkspacesWithSkills(workspaces),
    [workspaces]
  );
  const wsWithRules = useMemo(
    () => countWorkspacesWithRules(workspaces),
    [workspaces]
  );

  // Only count workspaces with meaningful configs (MCPs, rules, or skills)
  const meaningfulWorkspaces = useMemo(
    () => workspaces.filter(wsHasAnyConfig),
    [workspaces]
  );

  const filteredWorkspaces = useMemo(() => {
    if (wsFilter === "mcps") return workspaces.filter(wsHasMCPs);
    if (wsFilter === "rules") return workspaces.filter(wsHasRules);
    if (wsFilter === "skills") return workspaces.filter(wsHasSkills);
    return meaningfulWorkspaces;
  }, [workspaces, meaningfulWorkspaces, wsFilter]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Your AI Setup</h2>
        <p className="mt-1 text-muted-foreground">
          Global configuration across your AI coding tools
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to load some data</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {/* Detected tools */}
      {allItemsLoaded && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            Tools on this computer
          </h3>
          <div className="flex items-center gap-3">
            {ALL_TOOLS.map((tool) => {
              const bd = computeToolBreakdown(mcpsList, skills, rules, hooks, tool);
              const total = bd.mcpCount + bd.skillCount + bd.ruleCount + bd.hookCount;
              if (total === 0) return null;
              return (
                <div
                  key={tool}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border border-border bg-card px-4 py-3",
                    toolTextColor(tool)
                  )}
                >
                  <ToolLogo tool={tool} size={20} />
                  <span className="text-sm font-medium">{toolLabel(tool)}</span>
                </div>
              );
            })}
            {!hasAnyData && (
              <p className="text-sm text-muted-foreground">
                No AI tools detected yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards — user-level counts */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Unplug}
          label="MCP Servers"
          count={mcpsList.length}
          isLoading={mcpsLoading}
          toolBreakdown={mcpToolBreakdown}
          onClick={() => setActiveTab("mcps")}
        />
        <StatCard
          icon={Hammer}
          label="Skills"
          count={skills.length}
          isLoading={skillsLoading}
          toolBreakdown={skillToolBreakdown}
          onClick={() => setActiveTab("skills")}
        />
        <StatCard
          icon={FileText}
          label="Rules"
          count={rules.length}
          isLoading={rulesLoading}
          toolBreakdown={ruleToolBreakdown}
          onClick={() => setActiveTab("rules")}
        />
        <StatCard
          icon={Anchor}
          label="Hooks"
          count={hooks.length}
          isLoading={hooksLoading}
          toolBreakdown={hookToolBreakdown}
          onClick={() => setActiveTab("hooks")}
        />
      </div>

      {/* Tool coverage */}
      {allItemsLoaded && hasAnyData && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">
            Tool Coverage
          </h3>
          <div className="space-y-0.5">
            {toolCoverage.map(
              ({ tool, mcpCount, skillCount, ruleCount, hookCount }) => (
                <ToolRow
                  key={tool}
                  tool={tool}
                  mcpCount={mcpCount}
                  skillCount={skillCount}
                  ruleCount={ruleCount}
                  hookCount={hookCount}
                />
              )
            )}
          </div>
        </div>
      )}

      {/* Workspaces — discovery-based */}
      {discoveryLoading ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Scanning workspaces...
          </div>
        </div>
      ) : meaningfulWorkspaces.length > 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium text-muted-foreground">
            Across Your Projects
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            {meaningfulWorkspaces.length} workspace{meaningfulWorkspaces.length !== 1 ? "s" : ""}{" "}
            with project-level AI configs
          </p>

          {/* Filter cards — clickable toggles */}
          <div className="grid grid-cols-3 gap-3">
            {wsWithMCPs > 0 && (
              <button
                onClick={() => setWsFilter(wsFilter === "mcps" ? "all" : "mcps")}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left transition-colors",
                  wsFilter === "mcps"
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Unplug className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{wsWithMCPs}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  with MCP configs
                </p>
              </button>
            )}
            {wsWithRules > 0 && (
              <button
                onClick={() => setWsFilter(wsFilter === "rules" ? "all" : "rules")}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left transition-colors",
                  wsFilter === "rules"
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{wsWithRules}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  with rules
                </p>
              </button>
            )}
            {wsWithSkills > 0 && (
              <button
                onClick={() => setWsFilter(wsFilter === "skills" ? "all" : "skills")}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left transition-colors",
                  wsFilter === "skills"
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border bg-muted/30 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <Hammer className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{wsWithSkills}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  with skills
                </p>
              </button>
            )}
          </div>

          {/* All workspaces (filtered) */}
          <div className="mt-3 space-y-0.5">
            {filteredWorkspaces.map((ws) => (
              <div
                key={ws.path}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:bg-muted/50"
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 truncate font-medium text-xs">
                  {ws.name}
                </span>
                {ws.isGitRepo && (
                  <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                )}
                <div className="ml-auto flex items-center gap-1">
                  {wsToolDots(ws).map((t) => (
                    <span key={t} className={toolTextColor(t)} title={toolLabel(t)}>
                      <ToolLogo tool={t} size={10} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
