import {
  Unplug,
  Hammer,
  Bot,
  FileText,
  Anchor,
  Puzzle,
  BarChart3,
  Layers,
  Blocks,
} from "lucide-react";
import { ConceptCard, EcosystemTable } from "@/components/learn";

export function Learn() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Learn</h2>
        <p className="mt-1 text-muted-foreground">
          Master the building blocks that power your AI coding tools
        </p>
      </div>

      {/* Building Blocks */}
      <div className="mb-8">
        <div className="mb-5 flex items-center gap-2">
          <Blocks className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Building Blocks
          </h3>
        </div>

        <div className="max-w-3xl">
          <ConceptCard
            icon={Unplug}
            iconColorClass="text-cyan-500"
            iconBgClass="bg-cyan-500/10"
            dotColorClass="bg-cyan-400"
            ringColorClass="bg-cyan-400/15"
            stepNumber="01"
            stepNumberColorClass="text-cyan-500/50"
            title="MCPs"
            description="Model Context Protocol servers give AI agents new capabilities — like browsing the web, querying databases, or managing files."
            metaphor="Think of it as the software your company runs on — Slack, Jira, Salesforce. Each MCP gives the AI access to a new tool it needs to get the job done."
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
            icon={Hammer}
            iconColorClass="text-purple-500"
            iconBgClass="bg-purple-500/10"
            dotColorClass="bg-purple-400"
            ringColorClass="bg-purple-400/15"
            stepNumber="02"
            stepNumberColorClass="text-purple-500/50"
            title="Skills"
            description="Reusable instruction sets stored as SKILL.md files. Invoked as /slash-commands to teach the AI how to do specific tasks."
            metaphor="Think of it as your company's SOPs and playbooks — documented procedures any employee can pull up when they need to do a specific task the right way."
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
            icon={Bot}
            iconColorClass="text-pink-500"
            iconBgClass="bg-pink-500/10"
            dotColorClass="bg-pink-400"
            ringColorClass="bg-pink-400/15"
            stepNumber="03"
            stepNumberColorClass="text-pink-500/50"
            title="Subagents"
            description="Predefined personas or modes that combine a custom system prompt with optional MCP servers. They let you spin up specialized AI assistants on demand."
            metaphor="Think of it as contractors you bring in for specialized work — a security auditor, a designer, a tax accountant — each pre-briefed and equipped for their role."
            details={[
              "Defined as markdown files in .claude/agents/ (Claude) or .gemini/agents/ (Gemini)",
              "Each subagent has a name, description, and instruction prompt",
              "Can bundle MCP servers so the subagent has the right tools available",
              "Invoked via /agent command — similar to skills but with persistent identity",
              "User-level subagents are global; project-level subagents are workspace-scoped",
            ]}
            pageTab="agents"
            pageLabel="Go to Subagents page"
          />

          <ConceptCard
            icon={FileText}
            iconColorClass="text-amber-500"
            iconBgClass="bg-amber-500/10"
            dotColorClass="bg-amber-400"
            ringColorClass="bg-amber-400/15"
            stepNumber="04"
            stepNumberColorClass="text-amber-500/50"
            title="Rules"
            description="System instruction files injected into the AI's context on every message. They shape how the agent behaves in your project."
            metaphor="Think of it as your company culture and brand guidelines — the principles everyone internalizes and follows on every decision, without being asked."
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
            dotColorClass="bg-zinc-400 dark:bg-zinc-500"
            ringColorClass="bg-zinc-400/15"
            stepNumber="05"
            stepNumberColorClass="text-muted-foreground/50"
            title="Hooks"
            description="Shell commands that run automatically at lifecycle events — before or after a tool call, when a session starts or ends."
            metaphor="Think of it as your automated workflows — the onboarding checklist that triggers when someone joins, the approval flow that kicks in before a deploy."
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
            icon={Puzzle}
            iconColorClass="text-orange-500"
            iconBgClass="bg-orange-500/10"
            dotColorClass="bg-orange-400"
            ringColorClass="bg-orange-400/15"
            stepNumber="06"
            stepNumberColorClass="text-orange-500/50"
            title="Plugins"
            description="Installable packages that bundle MCPs, skills, hooks, agents, and commands into a single unit. Install one plugin and get a whole toolkit pre-wired."
            metaphor="Think of it as a franchise package — instead of setting up accounting, branding, and training separately, you get the whole turnkey operation in one box."
            details={[
              "Supported in Claude Code, Claude Desktop, Gemini CLI (as extensions), and Cursor",
              "Can contain any combination of: commands, skills, MCP servers, hooks, agents, LSP servers",
              "Installed via /plugin install or from a marketplace catalog",
              "Scoped to user-level, project-level, or local — just like other config",
              "Auto-updated from registered marketplaces on startup",
            ]}
            pageTab="plugins"
            pageLabel="Go to Plugins page"
          />

          <ConceptCard
            icon={BarChart3}
            iconColorClass="text-primary"
            iconBgClass="bg-primary/10"
            dotColorClass="bg-primary/70"
            ringColorClass="bg-primary/10"
            stepNumber="07"
            stepNumberColorClass="text-primary/50"
            title="Context Window"
            description="The 200K-token budget shared by all your rules, skills, and MCP tool definitions. Understanding it helps you optimize your setup."
            metaphor="Think of it as your team's bandwidth — there's only so many things everyone can keep in mind at once. The more policies and tools you pile on, the less headspace left for actual work."
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
            dotColorClass="bg-emerald-400"
            ringColorClass="bg-emerald-400/15"
            stepNumber="08"
            stepNumberColorClass="text-emerald-500/50"
            title="Scope"
            description="Config items are either user-level (global, applies to all projects) or project-level (specific to a workspace)."
            metaphor="Think of it as company-wide policy vs. department rules — HR policies apply to everyone, but each team can add their own working agreements on top."
            details={[
              "User-level: stored in your home directory, always active",
              "Project-level: stored in the workspace root, only active there",
              "Shadowing: a project-level item overrides a user-level item with the same name",
              "Select a workspace in the sidebar to see both scopes",
            ]}
            isLast
          />
        </div>
      </div>

      {/* Ecosystem */}
      <EcosystemTable />
    </div>
  );
}
