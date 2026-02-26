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
    /// Workspace path (required for project scope)
    pub workspace_path: Option<String>,
}

/// Request to sync an existing agent to other tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncAgentRequest {
    /// Agent filename (without .md extension)
    pub filename: String,
    /// Source tool (claude or gemini)
    pub source_tool: String,
    /// Source file path
    pub source_path: String,
    /// Target tools to sync to
    pub target_tools: Vec<String>,
    /// Scope: user or project
    pub scope: String,
    /// Workspace path (required for project scope)
    pub workspace_path: Option<String>,
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
            request.workspace_path.as_deref(),
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

/// Validate that source_path is inside an expected agent directory for the declared tool
fn validate_source_path(source_path: &str, source_tool: &str, workspace_path: Option<&str>) -> Result<(), String> {
    let path = std::path::Path::new(source_path);
    let canonical = path.canonicalize()
        .map_err(|e| format!("Cannot resolve source path: {}", e))?;
    let canonical_str = canonical.to_string_lossy();

    let home = crate::helpers::effective_home()
        .ok_or("Could not determine home directory")?;

    let tool_dir = match source_tool {
        "claude" => ".claude",
        "gemini" => ".gemini",
        _ => return Err(format!("Unknown source tool: {}", source_tool)),
    };

    // Check user-level path: ~/.<tool>/agents/
    let user_agents_dir = home.join(tool_dir).join("agents");
    if let Ok(user_canon) = user_agents_dir.canonicalize() {
        if canonical_str.starts_with(&user_canon.to_string_lossy().to_string()) {
            return Ok(());
        }
    }

    // Check project-level path: $WORKSPACE/.<tool>/agents/
    if let Some(ws) = workspace_path {
        let project_agents_dir = std::path::PathBuf::from(ws).join(tool_dir).join("agents");
        if let Ok(project_canon) = project_agents_dir.canonicalize() {
            if canonical_str.starts_with(&project_canon.to_string_lossy().to_string()) {
                return Ok(());
            }
        }
    }

    Err(format!(
        "Source path is not inside a valid {} agents directory",
        source_tool
    ))
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

    // Validate source path is inside the expected agent directory
    validate_source_path(
        &request.source_path,
        &request.source_tool,
        request.workspace_path.as_deref(),
    )?;

    // Read the source file content
    let content = std::fs::read_to_string(&request.source_path)
        .map_err(|e| format!("Failed to read source agent: {}", e))?;

    let safe_name = agent_writer::validate_agent_name(&request.filename)?;
    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        match agent_writer::write_agent(&safe_name, &content, tool, &request.scope, request.workspace_path.as_deref()) {
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
