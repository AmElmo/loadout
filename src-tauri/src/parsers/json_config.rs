//! JSON config parser for Claude Code and Gemini CLI MCP configurations

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// MCP server configuration from JSON files (Claude/Gemini format)
/// Supports both stdio (command-based) and http (url-based) MCPs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsonMCPServer {
    /// Type of MCP: "stdio" or "http" (defaults to "stdio" if not specified)
    #[serde(rename = "type", default = "default_mcp_type")]
    pub mcp_type: String,
    /// Command to run (for stdio type)
    #[serde(default)]
    pub command: Option<String>,
    /// Command arguments (for stdio type)
    #[serde(default)]
    pub args: Vec<String>,
    /// URL endpoint (for http type)
    #[serde(default)]
    pub url: Option<String>,
    /// Environment variables
    #[serde(default)]
    pub env: HashMap<String, String>,
    /// HTTP headers (for http type, supports ${VAR} interpolation)
    #[serde(default)]
    pub headers: HashMap<String, String>,
}

fn default_mcp_type() -> String {
    "stdio".to_string()
}

/// Root structure for Claude's ~/.claude.json or project .mcp.json
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeConfig {
    #[serde(default)]
    pub mcp_servers: HashMap<String, JsonMCPServer>,
}

/// Root structure for Gemini's ~/.gemini/settings.json
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GeminiConfig {
    #[serde(default)]
    pub mcp_servers: HashMap<String, JsonMCPServer>,
    #[serde(default)]
    pub experiments: GeminiExperiments,
    #[serde(default)]
    pub hooks: HashMap<String, Vec<HookMatcher>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GeminiExperiments {
    #[serde(default)]
    pub enable_hooks: bool,
    #[serde(default)]
    pub agent_skills: bool,
}

/// Hook matcher entry in settings.json (same structure for Claude and Gemini)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookMatcher {
    #[serde(default)]
    pub matcher: Option<String>,
    #[serde(default)]
    pub hooks: Vec<HookAction>,
}

/// Hook action (command to run)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookAction {
    #[serde(rename = "type", default)]
    pub action_type: Option<String>,
    #[serde(default)]
    pub command: Option<String>,
}

/// Claude Code settings.json structure (for hooks + permissions)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClaudeSettings {
    #[serde(default)]
    pub hooks: HashMap<String, Vec<HookMatcher>>,
    #[serde(default)]
    pub permissions: Option<ClaudePermissions>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ClaudePermissions {
    #[serde(default)]
    pub allow: Vec<String>,
    #[serde(default)]
    pub deny: Vec<String>,
}

/// Parse Claude Code settings.json (hooks and permissions)
pub fn parse_claude_settings(path: &Path) -> Result<ClaudeSettings, String> {
    if !path.exists() {
        return Ok(ClaudeSettings::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

/// Parse Claude Code JSON config file
pub fn parse_claude_config(path: &Path) -> Result<ClaudeConfig, String> {
    if !path.exists() {
        return Ok(ClaudeConfig::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

/// Parse Gemini CLI JSON config file
pub fn parse_gemini_config(path: &Path) -> Result<GeminiConfig, String> {
    if !path.exists() {
        return Ok(GeminiConfig::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_parse_stdio_mcp() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"{{
                "mcpServers": {{
                    "github": {{
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "@github/mcp-server"],
                        "env": {{"GITHUB_TOKEN": "test"}}
                    }}
                }}
            }}"#
        )
        .unwrap();

        let config = parse_claude_config(file.path()).unwrap();
        assert!(config.mcp_servers.contains_key("github"));
        let github = config.mcp_servers.get("github").unwrap();
        assert_eq!(github.mcp_type, "stdio");
        assert_eq!(github.command, Some("npx".to_string()));
        assert_eq!(github.args, vec!["-y", "@github/mcp-server"]);
    }

    #[test]
    fn test_parse_http_mcp() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"{{
                "mcpServers": {{
                    "linear": {{
                        "type": "http",
                        "url": "https://mcp.linear.app/mcp"
                    }}
                }}
            }}"#
        )
        .unwrap();

        let config = parse_claude_config(file.path()).unwrap();
        assert!(config.mcp_servers.contains_key("linear"));
        let linear = config.mcp_servers.get("linear").unwrap();
        assert_eq!(linear.mcp_type, "http");
        assert_eq!(linear.url, Some("https://mcp.linear.app/mcp".to_string()));
        assert!(linear.command.is_none());
    }

    #[test]
    fn test_parse_missing_file() {
        let config = parse_claude_config(Path::new("/nonexistent/file.json")).unwrap();
        assert!(config.mcp_servers.is_empty());
    }
}
