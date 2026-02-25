import { Filter, Bot } from "lucide-react";
import { useState } from "react";
import type { GroupedAgent } from "@/types";
import { AgentCard } from "./AgentCard";
import { AgentViewer } from "./AgentViewer";

interface AgentListProps {
  agents: GroupedAgent[];
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
}

export function AgentList({
  agents,
  hasActiveFilters,
  onClearFilters,
}: AgentListProps) {
  const [selectedAgent, setSelectedAgent] = useState<GroupedAgent | null>(null);

  if (agents.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Filter className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-medium">No Matching Agents</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No agents match the current filters.
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
        <Bot className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium">No Agents Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No agents are configured in Claude Code or Gemini CLI.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Add agents to:</p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">
              ~/.claude/agents/&lt;name&gt;.md
            </code>{" "}
            for Claude Code
          </li>
          <li>
            <code className="rounded bg-muted px-1">
              ~/.gemini/agents/&lt;name&gt;.md
            </code>{" "}
            for Gemini CLI
          </li>
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {agents.map((group) => (
          <AgentCard
            key={group.groupKey}
            group={group}
            onClick={() => setSelectedAgent(group)}
          />
        ))}
      </div>

      {selectedAgent && (
        <AgentViewer
          group={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </>
  );
}
