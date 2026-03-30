import { useState } from "react";
import { Filter, Puzzle } from "lucide-react";
import type { PluginItem } from "@/types";
import { PluginCard } from "./PluginCard";
import { PluginViewer } from "./PluginViewer";

interface PluginListProps {
  plugins: PluginItem[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function PluginList({
  plugins,
  hasActiveFilters,
  onClearFilters,
}: PluginListProps) {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginItem | null>(null);

  if (plugins.length === 0) {
    if (hasActiveFilters) {
      return (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <Filter className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="font-medium">No plugins match filters</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search query.
          </p>
          <button
            onClick={onClearFilters}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      );
    }

    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Puzzle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium">No Installed Plugins</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Plugins extend Claude Code and Gemini CLI with additional commands,
          skills, MCP servers, and more.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Install a plugin from Claude Code CLI:
        </p>
        <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
          /plugin install &lt;name&gt;
        </code>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {plugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            onClick={() => setSelectedPlugin(plugin)}
          />
        ))}
      </div>

      {selectedPlugin && (
        <PluginViewer
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
        />
      )}
    </div>
  );
}
