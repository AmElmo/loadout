//! Tauri commands for syncing MCP and skill configs across tools

use crate::converters::{
    to_claude_json_preview, to_codex_toml_preview, to_gemini_json_preview, MCPServerInput,
};
use crate::helpers::github::{self, GitHubUrl};
use crate::parsers::parse_skill_content;
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
    /// Install method: "link" (default) or "copy"
    #[serde(default = "default_method")]
    pub method: String,
    #[serde(default)]
    pub files: Vec<SkillFile>,
}

fn default_method() -> String {
    "link".to_string()
}

/// Request to sync an existing MCP to other tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncMCPRequest {
    pub name: String,
    pub source_tool: String,
    pub source_path: Option<String>,
    pub target_tools: Vec<String>,
}

/// Result of a write operation
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WriteResult {
    pub success: bool,
    pub modified_files: Vec<String>,
    pub errors: Vec<String>,
    /// Install method used: "link" or "copy"
    pub method: String,
    /// Path to the canonical skill directory (for link mode)
    pub canonical_path: Option<String>,
    /// True if symlink creation failed and fell back to copy
    pub symlink_failed: bool,
}

/// A companion file within a skill directory
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillFile {
    pub relative_path: String,
    pub content: String,
    pub size: u64,
}

/// A skill fetched from a URL or parsed from file content
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchedSkill {
    pub name: String,
    pub description: String,
    pub content: String,
    pub source_url: Option<String>,
    pub files: Vec<SkillFile>,
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
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    match tool {
        "claude" => Ok(home.join(".claude.json")),
        "codex" => Ok(home.join(".codex").join("config.toml")),
        "gemini" => Ok(home.join(".gemini").join("settings.json")),
        "cursor" => Ok(home.join(".cursor").join("mcp.json")),
        "copilot" => Ok(home.join(".vscode").join("mcp.json")),
        "windsurf" => Ok(home
            .join(".codeium")
            .join("windsurf")
            .join("mcp_config.json")),
        "roo" => Ok(home.join(".roo").join("mcp.json")),
        "cline" => Ok(home.join(".cline").join("mcp.json")),
        "kilo" => Ok(home.join(".kilocode").join("mcp.json")),
        "opencode" => Ok(home.join(".config").join("opencode").join("opencode.json")),
        _ => Err(format!("Unknown tool: {}", tool)),
    }
}

fn is_supported_mcp_type(mcp_type: &str) -> bool {
    matches!(mcp_type, "stdio" | "http")
}

fn candidate_paths(source_path: Option<&str>, default_path: PathBuf) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    if let Some(path) = source_path {
        paths.push(PathBuf::from(path));
    }
    if !paths.iter().any(|path| path == &default_path) {
        paths.push(default_path);
    }
    paths
}

/// Preview the generated config for each selected tool without writing
#[tauri::command]
pub fn preview_mcp_configs(request: AddMCPRequest) -> Result<PreviewResult, String> {
    let normalized_mcp_type = request.mcp_type.trim().to_ascii_lowercase();
    if !is_supported_mcp_type(&normalized_mcp_type) {
        return Err("MCP type must be either 'stdio' or 'http'".to_string());
    }

    let mut mcp = request.to_server_input();
    mcp.mcp_type = normalized_mcp_type;
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
            // All JSON-based tools use the same preview format
            "cursor" | "copilot" | "windsurf" | "roo" | "cline" | "kilo" => {
                configs.push(PreviewConfig {
                    tool: tool.clone(),
                    format: "json".to_string(),
                    content: to_claude_json_preview(&request.name, &mcp),
                });
            }
            "opencode" => {
                // OpenCode uses `mcp` key instead of `mcpServers`
                let wrapper = serde_json::json!({
                    "mcp": {
                        &request.name: crate::converters::to_json_value(&mcp)
                    }
                });
                configs.push(PreviewConfig {
                    tool: "opencode".to_string(),
                    format: "json".to_string(),
                    content: serde_json::to_string_pretty(&wrapper).unwrap_or_default(),
                });
            }
            _ => return Err(format!("Unknown tool: {}", tool)),
        }
    }

    Ok(PreviewResult { configs })
}

/// Add an MCP to all selected tools
#[tauri::command]
pub fn add_mcp_to_tools(request: AddMCPRequest) -> Result<WriteResult, String> {
    let normalized_mcp_type = request.mcp_type.trim().to_ascii_lowercase();

    // Validate input
    if request.name.trim().is_empty() {
        return Err("MCP name is required".to_string());
    }

    if !is_supported_mcp_type(&normalized_mcp_type) {
        return Err("MCP type must be either 'stdio' or 'http'".to_string());
    }

    if normalized_mcp_type == "stdio"
        && request
            .command
            .as_ref()
            .map_or(true, |c| c.trim().is_empty())
    {
        return Err("Command is required for stdio MCPs".to_string());
    }

    if normalized_mcp_type == "http" && request.url.as_ref().map_or(true, |u| u.trim().is_empty()) {
        return Err("URL is required for http MCPs".to_string());
    }

    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let mut mcp = request.to_server_input();
    mcp.mcp_type = normalized_mcp_type;

    write_mcp_to_target_tools(&request.name, &mcp, &request.target_tools)
}

