//! Tauri commands for Agents management

use crate::helpers::github::{self, GitHubUrl};
use crate::parsers::agent_md::parse_agent_content;
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

/// An agent fetched from a URL or parsed from file content
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchedAgent {
    pub name: String,
    pub description: String,
    /// Full raw file content (frontmatter + body)
    pub content: String,
    pub tools: Option<String>,
    pub model: Option<String>,
    pub max_turns: Option<u32>,
    pub permission_mode: Option<String>,
    pub source_url: Option<String>,
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

/// Request to remove an agent from one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveAgentRequest {
    /// Agent filename (without .md extension)
    pub filename: String,
    /// Target tools to remove from
    pub target_tools: Vec<String>,
    /// Scope: user or project
    pub scope: String,
    /// Workspace path (required for project scope)
    pub workspace_path: Option<String>,
}

/// Remove an agent from selected tools (delete .md files)
#[tauri::command]
pub fn remove_agent_from_tools(request: RemoveAgentRequest) -> Result<AgentWriteResult, String> {
    let safe_name = agent_writer::validate_agent_name(&request.filename)?;
    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        let agents_dir = match agent_writer::agents_dir_for_tool_pub(
            tool,
            &request.scope,
            request.workspace_path.as_deref(),
        ) {
            Ok(d) => d,
            Err(e) => {
                errors.push(format!("{}: {}", tool, e));
                continue;
            }
        };
        let agent_path = agents_dir.join(format!("{}.md", safe_name));

        match std::fs::remove_file(&agent_path) {
            Ok(()) => modified_files.push(agent_path.to_string_lossy().to_string()),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                // Already gone — idempotent success
            }
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(AgentWriteResult {
        success: errors.is_empty(),
        modified_files,
        errors,
    })
}

// ---------------------------------------------------------------------------
// Import commands: fetch from URL, read from file, parse from content
// ---------------------------------------------------------------------------

/// Fetch an agent from a URL, parse its frontmatter, and return a preview
#[tauri::command]
pub async fn fetch_agent_from_url(url: String) -> Result<FetchedAgent, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("URL is required".to_string());
    }

    let client = reqwest::Client::new();

    // Handle GitHub URLs: resolve to raw content URL
    if let Some(gh) = github::parse_github_url(&url) {
        let raw_url = match &gh {
            GitHubUrl::Blob {
                owner,
                repo,
                ref_and_path,
            } => format!(
                "https://raw.githubusercontent.com/{}/{}/{}",
                owner, repo, ref_and_path
            ),
            GitHubUrl::Tree {
                owner: _,
                repo: _,
                ref_and_path: _,
            } => {
                // For a directory URL, we can't know the agent filename — try common patterns
                // First try fetching as-is (the ref_and_path might point to a .md file)
                return Err(
                    "Please link directly to an agent .md file, not a directory. \
                     For example: https://github.com/org/repo/blob/main/agents/code-reviewer.md"
                        .to_string(),
                );
            }
            GitHubUrl::Repo { .. } => {
                return Err(
                    "Please link directly to an agent .md file, not a repository. \
                     For example: https://github.com/org/repo/blob/main/agents/code-reviewer.md"
                        .to_string(),
                );
            }
        };

        let raw_content = github::fetch_raw_content(&client, &raw_url).await?;

        let fallback_name = match &gh {
            GitHubUrl::Blob { ref_and_path, .. } => ref_and_path
                .rsplit('/')
                .find(|s| !s.is_empty())
                .unwrap_or("imported-agent")
                .trim_end_matches(".md")
                .to_string(),
            _ => "imported-agent".to_string(),
        };

        let parsed = parse_agent_content(&raw_content, &fallback_name)
            .map_err(|e| format!("Failed to parse agent: {}", e))?;

        return Ok(FetchedAgent {
            name: parsed.name,
            description: parsed.description,
            content: raw_content,
            tools: parsed.tools,
            model: parsed.model,
            max_turns: parsed.max_turns,
            permission_mode: parsed.permission_mode,
            source_url: Some(url),
        });
    }

    // Non-GitHub URL: simple fetch
    let raw_content = github::fetch_raw_content(&client, &url).await?;

    let fallback_name = url
        .rsplit('/')
        .find(|s| !s.is_empty())
        .unwrap_or("imported-agent")
        .trim_end_matches(".md")
        .to_string();

    let parsed = parse_agent_content(&raw_content, &fallback_name)
        .map_err(|e| format!("Failed to parse agent: {}", e))?;

    Ok(FetchedAgent {
        name: parsed.name,
        description: parsed.description,
        content: raw_content,
        tools: parsed.tools,
        model: parsed.model,
        max_turns: parsed.max_turns,
        permission_mode: parsed.permission_mode,
        source_url: Some(url),
    })
}

/// Read and parse an agent file from disk (for file picker imports)
#[tauri::command]
pub fn read_agent_file(path: String) -> Result<FetchedAgent, String> {
    let path_buf = std::path::PathBuf::from(&path);
    let content = std::fs::read_to_string(&path_buf)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let fallback_name = path_buf
        .file_stem()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "imported-agent".to_string());

    let parsed = parse_agent_content(&content, &fallback_name)
        .map_err(|e| format!("Failed to parse agent: {}", e))?;

    Ok(FetchedAgent {
        name: parsed.name,
        description: parsed.description,
        content,
        tools: parsed.tools,
        model: parsed.model,
        max_turns: parsed.max_turns,
        permission_mode: parsed.permission_mode,
        source_url: None,
    })
}

/// Parse raw agent file content (for drag-and-drop imports)
#[tauri::command]
pub fn parse_agent_file_content(content: String, filename: String) -> Result<FetchedAgent, String> {
    let fallback_name = filename
        .trim_end_matches(".md")
        .rsplit('/')
        .next()
        .unwrap_or("imported-agent")
        .to_string();

    let parsed = parse_agent_content(&content, &fallback_name)
        .map_err(|e| format!("Failed to parse agent: {}", e))?;

    Ok(FetchedAgent {
        name: parsed.name,
        description: parsed.description,
        content,
        tools: parsed.tools,
        model: parsed.model,
        max_turns: parsed.max_turns,
        permission_mode: parsed.permission_mode,
        source_url: None,
    })
}
