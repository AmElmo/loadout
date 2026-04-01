//! Hooks scanner for Claude Code and Gemini CLI
//!
//! Parses hook configurations from settings.json files and normalizes
//! them into a unified view. Codex only has a basic `notify` mechanism.
//!
//! Both Claude Code and Gemini CLI support hooks at two levels:
//! - User-level: ~/.claude/settings[.local].json / ~/.gemini/settings.json
//! - Project-level: <workspace>/.claude/settings[.local].json / <workspace>/.gemini/settings.json
//!
//! Claude Code has both settings.json (shared/git-tracked) and settings.local.json
//! (personal/gitignored). Both can contain hooks, and they're additive.

use crate::parsers::{parse_claude_settings, parse_gemini_config, ClaudeSettings, GeminiConfig};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;

/// Source tool for a hook
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum HookSourceTool {
    Claude,
    Gemini,
    Cursor,
    Copilot,
    Windsurf,
    Cline,
}

/// Scope level for a hook
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum HookScope {
    User,
    Project,
}

/// A normalized hook configuration item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookItem {
    /// Which tool this hook belongs to
    pub source_tool: HookSourceTool,
    /// Scope (user-level or project-level)
    pub scope: HookScope,
    /// Event name (e.g., "PreToolUse", "BeforeTool")
    pub event: String,
    /// Matcher pattern (e.g., "Bash|Write")
    pub matcher: Option<String>,
    /// Command to run
    pub command: String,
    /// Action type (e.g., "command")
    pub action_type: String,
    /// Path to the source config file
    pub path: String,
}

/// Result of scanning all hooks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookScanResult {
    pub hooks: Vec<HookItem>,
    /// Whether Gemini hooks experiment flag is enabled (user-level)
    pub gemini_hooks_enabled: bool,
}