/// Shared write logic for adding/syncing MCPs across tools
fn write_mcp_to_target_tools(
    name: &str,
    mcp: &MCPServerInput,
    target_tools: &[String],
) -> Result<WriteResult, String> {
    let mut modified_files = Vec::new();
    let mut errors = Vec::new();

    for tool in target_tools {
        let path = match mcp_config_path(tool) {
            Ok(p) => p,
            Err(e) => {
                errors.push(e);
                continue;
            }
        };

        let result = match tool.as_str() {
            "claude" => mcp_writer::write_mcp_to_claude(name, mcp, &path),
            "codex" => mcp_writer::write_mcp_to_codex(name, mcp, &path),
            "gemini" => mcp_writer::write_mcp_to_gemini(name, mcp, &path),
            "cursor" | "copilot" | "windsurf" | "roo" | "cline" | "kilo" => {
                mcp_writer::write_mcp_to_json(name, mcp, &path)
            }
            "opencode" => mcp_writer::write_mcp_to_opencode(name, mcp, &path),
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
        method: "copy".to_string(),
        canonical_path: None,
        symlink_failed: false,
    })
}

/// Read the real (unmasked) MCP config from a source tool
fn read_mcp_from_source(
    name: &str,
    source_tool: &str,
    source_path: Option<&str>,
) -> Result<MCPServerInput, String> {
    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;

    match source_tool {
        "claude" => {
            let default_path = home.join(".claude.json");
            let candidate_paths = candidate_paths(source_path, default_path);

            for path in candidate_paths {
                let config = parse_claude_config(&path)?;
                if let Some(server) = config.mcp_servers.get(name) {
                    return Ok(MCPServerInput {
                        mcp_type: server.mcp_type.clone(),
                        command: server.command.clone(),
                        args: server.args.clone(),
                        url: server.url.clone(),
                        env: server.env.clone(),
                    });
                }
            }

            Err(format!("MCP '{}' not found in Claude configs", name))
        }
        "codex" => {
            let default_path = home.join(".codex").join("config.toml");
            let candidate_paths = candidate_paths(source_path, default_path);

            for path in candidate_paths {
                let config = parse_codex_config(&path)?;
                if let Some(server) = config.mcp_servers.get(name) {
                    let mcp_type = if server.url.is_some() {
                        "http"
                    } else {
                        "stdio"
                    };
                    return Ok(MCPServerInput {
                        mcp_type: mcp_type.to_string(),
                        command: server.command.clone(),
                        args: server.args.clone(),
                        url: server.url.clone(),
                        env: server.env.clone(),
                    });
                }
            }

            Err(format!("MCP '{}' not found in Codex configs", name))
        }
        "gemini" => {
            let default_path = home.join(".gemini").join("settings.json");
            let candidate_paths = candidate_paths(source_path, default_path);

            for path in candidate_paths {
                let config = parse_gemini_config(&path)?;
                if let Some(server) = config.mcp_servers.get(name) {
                    return Ok(MCPServerInput {
                        mcp_type: server.mcp_type.clone(),
                        command: server.command.clone(),
                        args: server.args.clone(),
                        url: server.url.clone(),
                        env: server.env.clone(),
                    });
                }
            }

            Err(format!("MCP '{}' not found in Gemini configs", name))
        }
        // For tools that use mcpServers JSON format, use the generic parser
        "cursor" | "copilot" | "windsurf" | "roo" | "cline" | "kilo" => {
            let default_path = mcp_config_path(source_tool)?;
            for path in candidate_paths(source_path, default_path) {
                let config = parse_claude_config(&path)?;
                if let Some(server) = config.mcp_servers.get(name) {
                    return Ok(MCPServerInput {
                        mcp_type: server.mcp_type.clone(),
                        command: server.command.clone(),
                        args: server.args.clone(),
                        url: server.url.clone(),
                        env: server.env.clone(),
                    });
                }
            }
            Err(format!(
                "MCP '{}' not found in {} configs",
                name, source_tool
            ))
        }
        "opencode" => {
            let default_path = mcp_config_path(source_tool)?;
            for path in candidate_paths(source_path, default_path) {
                let config = crate::parsers::parse_opencode_config(&path)?;
                if let Some(server) = config.mcp.get(name) {
                    return Ok(MCPServerInput {
                        mcp_type: server.mcp_type.clone(),
                        command: server.command.clone(),
                        args: server.args.clone(),
                        url: server.url.clone(),
                        env: server.env.clone(),
                    });
                }
            }
            Err(format!("MCP '{}' not found in OpenCode configs", name))
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
    let mcp = read_mcp_from_source(
        &request.name,
        &request.source_tool,
        request.source_path.as_deref(),
    )?;

    write_mcp_to_target_tools(&request.name, &mcp, &request.target_tools)
}

/// Request to remove an MCP from one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveMCPRequest {
    pub name: String,
    pub target_tools: Vec<String>,
    /// Scope: user or project
    pub scope: String,
    /// Config file path (used for project-scoped MCPs to target the correct file)
    pub config_path: Option<String>,
}

/// Request to remove a skill from one or more tools
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveSkillRequest {
    pub name: String,
    pub target_tools: Vec<String>,
    /// Whether to also remove the canonical copy in ~/.agents/skills/
    pub remove_canonical: bool,
    /// Scope: user or project
    pub scope: String,
    /// Workspace path (required for project scope)
    pub workspace_path: Option<String>,
}

/// Result of a remove operation
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveResult {
    pub success: bool,
    pub removed_files: Vec<String>,
    pub errors: Vec<String>,
}

/// Remove an MCP from selected tools' config files
#[tauri::command]
pub fn remove_mcp_from_tools(request: RemoveMCPRequest) -> Result<RemoveResult, String> {
    if request.name.trim().is_empty() {
        return Err("MCP name is required".to_string());
    }
    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let mut removed_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        // For project-scoped MCPs, use the provided config path directly
        // (each tool's project config lives in the workspace, not in ~/)
        let path = if request.scope == "project" {
            match &request.config_path {
                Some(p) => PathBuf::from(p),
                None => {
                    errors.push(format!(
                        "{}: config_path required for project-scoped MCP removal",
                        tool
                    ));
                    continue;
                }
            }
        } else {
            match mcp_config_path(tool) {
                Ok(p) => p,
                Err(e) => {
                    errors.push(e);
                    continue;
                }
            }
        };

        let result = match tool.as_str() {
            "codex" => mcp_writer::remove_mcp_from_codex(&request.name, &path),
            "opencode" => mcp_writer::remove_mcp_from_opencode(&request.name, &path),
            // All other tools use mcpServers JSON format
            _ => mcp_writer::remove_mcp_from_json(&request.name, &path),
        };

        match result {
            Ok(()) => removed_files.push(path.to_string_lossy().to_string()),
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    Ok(RemoveResult {
        success: errors.is_empty(),
        removed_files,
        errors,
    })
}

/// Remove a skill from selected tools (delete files/symlinks)
#[tauri::command]
pub fn remove_skill_from_tools(request: RemoveSkillRequest) -> Result<RemoveResult, String> {
    let safe_name = skill_writer::validate_skill_name(&request.name)?;
    if request.target_tools.is_empty() {
        return Err("At least one target tool must be selected".to_string());
    }

    let home = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let mut removed_files = Vec::new();
    let mut errors = Vec::new();

    for tool in &request.target_tools {
        let skills_dir = if request.scope == "project" {
            match &request.workspace_path {
                Some(ws) => skill_writer::skill_dir_for_tool_project(tool, ws),
                None => {
                    errors.push(format!(
                        "{}: workspace_path required for project-scoped skill removal",
                        tool
                    ));
                    continue;
                }
            }
        } else {
            skill_writer::skill_dir_for_tool_pub(tool)
        };
        let skills_dir = match skills_dir {
            Ok(d) => d,
            Err(e) => {
                errors.push(format!("{}: {}", tool, e));
                continue;
            }
        };
        let skill_path = skills_dir.join(&safe_name);

        match remove_path(&skill_path) {
            Ok(true) => removed_files.push(skill_path.to_string_lossy().to_string()),
            Ok(false) => {} // Didn't exist — idempotent success
            Err(e) => errors.push(format!("{}: {}", tool, e)),
        }
    }

    // Optionally remove canonical copy
    if request.remove_canonical {
        let canonical = home.join(".agents").join("skills").join(&safe_name);
        match remove_path(&canonical) {
            Ok(true) => removed_files.push(canonical.to_string_lossy().to_string()),
            Ok(false) => {}
            Err(e) => errors.push(format!("canonical: {}", e)),
        }
    }

    Ok(RemoveResult {
        success: errors.is_empty(),
        removed_files,
        errors,
    })
}

/// Remove a path — handles regular files/dirs, symlinks, and broken symlinks.
/// Returns Ok(true) if something was removed, Ok(false) if path didn't exist.
fn remove_path(path: &std::path::Path) -> Result<bool, String> {
    // Use symlink_metadata to detect symlinks (including broken ones)
    match std::fs::symlink_metadata(path) {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                std::fs::remove_file(path)
                    .map_err(|e| format!("Failed to remove symlink {}: {}", path.display(), e))?;
            } else if meta.is_dir() {
                std::fs::remove_dir_all(path)
                    .map_err(|e| format!("Failed to remove directory {}: {}", path.display(), e))?;
            } else {
                std::fs::remove_file(path)
                    .map_err(|e| format!("Failed to remove file {}: {}", path.display(), e))?;
            }
            Ok(true)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(format!("Failed to access {}: {}", path.display(), e)),
    }
}

/// Convert a GitHub URL to a raw content URL (used in tests)
#[cfg(test)]
fn github_to_raw_url(url: &str) -> Option<String> {
    match github::parse_github_url(url)? {
        GitHubUrl::Blob {
            owner,
            repo,
            ref_and_path,
        } => Some(format!(
            "https://raw.githubusercontent.com/{}/{}/{}",
            owner, repo, ref_and_path
        )),
        GitHubUrl::Tree {
            owner,
            repo,
            ref_and_path,
        } => Some(format!(
            "https://raw.githubusercontent.com/{}/{}/{}/SKILL.md",
            owner, repo, ref_and_path
        )),
        GitHubUrl::Repo { owner, repo } => Some(format!(
            "https://raw.githubusercontent.com/{}/{}/main/SKILL.md",
            owner, repo
        )),
    }
}

/// Entry from the GitHub Contents API
#[derive(Debug, Deserialize)]
struct GitHubContentEntry {
    name: String,
    path: String,
    #[serde(rename = "type")]
    entry_type: String,
    size: Option<u64>,
    download_url: Option<String>,
}

const MAX_FILE_SIZE: u64 = 100_000; // 100 KB limit per companion file
const SKIP_DIRS: &[&str] = &[".git", ".github", "node_modules", "__pycache__"];

/// Fetch all files in a GitHub directory using the Contents API
async fn fetch_github_directory(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    branch: &str,
    dir_path: &str,
) -> Result<Vec<SkillFile>, String> {
    let api_url = if dir_path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            owner, repo, branch
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            owner, repo, dir_path, branch
        )
    };

    let response = client
        .get(&api_url)
        .header("User-Agent", "Loadout/0.1")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await
        .map_err(|e| format!("Failed to list directory: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned HTTP {}", response.status()));
    }

    let entries: Vec<GitHubContentEntry> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse GitHub API response: {}", e))?;

    let mut files = Vec::new();

    for entry in entries {
        // Skip unwanted directories
        if entry.entry_type == "dir" {
            if SKIP_DIRS.contains(&entry.name.as_str()) {
                continue;
            }
            // Recurse into subdirectories
            let sub_files = Box::pin(fetch_github_directory(
                client,
                owner,
                repo,
                branch,
                &entry.path,
            ))
            .await?;
            files.extend(sub_files);
            continue;
        }

        // Skip SKILL.md (it goes into FetchedSkill.content, not files)
        if entry.name == "SKILL.md" {
            continue;
        }

        // Skip oversized files
        if entry.size.unwrap_or(0) > MAX_FILE_SIZE {
            continue;
        }

        // Fetch file content via download_url
        if let Some(download_url) = &entry.download_url {
            let file_response = client
                .get(download_url)
                .header("User-Agent", "Loadout/0.1")
                .send()
                .await
                .map_err(|e| format!("Failed to fetch {}: {}", entry.path, e))?;

            if file_response.status().is_success() {
                let content = file_response
                    .text()
                    .await
                    .map_err(|e| format!("Failed to read {}: {}", entry.path, e))?;

                // Compute relative path from the directory root
                let relative_path = if dir_path.is_empty() {
                    entry.path.clone()
                } else {
                    entry
                        .path
                        .strip_prefix(dir_path)
                        .unwrap_or(&entry.path)
                        .trim_start_matches('/')
                        .to_string()
                };

                files.push(SkillFile {
                    size: content.len() as u64,
                    relative_path,
                    content,
                });
            }
        }
    }

    Ok(files)
}

