//! Parser for plugin manifest files (Claude plugin.json, Gemini extension, marketplace catalogs)

use serde::Deserialize;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

// === plugin.json (Claude) ===

#[derive(Debug, Clone, Deserialize)]
pub struct PluginAuthor {
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct PluginJson {
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub author: Option<PluginAuthor>,
}

pub fn parse_plugin_json(path: &Path) -> Result<PluginJson, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

// === gemini-extension.json ===

/// MCP server entry within a Gemini extension
#[derive(Debug, Clone, Deserialize)]
pub struct GeminiExtMcpServer {
    #[serde(default)]
    pub command: Option<String>,
    #[serde(default)]
    pub args: Option<Vec<String>>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub env: Option<HashMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeminiExtensionJson {
    pub name: String,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub mcp_servers: HashMap<String, GeminiExtMcpServer>,
    #[serde(default)]
    pub context_file_name: Option<String>,
}

pub fn parse_gemini_extension_json(path: &Path) -> Result<GeminiExtensionJson, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

// === marketplace.json ===

#[derive(Debug, Clone, Deserialize)]
pub struct MarketplaceOwner {
    pub name: String,
    #[serde(default)]
    pub email: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MarketplacePluginEntry {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub author: Option<PluginAuthor>,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MarketplaceJson {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub owner: Option<MarketplaceOwner>,
    #[serde(default)]
    pub plugins: Vec<MarketplacePluginEntry>,
}

pub fn parse_marketplace_json(path: &Path) -> Result<MarketplaceJson, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

// === installed_plugins.json ===

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPluginEntry {
    #[serde(default)]
    pub scope: Option<String>,
    #[serde(default)]
    pub install_path: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub installed_at: Option<String>,
    #[serde(default)]
    pub last_updated: Option<String>,
    #[serde(default)]
    pub git_commit_sha: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct InstalledPluginsJson {
    #[serde(default)]
    pub version: Option<u32>,
    #[serde(default)]
    pub plugins: HashMap<String, Vec<InstalledPluginEntry>>,
}

pub fn parse_installed_plugins_json(path: &Path) -> Result<InstalledPluginsJson, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_plugin_json() {
        let json = r#"{"name":"data","version":"1.0.0","description":"Write SQL","author":{"name":"Anthropic"}}"#;
        let parsed: PluginJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "data");
        assert_eq!(parsed.version, Some("1.0.0".to_string()));
        assert_eq!(parsed.author.unwrap().name, "Anthropic");
    }

    #[test]
    fn test_parse_plugin_json_minimal() {
        let json = r#"{"name":"minimal"}"#;
        let parsed: PluginJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "minimal");
        assert!(parsed.version.is_none());
        assert!(parsed.description.is_none());
    }

    #[test]
    fn test_parse_plugin_json_with_email() {
        let json = r#"{"name":"plugin","author":{"name":"Anthropic","email":"support@anthropic.com"}}"#;
        let parsed: PluginJson = serde_json::from_str(json).unwrap();
        let author = parsed.author.unwrap();
        assert_eq!(author.name, "Anthropic");
        assert_eq!(author.email, Some("support@anthropic.com".to_string()));
    }

    #[test]
    fn test_parse_gemini_extension() {
        let json = r#"{"name":"code-search","version":"0.3.0","description":"Search code","mcpServers":{"search":{"command":"node","args":["server.js"]}}}"#;
        let parsed: GeminiExtensionJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "code-search");
        assert_eq!(parsed.mcp_servers.len(), 1);
        assert!(parsed.mcp_servers.contains_key("search"));
        let server = parsed.mcp_servers.get("search").unwrap();
        assert_eq!(server.command, Some("node".to_string()));
        assert_eq!(server.args, Some(vec!["server.js".to_string()]));
    }

    #[test]
    fn test_parse_gemini_extension_minimal() {
        let json = r#"{"name":"my-ext"}"#;
        let parsed: GeminiExtensionJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "my-ext");
        assert!(parsed.version.is_none());
        assert!(parsed.mcp_servers.is_empty());
        assert!(parsed.context_file_name.is_none());
    }

