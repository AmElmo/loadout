use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::json_config::JsonMCPServer;

/// OpenCode config structure (opencode.json)
/// Uses `mcp` key instead of `mcpServers`
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct OpenCodeConfig {
    #[serde(default)]
    pub mcp: HashMap<String, JsonMCPServer>,
    #[serde(default)]
    pub instructions: Vec<String>,
}

/// Parse OpenCode config file
pub fn parse_opencode_config(path: &Path) -> Result<OpenCodeConfig, String> {
    if !path.exists() {
        return Ok(OpenCodeConfig::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;

    serde_json::from_str(&content).map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_parse_opencode_config() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(
            file,
            r#"{{
                "mcp": {{
                    "github": {{
                        "type": "stdio",
                        "command": "npx",
                        "args": ["-y", "@github/mcp-server"],
                        "env": {{"GITHUB_TOKEN": "test"}}
                    }}
                }},
                "instructions": ["docs/INSTRUCTIONS.md"]
            }}"#
        )
        .unwrap();

        let config = parse_opencode_config(file.path()).unwrap();
        assert!(config.mcp.contains_key("github"));
        assert_eq!(config.instructions.len(), 1);
    }

    #[test]
    fn test_parse_missing_file() {
        let config = parse_opencode_config(Path::new("/nonexistent/opencode.json")).unwrap();
        assert!(config.mcp.is_empty());
    }
}
