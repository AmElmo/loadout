import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/utils";

interface TokenBadgeProps {
  tokens: number;
  label?: string;
  className?: string;
}

function getTokenColor(tokens: number): string {
  if (tokens < 1000) return "bg-green-500/10 text-green-600 border-green-500/20";
  if (tokens < 5000) return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
  return "bg-orange-500/10 text-orange-600 border-orange-500/20";
}

export function TokenBadge({ tokens, label, className }: TokenBadgeProps) {
  if (tokens === 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        getTokenColor(tokens),
        className
      )}
      title={`${tokens.toLocaleString()} estimated tokens`}
    >
      {label && <span className="text-muted-foreground">{label}</span>}
      {formatTokens(tokens)} tokens
    </span>
  );
}
