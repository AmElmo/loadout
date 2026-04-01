import { useMemo, useRef, useState } from "react";
import {
  RefreshCw,
  Search,
  GitBranch,
  FolderOpen,
  Unplug,
  Hammer,
  FileText,
  Anchor,
  Bot,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn, isRealWorkspace } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { discoverWorkspaces } from "@/lib/api/workspace";
import { scanMCPs } from "@/lib/api/mcps";
import { scanSkills } from "@/lib/api/skills";
import { scanRules, scanHooks } from "@/lib/api/config";
import { scanAgents } from "@/lib/api/agents";
import type {
  SourceTool,
  DiscoveredWorkspace,
} from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { TOOL_CONFIG, toolTextColor } from "@/config/tools";
import { MCPList } from "@/components/mcps";
import { SkillList } from "@/components/skills";
import { PromptsSection } from "@/components/config";
import { HooksSection } from "@/components/config";
import { AgentList } from "@/components/agents";
import { groupSkills } from "@/lib/groupSkills";
import { groupAgents } from "@/lib/groupAgents";
import { Button } from "@/components/ui/button";
import { useShortcutAction } from "@/hooks/useKeyboardShortcuts";

// ---------------------------------------------------------------------------
// Workspace Signal Helpers (shared with Home.tsx)
// ---------------------------------------------------------------------------

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

function wsHasMCPs(ws: DiscoveredWorkspace): boolean {
  return ws.signals.hasMcpJson || ws.signals.hasCursorMcps;
}

function wsHasSkills(ws: DiscoveredWorkspace): boolean {
  return ws.signals.hasClaudeSkills || ws.signals.hasCodexSkills || ws.signals.hasGeminiSkills;
}

function wsHasRules(ws: DiscoveredWorkspace): boolean {
  const s = ws.signals;
  return (
    s.hasClaudePrompt || s.hasCodexPrompt || s.hasGeminiPrompt ||
    s.hasCursorRules || s.hasCopilotRules || s.hasWindsurfRules ||
    s.hasRooRules || s.hasClineRules || s.hasKiloRules || s.hasOpenCodeRules
  );
}

function wsHasAnyConfig(ws: DiscoveredWorkspace): boolean {
  return wsHasMCPs(ws) || wsHasSkills(ws) || wsHasRules(ws) || ws.signals.hasClaudeConfig || ws.signals.hasCodexConfig || ws.signals.hasGeminiConfig;
}

// ---------------------------------------------------------------------------
// Signal count helpers — rough counts from boolean flags
// ---------------------------------------------------------------------------

function wsSignalSummary(ws: DiscoveredWorkspace) {
  const s = ws.signals;
  let mcps = 0;
  let skills = 0;
  let rules = 0;

  if (s.hasMcpJson) mcps++;
  if (s.hasCursorMcps) mcps++;

  if (s.hasClaudeSkills) skills++;
  if (s.hasCodexSkills) skills++;
  if (s.hasGeminiSkills) skills++;

  if (s.hasClaudePrompt) rules++;
  if (s.hasCodexPrompt) rules++;
  if (s.hasGeminiPrompt) rules++;
  if (s.hasCursorRules) rules++;
  if (s.hasCopilotRules) rules++;
  if (s.hasWindsurfRules) rules++;
  if (s.hasRooRules) rules++;
  if (s.hasClineRules) rules++;
  if (s.hasKiloRules) rules++;
  if (s.hasOpenCodeRules) rules++;

  return { mcps, skills, rules };
}

// ---------------------------------------------------------------------------
// Repo Detail View
// ---------------------------------------------------------------------------

