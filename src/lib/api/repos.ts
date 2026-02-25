import { invoke } from "@tauri-apps/api/core";
import type { RepoScanResult } from "@/types";

/**
 * Scan home directory for git repos without any AI rules files.
 * Returns repos sorted by last commit date (most recent first).
 */
export async function scanReposWithoutRules(
  maxDepth?: number
): Promise<RepoScanResult> {
  return invoke<RepoScanResult>("scan_repos_without_rules", { maxDepth });
}
