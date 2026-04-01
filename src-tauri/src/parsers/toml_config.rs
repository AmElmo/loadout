//! TOML config parser for Codex CLI MCP configurations

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// MCP server configuration from TOML (Codex format)
/// Note: Codex uses `mcp_servers` (underscore) not `mcpServers` (camelCase)
/// Supports both stdio (command + args) and HTTP (url) transports.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TomlMCPServer {
    /// Command to run (required for stdio, absent for HTTP)
    pub command: Option<String>,
    #[serde(default)]
    pub args: Vec<String>,
    /// URL endpoint (required for HTTP, absent for stdio)
    pub url: Option<String>,
    #[serde(default)]
    pub env: HashMap<String, String>,
}

/// Root structure for Codex's ~/.codex/config.toml
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CodexConfig {
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub approval_policy: Option<String>,
    #[serde(default)]
    pub sandbox_mode: Option<String>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, TomlMCPServer>,
    #[serde(default)]
    pub features: CodexFeatures,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CodexFeatures {
    #[serde(default)]
    pub web_search: bool,
}

/// Parse Codex CLI TOML config file
pub fn parse_codex_config(path: &Path) -> Result<CodexConfig, String> {
    if !path.exists() {
        return Ok(CodexConfig::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    toml::from_str(&content).map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_parse_codex_config() {
        let mut file = NamedTempFile::with_suffix(".toml").unwrap();
        writeln!(
            file,
            r#"
model = "gpt-5.2-codex"
approval_policy = "on-request"

[mcp_servers.github]
command = "npx"
args = ["-y", "@github/mcp-server"]

[mcp_servers.github.env]
GITHUB_TOKEN = "test"
"#
        )
        .unwrap();

        let config = parse_codex_config(file.path()).unwrap();
        assert!(config.mcp_servers.contains_key("github"));
        let github = config.mcp_servers.get("github").unwrap();
        assert_eq!(github.command.as_deref(), Some("npx"));
        assert_eq!(github.args, vec!["-y", "@github/mcp-server"]);
    }

    #[test]
    fn test_parse_missing_file() {
        let config = parse_codex_config(Path::new("/nonexistent/config.toml")).unwrap();
        assert!(config.mcp_servers.is_empty());
    }
}
