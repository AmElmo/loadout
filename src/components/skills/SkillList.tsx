import { Sparkles } from "lucide-react";
import { useState } from "react";
import type { SkillItem } from "@/types";
import { SkillCard } from "./SkillCard";
import { SkillViewer } from "./SkillViewer";

interface SkillListProps {
  skills: SkillItem[];
}

export function SkillList({ skills }: SkillListProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="font-medium">No Skills Found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          No skills are configured in Claude Code, Codex CLI, or Gemini CLI.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Add skills to:</p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          <li>
            <code className="rounded bg-muted px-1">
              ~/.claude/skills/&lt;name&gt;/SKILL.md
            </code>{" "}
            for Claude Code
          </li>
          <li>
            <code className="rounded bg-muted px-1">
              ~/.agents/skills/&lt;name&gt;/SKILL.md
            </code>{" "}
            for Codex CLI
          </li>
          <li>
            <code className="rounded bg-muted px-1">
              ~/.gemini/skills/&lt;name&gt;/SKILL.md
            </code>{" "}
            for Gemini CLI
          </li>
        </ul>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {skills.map((skill) => (
          <SkillCard
            key={skill.id}
            skill={skill}
            onClick={() => setSelectedSkill(skill)}
          />
        ))}
      </div>

      {selectedSkill && (
        <SkillViewer
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </>
  );
}
