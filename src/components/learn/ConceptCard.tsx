import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface ConceptCardProps {
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  title: string;
  description: string;
  details: string[];
  pageTab?: "mcps" | "skills" | "agents" | "rules" | "hooks" | "context";
  pageLabel?: string;
}

export function ConceptCard({
  icon: Icon,
  iconColorClass,
  iconBgClass,
  title,
  description,
  details,
  pageTab,
  pageLabel,
}: ConceptCardProps) {
  const [open, setOpen] = useState(false);
  const { setActiveTab } = useWorkspaceStore();

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-muted/30"
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconBgClass
          )}
        >
          <Icon className={cn("h-4.5 w-4.5", iconColorClass)} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <ul className="space-y-1.5">
            {details.map((detail, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
                <span>{detail}</span>
              </li>
            ))}
          </ul>

          {pageTab && pageLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab(pageTab);
              }}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {pageLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
