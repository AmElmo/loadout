import { useState } from "react";
import { FileText, User, FolderOpen, Crosshair } from "lucide-react";
import type { PromptFile } from "@/types";
import { RuleCard } from "./RuleCard";
import { RuleViewer } from "./RuleViewer";

interface PromptsSectionProps {
  prompts: PromptFile[];
  workspaceName?: string;
}

export function PromptsSection({ prompts, workspaceName }: PromptsSectionProps) {
  const [selectedRule, setSelectedRule] = useState<PromptFile | null>(null);

  const existingPrompts = prompts.filter((p) => p.exists);

  const userRules = existingPrompts.filter((p) => p.scope === "user");
  const projectRules = existingPrompts.filter((p) => p.scope === "project");
  const alwaysLoadedProjectRules = projectRules.filter((p) => !p.isScoped);
  const scopedProjectRules = projectRules.filter((p) => p.isScoped);
  const hasBothTypes = alwaysLoadedProjectRules.length > 0 && scopedProjectRules.length > 0;

  if (existingPrompts.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium">No Rules Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No system instruction files found for Claude Code, Codex CLI, or
          Gemini CLI.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Create a rule file to get started:
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">CLAUDE.md</code> or{" "}
            <code className="rounded bg-muted px-1">.claude/rules/*.md</code>
          </li>
          <li>
            <code className="rounded bg-muted px-1">AGENTS.md</code>
          </li>
          <li>
            <code className="rounded bg-muted px-1">GEMINI.md</code>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* User rules */}
        {userRules.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              User — applies to all projects
            </h4>
            <div className="space-y-2">
              {userRules.map((rule) => (
                <RuleCard
                  key={rule.path}
                  rule={rule}
                  onClick={() => rule.exists && setSelectedRule(rule)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Project rules */}
        {projectRules.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <FolderOpen className="h-3.5 w-3.5" />
              Project{workspaceName ? ` — ${workspaceName}` : ""}
            </h4>

            {/* Always loaded */}
            {alwaysLoadedProjectRules.length > 0 && (
              <div className={scopedProjectRules.length > 0 ? "mb-4" : ""}>
                {hasBothTypes && (
                  <p className="mb-2 text-xs text-muted-foreground">
                    Always loaded
                  </p>
                )}
                <div className="space-y-2">
                  {alwaysLoadedProjectRules.map((rule) => (
                    <RuleCard
                      key={rule.path}
                      rule={rule}
                      onClick={() => rule.exists && setSelectedRule(rule)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Scoped */}
            {scopedProjectRules.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Crosshair className="h-3 w-3" />
                  Scoped — loaded when working on matching files
                </p>
                <div className="space-y-2">
                  {scopedProjectRules.map((rule) => (
                    <RuleCard
                      key={rule.path}
                      rule={rule}
                      onClick={() => rule.exists && setSelectedRule(rule)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRule && (
        <RuleViewer
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </>
  );
}
