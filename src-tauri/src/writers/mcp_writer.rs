//! MCP config writers for Claude (JSON), Codex (TOML), and Gemini (JSON)

use crate::converters::MCPServerInput;
use crate::writers::atomic::atomic_write;
use serde_json::Value;
use std::fs;
use std::path::Path;
use toml_edit::DocumentMut;

/// Write an MCP server entry to Claude's ~/.claude.json
///
/// Reads existing JSON, merges the new MCP into `mcpServers`, writes back.
/// Creates the file with a minimal structure if it doesn't exist.
pub fn write_mcp_to_claude(name: &str, mcp: &MCPServerInput, path: &Path) -> Result<(), String> {
    let mut root: Value = if path.exists() {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?
    } else {
        serde_json::json!({})
    };

    // Ensure mcpServers key exists
    if root.get("mcpServers").is_none() {
        root["mcpServers"] = serde_json::json!({});
    }

    // Insert the new MCP
    root["mcpServers"][name] = crate::converters::to_json_value(mcp);

    let output = serde_json::to_string_pretty(&root)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    // Validate by re-parsing
    serde_json::from_str::<Value>(&output)
        .map_err(|e| format!("Generated JSON is invalid: {}", e))?;

    atomic_write(path, &output)
}

/// Write an MCP server entry to Codex's ~/.codex/config.toml
///
/// Uses toml_edit to preserve comments and formatting.
/// Creates the file with a minimal structure if it doesn't exist.
pub fn write_mcp_to_codex(name: &str, mcp: &MCPServerInput, path: &Path) -> Result<(), String> {
    if mcp.mcp_type == "http" {
        return Err("Codex CLI does not support HTTP MCP servers".to_string());
    }

    let command = mcp
        .command
        .as_deref()
        .map(str::trim)
        .filter(|cmd| !cmd.is_empty())
        .ok_or_else(|| "Codex MCP entries require a command".to_string())?;

    let mut doc: DocumentMut = if path.exists() {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
        content
            .parse::<DocumentMut>()
            .map_err(|e| format!("Failed to parse TOML {}: {}", path.display(), e))?
    } else {
        DocumentMut::new()
    };

    // Ensure mcp_servers table exists
    if doc.get("mcp_servers").is_none() {
        doc["mcp_servers"] = toml_edit::Item::Table(toml_edit::Table::new());
    }

    // Create the server entry as a table
    let mut server_table = toml_edit::Table::new();
    server_table["command"] = toml_edit::value(command);

    if !mcp.args.is_empty() {
        let mut args_array = toml_edit::Array::new();
        for arg in &mcp.args {
            args_array.push(arg.as_str());
        }
        server_table["args"] = toml_edit::value(args_array);
    }

    if !mcp.env.is_empty() {
        let mut env_table = toml_edit::Table::new();
        for (k, v) in &mcp.env {
            env_table[k.as_str()] = toml_edit::value(v.as_str());
        }
        server_table["env"] = toml_edit::Item::Table(env_table);
    }

    doc["mcp_servers"][name] = toml_edit::Item::Table(server_table);

    let output = doc.to_string();

    // Validate by re-parsing
    output
        .parse::<DocumentMut>()
        .map_err(|e| format!("Generated TOML is invalid: {}", e))?;

    atomic_write(path, &output)
}

/// Write an MCP server entry to Gemini's ~/.gemini/settings.json
///
/// Reads existing JSON, merges the new MCP into `mcpServers`, writes back.
/// Creates the file with a minimal structure if it doesn't exist.
pub fn write_mcp_to_gemini(name: &str, mcp: &MCPServerInput, path: &Path) -> Result<(), String> {
    let mut root: Value = if path.exists() {
        let content = fs::read_to_string(path)
            .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse {}: {}", path.display(), e))?
    } else {
        serde_json::json!({})
    };

    // Ensure mcpServers key exists
    if root.get("mcpServers").is_none() {
        root["mcpServers"] = serde_json::json!({});
    }

    // Insert the new MCP
    root["mcpServers"][name] = crate::converters::to_json_value(mcp);

    let output = serde_json::to_string_pretty(&root)
        .map_err(|e| format!("Failed to serialize JSON: {}", e))?;

    // Validate by re-parsing
    serde_json::from_str::<Value>(&output)
        .map_err(|e| format!("Generated JSON is invalid: {}", e))?;

    atomic_write(path, &output)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use tempfile::TempDir;

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
    fn test_write_mcp_to_claude_new_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("claude.json");

        write_mcp_to_claude("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        let parsed: Value = serde_json::from_str(&content).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        let github = servers.get("github").unwrap();
        assert_eq!(github.get("command").unwrap(), "npx");
    }

    #[test]
    fn test_write_mcp_to_claude_merge_existing() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("claude.json");

        // Write first MCP
        fs::write(
            &path,
            r#"{"mcpServers": {"existing": {"command": "node", "args": ["server.js"]}}}"#,
        )
        .unwrap();

        // Add second MCP
        write_mcp_to_claude("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        let parsed: Value = serde_json::from_str(&content).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        assert!(servers.get("existing").is_some());
        assert!(servers.get("github").is_some());
    }

    #[test]
    fn test_write_mcp_to_codex_new_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");

        write_mcp_to_codex("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert!(content.contains("[mcp_servers.github]"));
        assert!(content.contains("command"));
        assert!(content.contains("npx"));
    }

    #[test]
    fn test_write_mcp_to_codex_preserves_comments() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");

        // Write existing config with comments
        fs::write(
            &path,
            "# My Codex config\nmodel = \"gpt-5.2-codex\"\napproval_policy = \"on-request\"\n",
        )
        .unwrap();

        write_mcp_to_codex("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        // Comments are preserved
        assert!(content.contains("# My Codex config"));
        assert!(content.contains("model = \"gpt-5.2-codex\""));
        // New MCP is added
        assert!(content.contains("[mcp_servers.github]"));
    }

    #[test]
    fn test_write_http_mcp_to_claude() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("claude.json");

        write_mcp_to_claude("linear", &http_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        let parsed: Value = serde_json::from_str(&content).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        let linear = servers.get("linear").unwrap();
        assert_eq!(linear.get("type").unwrap(), "http");
        assert_eq!(linear.get("url").unwrap(), "https://mcp.linear.app/mcp");
    }

    #[test]
    fn test_write_http_mcp_to_codex_is_rejected() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("config.toml");

        let err = write_mcp_to_codex("linear", &http_mcp(), &path).unwrap_err();
        assert!(err.contains("does not support HTTP"));
    }

    #[test]
    fn test_write_mcp_to_gemini_new_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("settings.json");

        write_mcp_to_gemini("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        let parsed: Value = serde_json::from_str(&content).unwrap();
        let servers = parsed.get("mcpServers").unwrap();
        assert!(servers.get("github").is_some());
    }

    #[test]
    fn test_write_mcp_to_gemini_preserves_other_fields() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("settings.json");

        // Existing settings with other fields
        fs::write(
            &path,
            r#"{"model": "gemini-2.5-pro", "sandbox": true, "mcpServers": {}}"#,
        )
        .unwrap();

        write_mcp_to_gemini("github", &stdio_mcp(), &path).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        let parsed: Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed.get("model").unwrap(), "gemini-2.5-pro");
        assert_eq!(parsed.get("sandbox").unwrap(), true);
        assert!(parsed.get("mcpServers").unwrap().get("github").is_some());
    }
}
