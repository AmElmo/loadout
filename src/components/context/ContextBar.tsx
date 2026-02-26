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

  // Use sqrt scale so small segments are still visible when usage is low.
  // Each segment gets width proportional to sqrt(tokens), with a minimum of 8%.
  const activeSegments = segments.filter((s) => s.tokens > 0);
  const usedPercent = (totalUsed / summary.contextLimit) * 100;
  // Give the used portion at least 8% of the bar width so it's always visible
  const usedBarPercent = Math.max(usedPercent, activeSegments.length > 0 ? 8 : 0);
  const sqrtValues = activeSegments.map((s) => Math.sqrt(s.tokens));
  const sqrtTotal = sqrtValues.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Bar */}
      <div className="flex h-8 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
        {activeSegments.map((segment, i) => {
          const segWidth =
            sqrtTotal > 0
              ? (sqrtValues[i] / sqrtTotal) * usedBarPercent
              : 0;
          return (
            <div
              key={segment.label}
              className={cn(
                "relative flex items-center justify-center transition-all",
                segment.bgColor
              )}
              style={{
                width: `${segWidth}%`,
              }}
              title={`${segment.label}: ${segment.tokens.toLocaleString()} tokens (${((segment.tokens / summary.contextLimit) * 100).toFixed(1)}%)`}
            >
              {segWidth > 5 && (
                <span className="truncate px-1 text-[10px] font-medium text-white">
                  {formatTokens(segment.tokens)}
                </span>
              )}
            </div>
          );
        })}
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
