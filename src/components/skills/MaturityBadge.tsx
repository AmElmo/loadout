import type { Maturity } from "@/types";
import { cn } from "@/lib/utils";

interface MaturityBadgeProps {
  maturity: Maturity;
  className?: string;
}

const maturityStyles: Record<Maturity, string> = {
  stable: "bg-green-500/10 text-green-600 border-green-500/20",
  experimental: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  deprecated: "bg-red-500/10 text-red-600 border-red-500/20",
};

const maturityLabels: Record<Maturity, string> = {
  stable: "Stable",
  experimental: "Experimental",
  deprecated: "Deprecated",
};

export function MaturityBadge({ maturity, className }: MaturityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
        maturityStyles[maturity],
        className
      )}
    >
      {maturityLabels[maturity]}
    </span>
  );
}
