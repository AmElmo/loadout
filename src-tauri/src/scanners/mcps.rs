//! MCP server discovery across all supported AI tools

use crate::parsers::{parse_claude_config, parse_codex_config, parse_gemini_config, parse_opencode_config};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

/// Health status of an MCP server
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Healthy,
    Unknown,
    Failed,
}

/// Source tool for a configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum SourceTool {
    Claude,
    Codex,
    Gemini,
    Cursor,
    Copilot,
    Windsurf,
    Roo,
    Cline,
    Kilo,
    OpenCode,
}

/// Scope of a configuration (user-level or project-level)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Scope {
    User,
    Project,
}

/// MCP type (stdio or http)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum MCPType {
    Stdio,
    Http,
}

/// Normalized MCP server configuration for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MCPItem {
    /// Unique identifier (hash of name + sources)
    pub id: String,
    /// Server name
    pub name: String,
    /// MCP type: stdio or http
    pub mcp_type: MCPType,
    /// Command to run (for stdio type)
    pub command: Option<String>,
    /// Command arguments (for stdio type)
    pub args: Vec<String>,
    /// URL endpoint (for http type)
    pub url: Option<String>,
    /// Environment variables (values masked)
    pub env: HashMap<String, String>,
    /// HTTP headers (for http type, values masked)
    pub headers: HashMap<String, String>,
    /// Which tools this MCP is configured in
    pub configured_in: Vec<SourceTool>,
    /// Scope (user or project level)
    pub scope: Scope,
    /// Path to the config file
    pub path: String,
    /// Health status (default: unknown)
    pub health: HealthStatus,
}

/// Individual MCP entry found during scanning (not yet merged)
#[derive(Debug, Clone)]
struct RawMCPEntry {
    name: String,
    mcp_type: MCPType,
    command: Option<String>,
    args: Vec<String>,
    url: Option<String>,
    env: HashMap<String, String>,
    headers: HashMap<String, String>,
    source_tool: SourceTool,
    scope: Scope,
    path: String,
}

