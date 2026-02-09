import { invoke } from "@tauri-apps/api/core";
import type { DiscoveryResult } from "@/types";

export interface WorkspaceInfo {
  path: string;
  repo_root: string | null;
  name: string;
}

export async function getWorkspaceInfo(path: string): Promise<WorkspaceInfo> {
  return invoke<WorkspaceInfo>("get_workspace_info", { path });
}

export async function findRepoRoot(path: string): Promise<string | null> {
  return invoke<string | null>("find_repo_root", { path });
}

export async function getHomeDir(): Promise<string | null> {
  return invoke<string | null>("get_home_dir");
}

/**
 * Discover workspaces with AI CLI configs across the home directory
 */
export async function discoverWorkspaces(
  maxDepth?: number
): Promise<DiscoveryResult> {
  return invoke<DiscoveryResult>("discover_ai_workspaces", { maxDepth });
}
