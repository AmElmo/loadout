//! Tauri commands for Agents management

use crate::scanners::agents::{scan_all_agents, AgentScanResult};
use crate::writers::agent_writer;
use serde::Deserialize;

/// Scan all agents from Claude Code and Gemini CLI
#[tauri::command]
pub fn scan_agents(workspace_path: Option<String>) -> Result<AgentScanResult, String> {
    scan_all_agents(workspace_path.as_deref())
}

/// Request to install a new agent to one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstallAgentRequest {
    /// Filename (without .md extension)
    pub filename: String,
    /// Full file content (frontmatter + body)
    pub content: String,
    /// Scope: user-level or project-level
    pub scope: String,
    /// Target tools to install to
    pub target_tools: Vec<String>,
}

/// Request to sync an existing agent to other tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncAgentRequest {
    /// Agent filename (without .md extension)
    pub filename: String,
    /// Source tool
    pub source_tool: String,
    /// Source file path
    pub source_path: String,
    /// Target tools to sync to
    pub target_tools: Vec<String>,
    /// Scope: user or project
    pub scope: String,
}

/// Result of an agent write operation
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentWriteResult {
    pub success: bool,
    pub modified_files: Vec<String>,
    pub errors: Vec<String>,
}

/// Install a new agent to selected tools
#[tauri::command]
pub fn install_agent_to_tools(request: InstallAgentRequest) -> Result<AgentWriteResult, String> {
    if request.filename.trim().is_empty() {
        return Err("Agent filename is required".to_string());
    }
    if request.content.trim().is_empty() {
        return Err("Agent content is required".to_string());
    }
    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let safe_name = agent_writer::validate_agent_name(&request.filename)?;
    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        match agent_writer::write_agent(
            &safe_name,
            &request.content,
            tool,
            &request.scope,
            None,
        ) {
            Ok(path) => modified_files.push(path),
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(AgentWriteResult {
        success: errors.is_empty(),
        modified_files,
        errors,
    })
}

/// Sync an existing agent to other tools
#[tauri::command]
pub fn sync_agent_to_tools(request: SyncAgentRequest) -> Result<AgentWriteResult, String> {
    if request.filename.trim().is_empty() {
        return Err("Agent filename is required".to_string());
    }
    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    // Read the source file content
    let content = std::fs::read_to_string(&request.source_path)
        .map_err(|e| format!("Failed to read source agent: {}", e))?;

    let safe_name = agent_writer::validate_agent_name(&request.filename)?;
    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        match agent_writer::write_agent(&safe_name, &content, tool, &request.scope, None) {
            Ok(path) => modified_files.push(path),
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(AgentWriteResult {
        success: errors.is_empty(),
        modified_files,
        errors,
    })
}
