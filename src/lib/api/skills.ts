import { invoke } from "@tauri-apps/api/core";
import type { SkillScanResult } from "@/types";

/**
 * Scan all skills from Claude Code, Codex CLI, and Gemini CLI
 */
export async function scanSkills(
  workspacePath?: string
): Promise<SkillScanResult> {
  return invoke<SkillScanResult>("scan_skills", { workspacePath });
}
