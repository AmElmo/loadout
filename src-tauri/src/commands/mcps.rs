//! Tauri commands for MCP management

use crate::parsers::{parse_claude_config, parse_codex_config, parse_gemini_config};
use crate::scanners::mcps::{scan_all_mcps, HealthStatus, MCPItem};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::Path;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

/// Scan all MCP configurations from Claude Code, Codex CLI, and Gemini CLI
#[tauri::command]
pub fn scan_mcps(workspace_path: Option<String>) -> Result<Vec<MCPItem>, String> {
    scan_all_mcps(workspace_path.as_deref())
}

/// Result of a health test
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthTestResult {
    pub status: HealthStatus,
    pub message: String,
}

/// Test an MCP server's health by attempting a protocol handshake.
/// Re-reads the config file to get real (unmasked) env vars — secrets never transit through the frontend.
#[tauri::command]
pub async fn test_mcp_health(
    name: String,
    mcp_type: String,
    command: Option<String>,
    args: Vec<String>,
    url: Option<String>,
    config_path: String,
) -> Result<HealthTestResult, String> {
    // Read real env vars from the config file
    let env = read_real_env(&name, &config_path)?;

    match mcp_type.as_str() {
        "stdio" => test_stdio_mcp(command, args, env).await,
        "http" => test_http_mcp(url).await,
        _ => Err(format!("Unknown MCP type: {}", mcp_type)),
    }
}

/// Re-read a config file to get the real (unmasked) env vars for a specific MCP
fn read_real_env(name: &str, config_path: &str) -> Result<HashMap<String, String>, String> {
    let path = Path::new(config_path);
    if !path.exists() {
        return Ok(HashMap::new());
    }

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    match ext {
        "json" => {
            // Could be Claude (.claude.json, .mcp.json) or Gemini (settings.json)
            let file_name = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
            if file_name == "settings.json" {
                // Gemini
                let config = parse_gemini_config(path)?;
                Ok(config
                    .mcp_servers
                    .get(name)
                    .map(|s| s.env.clone())
                    .unwrap_or_default())
            } else {
                // Claude
                let config = parse_claude_config(path)?;
                Ok(config
                    .mcp_servers
                    .get(name)
                    .map(|s| s.env.clone())
                    .unwrap_or_default())
            }
        }
        "toml" => {
            // Codex
            let config = parse_codex_config(path)?;
            Ok(config
                .mcp_servers
                .get(name)
                .map(|s| s.env.clone())
                .unwrap_or_default())
        }
        _ => Ok(HashMap::new()),
    }
}

/// Test a stdio MCP by spawning the process and performing a JSON-RPC initialize handshake
async fn test_stdio_mcp(
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<HealthTestResult, String> {
    let cmd = command.ok_or("No command specified for stdio MCP")?;

    let mut child = Command::new(&cmd)
        .args(&args)
        .envs(&env)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn '{}': {}", cmd, e))?;

    let stdin = child
        .stdin
        .take()
        .ok_or("Failed to open stdin for MCP process")?;
    let stdout = child
        .stdout
        .take()
        .ok_or("Failed to open stdout for MCP process")?;

    let result = timeout(Duration::from_secs(5), async {
        let mut writer = stdin;
        let mut reader = BufReader::new(stdout);

        // Send JSON-RPC initialize request
        let request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "loadout-health-check",
                    "version": "0.1.0"
                }
            }
        });

        let request_str = serde_json::to_string(&request)
            .map_err(|e| format!("Failed to serialize request: {}", e))?;

        writer
            .write_all(request_str.as_bytes())
            .await
            .map_err(|e| format!("Failed to write to stdin: {}", e))?;
        writer
            .write_all(b"\n")
            .await
            .map_err(|e| format!("Failed to write newline: {}", e))?;
        writer
            .flush()
            .await
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        // Read response line
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        if line.is_empty() {
            return Err("No response from MCP server".to_string());
        }

        // Parse JSON-RPC response
        let response: serde_json::Value = serde_json::from_str(line.trim())
            .map_err(|e| format!("Invalid JSON response: {}", e))?;

        if response.get("result").is_some() {
            Ok(HealthTestResult {
                status: HealthStatus::Healthy,
                message: "MCP server responded to initialize request".to_string(),
            })
        } else if let Some(error) = response.get("error") {
            let msg = error
                .get("message")
                .and_then(|m| m.as_str())
                .unwrap_or("Unknown error");
            Ok(HealthTestResult {
                status: HealthStatus::Failed,
                message: format!("MCP server returned error: {}", msg),
            })
        } else {
            Ok(HealthTestResult {
                status: HealthStatus::Failed,
                message: "Unexpected response format from MCP server".to_string(),
            })
        }
    })
    .await;

    // Kill the child process regardless of outcome
    let _ = child.kill().await;

    match result {
        Ok(inner) => inner,
        Err(_) => Ok(HealthTestResult {
            status: HealthStatus::Failed,
            message: "Health check timed out after 5 seconds".to_string(),
        }),
    }
}

/// Test an HTTP MCP by sending a request to the URL
async fn test_http_mcp(url: Option<String>) -> Result<HealthTestResult, String> {
    let endpoint = url.ok_or("No URL specified for HTTP MCP")?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    match client.get(&endpoint).send().await {
        Ok(response) => {
            // Any HTTP response (even 401/403) means the server is reachable.
            // Auth errors are expected since we don't send credentials.
            let status = response.status();
            Ok(HealthTestResult {
                status: HealthStatus::Healthy,
                message: format!("HTTP {} — server is reachable", status.as_u16()),
            })
        }
        Err(e) => {
            if e.is_timeout() {
                Ok(HealthTestResult {
                    status: HealthStatus::Failed,
                    message: "Request timed out after 5 seconds".to_string(),
                })
            } else if e.is_connect() {
                Ok(HealthTestResult {
                    status: HealthStatus::Failed,
                    message: "Could not connect to server".to_string(),
                })
            } else {
                Ok(HealthTestResult {
                    status: HealthStatus::Failed,
                    message: format!("Request failed: {}", e),
                })
            }
        }
    }
}
