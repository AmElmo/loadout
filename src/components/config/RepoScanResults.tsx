import { useState } from "react";
import {
  X,
  GitBranch,
  Clock,
  User,
  FolderOpen,
  Hash,
  PartyPopper,
  Wand2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { RepoScanResult, RepoWithoutRules } from "@/types";
import { Button } from "@/components/ui/button";
import { ToolLogo } from "@/components/ToolLogo";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

/** CLI tools that can generate rules files */
interface CliTool {
  id: "claude" | "codex" | "gemini";
  label: string;
  generates: string;
}

const CLI_TOOLS: CliTool[] = [
  { id: "claude", label: "Claude Code", generates: "CLAUDE.md" },
  { id: "codex", label: "Codex", generates: "AGENTS.md" },
  { id: "gemini", label: "Gemini CLI", generates: "GEMINI.md" },
];

interface RepoScanResultsProps {
  result: RepoScanResult;
  onClose: () => void;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${diffYears}y ago`;
}

function truncatePath(path: string): string {
  const home = path.replace(/^\/Users\/[^/]+/, "~");
  if (home.length <= 60) return home;
  const parts = home.split("/");
  if (parts.length <= 3) return home;
  return `${parts[0]}/.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function RepoCard({
  repo,
  onRemove,
}: {
  repo: RepoWithoutRules;
  onRemove: (path: string) => void;
}) {
  const [showCliMenu, setShowCliMenu] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingTool, setGeneratingTool] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installedClis, setInstalledClis] = useState<string[] | null>(null);
  const [checkingClis, setCheckingClis] = useState(false);

  const handleCreateRules = async () => {
    if (installedClis === null) {
      setCheckingClis(true);
      try {
        const result = await invoke<{ tools: { id: string; hasBinary: boolean }[] }>("detect_installed_tools");
        const clis = result.tools
          .filter((t) => CLI_TOOLS.some((c) => c.id === t.id) && t.hasBinary)
          .map((t) => t.id);
        setInstalledClis(clis);
      } catch {
        setInstalledClis([]);
      } finally {
        setCheckingClis(false);
      }
    }
    setShowCliMenu(true);
  };

  const handleSelectCli = async (tool: CliTool) => {
    setShowCliMenu(false);
    setGenerating(true);
    setGeneratingTool(tool.id);
    setOutput([]);
    setError(null);

    const prompt = `Analyze this project and generate a ${tool.generates} file. Look at the project structure, tech stack, existing configuration, README, and coding conventions. The rules file should include: project overview and structure, tech stack and key dependencies, build/run/test commands, coding conventions and patterns used, any important architectural decisions visible in the code. Write the file directly to the project root. Be concise and practical — focus on information that would help an AI coding assistant work effectively in this codebase.`;

    try {
      // Listen for streaming output events
      const unlisten = await listen<string>("cli-output", (event) => {
        setOutput((prev) => [...prev, event.payload]);
      });

      await invoke("create_rules_with_cli", {
        tool: tool.id,
        repoPath: repo.path,
        prompt,
      });

      unlisten();
      setSuccess(true);
      // Remove from list after short delay
      setTimeout(() => onRemove(repo.path), 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setGenerating(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-medium">
            Created {generatingTool && CLI_TOOLS.find((t) => t.id === generatingTool)?.generates} for {repo.name}
          </span>
        </div>
      </div>
    );
  }

  if (generating) {
    const tool = CLI_TOOLS.find((t) => t.id === generatingTool);
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm font-medium">
            Generating {tool?.generates} for {repo.name}...
          </span>
        </div>
        {output.length > 0 && (
          <div className="max-h-40 overflow-auto rounded bg-muted p-3 font-mono text-xs">
            {output.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}
        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-medium">{repo.name}</h3>
          {repo.currentBranch && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {repo.currentBranch}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground" title={repo.path}>
          {truncatePath(repo.path)}
        </p>
        {repo.lastCommitDate ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(repo.lastCommitDate)}
            </span>
            {repo.lastCommitMessage && (
              <span className="truncate max-w-[200px]" title={repo.lastCommitMessage}>
                {repo.lastCommitMessage}
              </span>
            )}
            {repo.lastCommitAuthor && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {repo.lastCommitAuthor}
              </span>
            )}
            {repo.commitCount != null && (
              <span className="inline-flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {repo.commitCount.toLocaleString()} commits
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground italic">No commits yet</p>
        )}
      </div>

      {/* Actions */}
      <div className="relative shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreateRules}
          disabled={checkingClis}
        >
          {checkingClis ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Create rules
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>

        {showCliMenu && (
          <>
            {/* Backdrop to close menu */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowCliMenu(false)}
            />
            <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-1 shadow-lg">
              {installedClis && installedClis.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  No CLI tools found. Install Claude Code, Codex, or Gemini CLI.
                </div>
              ) : (
                CLI_TOOLS.filter(
                  (t) => !installedClis || installedClis.includes(t.id)
                ).map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => handleSelectCli(tool)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    <ToolLogo tool={tool.id} size={14} />
                    <span>
                      Create with {tool.label}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {tool.generates}
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function RepoScanResults({ result, onClose }: RepoScanResultsProps) {
  const [repos, setRepos] = useState(result.repos);

  const handleRemoveRepo = (path: string) => {
    setRepos((prev) => prev.filter((r) => r.path !== path));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">Repos Without Rules</h2>
            <p className="text-sm text-muted-foreground">
              Found {result.reposWithoutRules} repos without rules out of{" "}
              {result.totalReposScanned} total repos
              <span className="ml-1 text-xs">
                (scanned in {result.scanDurationMs}ms)
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {repos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PartyPopper className="mb-3 h-10 w-10 text-green-500" />
              <h3 className="text-lg font-medium">All your repos have rules configured!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every git repository on your machine has at least one AI rules file.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map((repo) => (
                <RepoCard
                  key={repo.path}
                  repo={repo}
                  onRemove={handleRemoveRepo}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-3.5 w-3.5" />
            <span>
              {result.reposWithRules} repos already have rules
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
