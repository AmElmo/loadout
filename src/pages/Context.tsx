import { useState, useMemo } from "react";
import { RefreshCw, AlertCircle, Zap, HelpCircle, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { scanRules } from "@/lib/api/config";
import { scanMCPs, fetchMCPTools } from "@/lib/api/mcps";
import { scanSkills } from "@/lib/api/skills";
import { computeContextSummary } from "@/lib/api/context";
import { formatTokens } from "@/lib/utils";
import { ContextBar } from "@/components/context/ContextBar";
import { ContextTable } from "@/components/context/ContextTable";
import { Button } from "@/components/ui/button";
import type { MCPItem, MCPToolsResult, SourceTool } from "@/types";
import { ToolLogo } from "@/components/ToolLogo";
import { ALL_TOOLS, TOOL_CONFIG } from "@/config/tools";

function buildToolFilters(tools: SourceTool[]) {
  return tools.map((id) => ({
    label: TOOL_CONFIG[id].label,
    value: id,
  }));
}

export function Context() {

  const [activeTool, setActiveTool] = useState<SourceTool>("claude");
  const [showHelp, setShowHelp] = useState(false);

  // Fetch rules
  const {
    data: rulesResult,
    isLoading: rulesLoading,
    error: rulesError,
  } = useQuery({
    queryKey: ["rules", null],
    queryFn: () => scanRules(undefined),
  });

  // Fetch skills
  const {
    data: skillsResult,
    isLoading: skillsLoading,
    error: skillsError,
  } = useQuery({
    queryKey: ["skills", null],
    queryFn: () => scanSkills(undefined),
  });

  // Fetch MCPs
  const {
    data: mcps,
  } = useQuery({
    queryKey: ["mcps", null],
    queryFn: () => scanMCPs(undefined),
  });

  // MCP tool definitions (fetched on-demand)
  const [mcpToolsMap, setMcpToolsMap] = useState<Map<string, MCPToolsResult>>(new Map());
  const [fetchingMCPTools, setFetchingMCPTools] = useState(false);
  const [mcpToolsFetched, setMcpToolsFetched] = useState(false);
  const [mcpFetchErrors, setMcpFetchErrors] = useState<Map<string, string>>(new Map());
  // MCPs that need Keychain access (auth errors from phase 1)
  const [mcpsNeedingKeychain, setMcpsNeedingKeychain] = useState<Set<string>>(new Set());
  const [fetchingKeychain, setFetchingKeychain] = useState<Set<string>>(new Set());

  /** Phase 1: Fetch all MCPs WITHOUT Keychain access */
  const handleFetchMCPTools = async () => {
    if (!mcps || mcps.length === 0) return;
    setFetchingMCPTools(true);
    setMcpFetchErrors(new Map());
    setMcpsNeedingKeychain(new Set());

    const newMap = new Map<string, MCPToolsResult>();
    const newErrors = new Map<string, string>();
    const needsKeychain = new Set<string>();

    await Promise.all(
      mcps.map(async (mcp: MCPItem) => {
        try {
          const result = await fetchMCPTools(mcp, false);
          newMap.set(mcp.name, result);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          // Detect auth errors on HTTP MCPs — these could be resolved with Keychain
          if (mcp.mcpType === "http" && /authentication required|authentication failed/i.test(errMsg)) {
            needsKeychain.add(mcp.name);
          } else {
            newErrors.set(mcp.name, errMsg);
          }
        }
      })
    );

    setMcpToolsMap(newMap);
    setMcpFetchErrors(newErrors);
    setMcpsNeedingKeychain(needsKeychain);
    setMcpToolsFetched(true);
    setFetchingMCPTools(false);
  };

  /** Phase 2: Re-fetch a specific MCP WITH Keychain access (user-consented) */
  const handleGrantKeychainAccess = async (mcpName: string) => {
    const mcp = mcps?.find((m) => m.name === mcpName);
    if (!mcp) return;

    setFetchingKeychain((prev) => new Set(prev).add(mcpName));

    try {
      const result = await fetchMCPTools(mcp, true);
      setMcpToolsMap((prev) => {
        const next = new Map(prev);
        next.set(mcpName, result);
        return next;
      });
      setMcpsNeedingKeychain((prev) => {
        const next = new Set(prev);
        next.delete(mcpName);
        return next;
      });
      // Clear any previous error for this MCP
      setMcpFetchErrors((prev) => {
        const next = new Map(prev);
        next.delete(mcpName);
        return next;
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setMcpFetchErrors((prev) => {
        const next = new Map(prev);
        next.set(mcpName, errMsg);
        return next;
      });
      setMcpsNeedingKeychain((prev) => {
        const next = new Set(prev);
        next.delete(mcpName);
        return next;
      });
    } finally {
      setFetchingKeychain((prev) => {
        const next = new Set(prev);
        next.delete(mcpName);
        return next;
      });
    }
  };

  const prompts = rulesResult?.prompts ?? [];
  const skills = skillsResult?.skills ?? [];
  const mcpsList = mcps ?? [];

  const availableTools = useMemo(() => {
    const tools = new Set<SourceTool>();
    for (const p of prompts) tools.add(p.sourceTool);
    for (const s of skills) tools.add(s.sourceTool);
    for (const m of mcpsList) {
      for (const t of m.configuredIn) tools.add(t);
    }
    return ALL_TOOLS.filter((t) => tools.has(t));
  }, [prompts, skills, mcpsList]);

  const toolFilters = useMemo(() => buildToolFilters(availableTools), [availableTools]);

  // Reset active tool if it's not in available tools
  const effectiveTool = availableTools.includes(activeTool)
    ? activeTool
    : availableTools[0] ?? "claude";

  // Filter MCPs by active tool
  const filteredMcps = useMemo(() => {
    return mcpsList.filter((mcp) => mcp.configuredIn.includes(effectiveTool));
  }, [mcpsList, effectiveTool]);

  const summary = useMemo(() => {
    return computeContextSummary(
      prompts,
      skills,
      mcpsList,
      mcpToolsMap,
      mcpToolsFetched,
      effectiveTool
    );
  }, [prompts, skills, mcpsList, mcpToolsMap, mcpToolsFetched, effectiveTool]);

  const isLoading = rulesLoading || skillsLoading;
  const error = rulesError || skillsError;

  const idlePercent = ((summary.totalIdleTokens / summary.contextLimit) * 100).toFixed(1);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Context Window</h2>
          <p className="mt-1 text-muted-foreground">
            Estimated token usage across rules, skills, and MCPs
          </p>
        </div>

        {/* Tool filter */}
        {toolFilters.length > 1 && (
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {toolFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => setActiveTool(filter.value)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  effectiveTool === filter.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ToolLogo tool={filter.value} size={12} />
                {filter.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Failed to scan configurations</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Summary text */}
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm">
              <span className="font-medium capitalize">{effectiveTool}</span>{" "}
              configuration consumes an estimated{" "}
              <span className="font-semibold">
                {formatTokens(summary.totalIdleTokens)}
              </span>{" "}
              tokens at idle (
              <span className="font-medium">{idlePercent}%</span> of 200K).
              {effectiveTool === "claude" && summary.mcpsIdleTokens !== null && summary.mcpsIdleTokens > 0 && (
                <span className="text-muted-foreground">
                  {" "}Claude Code's Tool Search may load fewer MCP tools per turn.
                </span>
              )}
              {summary.rulesConditionalTokens > 0 && (
                <>
                  {" "}Conditional rules add up to{" "}
                  <span className="font-semibold">
                    {formatTokens(summary.rulesConditionalTokens)}
                  </span>{" "}
                  more when active.
                </>
              )}
            </p>
          </div>

          {/* More about context window */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            {showHelp ? "Hide details" : "More about context window"}
          </button>

          {showHelp && (
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="mb-2 text-xs font-medium">
                How context loading works
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-amber-500">Rules</span>{" "}
                  — Full content loaded on every message. Always-on cost. Scoped rules only load when the agent works on a matching file.
                </div>
                <div>
                  <span className="font-medium text-purple-500">Skills</span>{" "}
                  — Only name + description loaded idle. Full content loaded when invoked.
                </div>
                <div>
                  <span className="font-medium text-cyan-500">MCPs</span>{" "}
                  — Full tool definitions (name, description, JSON schema) loaded on every message.
                  {effectiveTool === "claude" && (
                    <span className="text-muted-foreground/70">
                      {" "}Claude Code's Tool Search can dynamically load only relevant tools per turn,
                      so actual usage may be lower than shown.
                    </span>
                  )}
                </div>
              </div>

              <p className="mb-2 mt-4 text-xs font-medium">
                Idle vs Active tokens
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Idle tokens</span>{" "}
                  — Consumed on every single message you send, even when the item is not being used.
                  User and project rules are always idle cost. Scoped rules only apply when a matching file is active. MCP tool definitions are always idle cost.
                </div>
                <div>
                  <span className="font-medium text-foreground">Active tokens</span>{" "}
                  — Only consumed when you invoke the item. Skills are the only type with a
                  different active cost — their full content loads only when your or the model invokes the skill.
                </div>
              </div>
            </div>
          )}

          {/* Stacked bar */}
          <ContextBar summary={summary} />

          {/* MCP tools section */}
          {filteredMcps.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">MCP Tool Definitions</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {mcpToolsFetched
                      ? `Fetched tool definitions from ${filteredMcps.filter((m) => mcpToolsMap.has(m.name)).length} of ${filteredMcps.length} MCPs`
                      : `${filteredMcps.length} MCP server${filteredMcps.length === 1 ? "" : "s"} found. Fetch tool definitions to see their context impact.`}
                  </p>
                </div>
                {!mcpToolsFetched && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFetchMCPTools}
                    disabled={fetchingMCPTools}
                  >
                    {fetchingMCPTools ? (
                      <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-3.5 w-3.5" />
                    )}
                    {fetchingMCPTools ? "Fetching..." : "Fetch Tool Definitions"}
                  </Button>
                )}
                {mcpToolsFetched && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleFetchMCPTools}
                    disabled={fetchingMCPTools}
                  >
                    <RefreshCw
                      className={`mr-2 h-3.5 w-3.5 ${fetchingMCPTools ? "animate-spin" : ""}`}
                    />
                    Refetch
                  </Button>
                )}
              </div>

              {/* Show per-MCP results */}
              {mcpToolsFetched && (
                <div className="mt-3 space-y-1">
                  {filteredMcps.map((mcp) => {
                    const tools = mcpToolsMap.get(mcp.name);
                    const fetchError = mcpFetchErrors.get(mcp.name);
                    const needsKeychain = mcpsNeedingKeychain.has(mcp.name);
                    const isFetchingKeychain = fetchingKeychain.has(mcp.name);

                    if (needsKeychain) {
                      return (
                        <div
                          key={mcp.name}
                          className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-mono text-xs">{mcp.name}</span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px]"
                              onClick={() => handleGrantKeychainAccess(mcp.name)}
                              disabled={isFetchingKeychain}
                            >
                              {isFetchingKeychain ? (
                                <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                              ) : (
                                <KeyRound className="mr-1.5 h-3 w-3" />
                              )}
                              {isFetchingKeychain ? "Accessing..." : "Grant Keychain Access"}
                            </Button>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            This MCP requires authentication to list its tools and estimate token usage.
                            Loadout reads the OAuth token from your macOS Keychain — everything stays local, nothing is stored or transmitted.
                          </p>
                        </div>
                      );
                    }
                    if (fetchError) {
                      return (
                        <div
                          key={mcp.name}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs"
                        >
                          <span className="font-mono">{mcp.name}</span>
                          <span className="text-red-500">{fetchError}</span>
                        </div>
                      );
                    }
                    if (tools) {
                      return (
                        <div
                          key={mcp.name}
                          className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-muted/50"
                        >
                          <span className="font-mono">{mcp.name}</span>
                          <span className="text-muted-foreground">
                            {tools.toolCount} tool{tools.toolCount === 1 ? "" : "s"} · {formatTokens(tools.idleTokens)}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              )}
            </div>
          )}

          {/* Items table */}
          <div>
            <h3 className="mb-2 text-sm font-medium">All Items</h3>
            <ContextTable
              prompts={prompts}
              skills={skills}
              mcps={mcpsList}
              mcpTools={mcpToolsMap}
              activeTool={effectiveTool}
            />
          </div>
        </div>
      )}
    </div>
  );
}