/// Fetch a skill from a URL, parse its frontmatter, and return a preview
#[tauri::command]
pub async fn fetch_skill_from_url(url: String) -> Result<FetchedSkill, String> {
    let url = url.trim().to_string();
    if url.is_empty() {
        return Err("URL is required".to_string());
    }

    let client = reqwest::Client::new();

    // Check if this is a GitHub URL with directory structure
    if let Some(gh) = github::parse_github_url(&url) {
        match gh {
            GitHubUrl::Tree {
                owner,
                repo,
                ref_and_path,
            } => {
                // Fetch SKILL.md (raw URL works with combined ref+path)
                let skill_md_url = format!(
                    "https://raw.githubusercontent.com/{}/{}/{}/SKILL.md",
                    owner, repo, ref_and_path
                );

                let raw_content = github::fetch_raw_content(&client, &skill_md_url).await?;

                // Resolve branch/path for the Contents API and fallback name
                let (branch, dir_path) =
                    github::resolve_github_branch(&client, &owner, &repo, &ref_and_path).await?;

                let fallback_name = if dir_path.is_empty() {
                    repo.clone()
                } else {
                    dir_path
                        .rsplit('/')
                        .next()
                        .unwrap_or("imported-skill")
                        .to_string()
                };

                let parsed = parse_skill_content(&raw_content, &fallback_name)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // Fetch companion files from the directory
                let files =
                    fetch_github_directory(&client, &owner, &repo, &branch, &dir_path).await?;

                return Ok(FetchedSkill {
                    name: parsed.name,
                    description: parsed.description,
                    content: raw_content,
                    source_url: Some(url),
                    files,
                });
            }
            GitHubUrl::Blob {
                owner,
                repo,
                ref ref_and_path,
            } => {
                // Fetch the file (raw URL works with combined ref+path)
                let raw_url = format!(
                    "https://raw.githubusercontent.com/{}/{}/{}",
                    owner, repo, ref_and_path
                );
                let raw_content = github::fetch_raw_content(&client, &raw_url).await?;

                let fallback_name = ref_and_path
                    .rsplit('/')
                    .find(|s| !s.is_empty())
                    .unwrap_or("imported-skill")
                    .trim_end_matches(".md")
                    .to_string();

                let parsed = parse_skill_content(&raw_content, &fallback_name)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // If this is a SKILL.md file, also fetch sibling files
                let files = if ref_and_path.ends_with("SKILL.md") {
                    let dir_ref_and_path = ref_and_path
                        .trim_end_matches("SKILL.md")
                        .trim_end_matches('/');
                    if !dir_ref_and_path.is_empty() {
                        let (branch, dir_path) =
                            github::resolve_github_branch(&client, &owner, &repo, dir_ref_and_path)
                                .await
                                .unwrap_or_else(|_| {
                                    let parts: Vec<&str> =
                                        dir_ref_and_path.splitn(2, '/').collect();
                                    (
                                        parts[0].to_string(),
                                        parts.get(1).unwrap_or(&"").to_string(),
                                    )
                                });
                        fetch_github_directory(&client, &owner, &repo, &branch, &dir_path)
                            .await
                            .unwrap_or_default()
                    } else {
                        vec![]
                    }
                } else {
                    vec![]
                };

                return Ok(FetchedSkill {
                    name: parsed.name,
                    description: parsed.description,
                    content: raw_content,
                    source_url: Some(url),
                    files,
                });
            }
            GitHubUrl::Repo { owner, repo } => {
                // Try fetching SKILL.md from main branch root
                let raw_url = format!(
                    "https://raw.githubusercontent.com/{}/{}/main/SKILL.md",
                    owner, repo
                );
                let raw_content = github::fetch_raw_content(&client, &raw_url).await?;

                let parsed = parse_skill_content(&raw_content, &repo)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // Fetch companion files from repo root
                let files = fetch_github_directory(&client, &owner, &repo, "main", "")
                    .await
                    .unwrap_or_default();

                return Ok(FetchedSkill {
                    name: parsed.name,
                    description: parsed.description,
                    content: raw_content,
                    source_url: Some(url),
                    files,
                });
            }
        }
    }

    // Non-GitHub URL: simple fetch
    let fetch_url = url.clone();
    let raw_content = github::fetch_raw_content(&client, &fetch_url).await?;

    let fallback_name = fetch_url
        .rsplit('/')
        .find(|s| !s.is_empty())
        .unwrap_or("imported-skill")
        .trim_end_matches(".md")
        .to_string();

    let parsed = parse_skill_content(&raw_content, &fallback_name)
        .map_err(|e| format!("Failed to parse skill: {}", e))?;

    Ok(FetchedSkill {
        name: parsed.name,
        description: parsed.description,
        content: raw_content,
        source_url: Some(url),
        files: vec![],
    })
}

