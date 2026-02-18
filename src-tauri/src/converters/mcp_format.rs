//! MCP format conversion for preview and writing across Claude, Codex, and Gemini

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;

/// Input from the frontend when adding an MCP
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MCPServerInput {
    pub mcp_type: String, // "stdio" or "http"
    pub command: Option<String>,
    pub args: Vec<String>,
    pub url: Option<String>,
    pub env: HashMap<String, String>,
}

/// Generate the JSON value for a single MCP server entry (Claude/Gemini format)
fn to_json_mcp_value(mcp: &MCPServerInput) -> Value {
    if mcp.mcp_type == "http" {
        let mut obj = serde_json::Map::new();
        obj.insert("type".to_string(), json!("http"));
        if let Some(url) = &mcp.url {
            obj.insert("url".to_string(), json!(url));
        }
        Value::Object(obj)
    } else {
        let mut obj = serde_json::Map::new();
        if let Some(cmd) = &mcp.command {
            obj.insert("command".to_string(), json!(cmd));
        }
        if !mcp.args.is_empty() {
            obj.insert("args".to_string(), json!(mcp.args));
        }
        if !mcp.env.is_empty() {
            obj.insert("env".to_string(), json!(mcp.env));
        }
        Value::Object(obj)
    }
}

/// Generate a Claude JSON config preview for the MCP
pub fn to_claude_json_preview(name: &str, mcp: &MCPServerInput) -> String {
    let wrapper = json!({
        "mcpServers": {
            name: to_json_mcp_value(mcp)
        }
    });
    serde_json::to_string_pretty(&wrapper).unwrap_or_default()
}

/// Generate a Codex TOML config preview for the MCP
pub fn to_codex_toml_preview(name: &str, mcp: &MCPServerInput) -> String {
    let mut lines = Vec::new();
    lines.push(format!("[mcp_servers.{}]", name));

    if mcp.mcp_type == "http" {
        if let Some(url) = &mcp.url {
            lines.push(format!("url = \"{}\"", url));
        }
    } else {
        if let Some(cmd) = &mcp.command {
            lines.push(format!("command = \"{}\"", cmd));
        }
        if !mcp.args.is_empty() {
            let args: Vec<String> = mcp.args.iter().map(|a| format!("\"{}\"", a)).collect();
            lines.push(format!("args = [{}]", args.join(", ")));
        }
    }

    if !mcp.env.is_empty() {
        lines.push(String::new());
        lines.push(format!("[mcp_servers.{}.env]", name));
        for (k, v) in &mcp.env {
            lines.push(format!("{} = \"{}\"", k, v));
        }
    }

    lines.join("\n")
}

/// Generate a Gemini JSON config preview for the MCP
pub fn to_gemini_json_preview(name: &str, mcp: &MCPServerInput) -> String {
    let wrapper = json!({
        "mcpServers": {
            name: to_json_mcp_value(mcp)
        }
    });
    serde_json::to_string_pretty(&wrapper).unwrap_or_default()
}

/// Get the JSON value for inserting into an existing config
pub fn to_json_value(mcp: &MCPServerInput) -> Value {
    to_json_mcp_value(mcp)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn stdio_mcp() -> MCPServerInput {
        let mut env = HashMap::new();
        env.insert("GITHUB_TOKEN".to_string(), "test-token".to_string());
        MCPServerInput {
            mcp_type: "stdio".to_string(),
            command: Some("npx".to_string()),
            args: vec!["-y".to_string(), "@github/mcp-server".to_string()],
            url: None,
            env,
        }
    }

    fn http_mcp() -> MCPServerInput {
        MCPServerInput {
            mcp_type: "http".to_string(),
            command: None,
            args: vec![],
            url: Some("https://mcp.linear.app/mcp".to_string()),
            env: HashMap::new(),
        }
    }

    #[test]
    fn test_claude_json_preview_stdio() {
        let preview = to_claude_json_preview("github", &stdio_mcp());
        let parsed: Value = serde_json::from_str(&preview).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        let github = servers.get("github").unwrap();
        assert_eq!(github.get("command").unwrap(), "npx");
    }

    #[test]
    fn test_claude_json_preview_http() {
        let preview = to_claude_json_preview("linear", &http_mcp());
        let parsed: Value = serde_json::from_str(&preview).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        let linear = servers.get("linear").unwrap();
        assert_eq!(linear.get("type").unwrap(), "http");
        assert_eq!(linear.get("url").unwrap(), "https://mcp.linear.app/mcp");
    }

    #[test]
    fn test_codex_toml_preview() {
        let preview = to_codex_toml_preview("github", &stdio_mcp());
        assert!(preview.contains("[mcp_servers.github]"));
        assert!(preview.contains("command = \"npx\""));
        assert!(preview.contains("[mcp_servers.github.env]"));
        assert!(preview.contains("GITHUB_TOKEN"));
    }

    #[test]
    fn test_gemini_json_preview() {
        let preview = to_gemini_json_preview("linear", &http_mcp());
        let parsed: Value = serde_json::from_str(&preview).unwrap();
        assert!(parsed.get("mcpServers").is_some());
    }
}
