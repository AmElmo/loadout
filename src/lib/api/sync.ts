import { invoke } from "@tauri-apps/api/core";
import type {
  AddMCPRequest,
  FetchedSkill,
  InstallSkillRequest,
  SyncMCPRequest,
  PreviewResult,
  WriteResult,
} from "@/types";

/**
 * Add an MCP to one or more tools
 */
export async function addMCPToTools(
  request: AddMCPRequest
): Promise<WriteResult> {
  return invoke<WriteResult>("add_mcp_to_tools", { request });
}

/**
 * Preview generated configs for each selected tool
 */
export async function previewMCPConfigs(
  request: AddMCPRequest
): Promise<PreviewResult> {
  return invoke<PreviewResult>("preview_mcp_configs", { request });
}

/**
 * Install a skill to one or more tools
 */
export async function installSkillToTools(
  request: InstallSkillRequest
): Promise<WriteResult> {
  return invoke<WriteResult>("install_skill_to_tools", { request });
}

/**
 * Fetch a skill from a URL and parse its frontmatter
 */
export async function fetchSkillFromUrl(
  url: string
): Promise<FetchedSkill> {
  return invoke<FetchedSkill>("fetch_skill_from_url", { url });
}

/**
 * Parse skill content from raw markdown text (for file imports)
 */
export async function parseSkillFileContent(
  content: string,
  filename: string
): Promise<FetchedSkill> {
  return invoke<FetchedSkill>("parse_skill_file_content", { content, filename });
}

/**
 * Read and parse a skill file from disk (for file picker imports)
 */
export async function readSkillFile(
  path: string
): Promise<FetchedSkill> {
  return invoke<FetchedSkill>("read_skill_file", { path });
}

/**
 * Sync an existing MCP from one tool to other tools (copies real env values)
 */
export async function syncMCPToTools(
  request: SyncMCPRequest
): Promise<WriteResult> {
  return invoke<WriteResult>("sync_mcp_to_tools", { request });
}
