import type { AgentItem, GroupedAgent, AgentSourceTool } from "@/types";

const AGENT_TOOL_ORDER: AgentSourceTool[] = ["claude", "gemini"];

/**
 * Groups AgentItems by name + scope into GroupedAgent[].
 * Picks the primary variant by preferring Claude (stable), then Gemini.
 */
export function groupAgents(agents: AgentItem[]): GroupedAgent[] {
  const map = new Map<string, AgentItem[]>();

  for (const agent of agents) {
    const key = `${agent.name}::${agent.scope}`;
    const group = map.get(key);
    if (group) {
      group.push(agent);
    } else {
      map.set(key, [agent]);
    }
  }

  const groups: GroupedAgent[] = [];

  for (const [groupKey, variants] of map) {
    // Sort variants by tool order for deterministic output
    variants.sort(
      (a, b) =>
        AGENT_TOOL_ORDER.indexOf(a.sourceTool) -
        AGENT_TOOL_ORDER.indexOf(b.sourceTool)
    );

    const primary = variants[0];

    // Detect content drift: any variant has different content than the primary
    const hasContentDrift = variants.some(
      (v) => v.content !== primary.content
    );

    const installedTools = variants.map((v) => v.sourceTool);

    groups.push({
      groupKey,
      name: primary.name,
      description: primary.description,
      scope: primary.scope,
      maturity: primary.maturity,
      tools: primary.tools,
      model: primary.model,
      maxTurns: primary.maxTurns,
      permissionMode: primary.permissionMode,
      installedTools,
      primary,
      variants,
      hasContentDrift,
    });
  }

  return groups;
}
