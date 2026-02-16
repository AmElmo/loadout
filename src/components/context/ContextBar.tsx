import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/utils";
import type { ContextSummary } from "@/lib/api/context";

interface ContextBarProps {
  summary: ContextSummary;
}

interface Segment {
  label: string;
  tokens: number;
  color: string;
  bgColor: string;
  dotColor: string;
}

export function ContextBar({ summary }: ContextBarProps) {
  const segments: Segment[] = [
    {
      label: "Rules",
      tokens: summary.rulesTokens,
      color: "bg-amber-500",
      bgColor: "bg-amber-500/80",
      dotColor: "bg-amber-500",
    },
    {
      label: "Skills (idle)",
      tokens: summary.skillsIdleTokens,
      color: "bg-purple-500",
      bgColor: "bg-purple-500/80",
      dotColor: "bg-purple-500",
    },
  ];

  if (summary.mcpsIdleTokens !== null) {
    segments.push({
      label: "MCPs",
      tokens: summary.mcpsIdleTokens,
      color: "bg-cyan-500",
      bgColor: "bg-cyan-500/80",
      dotColor: "bg-cyan-500",
    });
  }

  if (summary.rulesConditionalTokens > 0) {
    segments.push({
      label: "Rules (conditional)",
      tokens: summary.rulesConditionalTokens,
      color: "bg-amber-500/40",
      bgColor: "bg-amber-500/30",
      dotColor: "bg-amber-500/40",
    });
  }

  const totalUsed = segments.reduce((acc, s) => acc + s.tokens, 0);
  const freeTokens = Math.max(0, summary.contextLimit - totalUsed);

  return (
    <div>
      {/* Bar */}
      <div className="flex h-8 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
        {segments.map(
          (segment) =>
            segment.tokens > 0 && (
              <div
                key={segment.label}
                className={cn(
                  "relative flex items-center justify-center transition-all",
                  segment.bgColor
                )}
                style={{
                  width: `${Math.max((segment.tokens / summary.contextLimit) * 100, 0.5)}%`,
                }}
                title={`${segment.label}: ${segment.tokens.toLocaleString()} tokens (${((segment.tokens / summary.contextLimit) * 100).toFixed(1)}%)`}
              >
                {segment.tokens / summary.contextLimit > 0.05 && (
                  <span className="truncate px-1 text-[10px] font-medium text-white">
                    {formatTokens(segment.tokens)}
                  </span>
                )}
              </div>
            )
        )}
        {/* Free space */}
        <div
          className="flex flex-1 items-center justify-center"
          title={`Free: ${freeTokens.toLocaleString()} tokens`}
        />
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {segments.map(
          (segment) =>
            segment.tokens > 0 && (
              <div key={segment.label} className="flex items-center gap-1.5">
                <div className={cn("h-2.5 w-2.5 rounded-full", segment.dotColor)} />
                <span>
                  {segment.label}: {formatTokens(segment.tokens)}
                </span>
              </div>
            )
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" />
          <span>Free: {formatTokens(freeTokens)}</span>
        </div>
      </div>
    </div>
  );
}
