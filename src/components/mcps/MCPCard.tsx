import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { MCPItem } from "@/types";
import { cn } from "@/lib/utils";
import { HealthBadge } from "./HealthBadge";
import { MCPIcon } from "./MCPIcon";
import { ToolBadges } from "./ToolBadge";

interface MCPCardProps {
  mcp: MCPItem;
}

export function MCPCard({ mcp }: MCPCardProps) {
  const [expanded, setExpanded] = useState(false);

  const envKeys = Object.keys(mcp.env);
  const hasEnv = envKeys.length > 0;
  const isHttp = mcp.mcpType === "http";

  // Display string for the card preview
  const displayString = isHttp
    ? mcp.url ?? "HTTP endpoint"
    : `${mcp.command ?? ""} ${mcp.args.join(" ")}`.trim();

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card transition-colors",
        expanded && "ring-1 ring-primary/20"
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50"
      >
        <MCPIcon name={mcp.name} mcpType={mcp.mcpType} url={mcp.url} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{mcp.name}</h3>
            <HealthBadge status={mcp.health} />
            {isHttp && (
              <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-blue-500">
                HTTP
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {displayString}
          </p>
        </div>

        <ToolBadges tools={mcp.configuredIn} className="shrink-0" />

        <div className="shrink-0 text-muted-foreground">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <dl className="space-y-2 text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="font-medium text-muted-foreground">Type</dt>
              <dd className="capitalize">{mcp.mcpType}</dd>
            </div>

            {isHttp && mcp.url && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-medium text-muted-foreground">URL</dt>
                <dd className="truncate font-mono text-xs" title={mcp.url}>
                  {mcp.url}
                </dd>
              </div>
            )}

            {!isHttp && mcp.command && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-medium text-muted-foreground">Command</dt>
                <dd className="font-mono">{mcp.command}</dd>
              </div>
            )}

            {!isHttp && mcp.args.length > 0 && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-medium text-muted-foreground">Arguments</dt>
                <dd className="font-mono">
                  {mcp.args.map((arg, i) => (
                    <span
                      key={i}
                      className="mr-1 inline-block rounded bg-muted px-1"
                    >
                      {arg}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {hasEnv && (
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-medium text-muted-foreground">
                  Environment
                </dt>
                <dd>
                  {envKeys.map((key) => (
                    <div key={key} className="font-mono text-xs">
                      <span className="text-muted-foreground">{key}=</span>
                      <span className="text-warning">***</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}

            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="font-medium text-muted-foreground">Scope</dt>
              <dd className="capitalize">{mcp.scope}</dd>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-2">
              <dt className="font-medium text-muted-foreground">Config</dt>
              <dd className="truncate font-mono text-xs" title={mcp.path}>
                {mcp.path}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