/// Scan all MCP configurations from Claude Code, Codex CLI, and Gemini CLI
pub fn scan_all_mcps(workspace_path: Option<&str>) -> Result<Vec<MCPItem>, String> {
    let home_dir = crate::helpers::effective_home().ok_or("Could not determine home directory")?;
    let mut entries: Vec<RawMCPEntry> = Vec::new();

    // Scan Claude Code MCPs
    // User-level: ~/.claude.json
    let claude_user_path = home_dir.join(".claude.json");
    if let Ok(config) = parse_claude_config(&claude_user_path) {
        for (name, server) in config.mcp_servers {
            let mcp_type = if server.mcp_type == "http" {
                MCPType::Http
            } else {
                MCPType::Stdio
            };
            entries.push(RawMCPEntry {
                name,
                mcp_type,
                command: server.command,
                args: server.args,
                url: server.url,
                env: server.env,
                headers: server.headers,
                source_tool: SourceTool::Claude,
                scope: Scope::User,
                path: claude_user_path.to_string_lossy().to_string(),
            });
        }
    }

    // Project-level: $PROJECT_ROOT/.mcp.json (Claude Code)
    if let Some(ws_path) = workspace_path {
        let ws = PathBuf::from(ws_path);

        let project_mcp_path = ws.join(".mcp.json");
        if let Ok(config) = parse_claude_config(&project_mcp_path) {
            for (name, server) in config.mcp_servers {
                let mcp_type = if server.mcp_type == "http" {
                    MCPType::Http
                } else {
                    MCPType::Stdio
                };
                entries.push(RawMCPEntry {
                    name,
                    mcp_type,
                    command: server.command,
                    args: server.args,
                    url: server.url,
                    env: server.env,
                    headers: server.headers,
                    source_tool: SourceTool::Claude,
                    scope: Scope::Project,
                    path: project_mcp_path.to_string_lossy().to_string(),
                });
            }
        }

        // Project-level: $PROJECT_ROOT/.codex/config.toml (Codex CLI)
        let codex_project_path = ws.join(".codex").join("config.toml");
        if codex_project_path.exists() {
            if let Ok(config) = parse_codex_config(&codex_project_path) {
                for (name, server) in config.mcp_servers {
                    let mcp_type = if server.url.is_some() {
                        MCPType::Http
                    } else {
                        MCPType::Stdio
                    };
                    entries.push(RawMCPEntry {
                        name,
                        mcp_type,
                        command: server.command,
                        args: server.args,
                        url: server.url,
                        env: server.env,
                        headers: HashMap::new(),
                        source_tool: SourceTool::Codex,
                        scope: Scope::Project,
                        path: codex_project_path.to_string_lossy().to_string(),
                    });
                }
            }
        }

        // Project-level: $PROJECT_ROOT/.gemini/settings.json (Gemini CLI)
        let gemini_project_path = ws.join(".gemini").join("settings.json");
        if gemini_project_path.exists() {
            if let Ok(config) = parse_gemini_config(&gemini_project_path) {
                for (name, server) in config.mcp_servers {
                    let mcp_type = if server.mcp_type == "http" {
                        MCPType::Http
                    } else {
                        MCPType::Stdio
                    };
                    entries.push(RawMCPEntry {
                        name,
                        mcp_type,
                        command: server.command,
                        args: server.args,
                        url: server.url,
                        env: server.env,
                        headers: server.headers,
                        source_tool: SourceTool::Gemini,
                        scope: Scope::Project,
                        path: gemini_project_path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    // Scan Codex CLI MCPs
    // User-level: ~/.codex/config.toml
    let codex_config_path = home_dir.join(".codex").join("config.toml");
    if let Ok(config) = parse_codex_config(&codex_config_path) {
        for (name, server) in config.mcp_servers {
            let mcp_type = if server.url.is_some() {
                MCPType::Http
            } else {
                MCPType::Stdio
            };
            entries.push(RawMCPEntry {
                name,
                mcp_type,
                command: server.command,
                args: server.args,
                url: server.url,
                env: server.env,
                headers: HashMap::new(),
                source_tool: SourceTool::Codex,
                scope: Scope::User,
                path: codex_config_path.to_string_lossy().to_string(),
            });
        }
    }

    // Scan Gemini CLI MCPs
    // User-level: ~/.gemini/settings.json
    let gemini_config_path = home_dir.join(".gemini").join("settings.json");
    if let Ok(config) = parse_gemini_config(&gemini_config_path) {
        for (name, server) in config.mcp_servers {
            let mcp_type = if server.mcp_type == "http" {
                MCPType::Http
            } else {
                MCPType::Stdio
            };
            entries.push(RawMCPEntry {
                name,
                mcp_type,
                command: server.command,
                args: server.args,
                url: server.url,
                env: server.env,
                headers: server.headers,
                source_tool: SourceTool::Gemini,
                scope: Scope::User,
                path: gemini_config_path.to_string_lossy().to_string(),
            });
        }
    }

    // === Cursor MCPs ===
    // User-level: ~/.cursor/mcp.json
    let cursor_user_path = home_dir.join(".cursor").join("mcp.json");
    scan_json_mcp_file(&cursor_user_path, SourceTool::Cursor, Scope::User, &mut entries);

    // === Copilot MCPs ===
    // User-level: ~/.vscode/mcp.json
    let copilot_user_path = home_dir.join(".vscode").join("mcp.json");
    scan_json_mcp_file(&copilot_user_path, SourceTool::Copilot, Scope::User, &mut entries);

    // === Windsurf MCPs ===
    // User-level: ~/.codeium/windsurf/mcp_config.json
    let windsurf_user_path = home_dir.join(".codeium").join("windsurf").join("mcp_config.json");
    scan_json_mcp_file(&windsurf_user_path, SourceTool::Windsurf, Scope::User, &mut entries);

    // === OpenCode MCPs ===
    // User-level: ~/.config/opencode/opencode.json
    let opencode_user_path = home_dir.join(".config").join("opencode").join("opencode.json");
    if let Ok(config) = parse_opencode_config(&opencode_user_path) {
        for (name, server) in config.mcp {
            let mcp_type = if server.mcp_type == "http" { MCPType::Http } else { MCPType::Stdio };
            entries.push(RawMCPEntry {
                name,
                mcp_type,
                command: server.command,
                args: server.args,
                url: server.url,
                env: server.env,
                headers: server.headers,
                source_tool: SourceTool::OpenCode,
                scope: Scope::User,
                path: opencode_user_path.to_string_lossy().to_string(),
            });
        }
    }

    // === Roo MCPs ===
    // User-level: ~/.roo/mcp.json
    let roo_user_path = home_dir.join(".roo").join("mcp.json");
    scan_json_mcp_file(&roo_user_path, SourceTool::Roo, Scope::User, &mut entries);

    // === Cline MCPs ===
    // User-level: ~/.cline/mcp.json
    let cline_user_path = home_dir.join(".cline").join("mcp.json");
    scan_json_mcp_file(&cline_user_path, SourceTool::Cline, Scope::User, &mut entries);

    // === Kilo MCPs ===
    // User-level: ~/.kilocode/mcp.json
    let kilo_user_path = home_dir.join(".kilocode").join("mcp.json");
    scan_json_mcp_file(&kilo_user_path, SourceTool::Kilo, Scope::User, &mut entries);

    // === Project-level scans for new tools ===
    if let Some(ws_path) = workspace_path {
        let ws = PathBuf::from(ws_path);

        // Cursor: $PROJECT_ROOT/.cursor/mcp.json
        let cursor_project_path = ws.join(".cursor").join("mcp.json");
        scan_json_mcp_file(&cursor_project_path, SourceTool::Cursor, Scope::Project, &mut entries);

        // Copilot: $PROJECT_ROOT/.vscode/mcp.json
        let copilot_project_path = ws.join(".vscode").join("mcp.json");
        scan_json_mcp_file(&copilot_project_path, SourceTool::Copilot, Scope::Project, &mut entries);

        // Windsurf: project-level (already scanned user-level above)
        // Windsurf doesn't have project-level MCP config (only user-level)

        // Roo: $PROJECT_ROOT/.roo/mcp.json
        let roo_project_path = ws.join(".roo").join("mcp.json");
        scan_json_mcp_file(&roo_project_path, SourceTool::Roo, Scope::Project, &mut entries);

        // Cline: $PROJECT_ROOT/.cline/mcp.json
        let cline_project_path = ws.join(".cline").join("mcp.json");
        scan_json_mcp_file(&cline_project_path, SourceTool::Cline, Scope::Project, &mut entries);

        // Kilo: $PROJECT_ROOT/.kilocode/mcp.json
        let kilo_project_path = ws.join(".kilocode").join("mcp.json");
        scan_json_mcp_file(&kilo_project_path, SourceTool::Kilo, Scope::Project, &mut entries);

        // OpenCode: $PROJECT_ROOT/opencode.json
        let opencode_project_path = ws.join("opencode.json");
        if let Ok(config) = parse_opencode_config(&opencode_project_path) {
            for (name, server) in config.mcp {
                let mcp_type = if server.mcp_type == "http" { MCPType::Http } else { MCPType::Stdio };
                entries.push(RawMCPEntry {
                    name,
                    mcp_type,
                    command: server.command,
                    args: server.args,
                    url: server.url,
                    env: server.env,
                    headers: server.headers,
                    source_tool: SourceTool::OpenCode,
                    scope: Scope::Project,
                    path: opencode_project_path.to_string_lossy().to_string(),
                });
            }
        }
    }

    // Merge entries with the same name
    let merged = merge_mcp_entries(entries);

    Ok(merged)
}

/// Helper: scan a JSON file with Claude-style `mcpServers` format
fn scan_json_mcp_file(
    path: &PathBuf,
    source_tool: SourceTool,
    scope: Scope,
    entries: &mut Vec<RawMCPEntry>,
) {
    if let Ok(config) = parse_claude_config(path) {
        for (name, server) in config.mcp_servers {
            // Detect type: explicit "http" type, or infer from url presence when no command
            let mcp_type = if server.mcp_type == "http"
                || (server.url.is_some() && server.command.is_none())
            {
                MCPType::Http
            } else {
                MCPType::Stdio
            };
            entries.push(RawMCPEntry {
                name,
                mcp_type,
                command: server.command,
                args: server.args,
                url: server.url,
                env: server.env,
                headers: server.headers,
                source_tool: source_tool.clone(),
                scope: scope.clone(),
                path: path.to_string_lossy().to_string(),
            });
        }
    }
}

/// Merge MCP entries with the same name, tracking which tools they're configured in
fn merge_mcp_entries(entries: Vec<RawMCPEntry>) -> Vec<MCPItem> {
    let mut by_name: HashMap<String, MCPItem> = HashMap::new();

    for entry in entries {
        let masked_env = mask_env_values(&entry.env);
        let masked_headers = mask_env_values(&entry.headers);

        if let Some(existing) = by_name.get_mut(&entry.name) {
            // Add this tool to the list if not already present
            if !existing.configured_in.contains(&entry.source_tool) {
                existing.configured_in.push(entry.source_tool);
            }
            // If this is project-scoped, update scope
            if entry.scope == Scope::Project {
                existing.scope = Scope::Project;
                existing.path = entry.path;
            }
        } else {
            // Create new entry
            let id = generate_id(&entry.name);
            by_name.insert(
                entry.name.clone(),
                MCPItem {
                    id,
                    name: entry.name,
                    mcp_type: entry.mcp_type,
                    command: entry.command,
                    args: entry.args,
                    url: entry.url,
                    env: masked_env,
                    headers: masked_headers,
                    configured_in: vec![entry.source_tool],
                    scope: entry.scope,
                    path: entry.path,
                    health: HealthStatus::Unknown,
                },
            );
        }
    }

    let mut result: Vec<MCPItem> = by_name.into_values().collect();
    result.sort_by(|a, b| a.name.cmp(&b.name));
    result
}

/// Generate a unique ID from the MCP name
fn generate_id(name: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    name.hash(&mut hasher);
    format!("mcp_{:x}", hasher.finish())
}

/// Mask environment variable values for security
fn mask_env_values(env: &HashMap<String, String>) -> HashMap<String, String> {
    env.iter()
        .map(|(k, _)| (k.clone(), "***".to_string()))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_same_name() {
        let entries = vec![
            RawMCPEntry {
                name: "github".to_string(),
                mcp_type: MCPType::Stdio,
                command: Some("npx".to_string()),
                args: vec!["-y".to_string(), "@github/mcp-server".to_string()],
                url: None,
                env: HashMap::new(),
                headers: HashMap::new(),
                source_tool: SourceTool::Claude,
                scope: Scope::User,
                path: "/path/to/claude.json".to_string(),
            },
            RawMCPEntry {
                name: "github".to_string(),
                mcp_type: MCPType::Stdio,
                command: Some("npx".to_string()),
                args: vec!["-y".to_string(), "@github/mcp-server".to_string()],
                url: None,
                env: HashMap::new(),
                headers: HashMap::new(),
                source_tool: SourceTool::Codex,
                scope: Scope::User,
                path: "/path/to/config.toml".to_string(),
            },
        ];

        let merged = merge_mcp_entries(entries);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].configured_in.len(), 2);
        assert!(merged[0].configured_in.contains(&SourceTool::Claude));
        assert!(merged[0].configured_in.contains(&SourceTool::Codex));
    }

    #[test]
    fn test_http_mcp_entry() {
        let entries = vec![RawMCPEntry {
            name: "linear".to_string(),
            mcp_type: MCPType::Http,
            command: None,
            args: vec![],
            url: Some("https://mcp.linear.app/mcp".to_string()),
            env: HashMap::new(),
            headers: HashMap::new(),
            source_tool: SourceTool::Claude,
            scope: Scope::User,
            path: "/path/to/claude.json".to_string(),
        }];

        let merged = merge_mcp_entries(entries);
        assert_eq!(merged.len(), 1);
        assert_eq!(merged[0].mcp_type, MCPType::Http);
        assert_eq!(
            merged[0].url,
            Some("https://mcp.linear.app/mcp".to_string())
        );
        assert!(merged[0].command.is_none());
    }

    #[test]
    fn test_mask_env_values() {
        let mut env = HashMap::new();
        env.insert("API_KEY".to_string(), "secret123".to_string());
        env.insert("TOKEN".to_string(), "mytoken".to_string());

        let masked = mask_env_values(&env);
        assert_eq!(masked.get("API_KEY"), Some(&"***".to_string()));
        assert_eq!(masked.get("TOKEN"), Some(&"***".to_string()));
    }

    #[test]
    fn test_generate_id() {
        let id1 = generate_id("github");
        let id2 = generate_id("github");
        let id3 = generate_id("postgres");

        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
        assert!(id1.starts_with("mcp_"));
    }
}