function RepoDetail({ repo }: { repo: DiscoveredWorkspace }) {
  const repoPath = repo.path;
  const [activeSection, setActiveSection] = useState<"mcps" | "skills" | "rules" | "hooks" | "agents">("mcps");

  const { data: mcps, isLoading: mcpsLoading } = useQuery({
    queryKey: ["repo-mcps", repoPath],
    queryFn: () => scanMCPs(repoPath),
  });

  const { data: skillsResult, isLoading: skillsLoading } = useQuery({
    queryKey: ["repo-skills", repoPath],
    queryFn: () => scanSkills(repoPath),
  });

  const { data: rulesResult, isLoading: rulesLoading } = useQuery({
    queryKey: ["repo-rules", repoPath],
    queryFn: () => scanRules(repoPath),
  });

  const { data: hooksResult, isLoading: hooksLoading } = useQuery({
    queryKey: ["repo-hooks", repoPath],
    queryFn: () => scanHooks(repoPath),
  });

  const { data: agentsResult, isLoading: agentsLoading } = useQuery({
    queryKey: ["repo-agents", repoPath],
    queryFn: () => scanAgents(repoPath),
  });

  // Filter to project-level only
  const projectMcps = useMemo(
    () => (mcps ?? []).filter((m) => m.scope === "project" || m.scope === "repo"),
    [mcps]
  );
  const projectSkills = useMemo(
    () => groupSkills((skillsResult?.skills ?? []).filter((s) => s.scope === "project")),
    [skillsResult]
  );
  const projectRules = useMemo(
    () => (rulesResult?.prompts ?? []).filter((p) => p.scope === "project" && p.exists),
    [rulesResult]
  );
  const projectHooks = useMemo(
    () => (hooksResult?.hooks ?? []).filter((h) => h.scope === "project"),
    [hooksResult]
  );
  const projectAgents = useMemo(
    () => groupAgents((agentsResult?.agents ?? []).filter((a) => a.scope === "project")),
    [agentsResult]
  );

  const isLoading = mcpsLoading || skillsLoading || rulesLoading || hooksLoading || agentsLoading;

  const sections = [
    { id: "mcps" as const, label: "MCPs", icon: Unplug, count: projectMcps.length },
    { id: "skills" as const, label: "Skills", icon: Hammer, count: projectSkills.length },
    { id: "rules" as const, label: "Rules", icon: FileText, count: projectRules.length },
    { id: "hooks" as const, label: "Hooks", icon: Anchor, count: projectHooks.length },
    { id: "agents" as const, label: "Subagents", icon: Bot, count: projectAgents.length },
  ];

  // Auto-select first non-empty section
  useMemo(() => {
    if (!isLoading) {
      const firstNonEmpty = sections.find((s) => s.count > 0);
      if (firstNonEmpty && sections.find((s) => s.id === activeSection)?.count === 0) {
        setActiveSection(firstNonEmpty.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <div className="p-6">
      {/* Section tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {section.label}
              {!isLoading && (
                <span className={cn(
                  "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-medium",
                  isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {section.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (
        <>
          {activeSection === "mcps" && (
            projectMcps.length > 0 ? (
              <MCPList mcps={projectMcps} hasActiveFilters={false} onClearFilters={() => {}} />
            ) : (
              <EmptySection label="MCPs" />
            )
          )}

          {activeSection === "skills" && (
            projectSkills.length > 0 ? (
              <SkillList skills={projectSkills} hasActiveFilters={false} onClearFilters={() => {}} />
            ) : (
              <EmptySection label="skills" />
            )
          )}

          {activeSection === "rules" && (
            projectRules.length > 0 ? (
              <PromptsSection prompts={projectRules} workspaceName={repo.name} />
            ) : (
              <EmptySection label="rules" />
            )
          )}

          {activeSection === "hooks" && (
            projectHooks.length > 0 ? (
              <HooksSection hooks={projectHooks} geminiHooksEnabled={hooksResult?.geminiHooksEnabled ?? false} />
            ) : (
              <EmptySection label="hooks" />
            )
          )}

          {activeSection === "agents" && (
            projectAgents.length > 0 ? (
              <AgentList agents={projectAgents} hasActiveFilters={false} onClearFilters={() => {}} />
            ) : (
              <EmptySection label="subagents" />
            )
          )}
        </>
      )}
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
      <p className="text-sm text-muted-foreground">
        No project-level {label} configured in this repository
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Repo List View
// ---------------------------------------------------------------------------

function RepoRow({
  workspace,
  onClick,
}: {
  workspace: DiscoveredWorkspace;
  onClick: () => void;
}) {
  const tools = wsToolDots(workspace);
  const summary = wsSignalSummary(workspace);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg border border-border bg-card p-4 text-left transition-all",
        "hover:border-primary/20 hover:ring-1 hover:ring-primary/15"
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <FolderOpen className="h-5 w-5 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{workspace.name}</span>
          {workspace.isGitRepo && (
            <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
        </div>

        <div className="mt-1 flex items-center gap-3">
          {/* Tool badges */}
          <div className="flex items-center gap-1">
            {tools.map((t) => (
              <span key={t} className={toolTextColor(t)} title={TOOL_CONFIG[t].label}>
                <ToolLogo tool={t} size={12} />
              </span>
            ))}
          </div>

          {/* Config counts */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {summary.mcps > 0 && (
              <span className="flex items-center gap-1">
                <Unplug className="h-3 w-3" /> {summary.mcps}
              </span>
            )}
            {summary.skills > 0 && (
              <span className="flex items-center gap-1">
                <Hammer className="h-3 w-3" /> {summary.skills}
              </span>
            )}
            {summary.rules > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> {summary.rules}
              </span>
            )}
          </div>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-muted-foreground" title={workspace.path}>
          {workspace.path.replace(/^\/Users\/[^/]+/, "~")}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Repos Page
// ---------------------------------------------------------------------------

export function Repos() {
  const { selectedRepo, setSelectedRepo } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [toolFilter, setToolFilter] = useState<SourceTool | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useShortcutAction("focus-search", () => searchRef.current?.focus());

  const {
    data: discovery,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["discover-workspaces"],
    queryFn: () => discoverWorkspaces(4),
    staleTime: 5 * 60 * 1000,
  });

  useShortcutAction("refresh", () => refetch());

  // Filter to real workspaces with at least one config signal
  const workspaces = useMemo(() => {
    return (discovery?.workspaces ?? [])
      .filter(isRealWorkspace)
      .filter(wsHasAnyConfig);
  }, [discovery]);

  // Available tools for filter buttons
  const availableTools = useMemo(() => {
    const tools = new Set<SourceTool>();
    for (const ws of workspaces) {
      for (const t of wsToolDots(ws)) tools.add(t);
    }
    return Array.from(tools);
  }, [workspaces]);

  // Apply search + tool filter
  const filteredWorkspaces = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return workspaces.filter((ws) => {
      if (query && !ws.name.toLowerCase().includes(query)) return false;
      if (toolFilter && !wsToolDots(ws).includes(toolFilter)) return false;
      return true;
    });
  }, [workspaces, searchQuery, toolFilter]);

  // If a repo is selected, show detail view
  if (selectedRepo) {
    return <RepoDetail repo={selectedRepo} />;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Repos</h2>
          <p className="mt-1 text-muted-foreground">
            All codebases on your machine where AI coding tools are configured
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isRefetching && "animate-spin")}
          />
          Rescan
        </Button>
      </div>

      {/* Search + tool filter */}
      {workspaces.length > 0 && (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search repos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {availableTools.length > 1 && (
            <div className="flex items-center gap-1">
              {availableTools.map((tool) => (
                <button
                  key={tool}
                  onClick={() => setToolFilter(toolFilter === tool ? null : tool)}
                  title={TOOL_CONFIG[tool].label}
                  className={cn(
                    "rounded-md p-1.5 transition-colors",
                    toolFilter === tool
                      ? "bg-primary/10 ring-1 ring-primary/30"
                      : "hover:bg-muted"
                  )}
                >
                  <span className={toolTextColor(tool)}>
                    <ToolLogo tool={tool} size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && filteredWorkspaces.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <FolderOpen className="mb-3 h-8 w-8 text-muted-foreground" />
          {workspaces.length === 0 ? (
            <>
              <p className="text-sm font-medium">No repositories with AI tool configurations found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add config files like <code className="rounded bg-muted px-1 text-xs">.claude/</code>,{" "}
                <code className="rounded bg-muted px-1 text-xs">.mcp.json</code>, or{" "}
                <code className="rounded bg-muted px-1 text-xs">CLAUDE.md</code> to a repo to see it here.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No repos match your search</p>
          )}
        </div>
      )}

      {!isLoading && filteredWorkspaces.length > 0 && (
        <>
          <div className="space-y-2">
            {filteredWorkspaces.map((ws) => (
              <RepoRow
                key={ws.path}
                workspace={ws}
                onClick={() => setSelectedRepo(ws)}
              />
            ))}
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            {filteredWorkspaces.length === workspaces.length
              ? `${workspaces.length} repositor${workspaces.length !== 1 ? "ies" : "y"} with AI tool configs`
              : `Showing ${filteredWorkspaces.length} of ${workspaces.length} repositor${workspaces.length !== 1 ? "ies" : "y"}`}
          </p>
        </>
      )}
    </div>
  );
}
