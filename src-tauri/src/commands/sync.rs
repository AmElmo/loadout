//! Tauri commands for syncing MCP and skill configs across tools

use crate::converters::{
    to_claude_json_preview, to_codex_toml_preview, to_gemini_json_preview, MCPServerInput,
};
use crate::parsers::{parse_claude_config, parse_codex_config, parse_gemini_config};
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

/// Request to sync an existing MCP to other tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncMCPRequest {
    pub name: String,
    pub source_tool: String,
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

/// Read the real (unmasked) MCP config from a source tool
fn read_mcp_from_source(name: &str, source_tool: &str) -> Result<MCPServerInput, String> {
    let home = dirs::home_dir().ok_or("Could not determine home directory")?;

    match source_tool {
        "claude" => {
            let path = home.join(".claude.json");
            let config = parse_claude_config(&path)?;
            let server = config
                .mcp_servers
                .get(name)
                .ok_or(format!("MCP '{}' not found in Claude config", name))?;
            Ok(MCPServerInput {
                mcp_type: server.mcp_type.clone(),
                command: server.command.clone(),
                args: server.args.clone(),
                url: server.url.clone(),
                env: server.env.clone(),
            })
        }
        "codex" => {
            let path = home.join(".codex").join("config.toml");
            let config = parse_codex_config(&path)?;
            let server = config
                .mcp_servers
                .get(name)
                .ok_or(format!("MCP '{}' not found in Codex config", name))?;
            Ok(MCPServerInput {
                mcp_type: "stdio".to_string(),
                command: Some(server.command.clone()),
                args: server.args.clone(),
                url: None,
                env: server.env.clone(),
            })
        }
        "gemini" => {
            let path = home.join(".gemini").join("settings.json");
            let config = parse_gemini_config(&path)?;
            let server = config
                .mcp_servers
                .get(name)
                .ok_or(format!("MCP '{}' not found in Gemini config", name))?;
            Ok(MCPServerInput {
                mcp_type: server.mcp_type.clone(),
                command: server.command.clone(),
                args: server.args.clone(),
                url: server.url.clone(),
                env: server.env.clone(),
            })
        }
        _ => Err(format!("Unknown source tool: {}", source_tool)),
    }
}

/// Sync an existing MCP from one tool to other tools (reads real env values from source)
#[tauri::command]
pub fn sync_mcp_to_tools(request: SyncMCPRequest) -> Result<WriteResult, String> {
    if request.name.trim().is_empty() {
        return Err("MCP name is required".to_string());
    }

    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    // Read the real config from the source tool (unmasked env values)
    let mcp = read_mcp_from_source(&request.name, &request.source_tool)?;

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
