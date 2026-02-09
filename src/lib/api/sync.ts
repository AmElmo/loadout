import { invoke } from "@tauri-apps/api/core";
import type {
  AddMCPRequest,
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
 * Sync an existing MCP from one tool to other tools (copies real env values)
 */
export async function syncMCPToTools(
  request: SyncMCPRequest
): Promise<WriteResult> {
  return invoke<WriteResult>("sync_mcp_to_tools", { request });
}
