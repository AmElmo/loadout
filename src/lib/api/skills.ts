import { invoke } from "@tauri-apps/api/core";
import type { SkillScanResult, SkillVersion } from "@/types";

/**
 * Scan all skills from Claude Code, Codex CLI, and Gemini CLI
 */
export async function scanSkills(
  workspacePath?: string
): Promise<SkillScanResult> {
  return invoke<SkillScanResult>("scan_skills", { workspacePath });
}

/**
 * Get detailed version information for a conflicting skill.
 * Returns content + last-modified timestamp for each path.
 */
export async function getSkillConflictDetails(
  skillName: string,
  paths: string[]
): Promise<SkillVersion[]> {
  return invoke<SkillVersion[]>("get_skill_conflict_details", {
    skillName,
    paths,
  });
}

/**
 * Resolve a skill conflict by overwriting target paths with the chosen version.
 */
export async function resolveSkillConflict(
  skillName: string,
  chosenPath: string,
  targetPaths: string[]
): Promise<void> {
  return invoke<void>("resolve_skill_conflict", {
    skillName,
    chosenPath,
    targetPaths,
  });
}
