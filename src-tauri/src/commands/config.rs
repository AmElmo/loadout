//! Tauri commands for Rules and Hooks pages

use crate::scanners::hooks::{scan_all_hooks, HookScanResult};
use crate::scanners::prompts::{scan_all_prompts, PromptScanResult};

/// Scan system prompt / rule files (CLAUDE.md, AGENTS.md, GEMINI.md)
#[tauri::command]
pub fn scan_rules(workspace_path: Option<String>) -> Result<PromptScanResult, String> {
    scan_all_prompts(workspace_path.as_deref())
}

/// Scan hook configurations from Claude and Gemini settings
#[tauri::command]
pub fn scan_hooks() -> Result<HookScanResult, String> {
    scan_all_hooks()
}
