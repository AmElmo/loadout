import { useEffect, useRef, useState } from "react";
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
  FolderSearch,
  Terminal,
} from "lucide-react";
import type { RepoScanResult, RepoWithoutRules, SourceTool } from "@/types";
import { Button } from "@/components/ui/button";
import { ToolLogo } from "@/components/ToolLogo";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { scanReposWithoutRules } from "@/lib/api/repos";

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

/** Terminal-style streaming output that auto-scrolls to bottom */
function CliOutputStream({ lines }: { lines: string[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  if (lines.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
        <Terminal className="h-3.5 w-3.5" />
        <span>Waiting for output...</span>
        <span className="inline-block h-3.5 w-[2px] animate-pulse bg-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="max-h-48 overflow-auto bg-[#1a1a2e] p-3 font-mono text-xs leading-relaxed text-green-400/90"
    >
      {lines.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap break-all">
          {line || "\u00A0"}
        </div>
      ))}
      <span className="inline-block h-3.5 w-[2px] animate-pulse bg-green-400/70" />
    </div>
  );
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
  const [generatingTool, setGeneratingTool] = useState<SourceTool | null>(null);
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
      const unlisten = await listen<{ repoPath: string; line: string }>("cli-output", (event) => {
        if (event.payload.repoPath === repo.path) {
          setOutput((prev) => [...prev, event.payload.line]);
        }
      });

      await invoke("create_rules_with_cli", {
        tool: tool.id,
        repoPath: repo.path,
        prompt,
      });

      unlisten();
      setSuccess(true);
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
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header bar */}
        <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
          <ToolLogo tool={(generatingTool ?? "claude") as SourceTool} size={14} />
          <span className="text-sm font-medium">
            Generating {tool?.generates} for {repo.name}
          </span>
          <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
        </div>

        {/* Terminal output */}
        <CliOutputStream lines={output} />

        {error && (
          <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-2 flex items-center gap-2 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-card/80">
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
              <span className="max-w-[200px] truncate" title={repo.lastCommitMessage}>
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
          <p className="mt-1.5 text-xs italic text-muted-foreground">No commits yet</p>
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
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setShowCliMenu(false)}
            />
            <div className="absolute right-0 top-full z-[70] mt-1 w-64 overflow-hidden rounded-lg border border-border bg-background shadow-xl">
              {installedClis && installedClis.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  No CLI tools found. Install Claude Code, Codex, or Gemini CLI.
                </div>
              ) : (
                <div className="p-1">
                  {CLI_TOOLS.filter(
                    (t) => !installedClis || installedClis.includes(t.id)
                  ).map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleSelectCli(tool)}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted"
                    >
                      <ToolLogo tool={tool.id} size={14} />
                      <span>
                        Create with {tool.label}
                      </span>
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        {tool.generates}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Loading state shown inside the modal while scanning */
function ScanLoadingContent() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <FolderSearch className="h-8 w-8 text-primary" />
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/10" style={{ animationDuration: "1.5s" }} />
        <div className="absolute inset-[-4px] animate-spin rounded-full border-2 border-transparent border-t-primary/30" style={{ animationDuration: "2s" }} />
      </div>
      <p className="text-sm font-medium">Scanning your repos...</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Looking for git repositories without AI rules files
      </p>
      {/* Shimmer bar */}
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-1/3 rounded-full bg-primary/50" style={{ animation: "shimmer 1.5s ease-in-out infinite" }} />
      </div>
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-150%); }
          100% { transform: translateX(450%); }
        }
      `}</style>
    </div>
  );
}

interface RepoScanModalProps {
  onClose: () => void;
}

/**
 * Full overlay modal that opens immediately, runs the scan with a loading animation,
 * then shows results. Closes cleanly — nothing persists on the Rules page.
 */
export function RepoScanModal({ onClose }: RepoScanModalProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<RepoScanResult | null>(null);
  const [repos, setRepos] = useState<RepoWithoutRules[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runScan() {
      try {
        const [scanResult] = await Promise.all([
          scanReposWithoutRules(),
          // minimum time so the loading animation is visible
          new Promise((r) => setTimeout(r, 1200)),
        ]);
        if (!cancelled) {
          setResult(scanResult);
          setRepos(scanResult.repos);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    }

    runScan();
    return () => { cancelled = true; };
  }, []);

  const handleRemoveRepo = (path: string) => {
    setRepos((prev) => prev.filter((r) => r.path !== path));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-lg border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FolderSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Repos Without Rules</h2>
              {result && (
                <p className="text-xs text-muted-foreground">
                  {result.reposWithoutRules} of {result.totalReposScanned} repos have no rules
                  <span className="ml-1 opacity-60">
                    ({result.scanDurationMs}ms)
                  </span>
                </p>
              )}
              {loading && (
                <p className="text-xs text-muted-foreground">Scanning...</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {loading && <ScanLoadingContent />}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="mb-3 h-8 w-8 text-red-500" />
              <h3 className="font-medium text-red-600">Failed to scan repos</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {!loading && !error && repos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PartyPopper className="mb-3 h-10 w-10 text-green-500" />
              <h3 className="text-lg font-medium">All your repos have rules configured!</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Every git repository on your machine has at least one AI rules file.
              </p>
            </div>
          )}

          {!loading && !error && repos.length > 0 && (
            <div className="space-y-2">
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
        {!loading && result && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-3.5 w-3.5" />
              <span>{result.reposWithRules} repos already have rules</span>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
