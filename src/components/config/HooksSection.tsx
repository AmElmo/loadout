import { Anchor, AlertTriangle } from "lucide-react";
import type { HookItem } from "@/types";
import { cn } from "@/lib/utils";
import { OpenPathButton } from "@/components/ui/open-path-button";

interface HooksSectionProps {
  hooks: HookItem[];
  geminiHooksEnabled: boolean;
}

const toolColors: Record<string, string> = {
  claude: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  gemini: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

/** Event mapping between Claude and Gemini */
const EVENT_MAP: [string, string, string][] = [
  ["Before tool", "PreToolUse", "BeforeTool"],
  ["After tool", "PostToolUse", "AfterTool"],
  ["Session start", "SessionStart", "SessionStart"],
  ["Session end", "SessionEnd", "SessionEnd"],
  ["Notifications", "Notification", "Notification"],
  ["Before compress", "PreCompact", "PreCompress"],
];

export function HooksSection({ hooks, geminiHooksEnabled }: HooksSectionProps) {
  const claudeHooks = hooks.filter((h) => h.sourceTool === "claude");
  const geminiHooks = hooks.filter((h) => h.sourceTool === "gemini");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Hooks</h3>

      {/* Gemini hooks disabled warning */}
      {geminiHooks.length > 0 && !geminiHooksEnabled && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <div>
            <span className="font-medium text-yellow-700">
              Gemini hooks are configured but disabled
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add{" "}
              <code className="rounded bg-muted px-1">
                "experiments": {"{"}"enableHooks": true{"}"}
              </code>{" "}
              to <code className="rounded bg-muted px-1">~/.gemini/settings.json</code>
            </p>
          </div>
        </div>
      )}

      {hooks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <Anchor className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No hooks configured. Hooks are available in Claude Code and Gemini
            CLI.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Codex CLI only supports a basic{" "}
            <code className="rounded bg-muted px-1">notify</code> mechanism.
          </p>
        </div>
      ) : (
        <>
          {/* Hooks table */}
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Tool
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Event
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Matcher
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Command
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Config
                  </th>
                </tr>
              </thead>
              <tbody>
                {hooks.map((hook, i) => (
                  <tr
                    key={`${hook.sourceTool}-${hook.event}-${i}`}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      hook.sourceTool === "gemini" &&
                        !geminiHooksEnabled &&
                        "opacity-50"
                    )}
                  >
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase",
                          toolColors[hook.sourceTool]
                        )}
                      >
                        {hook.sourceTool}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {hook.event}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {hook.matcher ?? "*"}
                    </td>
                    <td
                      className="max-w-[300px] truncate px-3 py-2 font-mono text-xs"
                      title={hook.command}
                    >
                      {hook.command}
                    </td>
                    <td className="px-3 py-2">
                      <OpenPathButton
                        path={hook.path}
                        variant="ghost"
                        size="sm"
                        label="Open Config"
                        className="h-7 px-2 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Event mapping reference */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              Event mapping reference
            </summary>
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                      Purpose
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                      Claude Code
                    </th>
                    <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                      Gemini CLI
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EVENT_MAP.map(([purpose, claude, gemini]) => (
                    <tr
                      key={purpose}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-3 py-1.5">{purpose}</td>
                      <td className="px-3 py-1.5 font-mono">
                        {claudeHooks.some((h) => h.event === claude) ? (
                          <span className="text-orange-600">{claude}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {claude}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {geminiHooks.some((h) => h.event === gemini) ? (
                          <span className="text-blue-600">{gemini}</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {gemini}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          <p className="text-xs text-muted-foreground">
            {claudeHooks.length} Claude hook
            {claudeHooks.length !== 1 ? "s" : ""}, {geminiHooks.length} Gemini
            hook{geminiHooks.length !== 1 ? "s" : ""}. Codex only supports{" "}
            <code className="rounded bg-muted px-1">notify</code> (limited).
          </p>
        </>
      )}
    </div>
  );
}
