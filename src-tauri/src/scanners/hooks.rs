//! Hooks scanner for Claude Code and Gemini CLI
//!
//! Parses hook configurations from settings.json files and normalizes
//! them into a unified view. Codex only has a basic `notify` mechanism.

use crate::parsers::{parse_claude_settings, parse_gemini_config};
use serde::{Deserialize, Serialize};

/// Source tool for a hook
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum HookSourceTool {
    Claude,
    Gemini,
}

/// A normalized hook configuration item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookItem {
    /// Which tool this hook belongs to
    pub source_tool: HookSourceTool,
    /// Event name (e.g., "PreToolUse", "BeforeTool")
    pub event: String,
    /// Matcher pattern (e.g., "Bash|Write")
    pub matcher: Option<String>,
    /// Command to run
    pub command: String,
    /// Action type (e.g., "command")
    pub action_type: String,
}

/// Result of scanning all hooks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HookScanResult {
    pub hooks: Vec<HookItem>,
    /// Whether Gemini hooks experiment flag is enabled
    pub gemini_hooks_enabled: bool,
}

/// Scan all hook configurations
pub fn scan_all_hooks() -> Result<HookScanResult, String> {
    let home_dir = dirs::home_dir().ok_or("Could not determine home directory")?;
    let mut hooks: Vec<HookItem> = Vec::new();

    // Scan Claude Code hooks from ~/.claude/settings.json
    let claude_settings_path = home_dir.join(".claude").join("settings.json");
    if let Ok(settings) = parse_claude_settings(&claude_settings_path) {
        for (event, matchers) in &settings.hooks {
            for matcher_entry in matchers {
                for action in &matcher_entry.hooks {
                    if let Some(cmd) = &action.command {
                        hooks.push(HookItem {
                            source_tool: HookSourceTool::Claude,
                            event: event.clone(),
                            matcher: matcher_entry.matcher.clone(),
                            command: cmd.clone(),
                            action_type: action.action_type.clone().unwrap_or_else(|| "command".to_string()),
                        });
                    }
                }
            }
        }
    }

    // Scan Gemini CLI hooks from ~/.gemini/settings.json
    let gemini_settings_path = home_dir.join(".gemini").join("settings.json");
    let gemini_config = parse_gemini_config(&gemini_settings_path).unwrap_or_default();
    let gemini_hooks_enabled = gemini_config.experiments.enable_hooks;

    for (event, matchers) in &gemini_config.hooks {
        for matcher_entry in matchers {
            for action in &matcher_entry.hooks {
                if let Some(cmd) = &action.command {
                    hooks.push(HookItem {
                        source_tool: HookSourceTool::Gemini,
                        event: event.clone(),
                        matcher: matcher_entry.matcher.clone(),
                        command: cmd.clone(),
                        action_type: action.action_type.clone().unwrap_or_else(|| "command".to_string()),
                    });
                }
            }
        }
    }

    // Sort by tool then event
    hooks.sort_by(|a, b| {
        format!("{:?}", a.source_tool)
            .cmp(&format!("{:?}", b.source_tool))
            .then_with(|| a.event.cmp(&b.event))
    });

    Ok(HookScanResult {
        hooks,
        gemini_hooks_enabled,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hook_item_serialization() {
        let hook = HookItem {
            source_tool: HookSourceTool::Claude,
            event: "PreToolUse".to_string(),
            matcher: Some("Bash|Write".to_string()),
            command: "/path/to/script.sh".to_string(),
            action_type: "command".to_string(),
        };

        let json = serde_json::to_string(&hook).unwrap();
        assert!(json.contains("PreToolUse"));
        assert!(json.contains("sourceTool"));
    }
}
