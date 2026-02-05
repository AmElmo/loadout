import { CheckCircle, HelpCircle, XCircle } from "lucide-react";
import type { HealthStatus } from "@/types";
import { cn } from "@/lib/utils";

interface HealthBadgeProps {
  status: HealthStatus;
  className?: string;
}

export function HealthBadge({ status, className }: HealthBadgeProps) {
  switch (status) {
    case "healthy":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-success",
            className
          )}
          title="Healthy"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span className="sr-only">Healthy</span>
        </span>
      );
    case "failed":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-error",
            className
          )}
          title="Failed"
        >
          <XCircle className="h-3.5 w-3.5" />
          <span className="sr-only">Failed</span>
        </span>
      );
    case "unknown":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium text-muted-foreground",
            className
          )}
          title="Unknown"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span className="sr-only">Unknown</span>
        </span>
      );
  }
}
