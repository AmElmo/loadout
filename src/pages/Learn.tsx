import {
  Server,
  Sparkles,
  FileText,
  Anchor,
  BarChart3,
  Layers,
} from "lucide-react";
import { ConceptCard, EcosystemTable } from "@/components/learn";

export function Learn() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Learn</h2>
        <p className="mt-1 text-muted-foreground">
          A quick reference to the concepts Loadout helps you manage
        </p>
      </div>

      {/* Building Blocks */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Building Blocks
        </h3>
        <div className="grid gap-4 lg:grid-cols-2">
          <ConceptCard
            icon={Server}
            iconColorClass="text-cyan-500"
            iconBgClass="bg-cyan-500/10"
            title="MCPs"
            description="Model Context Protocol servers give AI agents new capabilities — like browsing the web, querying databases, or managing files."
            details={[
              "stdio type: runs a local process via a shell command (e.g., npx, uvx)",
              "http type: connects to a remote URL endpoint",
              "Configured in tool-specific config files (see ecosystem table below)",
              "Tool definitions consume context tokens on every message",
            ]}
            pageTab="mcps"
            pageLabel="Go to MCPs page"
          />

          <ConceptCard
            icon={Sparkles}
            iconColorClass="text-purple-500"
            iconBgClass="bg-purple-500/10"
            title="Skills"
            description="Reusable instruction sets stored as SKILL.md files. Invoked as /slash-commands to teach the AI how to do specific tasks."
            details={[
              "Only the description is loaded at idle (low token cost)",
              "Full content loads only when the skill is invoked (active cost)",
              "Defined in .claude/skills/<name>/SKILL.md (path varies by tool)",
              "Priority order varies by tool — check each tool's docs for shadowing behavior",
            ]}
            pageTab="skills"
            pageLabel="Go to Skills page"
          />

          <ConceptCard
            icon={FileText}
            iconColorClass="text-amber-500"
            iconBgClass="bg-amber-500/10"
            title="Rules"
            description="System instruction files injected into the AI's context on every message. They shape how the agent behaves in your project."
            details={[
              "Always-loaded rules: full content in context on every turn",
              "Scoped rules: only loaded when the agent works on matching files",
              "Each tool uses its own file: CLAUDE.md, AGENTS.md, or GEMINI.md",
              "High token cost — keep them concise",
            ]}
            pageTab="rules"
            pageLabel="Go to Rules page"
          />

          <ConceptCard
            icon={Anchor}
            iconColorClass="text-muted-foreground"
            iconBgClass="bg-muted"
            title="Hooks"
            description="Shell commands that run automatically at lifecycle events — before or after a tool call, when a session starts or ends."
            details={[
              "Supported in Claude Code and Gemini CLI",
              "Events: PreToolUse, PostToolUse, SessionStart, SessionEnd, and more",
              "Can be scoped to specific tools (e.g., only before file writes)",
              "Codex CLI has only a basic notify mechanism",
            ]}
            pageTab="hooks"
            pageLabel="Go to Hooks page"
          />

          <ConceptCard
            icon={BarChart3}
            iconColorClass="text-primary"
            iconBgClass="bg-primary/10"
            title="Context Window"
            description="The 200K-token budget shared by all your rules, skills, and MCP tool definitions. Understanding it helps you optimize your setup."
            details={[
              "Idle tokens: consumed on every message, even when items aren't used",
              "Active tokens: consumed only when you invoke a skill",
              "Rules and MCP definitions are always idle cost",
              "Claude's Tool Search can reduce MCP idle cost dynamically",
            ]}
            pageTab="context"
            pageLabel="Go to Context page"
          />

          <ConceptCard
            icon={Layers}
            iconColorClass="text-emerald-500"
            iconBgClass="bg-emerald-500/10"
            title="Scope"
            description="Config items are either user-level (global, applies to all projects) or project-level (specific to a workspace)."
            details={[
              "User-level: stored in your home directory, always active",
              "Project-level: stored in the workspace root, only active there",
              "Shadowing: a project-level item overrides a user-level item with the same name",
              "Select a workspace in the sidebar to see both scopes",
            ]}
          />
        </div>
      </div>

      {/* Ecosystem */}
      <EcosystemTable />
    </div>
  );
}
