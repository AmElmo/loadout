import { invoke } from "@tauri-apps/api/core";
import type { PromptScanResult, HookScanResult } from "@/types";

/**
 * Scan system prompt / rule files (CLAUDE.md, AGENTS.md, GEMINI.md)
 */
export async function scanRules(
  workspacePath?: string
): Promise<PromptScanResult> {
  return invoke<PromptScanResult>("scan_rules", { workspacePath });
}

/**
 * Scan hook configurations from Claude and Gemini settings.
 * Pass workspacePath to include project-level hooks from
 * <workspace>/.claude/settings.json and <workspace>/.gemini/settings.json.
 */
export async function scanHooks(
  workspacePath?: string
): Promise<HookScanResult> {
  return invoke<HookScanResult>("scan_hooks", { workspacePath });
}
