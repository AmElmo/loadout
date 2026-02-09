import { useState } from "react";
import { FileText, Globe, FolderOpen } from "lucide-react";
import type { PromptFile } from "@/types";
import { RuleCard } from "./RuleCard";
import { RuleViewer } from "./RuleViewer";

interface PromptsSectionProps {
  prompts: PromptFile[];
  workspaceName?: string;
}

export function PromptsSection({ prompts, workspaceName }: PromptsSectionProps) {
  const [selectedRule, setSelectedRule] = useState<PromptFile | null>(null);

  const globalRules = prompts.filter((p) => p.scope === "global");
  const projectRules = prompts.filter((p) => p.scope === "project");

  if (prompts.length === 0) {
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
        {/* Global rules */}
        {globalRules.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              Global — applies to all projects
            </h4>
            <div className="space-y-2">
              {globalRules.map((rule) => (
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
            <div className="space-y-2">
              {projectRules.map((rule) => (
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

      {selectedRule && (
        <RuleViewer
          rule={selectedRule}
          onClose={() => setSelectedRule(null)}
        />
      )}
    </>
  );
}