/// Extract hooks from a parsed Claude settings file
fn collect_claude_hooks(settings: &ClaudeSettings, path: &Path, scope: HookScope) -> Vec<HookItem> {
    let mut hooks = Vec::new();
    for (event, matchers) in &settings.hooks {
        for matcher_entry in matchers {
            for action in &matcher_entry.hooks {
                if let Some(cmd) = &action.command {
                    hooks.push(HookItem {
                        source_tool: HookSourceTool::Claude,
                        scope,
                        event: event.clone(),
                        matcher: matcher_entry.matcher.clone(),
                        command: cmd.clone(),
                        action_type: action
                            .action_type
                            .clone()
                            .unwrap_or_else(|| "command".to_string()),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    hooks
}

/// Extract hooks from a parsed Gemini config file
fn collect_gemini_hooks(config: &GeminiConfig, path: &Path, scope: HookScope) -> Vec<HookItem> {
    let mut hooks = Vec::new();
    for (event, matchers) in &config.hooks {
        for matcher_entry in matchers {
            for action in &matcher_entry.hooks {
                if let Some(cmd) = &action.command {
                    hooks.push(HookItem {
                        source_tool: HookSourceTool::Gemini,
                        scope,
                        event: event.clone(),
                        matcher: matcher_entry.matcher.clone(),
                        command: cmd.clone(),
                        action_type: action
                            .action_type
                            .clone()
                            .unwrap_or_else(|| "command".to_string()),
                        path: path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }
    hooks
}

/// Scan all hook configurations (user-level + optional project-level)
pub fn scan_all_hooks(workspace_path: Option<&str>) -> Result<HookScanResult, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let mut hooks: Vec<HookItem> = Vec::new();

    // --- User-level hooks ---
    // Claude Code stores hooks in both settings.json (shared) and settings.local.json (personal).
    // Both are scanned — hooks are additive across files.

    for filename in &["settings.json", "settings.local.json"] {
        let claude_user_path = home_dir.join(".claude").join(filename);
        if let Ok(settings) = parse_claude_settings(&claude_user_path) {
            hooks.extend(collect_claude_hooks(
                &settings,
                &claude_user_path,
                HookScope::User,
            ));
        }
    }

    // Gemini CLI: ~/.gemini/settings.json
    let gemini_user_path = home_dir.join(".gemini").join("settings.json");
    let gemini_user_config = parse_gemini_config(&gemini_user_path).unwrap_or_default();
    let gemini_hooks_enabled = gemini_user_config.experiments.enable_hooks;
    hooks.extend(collect_gemini_hooks(
        &gemini_user_config,
        &gemini_user_path,
        HookScope::User,
    ));

    // --- Project-level hooks ---

    if let Some(ws_path) = workspace_path {
        let ws = Path::new(ws_path);

        // Claude Code: <workspace>/.claude/settings.json and settings.local.json
        for filename in &["settings.json", "settings.local.json"] {
            let claude_project_path = ws.join(".claude").join(filename);
            if claude_project_path.exists() {
                if let Ok(settings) = parse_claude_settings(&claude_project_path) {
                    hooks.extend(collect_claude_hooks(
                        &settings,
                        &claude_project_path,
                        HookScope::Project,
                    ));
                }
            }
        }

        // Gemini CLI: <workspace>/.gemini/settings.json
        let gemini_project_path = ws.join(".gemini").join("settings.json");
        if gemini_project_path.exists() {
            if let Ok(config) = parse_gemini_config(&gemini_project_path) {
                hooks.extend(collect_gemini_hooks(
                    &config,
                    &gemini_project_path,
                    HookScope::Project,
                ));
            }
        }
    }

    // === Cursor hooks (read-only) ===
    // User-level: ~/.cursor/hooks.json
    let cursor_user_hooks = home_dir.join(".cursor").join("hooks.json");
    collect_generic_hooks_json(
        &cursor_user_hooks,
        HookSourceTool::Cursor,
        HookScope::User,
        &mut hooks,
    );

    // Project-level: .cursor/hooks.json
    if let Some(ws_path) = workspace_path {
        let ws = std::path::Path::new(ws_path);
        let cursor_project_hooks = ws.join(".cursor").join("hooks.json");
        collect_generic_hooks_json(
            &cursor_project_hooks,
            HookSourceTool::Cursor,
            HookScope::Project,
            &mut hooks,
        );
    }

    // === Copilot hooks (read-only) ===
    // .github/hooks/*.json
    if let Some(ws_path) = workspace_path {
        let ws = std::path::Path::new(ws_path);
        let github_hooks_dir = ws.join(".github").join("hooks");
        if github_hooks_dir.is_dir() {
            if let Ok(read_dir) = std::fs::read_dir(&github_hooks_dir) {
                for entry in read_dir.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) == Some("json") {
                        collect_generic_hooks_json(
                            &path,
                            HookSourceTool::Copilot,
                            HookScope::Project,
                            &mut hooks,
                        );
                    }
                }
            }
        }
    }

    // === Windsurf hooks (read-only) ===
    // User-level: ~/.codeium/windsurf/hooks.json
    let windsurf_user_hooks = home_dir
        .join(".codeium")
        .join("windsurf")
        .join("hooks.json");
    collect_generic_hooks_json(
        &windsurf_user_hooks,
        HookSourceTool::Windsurf,
        HookScope::User,
        &mut hooks,
    );

    // Project-level: .windsurf/hooks.json
    if let Some(ws_path) = workspace_path {
        let ws = std::path::Path::new(ws_path);
        let windsurf_project_hooks = ws.join(".windsurf").join("hooks.json");
        collect_generic_hooks_json(
            &windsurf_project_hooks,
            HookSourceTool::Windsurf,
            HookScope::Project,
            &mut hooks,
        );
    }

    // === Cline hooks (read-only) ===
    // Project-level: .cline/hooks.json
    if let Some(ws_path) = workspace_path {
        let ws = std::path::Path::new(ws_path);
        let cline_project_hooks = ws.join(".cline").join("hooks.json");
        collect_generic_hooks_json(
            &cline_project_hooks,
            HookSourceTool::Cline,
            HookScope::Project,
            &mut hooks,
        );
    }

    // Sort by scope (user first), then tool, then event
    hooks.sort_by(|a, b| {
        format!("{:?}", a.scope)
            .cmp(&format!("{:?}", b.scope))
            .then_with(|| format!("{:?}", a.source_tool).cmp(&format!("{:?}", b.source_tool)))
            .then_with(|| a.event.cmp(&b.event))
    });

    Ok(HookScanResult {
        hooks,
        gemini_hooks_enabled,
    })
}

/// Parse a generic hooks.json file that uses a Claude/Gemini-compatible format
/// Many tools (Cursor, Copilot, Windsurf, Cline) use similar JSON hook schemas
fn collect_generic_hooks_json(
    path: &std::path::Path,
    tool: HookSourceTool,
    scope: HookScope,
    hooks: &mut Vec<HookItem>,
) {
    if !path.exists() {
        return;
    }

    // Try to parse as a JSON file with hook events
    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return,
    };

    // Try parsing as { "event_name": [...matchers] } format
    if let Ok(parsed) =
        serde_json::from_str::<HashMap<String, Vec<crate::parsers::HookMatcher>>>(&content)
    {
        for (event, matchers) in parsed {
            for matcher_entry in matchers {
                for action in &matcher_entry.hooks {
                    if let Some(cmd) = &action.command {
                        hooks.push(HookItem {
                            source_tool: tool,
                            scope,
                            event: event.clone(),
                            matcher: matcher_entry.matcher.clone(),
                            command: cmd.clone(),
                            action_type: action
                                .action_type
                                .clone()
                                .unwrap_or_else(|| "command".to_string()),
                            path: path.to_string_lossy().to_string(),
                        });
                    }
                }
            }
        }
        return;
    }

    // Try parsing as an array of hook objects [{ "event": "...", "command": "..." }]
    #[derive(serde::Deserialize)]
    struct SimpleHook {
        event: Option<String>,
        command: Option<String>,
        matcher: Option<String>,
    }

    if let Ok(hook_list) = serde_json::from_str::<Vec<SimpleHook>>(&content) {
        for hook in hook_list {
            if let (Some(event), Some(cmd)) = (hook.event, hook.command) {
                hooks.push(HookItem {
                    source_tool: tool,
                    scope,
                    event,
                    matcher: hook.matcher,
                    command: cmd,
                    action_type: "command".to_string(),
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hook_item_serialization() {
        let hook = HookItem {
            source_tool: HookSourceTool::Claude,
            scope: HookScope::User,
            event: "PreToolUse".to_string(),
            matcher: Some("Bash|Write".to_string()),
            command: "/path/to/script.sh".to_string(),
            action_type: "command".to_string(),
            path: "/Users/test/.claude/settings.json".to_string(),
        };

        let json = serde_json::to_string(&hook).unwrap();
        assert!(json.contains("PreToolUse"));
        assert!(json.contains("sourceTool"));
        assert!(json.contains("\"scope\":\"user\""));
    }

    #[test]
    fn test_hook_scope_serialization() {
        let project_hook = HookItem {
            source_tool: HookSourceTool::Gemini,
            scope: HookScope::Project,
            event: "BeforeTool".to_string(),
            matcher: None,
            command: "echo test".to_string(),
            action_type: "command".to_string(),
            path: "/project/.gemini/settings.json".to_string(),
        };

        let json = serde_json::to_string(&project_hook).unwrap();
        assert!(json.contains("\"scope\":\"project\""));
    }
}
