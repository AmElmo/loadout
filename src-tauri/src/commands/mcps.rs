//! Tauri commands for MCP management

use crate::scanners::mcps::{scan_all_mcps, MCPItem};

/// Scan all MCP configurations from Claude Code, Codex CLI, and Gemini CLI
#[tauri::command]
pub fn scan_mcps(workspace_path: Option<String>) -> Result<Vec<MCPItem>, String> {
    scan_all_mcps(workspace_path.as_deref())
}