/// Parse skill content from raw markdown text (for file imports)
#[tauri::command]
pub fn parse_skill_file_content(content: String, filename: String) -> Result<FetchedSkill, String> {
    let fallback_name = filename
        .trim_end_matches(".md")
        .trim_end_matches("/SKILL")
        .rsplit('/')
        .next()
        .unwrap_or("imported-skill")
        .to_string();

    let parsed = parse_skill_content(&content, &fallback_name)
        .map_err(|e| format!("Failed to parse skill: {}", e))?;

    Ok(FetchedSkill {
        name: parsed.name,
        description: parsed.description,
        content,
        source_url: None,
        files: vec![],
    })
}

/// Read and parse a skill file from disk (for file picker imports)
#[tauri::command]
pub fn read_skill_file(path: String) -> Result<FetchedSkill, String> {
    let path_buf = PathBuf::from(&path);
    let content =
        std::fs::read_to_string(&path_buf).map_err(|e| format!("Failed to read file: {}", e))?;

    let filename = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "SKILL.md".to_string());

    // Use parent dir name as fallback skill name (matching how the scanner works)
    let fallback_name = path_buf
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| filename.trim_end_matches(".md").to_string());

    let parsed = parse_skill_content(&content, &fallback_name)
        .map_err(|e| format!("Failed to parse skill: {}", e))?;

    Ok(FetchedSkill {
        name: parsed.name,
        description: parsed.description,
        content,
        source_url: None,
        files: vec![],
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

    let validated_name = skill_writer::validate_skill_name(&request.name)?;
    match request.method.as_str() {
        "link" => {
            // Link mode: write canonical to ~/.agents/skills/<name>, then symlink per tool
            let link_result = skill_writer::link_skill(
                &validated_name,
                &request.content,
                &request.files,
                &request.target_tools,
            )?;

            Ok(WriteResult {
                success: link_result.errors.is_empty(),
                modified_files: link_result.modified_files,
                errors: link_result.errors,
                method: "link".to_string(),
                canonical_path: Some(link_result.canonical_path),
                symlink_failed: link_result.symlink_failed,
            })
        }
        "copy" => {
            // Copy mode: per-tool independent copies (existing behavior)
            let mut modified_files = Vec::new();
            let mut errors = Vec::new();

            for tool in &request.target_tools {
                if request.files.is_empty() {
                    match skill_writer::write_skill(&validated_name, &request.content, tool) {
                        Ok(path) => modified_files.push(path),
                        Err(e) => errors.push(format!("{}: {}", tool, e)),
                    }
                } else {
                    match skill_writer::write_skill_with_files(
                        &validated_name,
                        &request.content,
                        &request.files,
                        tool,
                    ) {
                        Ok(paths) => modified_files.extend(paths),
                        Err(e) => errors.push(format!("{}: {}", tool, e)),
                    }
                }
            }

            Ok(WriteResult {
                success: errors.is_empty(),
                modified_files,
                errors,
                method: "copy".to_string(),
                canonical_path: None,
                symlink_failed: false,
            })
        }
        _ => Err("Install method must be either 'link' or 'copy'".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;
    use std::sync::{Mutex, OnceLock};
    use tempfile::{NamedTempFile, TempDir};

    fn with_loadout_home<T>(home: &Path, f: impl FnOnce() -> T) -> T {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        let _guard = LOCK.get_or_init(|| Mutex::new(())).lock().unwrap();

        let previous = std::env::var("LOADOUT_HOME").ok();
        std::env::set_var("LOADOUT_HOME", home);
        let result = f();
        if let Some(prev) = previous {
            std::env::set_var("LOADOUT_HOME", prev);
        } else {
            std::env::remove_var("LOADOUT_HOME");
        }
        result
    }

    #[cfg(unix)]
    fn create_dir_symlink(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::unix::fs::symlink(src, dst)
    }

    #[cfg(windows)]
    fn create_dir_symlink(src: &Path, dst: &Path) -> std::io::Result<()> {
        std::os::windows::fs::symlink_dir(src, dst)
    }

    #[test]
    fn test_install_skill_rejects_unknown_method() {
        let result = install_skill_to_tools(InstallSkillRequest {
            name: "my-skill".to_string(),
            content: "---\nname: my-skill\n---\n\ncontent".to_string(),
            target_tools: vec!["codex".to_string()],
            method: "invalid".to_string(),
            files: vec![],
        });

        assert!(result.is_err());
        assert_eq!(
            result.unwrap_err(),
            "Install method must be either 'link' or 'copy'"
        );
    }

    #[test]
    fn test_read_mcp_from_claude_source_path() {
        let file = NamedTempFile::new().unwrap();
        fs::write(
            file.path(),
            r#"{
  "mcpServers": {
    "project-server": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"]
    }
  }
}"#,
        )
        .unwrap();

        let mcp = read_mcp_from_source(
            "project-server",
            "claude",
            Some(file.path().to_string_lossy().as_ref()),
        )
        .unwrap();

        assert_eq!(mcp.mcp_type, "stdio");
        assert_eq!(mcp.command.as_deref(), Some("node"));
        assert_eq!(mcp.args, vec!["server.js"]);
    }

    #[test]
    fn test_preview_http_for_codex() {
        let request = AddMCPRequest {
            name: "http-server".to_string(),
            mcp_type: "http".to_string(),
            command: None,
            args: vec![],
            url: Some("https://example.com/mcp".to_string()),
            env: HashMap::new(),
            target_tools: vec!["codex".to_string()],
        };

        let result = preview_mcp_configs(request).unwrap();
        assert_eq!(result.configs.len(), 1);
        assert_eq!(result.configs[0].tool, "codex");
        assert!(result.configs[0].content.contains("url"));
    }

    #[test]
    fn test_read_mcp_from_cline_source_path() {
        let file = NamedTempFile::new().unwrap();
        fs::write(
            file.path(),
            r#"{
  "mcpServers": {
    "project-server": {
      "type": "stdio",
      "command": "node",
      "args": ["server.js"]
    }
  }
}"#,
        )
        .unwrap();

        let mcp = read_mcp_from_source(
            "project-server",
            "cline",
            Some(file.path().to_string_lossy().as_ref()),
        )
        .unwrap();

        assert_eq!(mcp.mcp_type, "stdio");
        assert_eq!(mcp.command.as_deref(), Some("node"));
        assert_eq!(mcp.args, vec!["server.js"]);
    }

    #[test]
    fn test_github_blob_url_conversion() {
        let url = "https://github.com/anthropics/skills/blob/main/commit/SKILL.md";
        let raw = github_to_raw_url(url).unwrap();
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/anthropics/skills/main/commit/SKILL.md"
        );
    }

    #[test]
    fn test_github_tree_url_conversion() {
        let url = "https://github.com/anthropics/skills/tree/main/skills/algorithmic-art";
        let raw = github_to_raw_url(url).unwrap();
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/anthropics/skills/main/skills/algorithmic-art/SKILL.md"
        );
    }

    #[test]
    fn test_github_repo_url_conversion() {
        let url = "https://github.com/anthropics/skills";
        let raw = github_to_raw_url(url).unwrap();
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/anthropics/skills/main/SKILL.md"
        );
    }

    #[test]
    fn test_github_repo_url_with_trailing_slash() {
        let url = "https://github.com/anthropics/skills/";
        let raw = github_to_raw_url(url).unwrap();
        assert_eq!(
            raw,
            "https://raw.githubusercontent.com/anthropics/skills/main/SKILL.md"
        );
    }

    #[test]
    fn test_non_github_url_returns_none() {
        let url = "https://example.com/skill.md";
        assert!(github_to_raw_url(url).is_none());
    }

    #[test]
    fn test_parse_skill_file_content_with_frontmatter() {
        let content = "---\nname: test-skill\ndescription: A test\n---\n\nContent here".to_string();
        let result = parse_skill_file_content(content, "test.md".to_string()).unwrap();
        assert_eq!(result.name, "test-skill");
        assert_eq!(result.description, "A test");
    }

    #[test]
    fn test_parse_skill_file_content_without_frontmatter() {
        let content = "# My Skill\n\nDo the thing.".to_string();
        let result = parse_skill_file_content(content, "my-skill/SKILL.md".to_string()).unwrap();
        assert_eq!(result.name, "my-skill");
    }

    #[test]
    fn test_read_mcp_from_opencode_source_path() {
        let file = NamedTempFile::new().unwrap();
        fs::write(
            file.path(),
            r#"{
  "mcp": {
    "linear": {
      "type": "http",
      "url": "https://mcp.linear.app/mcp"
    }
  }
}"#,
        )
        .unwrap();

        let mcp = read_mcp_from_source(
            "linear",
            "opencode",
            Some(file.path().to_string_lossy().as_ref()),
        )
        .unwrap();

        assert_eq!(mcp.mcp_type, "http");
        assert_eq!(mcp.url.as_deref(), Some("https://mcp.linear.app/mcp"));
    }

    #[test]
    fn test_remove_mcp_from_specific_tool_only_updates_selected_config() {
        let home = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            let claude_path = home.path().join(".claude.json");
            let gemini_path = home.path().join(".gemini").join("settings.json");
            fs::create_dir_all(gemini_path.parent().unwrap()).unwrap();

            fs::write(
                &claude_path,
                r#"{
  "mcpServers": {
    "github": { "command": "npx" },
    "keep": { "command": "node" }
  }
}"#,
            )
            .unwrap();
            fs::write(
                &gemini_path,
                r#"{
  "mcpServers": {
    "github": { "command": "npx" }
  }
}"#,
            )
            .unwrap();

            let result = remove_mcp_from_tools(RemoveMCPRequest {
                name: "github".to_string(),
                target_tools: vec!["claude".to_string()],
                scope: "user".to_string(),
                config_path: None,
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());
            assert_eq!(
                result.removed_files,
                vec![claude_path.to_string_lossy().to_string()]
            );

            let claude_content = fs::read_to_string(&claude_path).unwrap();
            assert!(!claude_content.contains("\"github\""));
            assert!(claude_content.contains("\"keep\""));

            let gemini_content = fs::read_to_string(&gemini_path).unwrap();
            assert!(gemini_content.contains("\"github\""));
        });
    }

    #[test]
    fn test_remove_linked_skill_from_one_tool_keeps_canonical_and_other_links() {
        let home = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            let canonical = home
                .path()
                .join(".agents")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(&canonical).unwrap();
            fs::write(canonical.join("SKILL.md"), "# Shared skill").unwrap();

            let claude_link = home
                .path()
                .join(".claude")
                .join("skills")
                .join("shared-skill");
            let gemini_link = home
                .path()
                .join(".gemini")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(claude_link.parent().unwrap()).unwrap();
            fs::create_dir_all(gemini_link.parent().unwrap()).unwrap();
            create_dir_symlink(&canonical, &claude_link).unwrap();
            create_dir_symlink(&canonical, &gemini_link).unwrap();

            let result = remove_skill_from_tools(RemoveSkillRequest {
                name: "shared-skill".to_string(),
                target_tools: vec!["claude".to_string()],
                remove_canonical: false,
                scope: "user".to_string(),
                workspace_path: None,
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());
            assert_eq!(
                result.removed_files,
                vec![claude_link.to_string_lossy().to_string()]
            );
            assert!(!claude_link.exists());
            assert!(fs::symlink_metadata(&gemini_link)
                .unwrap()
                .file_type()
                .is_symlink());
            assert!(canonical.join("SKILL.md").exists());
        });
    }

    #[test]
    fn test_remove_linked_skill_from_all_tools_also_removes_canonical_copy() {
        let home = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            let canonical = home
                .path()
                .join(".agents")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(&canonical).unwrap();
            fs::write(canonical.join("SKILL.md"), "# Shared skill").unwrap();

            let claude_link = home
                .path()
                .join(".claude")
                .join("skills")
                .join("shared-skill");
            let gemini_link = home
                .path()
                .join(".gemini")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(claude_link.parent().unwrap()).unwrap();
            fs::create_dir_all(gemini_link.parent().unwrap()).unwrap();
            create_dir_symlink(&canonical, &claude_link).unwrap();
            create_dir_symlink(&canonical, &gemini_link).unwrap();

            let result = remove_skill_from_tools(RemoveSkillRequest {
                name: "shared-skill".to_string(),
                target_tools: vec!["claude".to_string(), "gemini".to_string()],
                remove_canonical: true,
                scope: "user".to_string(),
                workspace_path: None,
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());
            assert_eq!(
                result.removed_files,
                vec![
                    claude_link.to_string_lossy().to_string(),
                    gemini_link.to_string_lossy().to_string(),
                    canonical.to_string_lossy().to_string(),
                ]
            );
            assert!(!claude_link.exists());
            assert!(!gemini_link.exists());
            assert!(!canonical.exists());
        });
    }

    #[test]
    fn test_remove_skill_deletes_broken_symlink() {
        let home = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            let canonical = home
                .path()
                .join(".agents")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(canonical.parent().unwrap()).unwrap();

            let claude_link = home
                .path()
                .join(".claude")
                .join("skills")
                .join("shared-skill");
            fs::create_dir_all(claude_link.parent().unwrap()).unwrap();
            create_dir_symlink(&canonical, &claude_link).unwrap();

            let result = remove_skill_from_tools(RemoveSkillRequest {
                name: "shared-skill".to_string(),
                target_tools: vec!["claude".to_string()],
                remove_canonical: false,
                scope: "user".to_string(),
                workspace_path: None,
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());
            assert_eq!(
                result.removed_files,
                vec![claude_link.to_string_lossy().to_string()]
            );
            assert!(!claude_link.exists());
        });
    }

    #[test]
    fn test_remove_project_scoped_mcp_uses_config_path() {
        let home = TempDir::new().unwrap();
        let workspace = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            // Create project-level .mcp.json
            let config_path = workspace.path().join(".mcp.json");
            fs::write(
                &config_path,
                r#"{
  "mcpServers": {
    "local-mcp": { "command": "node", "args": ["server.js"] },
    "keep-mcp": { "command": "python", "args": ["serve.py"] }
  }
}"#,
            )
            .unwrap();

            // Also create user-level config to verify it's NOT touched
            let user_claude = home.path().join(".claude.json");
            fs::write(
                &user_claude,
                r#"{"mcpServers": {"local-mcp": {"command": "other"}}}"#,
            )
            .unwrap();

            let result = remove_mcp_from_tools(RemoveMCPRequest {
                name: "local-mcp".to_string(),
                target_tools: vec!["claude".to_string()],
                scope: "project".to_string(),
                config_path: Some(config_path.to_string_lossy().to_string()),
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());

            // Project config should have local-mcp removed
            let project_content = fs::read_to_string(&config_path).unwrap();
            assert!(!project_content.contains("\"local-mcp\""));
            assert!(project_content.contains("\"keep-mcp\""));

            // User config should be untouched
            let user_content = fs::read_to_string(&user_claude).unwrap();
            assert!(user_content.contains("\"local-mcp\""));
        });
    }

    #[test]
    fn test_remove_project_scoped_skill_uses_workspace_path() {
        let home = TempDir::new().unwrap();
        let workspace = TempDir::new().unwrap();

        with_loadout_home(home.path(), || {
            // Create project-level skill
            let project_skill = workspace
                .path()
                .join(".claude")
                .join("skills")
                .join("local-skill");
            fs::create_dir_all(&project_skill).unwrap();
            fs::write(project_skill.join("SKILL.md"), "# Project skill").unwrap();

            // Also create user-level skill with same name to verify it's NOT touched
            let user_skill = home
                .path()
                .join(".claude")
                .join("skills")
                .join("local-skill");
            fs::create_dir_all(&user_skill).unwrap();
            fs::write(user_skill.join("SKILL.md"), "# User skill").unwrap();

            let result = remove_skill_from_tools(RemoveSkillRequest {
                name: "local-skill".to_string(),
                target_tools: vec!["claude".to_string()],
                remove_canonical: false,
                scope: "project".to_string(),
                workspace_path: Some(workspace.path().to_string_lossy().to_string()),
            })
            .unwrap();

            assert!(result.success);
            assert_eq!(result.errors, Vec::<String>::new());
            assert_eq!(
                result.removed_files,
                vec![project_skill.to_string_lossy().to_string()]
            );

            // Project skill should be gone
            assert!(!project_skill.exists());
            // User skill should still exist
            assert!(user_skill.join("SKILL.md").exists());
        });
    }
}
