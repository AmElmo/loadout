//! Tauri commands for Skills management

use crate::scanners::skills::{scan_all_skills, SkillScanResult, SkillSourceTool};
use crate::writers::atomic::atomic_write;
use serde::Serialize;
use std::path::PathBuf;

/// Scan all skills from Claude Code, Codex CLI, and Gemini CLI
#[tauri::command]
pub fn scan_skills(workspace_path: Option<String>) -> Result<SkillScanResult, String> {
    scan_all_skills(workspace_path.as_deref())
}

/// A single version of a skill for conflict resolution comparison
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillVersion {
    pub source_tool: SkillSourceTool,
    pub scope: String,
    pub path: String,
    pub content: String,
    pub last_modified: Option<String>,
}

/// Get detailed information about each version of a conflicting skill.
///
/// Reads each path, returns the content and filesystem mtime so the
/// frontend can render a side-by-side diff with "which is newer" hints.
#[tauri::command]
pub fn get_skill_conflict_details(
    skill_name: String,
    paths: Vec<String>,
) -> Result<Vec<SkillVersion>, String> {
    let mut versions: Vec<SkillVersion> = Vec::new();

    for path_str in &paths {
        let path = PathBuf::from(path_str);
        if !path.exists() {
            continue;
        }

        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read {}: {}", path_str, e))?;

        let last_modified = std::fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok())
            .map(|mtime| {
                let duration = mtime
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default();
                // Return ISO 8601 timestamp
                let secs = duration.as_secs() as i64;
                chrono_lite_format(secs)
            });

        // Infer source tool and scope from the path
        let (source_tool, scope) = infer_tool_and_scope(path_str, &skill_name);

        versions.push(SkillVersion {
            source_tool,
            scope,
            path: path_str.clone(),
            content,
            last_modified,
        });
    }

    if versions.is_empty() {
        return Err(format!(
            "No valid versions found for skill '{}'",
            skill_name
        ));
    }

    Ok(versions)
}

/// Resolve a skill conflict by overwriting target paths with the chosen version.
///
/// Pre-validates all targets before writing to avoid partial application.
/// Uses atomic writes with backups for safety.
#[tauri::command]
pub fn resolve_skill_conflict(
    skill_name: String,
    chosen_path: String,
    target_paths: Vec<String>,
) -> Result<(), String> {
    let source = PathBuf::from(&chosen_path);
    if !source.exists() {
        return Err(format!("Source file does not exist: {}", chosen_path));
    }

    let content = std::fs::read_to_string(&source)
        .map_err(|e| format!("Failed to read source {}: {}", chosen_path, e))?;

    // Pre-validate: ensure all targets exist before writing any
    let targets: Vec<PathBuf> = target_paths
        .iter()
        .filter(|p| p.as_str() != chosen_path)
        .map(PathBuf::from)
        .collect();

    for target in &targets {
        if !target.exists() {
            return Err(format!(
                "Target file does not exist: {}. Cannot resolve conflict for skill '{}'.",
                target.display(),
                skill_name
            ));
        }
    }

    // All targets validated — now perform writes
    for target in &targets {
        atomic_write(target, &content)?;
    }

    Ok(())
}

/// Format a Unix timestamp as an ISO 8601 string without pulling in chrono.
fn chrono_lite_format(epoch_secs: i64) -> String {
    // Simple UTC formatter: YYYY-MM-DDTHH:MM:SSZ
    const SECS_PER_MIN: i64 = 60;
    const SECS_PER_HOUR: i64 = 3600;
    const SECS_PER_DAY: i64 = 86400;

    let mut remaining = epoch_secs;
    let days = remaining / SECS_PER_DAY;
    remaining %= SECS_PER_DAY;
    let hours = remaining / SECS_PER_HOUR;
    remaining %= SECS_PER_HOUR;
    let minutes = remaining / SECS_PER_MIN;
    let seconds = remaining % SECS_PER_MIN;

    // Convert days since epoch to year/month/day
    let (year, month, day) = days_to_ymd(days);

    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        year, month, day, hours, minutes, seconds
    )
}

/// Convert days since Unix epoch to (year, month, day).
fn days_to_ymd(days_since_epoch: i64) -> (i64, i64, i64) {
    // Algorithm from https://howardhinnant.github.io/date_algorithms.html
    let z = days_since_epoch + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    (y, m, d)
}

/// Infer the source tool and scope from a skill file path.
fn infer_tool_and_scope(path: &str, _skill_name: &str) -> (SkillSourceTool, String) {
    let tool = if path.contains("/.claude/") || path.contains("\\.claude\\") {
        SkillSourceTool::Claude
    } else if path.contains("/.agents/")
        || path.contains("\\.agents\\")
        || path.contains("/.codex/")
        || path.contains("\\.codex\\")
    {
        SkillSourceTool::Codex
    } else if path.contains("/.gemini/") || path.contains("\\.gemini\\") {
        SkillSourceTool::Gemini
    } else if path.contains("/.cursor/") || path.contains("\\.cursor\\") {
        SkillSourceTool::Cursor
    } else if path.contains("/.copilot/")
        || path.contains("\\.copilot\\")
        || path.contains("/.github/")
        || path.contains("\\.github\\")
    {
        SkillSourceTool::Copilot
    } else if path.contains("/.codeium/")
        || path.contains("\\.codeium\\")
        || path.contains("/.windsurf/")
        || path.contains("\\.windsurf\\")
    {
        SkillSourceTool::Windsurf
    } else if path.contains("/.roo/") || path.contains("\\.roo\\") {
        SkillSourceTool::Roo
    } else if path.contains("/.cline/") || path.contains("\\.cline\\") {
        SkillSourceTool::Cline
    } else if path.contains("/.kilocode/") || path.contains("\\.kilocode\\") {
        SkillSourceTool::Kilo
    } else if path.contains("/opencode/")
        || path.contains("/.opencode/")
        || path.contains("\\.opencode\\")
    {
        SkillSourceTool::OpenCode
    } else {
        SkillSourceTool::Claude // fallback
    };

    // Scope: if path is under a home directory config dir -> user, otherwise project
    let scope = if let Some(home) = crate::helpers::effective_home() {
        let home_str = home.to_string_lossy().to_string();
        if path.starts_with(&home_str)
            && !path.contains("/.")  // not a nested hidden dir in a project
            || path.contains(&format!("{}/.claude/", home_str))
            || path.contains(&format!("{}/.agents/", home_str))
            || path.contains(&format!("{}/.gemini/", home_str))
            || path.contains(&format!("{}/.cursor/", home_str))
            || path.contains(&format!("{}/.copilot/", home_str))
            || path.contains(&format!("{}/.codeium/", home_str))
            || path.contains(&format!("{}/.roo/", home_str))
            || path.contains(&format!("{}/.cline/", home_str))
            || path.contains(&format!("{}/.kilocode/", home_str))
            || path.contains(&format!("{}/.config/opencode/", home_str))
        {
            "user".to_string()
        } else {
            "project".to_string()
        }
    } else {
        "user".to_string()
    };

    (tool, scope)
}
