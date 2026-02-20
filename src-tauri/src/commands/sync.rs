//! Tauri commands for syncing MCP and skill configs across tools

use crate::converters::{
    to_claude_json_preview, to_codex_toml_preview, to_gemini_json_preview, MCPServerInput,
};
use crate::parsers::{parse_claude_config, parse_codex_config, parse_gemini_config};
use crate::parsers::parse_skill_content;
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
    #[serde(default)]
    pub files: Vec<SkillFile>,
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
            let default_path = match mcp_config_path(source_tool) {
                Ok(p) => p,
                Err(e) => return Err(e),
            };
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
            let default_path = match mcp_config_path(source_tool) {
                Ok(p) => p,
                Err(e) => return Err(e),
            };
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

/// Parsed GitHub URL information
#[derive(Debug, Clone, PartialEq)]
enum GitHubUrl {
    /// A direct file: github.com/org/repo/blob/branch/path
    Blob {
        owner: String,
        repo: String,
        branch: String,
        path: String,
    },
    /// A directory: github.com/org/repo/tree/branch/path
    Tree {
        owner: String,
        repo: String,
        branch: String,
        path: String,
    },
    /// Bare repo: github.com/org/repo
    Repo {
        owner: String,
        repo: String,
    },
}

/// Parse a GitHub URL into structured components
fn parse_github_url(url: &str) -> Option<GitHubUrl> {
    let rest = url
        .strip_prefix("https://github.com/")
        .or_else(|| url.strip_prefix("http://github.com/"))?;

    let parts: Vec<&str> = rest.splitn(5, '/').collect();

    if parts.len() >= 4 && parts[2] == "blob" {
        return Some(GitHubUrl::Blob {
            owner: parts[0].to_string(),
            repo: parts[1].to_string(),
            branch: parts[3].to_string(),
            path: parts.get(4).unwrap_or(&"").to_string(),
        });
    }

    if parts.len() >= 4 && parts[2] == "tree" {
        let dir_path = parts
            .get(4)
            .unwrap_or(&"")
            .trim_end_matches('/')
            .to_string();
        return Some(GitHubUrl::Tree {
            owner: parts[0].to_string(),
            repo: parts[1].to_string(),
            branch: parts[3].to_string(),
            path: dir_path,
        });
    }

    if parts.len() == 2 || (parts.len() == 3 && parts[2].is_empty()) {
        return Some(GitHubUrl::Repo {
            owner: parts[0].to_string(),
            repo: parts[1].trim_end_matches('/').to_string(),
        });
    }

    None
}

/// Convert a GitHub URL to a raw content URL (used in tests)
#[cfg(test)]
fn github_to_raw_url(url: &str) -> Option<String> {
    match parse_github_url(url)? {
        GitHubUrl::Blob {
            owner,
            repo,
            branch,
            path,
        } => Some(format!(
            "https://raw.githubusercontent.com/{}/{}/{}/{}",
            owner, repo, branch, path
        )),
        GitHubUrl::Tree {
            owner,
            repo,
            branch,
            path,
        } => {
            if path.is_empty() {
                Some(format!(
                    "https://raw.githubusercontent.com/{}/{}/{}/SKILL.md",
                    owner, repo, branch
                ))
            } else {
                Some(format!(
                    "https://raw.githubusercontent.com/{}/{}/{}/{}/SKILL.md",
                    owner, repo, branch, path
                ))
            }
        }
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
                client, owner, repo, branch, &entry.path,
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

/// Fetch raw content from a URL, rejecting HTML responses
async fn fetch_raw_content(client: &reqwest::Client, url: &str) -> Result<String, String> {
    let response = client
        .get(url)
        .header("User-Agent", "Loadout/0.1")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch URL: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("HTTP {} fetching {}", response.status(), url));
    }

    // Check content type — reject HTML responses
    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_lowercase();

    if content_type.contains("text/html") {
        return Err(
            "URL returned an HTML page instead of raw markdown. For GitHub, use a raw URL like https://raw.githubusercontent.com/org/repo/main/SKILL.md".to_string()
        );
    }

    let raw_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Double-check: sometimes content-type is missing/wrong, detect HTML by content
    let trimmed = raw_content.trim_start();
    if trimmed.starts_with("<!DOCTYPE") || trimmed.starts_with("<html") {
        return Err(
            "URL returned an HTML page instead of raw markdown. For GitHub, use a raw URL like https://raw.githubusercontent.com/org/repo/main/SKILL.md".to_string()
        );
    }

    Ok(raw_content)
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
    if let Some(gh) = parse_github_url(&url) {
        match gh {
            GitHubUrl::Tree {
                owner,
                repo,
                branch,
                path,
            } => {
                // Fetch SKILL.md from the directory
                let skill_md_url = if path.is_empty() {
                    format!(
                        "https://raw.githubusercontent.com/{}/{}/{}/SKILL.md",
                        owner, repo, branch
                    )
                } else {
                    format!(
                        "https://raw.githubusercontent.com/{}/{}/{}/{}/SKILL.md",
                        owner, repo, branch, path
                    )
                };

                let raw_content = fetch_raw_content(&client, &skill_md_url).await?;

                // Derive fallback name from directory path
                let fallback_name = if path.is_empty() {
                    repo.clone()
                } else {
                    path.rsplit('/')
                        .next()
                        .unwrap_or("imported-skill")
                        .to_string()
                };

                let parsed = parse_skill_content(&raw_content, &fallback_name)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // Fetch companion files from the directory
                let files =
                    fetch_github_directory(&client, &owner, &repo, &branch, &path).await?;

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
                branch,
                ref path,
            } => {
                // Fetch the file itself
                let raw_url = format!(
                    "https://raw.githubusercontent.com/{}/{}/{}/{}",
                    owner, repo, branch, path
                );
                let raw_content = fetch_raw_content(&client, &raw_url).await?;

                let fallback_name = path
                    .rsplit('/')
                    .find(|s| !s.is_empty())
                    .unwrap_or("imported-skill")
                    .trim_end_matches(".md")
                    .to_string();

                let parsed = parse_skill_content(&raw_content, &fallback_name)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // If this is a SKILL.md file, also fetch sibling files
                let files = if path.ends_with("SKILL.md") {
                    let dir_path = path.trim_end_matches("SKILL.md").trim_end_matches('/');
                    fetch_github_directory(&client, &owner, &repo, &branch, dir_path).await
                        .unwrap_or_default()
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
                let raw_content = fetch_raw_content(&client, &raw_url).await?;

                let parsed = parse_skill_content(&raw_content, &repo)
                    .map_err(|e| format!("Failed to parse skill: {}", e))?;

                // Fetch companion files from repo root
                let files =
                    fetch_github_directory(&client, &owner, &repo, "main", "").await
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
    let raw_content = fetch_raw_content(&client, &fetch_url).await?;

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
    let content = std::fs::read_to_string(&path_buf)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    let filename = path_buf
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "SKILL.md".to_string());

    // Use parent dir name as fallback skill name (matching how the scanner works)
    let fallback_name = path_buf
        .parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| {
            filename
                .trim_end_matches(".md")
                .to_string()
        });

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
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::NamedTempFile;

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
}
