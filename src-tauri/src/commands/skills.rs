//! Tauri commands for Skills management

use crate::scanners::skills::{scan_all_skills, SkillScanResult};

/// Scan all skills from Claude Code, Codex CLI, and Gemini CLI
#[tauri::command]
pub fn scan_skills(workspace_path: Option<String>) -> Result<SkillScanResult, String> {
    scan_all_skills(workspace_path.as_deref())
}
