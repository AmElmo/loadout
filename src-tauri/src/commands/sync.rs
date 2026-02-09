//! Tauri commands for syncing MCP and skill configs across tools

use crate::converters::{
    to_claude_json_preview, to_codex_toml_preview, to_gemini_json_preview, MCPServerInput,
};
use crate::writers::{mcp_writer, skill_writer};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Request to add an MCP to one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddMCPRequest {
    pub name: String,
    pub mcp_type: String,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub url: Option<String>,
    pub env: HashMap<String, String>,
    pub target_tools: Vec<String>,
}

/// Request to install a skill to one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallSkillRequest {
    pub name: String,
    pub content: String,
    pub target_tools: Vec<String>,
}

/// Result of a write operation
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    pub success: bool,
    pub modified_files: Vec<String>,
    pub errors: Vec<String>,
}

/// Preview of generated configs for each tool
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewConfig {
    pub tool: String,
    pub format: String,
    pub content: String,
}

/// Result of preview generation
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreviewResult {
    pub configs: Vec<PreviewConfig>,
}

impl AddMCPRequest {
    fn to_server_input(&self) -> MCPServerInput {
        MCPServerInput {
            mcp_type: self.mcp_type.clone(),
            command: self.command.clone(),
            args: self.args.clone(),
            url: self.url.clone(),
            env: self.env.clone(),
        }
    }
}

/// Get the config file path for each tool's MCP config
fn mcp_config_path(tool: &str) -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;
    match tool {
        "claude" => Ok(home.join(".claude.json")),
        "codex" => Ok(home.join(".codex").join("config.toml")),
        "gemini" => Ok(home.join(".gemini").join("settings.json")),
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

/// Preview the generated config for each selected tool without writing
#[tauri::command]
pub fn preview_mcp_configs(request: AddMCPRequest) -> Result<PreviewResult, String> {
    let mcp = request.to_server_input();
    let mut configs = Vec::new();

    for tool in &request.target_tools {
        match tool.as_str() {
            "claude" => configs.push(PreviewConfig {
                tool: "claude".to_string(),
                format: "json".to_string(),
                content: to_claude_json_preview(&request.name, &mcp),
            }),
            "codex" => configs.push(PreviewConfig {
                tool: "codex".to_string(),
                format: "toml".to_string(),
                content: to_codex_toml_preview(&request.name, &mcp),
            }),
            "gemini" => configs.push(PreviewConfig {
                tool: "gemini".to_string(),
                format: "json".to_string(),
                content: to_gemini_json_preview(&request.name, &mcp),
            }),
            _ => return Err(format!("Unknown tool: {}", tool)),
        }
    }

    Ok(PreviewResult { configs })
}

/// Add an MCP to all selected tools
#[tauri::command]
pub fn add_mcp_to_tools(request: AddMCPRequest) -> Result<WriteResult, String> {
    // Validate input
    if request.name.trim().is_empty() {
        return Err("MCP name is required".to_string());
    }

    if request.mcp_type == "stdio" && request.command.as_ref().map_or(true, |c| c.trim().is_empty())
    {
        return Err("Command is required for stdio MCPs".to_string());
    }

    if request.mcp_type == "http" && request.url.as_ref().map_or(true, |u| u.trim().is_empty()) {
        return Err("URL is required for http MCPs".to_string());
    }

    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let mcp = request.to_server_input();
    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        let path = match mcp_config_path(tool) {
            Ok(p) => p,
            Err(e) => {
                errors.push(e);
                continue;
            }
        };

        let result = match tool.as_str() {
            "claude" => mcp_writer::write_mcp_to_claude(&request.name, &mcp, &path),
            "codex" => mcp_writer::write_mcp_to_codex(&request.name, &mcp, &path),
            "gemini" => mcp_writer::write_mcp_to_gemini(&request.name, &mcp, &path),
            _ => Err(format!("Unknown tool: {}", tool)),
        };

        match result {
            Ok(()) => modified_files.push(path.to_string_lossy().to_string()),
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(WriteResult {
        success: errors.is_empty(),
        modified_files,
        errors,
    })
}

/// Install a skill to all selected tools
#[tauri::command]
pub fn install_skill_to_tools(request: InstallSkillRequest) -> Result<WriteResult, String> {
    // Validate input
    if request.name.trim().is_empty() {
        return Err("Skill name is required".to_string());
    }

    if request.content.trim().is_empty() {
        return Err("Skill content is required".to_string());
    }

    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        match skill_writer::write_skill(&request.name, &request.content, tool) {
            Ok(path) => modified_files.push(path),
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(WriteResult {
        success: errors.is_empty(),
        modified_files,
        errors,
    })
}
