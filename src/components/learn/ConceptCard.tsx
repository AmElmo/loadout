import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspaceStore } from "@/stores/workspaceStore";

interface ConceptCardProps {
  icon: LucideIcon;
  iconColorClass: string;
  iconBgClass: string;
  dotColorClass: string;
  ringColorClass: string;
  stepNumber: string;
  stepNumberColorClass: string;
  title: string;
  description: string;
  metaphor?: string;
  details: string[];
  pageTab?: "mcps" | "skills" | "agents" | "rules" | "hooks" | "plugins" | "context";
  pageLabel?: string;
  isLast?: boolean;
}

export function ConceptCard({
  icon: Icon,
  iconColorClass,
  iconBgClass,
  dotColorClass,
  ringColorClass,
  stepNumber,
  stepNumberColorClass,
  title,
  description,
  metaphor,
  details,
  pageTab,
  pageLabel,
  isLast,
}: ConceptCardProps) {
  const [open, setOpen] = useState(false);
  const { setActiveTab } = useWorkspaceStore();

  return (
    <div className={cn("relative pl-12", !isLast && "pb-4")}>
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-[2px] bg-border/60" />
      )}

      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-[14px] h-6 w-6 rounded-full flex items-center justify-center",
          ringColorClass
        )}
      >
        <div className={cn("h-3 w-3 rounded-full", dotColorClass)} />
      </div>

      {/* Card */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/30",
          open && "shadow-sm"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              iconBgClass
            )}
          >
            <Icon className={cn("h-4.5 w-4.5", iconColorClass)} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "font-mono text-[10px] font-medium",
                  stepNumberColorClass
                )}
              >
                {stepNumber}
              </span>
              <h3 className="font-semibold leading-tight">{title}</h3>
            </div>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              {description}
            </p>
            {metaphor && (
              <p className="mt-1.5 text-xs leading-snug text-muted-foreground/70 italic">
                {metaphor}
              </p>
            )}
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform mt-1",
              open && "rotate-180"
            )}
          />
        </div>

        {open && (
          <div className="mt-3 border-t border-border pt-3 ml-12">
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
      </button>
    </div>
  );
}