    #[test]
    fn test_parse_gemini_extension_with_context_file() {
        let json = r#"{"name":"ext","contextFileName":"GEMINI.md","settings":{}}"#;
        let parsed: GeminiExtensionJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.context_file_name, Some("GEMINI.md".to_string()));
    }

    #[test]
    fn test_parse_marketplace_json() {
        let json = r#"{"name":"official","plugins":[{"name":"commit","description":"Commits","version":"1.0.0","category":"productivity"}]}"#;
        let parsed: MarketplaceJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "official");
        assert_eq!(parsed.plugins.len(), 1);
        assert_eq!(parsed.plugins[0].category, Some("productivity".to_string()));
    }

    #[test]
    fn test_parse_marketplace_json_full() {
        let json = r#"{
            "$schema": "...",
            "name": "claude-plugins-official",
            "description": "Official plugins",
            "owner": {"name": "Anthropic", "email": "hello@anthropic.com"},
            "plugins": [
                {
                    "name": "commit-commands",
                    "description": "Commit helpers",
                    "version": "1.0.0",
                    "author": {"name": "Anthropic"},
                    "source": "./plugins/commit-commands",
                    "category": "productivity"
                }
            ]
        }"#;
        let parsed: MarketplaceJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "claude-plugins-official");
        let owner = parsed.owner.unwrap();
        assert_eq!(owner.name, "Anthropic");
        assert_eq!(owner.email, Some("hello@anthropic.com".to_string()));
        assert_eq!(parsed.plugins[0].source, Some("./plugins/commit-commands".to_string()));
    }

    #[test]
    fn test_parse_marketplace_json_empty_plugins() {
        let json = r#"{"name":"empty-catalog"}"#;
        let parsed: MarketplaceJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.name, "empty-catalog");
        assert!(parsed.plugins.is_empty());
        assert!(parsed.owner.is_none());
    }

    #[test]
    fn test_parse_installed_plugins() {
        let json = r#"{"version":2,"plugins":{"commit@official":[{"scope":"user","installPath":"cache/official/commit/1.0.0","version":"1.0.0","installedAt":"2026-02-19T03:32:02.466Z"}]}}"#;
        let parsed: InstalledPluginsJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.version, Some(2));
        assert_eq!(parsed.plugins.len(), 1);
        let entries = &parsed.plugins["commit@official"];
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].scope, Some("user".to_string()));
        assert_eq!(entries[0].install_path, Some("cache/official/commit/1.0.0".to_string()));
        assert_eq!(entries[0].version, Some("1.0.0".to_string()));
        assert_eq!(entries[0].installed_at, Some("2026-02-19T03:32:02.466Z".to_string()));
    }

    #[test]
    fn test_parse_installed_plugins_full_entry() {
        let json = r#"{
            "version": 2,
            "plugins": {
                "data@official": [{
                    "scope": "user",
                    "installPath": "cache/official/data/1.0.0",
                    "version": "1.0.0",
                    "installedAt": "2026-02-19T03:32:02.466Z",
                    "lastUpdated": "2026-02-20T10:00:00.000Z",
                    "gitCommitSha": "abc123def456"
                }]
            }
        }"#;
        let parsed: InstalledPluginsJson = serde_json::from_str(json).unwrap();
        let entries = &parsed.plugins["data@official"];
        assert_eq!(entries[0].last_updated, Some("2026-02-20T10:00:00.000Z".to_string()));
        assert_eq!(entries[0].git_commit_sha, Some("abc123def456".to_string()));
    }

    #[test]
    fn test_parse_installed_plugins_empty() {
        let json = r#"{"version":2,"plugins":{}}"#;
        let parsed: InstalledPluginsJson = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.version, Some(2));
        assert!(parsed.plugins.is_empty());
    }

    #[test]
    fn test_parse_installed_plugins_minimal() {
        let json = r#"{}"#;
        let parsed: InstalledPluginsJson = serde_json::from_str(json).unwrap();
        assert!(parsed.version.is_none());
        assert!(parsed.plugins.is_empty());
    }
}
