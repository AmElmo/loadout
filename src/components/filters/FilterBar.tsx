import { cn } from "@/lib/utils";
import type { SourceTool } from "@/types";

interface FilterBarProps {
  activeTools: SourceTool[];
  onToolsChange: (tools: SourceTool[]) => void;
  activeScopes: string[];
  onScopesChange: (scopes: string[]) => void;
  showScopeFilter: boolean;
  scopeOptions?: { value: string; label: string }[];
}

const toolConfig: { id: SourceTool; label: string; activeClass: string }[] = [
  {
    id: "claude",
    label: "Claude",
    activeClass: "bg-orange-500/15 text-orange-600 border-orange-500/30",
  },
  {
    id: "codex",
    label: "Codex",
    activeClass: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  {
    id: "gemini",
    label: "Gemini",
    activeClass: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  },
];

function toggleValue<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

export function FilterBar({
  activeTools,
  onToolsChange,
  activeScopes,
  onScopesChange,
  showScopeFilter,
  scopeOptions = [
    { value: "user", label: "User" },
    { value: "project", label: "Project" },
  ],
}: FilterBarProps) {
  return (
    <div className="mb-4 flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Tool
        </span>
        <div className="flex gap-1">
          {toolConfig.map(({ id, label, activeClass }) => {
            const isActive = activeTools.includes(id);
            return (
              <button
                key={id}
                role="checkbox"
                aria-checked={isActive}
                onClick={() => onToolsChange(toggleValue(activeTools, id))}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                  isActive
                    ? activeClass
                    : "border-border text-muted-foreground hover:bg-muted/50"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {showScopeFilter && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Scope
          </span>
          <div className="flex gap-1">
            {scopeOptions.map(({ value, label }) => {
              const isActive = activeScopes.includes(value);
              return (
                <button
                  key={value}
                  role="checkbox"
                  aria-checked={isActive}
                  onClick={() =>
                    onScopesChange(toggleValue(activeScopes, value))
                  }
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                    isActive
                      ? "border-foreground/20 bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
