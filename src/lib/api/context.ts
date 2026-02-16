import type { PromptFile, SkillItem, MCPItem, MCPToolsResult, SourceTool } from "@/types";

/** Default context window size for Claude models */
export const CONTEXT_WINDOW_LIMIT = 200_000;

export interface ContextSummary {
  /** Total tokens consumed at idle (rules + skills idle + MCPs if fetched) */
  totalIdleTokens: number;
  /** Total tokens if all skills are invoked */
  totalActiveTokens: number;
  /** Context window limit */
  contextLimit: number;
  /** Breakdown by category */
  rulesTokens: number;
  rulesConditionalTokens: number;
  skillsIdleTokens: number;
  skillsActiveTokens: number;
  mcpsIdleTokens: number | null;
}

/**
 * Aggregate token usage from existing scan results (client-side computation).
 * When activeTool is set, only items for that tool are included.
 */
export function computeContextSummary(
  prompts: PromptFile[],
  skills: SkillItem[],
  mcps: MCPItem[],
  mcpToolsMap: Map<string, MCPToolsResult>,
  mcpToolsFetched: boolean,
  activeTool: SourceTool | null
): ContextSummary {
  // Rules: sum tokens, separate always-loaded from conditional
  let rulesTokens = 0;
  let rulesConditionalTokens = 0;
  for (const p of prompts) {
    if (!p.exists) continue;
    if (activeTool && p.sourceTool !== activeTool) continue;
    if (p.isScoped) {
      rulesConditionalTokens += p.tokens;
    } else {
      rulesTokens += p.tokens;
    }
  }

  // Skills: sum idle (name+desc) and active (full content)
  let skillsIdleTokens = 0;
  let skillsActiveTokens = 0;
  for (const s of skills) {
    if (s.isShadowed) continue;
    if (activeTool && s.sourceTool !== activeTool) continue;
    skillsIdleTokens += s.idleTokens;
    skillsActiveTokens += s.activeTokens;
  }

  // MCPs: sum from fetched tool definitions
  let mcpsIdleTokens: number | null = null;
  if (mcpToolsFetched) {
    mcpsIdleTokens = 0;
    for (const mcp of mcps) {
      if (activeTool && !mcp.configuredIn.includes(activeTool)) continue;
      const tools = mcpToolsMap.get(mcp.name);
      if (tools) {
        mcpsIdleTokens += tools.idleTokens;
      }
    }
  }

  const totalIdleTokens =
    rulesTokens + skillsIdleTokens + (mcpsIdleTokens ?? 0);
  const totalActiveTokens =
    rulesTokens + skillsActiveTokens + (mcpsIdleTokens ?? 0);

  return {
    totalIdleTokens,
    totalActiveTokens,
    contextLimit: CONTEXT_WINDOW_LIMIT,
    rulesTokens,
    rulesConditionalTokens,
    skillsIdleTokens,
    skillsActiveTokens,
    mcpsIdleTokens,
  };
}
