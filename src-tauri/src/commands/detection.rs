//! Tool detection command — checks which AI tools are installed/available

use serde::{Deserialize, Serialize};
use std::process::Command;

/// A detected tool with its detection signals
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectedTool {
    pub id: String,
    pub label: String,
    pub has_home_config: bool,
    pub has_binary: bool,
}

/// Result of tool detection
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DetectionResult {
    pub tools: Vec<DetectedTool>,
}

fn has_binary(name: &str) -> bool {
    Command::new("which")
        .arg(name)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn dir_exists(path: &std::path::Path) -> bool {
    path.is_dir()
}

fn file_exists(path: &std::path::Path) -> bool {
    path.is_file()
}

/// Detect which AI tools are installed on this machine
#[tauri::command]
pub fn detect_installed_tools() -> Result<DetectionResult, String> {
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let tools = vec![
        DetectedTool {
            id: "claude".to_string(),
            label: "Claude".to_string(),
            has_home_config: dir_exists(&home.join(".claude"))
                || file_exists(&home.join(".claude.json")),
            has_binary: has_binary("claude"),
        },
        DetectedTool {
            id: "codex".to_string(),
            label: "Codex".to_string(),
            has_home_config: dir_exists(&home.join(".codex")) || dir_exists(&home.join(".agents")),
            has_binary: has_binary("codex"),
        },
        DetectedTool {
            id: "gemini".to_string(),
            label: "Gemini".to_string(),
            has_home_config: dir_exists(&home.join(".gemini")),
            has_binary: has_binary("gemini"),
        },
        DetectedTool {
            id: "cursor".to_string(),
            label: "Cursor".to_string(),
            has_home_config: dir_exists(&home.join(".cursor")),
            has_binary: has_binary("cursor"),
        },
        DetectedTool {
            id: "copilot".to_string(),
            label: "Copilot".to_string(),
            has_home_config: dir_exists(&home.join(".copilot")),
            has_binary: false,
        },
        DetectedTool {
            id: "windsurf".to_string(),
            label: "Windsurf".to_string(),
            has_home_config: dir_exists(&home.join(".codeium").join("windsurf")),
            has_binary: has_binary("windsurf"),
        },
        DetectedTool {
            id: "roo".to_string(),
            label: "Roo".to_string(),
            has_home_config: dir_exists(&home.join(".roo")),
            has_binary: false,
        },
        DetectedTool {
            id: "cline".to_string(),
            label: "Cline".to_string(),
            has_home_config: dir_exists(&home.join(".cline")),
            has_binary: false,
        },
        DetectedTool {
            id: "kilo".to_string(),
            label: "Kilo".to_string(),
            has_home_config: dir_exists(&home.join(".kilocode")),
            has_binary: false,
        },
        DetectedTool {
            id: "opencode".to_string(),
            label: "OpenCode".to_string(),
            has_home_config: file_exists(
                &home.join(".config").join("opencode").join("opencode.json"),
            ),
            has_binary: has_binary("opencode"),
        },
    ];

    // Only return tools that have some signal
    let detected: Vec<DetectedTool> = tools
        .into_iter()
        .filter(|t| t.has_home_config || t.has_binary)
        .collect();

    Ok(DetectionResult { tools: detected })
}
