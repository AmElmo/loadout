//! Tauri commands for MCP management

use crate::parsers::{
    parse_claude_config, parse_codex_config, parse_gemini_config, parse_opencode_config,
};
use crate::scanners::mcps::{scan_all_mcps, HealthStatus, MCPItem};
use crate::scanners::tokens::estimate_tokens;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::time::Duration;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::Command;
use tokio::time::timeout;

#[cfg(target_os = "macos")]
use security_framework::passwords::get_generic_password;

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

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");

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
            } else if file_name == "opencode.json" {
                // OpenCode (uses `mcp` key, not `mcpServers`)
                let config = parse_opencode_config(path)?;
                Ok(config
                    .mcp
                    .get(name)
                    .map(|s| s.env.clone())
                    .unwrap_or_default())
            } else {
                // Claude and other mcpServers-based JSON configs
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

/// Split a command string into binary + args when args is empty.
/// Supports quoted values (`"..."`, `'...'`) and falls back to whitespace splitting
/// for malformed command strings to preserve backwards compatibility.
fn resolve_command(command: &str, args: &[String]) -> Result<(String, Vec<String>), String> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err("No command specified for stdio MCP".to_string());
    }
    if !args.is_empty() {
        return Ok((trimmed.to_string(), args.to_vec()));
    }
    if !trimmed.chars().any(char::is_whitespace) {
        return Ok((trimmed.to_string(), Vec::new()));
    }

    if let Some(parts) = shlex::split(trimmed) {
        if let Some((bin, rest)) = parts.split_first() {
            return Ok((bin.clone(), rest.to_vec()));
        }
    }

    let mut parts = trimmed.split_whitespace();
    let bin = parts
        .next()
        .ok_or("No command specified for stdio MCP")?
        .to_string();
    let extra_args: Vec<String> = parts.map(|s| s.to_string()).collect();
    Ok((bin, extra_args))
}

/// Test a stdio MCP by spawning the process and performing a JSON-RPC initialize handshake
async fn test_stdio_mcp(
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<HealthTestResult, String> {
    let raw_cmd = command.ok_or("No command specified for stdio MCP")?;
    let (cmd, resolved_args) = resolve_command(&raw_cmd, &args)?;

    let mut child = Command::new(&cmd)
        .args(&resolved_args)
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

// === MCP Tool Definition Fetching ===

/// Information about a single MCP tool
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MCPToolInfo {
    /// Tool name
    pub name: String,
    /// Tool description
    pub description: Option<String>,
    /// Estimated tokens for this tool's definition
    pub tokens: u32,
}

/// Result of fetching MCP tool definitions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MCPToolsResult {
    /// Number of tools exposed by this MCP
    pub tool_count: u32,
    /// Total estimated idle tokens (all tool definitions)
    pub idle_tokens: u32,
    /// Individual tool information
    pub tools: Vec<MCPToolInfo>,
}

/// Fetch tool definitions from an MCP server via tools/list JSON-RPC.
/// This connects to the MCP, performs initialize + tools/list, then estimates token usage.
/// When `use_keychain` is false, HTTP MCPs that need OAuth will fail with an auth error
/// rather than prompting for Keychain access — letting the frontend show a consent UI first.
#[tauri::command]
pub async fn fetch_mcp_tools(
    name: String,
    mcp_type: String,
    command: Option<String>,
    args: Vec<String>,
    url: Option<String>,
    config_path: String,
    use_keychain: bool,
) -> Result<MCPToolsResult, String> {
    let env = read_real_env(&name, &config_path)?;

    match mcp_type.as_str() {
        "stdio" => fetch_stdio_mcp_tools(command, args, env).await,
        "http" => fetch_http_mcp_tools(&name, url, &config_path, use_keychain).await,
        _ => Err(format!("Unknown MCP type: {}", mcp_type)),
    }
}

/// Parse the tools/list response into MCPToolsResult
fn parse_tools_response(response: &serde_json::Value) -> Result<MCPToolsResult, String> {
    // Check for JSON-RPC error responses
    if let Some(error) = response.get("error") {
        let msg = error
            .get("message")
            .and_then(|m| m.as_str())
            .or_else(|| error.as_str())
            .unwrap_or("Unknown error");
        return Err(format!("MCP returned error: {}", msg));
    }

    // Check for non-MCP error responses (e.g., HTTP auth errors)
    if response.get("result").is_none() {
        // Try to extract a meaningful error from the response
        if let Some(err_desc) = response.get("error_description").and_then(|d| d.as_str()) {
            return Err(format!("Authentication failed: {}", err_desc));
        }
        return Err(
            "Invalid response: no result from tools/list (server may require authentication)"
                .to_string(),
        );
    }

    let empty_vec = vec![];
    let tools_array = response
        .get("result")
        .and_then(|r| r.get("tools"))
        .and_then(|t| t.as_array())
        .unwrap_or(&empty_vec);

    let mut tools = Vec::new();
    let mut total_tokens: u32 = 0;

    for tool in tools_array {
        let name = tool
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("unknown")
            .to_string();
        let description = tool
            .get("description")
            .and_then(|d| d.as_str())
            .map(|s| s.to_string());

        // Estimate tokens from the serialized tool definition
        // (name + description + inputSchema is what goes into context)
        let tool_str = serde_json::to_string(tool).unwrap_or_default();
        let tokens = estimate_tokens(&tool_str);
        total_tokens += tokens;

        tools.push(MCPToolInfo {
            name,
            description,
            tokens,
        });
    }

    // Sort by token count descending (biggest consumers first)
    tools.sort_by(|a, b| b.tokens.cmp(&a.tokens));

    Ok(MCPToolsResult {
        tool_count: tools.len() as u32,
        idle_tokens: total_tokens,
        tools,
    })
}

/// Fetch tool definitions from a stdio MCP
async fn fetch_stdio_mcp_tools(
    command: Option<String>,
    args: Vec<String>,
    env: HashMap<String, String>,
) -> Result<MCPToolsResult, String> {
    let raw_cmd = command.ok_or("No command specified for stdio MCP")?;
    let (cmd, resolved_args) = resolve_command(&raw_cmd, &args)?;

    let mut child = Command::new(&cmd)
        .args(&resolved_args)
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

    let result = timeout(Duration::from_secs(10), async {
        let mut writer = stdin;
        let mut reader = BufReader::new(stdout);

        // Step 1: Send initialize request
        let init_request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "loadout-context-check",
                    "version": "0.1.0"
                }
            }
        });

        let init_str = serde_json::to_string(&init_request)
            .map_err(|e| format!("Failed to serialize init request: {}", e))?;
        writer
            .write_all(init_str.as_bytes())
            .await
            .map_err(|e| format!("Failed to write init request: {}", e))?;
        writer
            .write_all(b"\n")
            .await
            .map_err(|e| format!("Failed to write newline: {}", e))?;
        writer
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;

        // Read initialize response
        let mut line = String::new();
        reader
            .read_line(&mut line)
            .await
            .map_err(|e| format!("Failed to read init response: {}", e))?;

        if line.is_empty() {
            return Err("No response from MCP server during initialize".to_string());
        }

        let init_response: serde_json::Value = serde_json::from_str(line.trim())
            .map_err(|e| format!("Invalid init JSON response: {}", e))?;

        if init_response.get("error").is_some() {
            return Err("MCP server returned error during initialize".to_string());
        }

        // Step 2: Send tools/list request
        let tools_request = serde_json::json!({
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list",
            "params": {}
        });

        let tools_str = serde_json::to_string(&tools_request)
            .map_err(|e| format!("Failed to serialize tools/list request: {}", e))?;
        writer
            .write_all(tools_str.as_bytes())
            .await
            .map_err(|e| format!("Failed to write tools/list request: {}", e))?;
        writer
            .write_all(b"\n")
            .await
            .map_err(|e| format!("Failed to write newline: {}", e))?;
        writer
            .flush()
            .await
            .map_err(|e| format!("Failed to flush: {}", e))?;

        // Read tools/list response
        let mut tools_line = String::new();
        reader
            .read_line(&mut tools_line)
            .await
            .map_err(|e| format!("Failed to read tools/list response: {}", e))?;

        if tools_line.is_empty() {
            return Err("No response from MCP server for tools/list".to_string());
        }

        let tools_response: serde_json::Value = serde_json::from_str(tools_line.trim())
            .map_err(|e| format!("Invalid tools/list JSON response: {}", e))?;

        parse_tools_response(&tools_response)
    })
    .await;

    let _ = child.kill().await;

    match result {
        Ok(inner) => inner,
        Err(_) => Err("Tool fetch timed out after 10 seconds".to_string()),
    }
}

/// Read real (unmasked) headers from the config file for a specific MCP.
/// Interpolates ${VAR} references, restricted to env vars declared in the MCP's own env block.
fn read_real_headers(name: &str, config_path: &str) -> HashMap<String, String> {
    let path = Path::new(config_path);
    if !path.exists() {
        return HashMap::new();
    }

    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let (raw_headers, allowed_vars) = match ext {
        "json" => {
            let file_name = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
            if file_name == "settings.json" {
                parse_gemini_config(path)
                    .ok()
                    .and_then(|c| {
                        c.mcp_servers
                            .get(name)
                            .map(|s| (s.headers.clone(), s.env.keys().cloned().collect()))
                    })
                    .unwrap_or_default()
            } else if file_name == "opencode.json" {
                parse_opencode_config(path)
                    .ok()
                    .and_then(|c| {
                        c.mcp
                            .get(name)
                            .map(|s| (s.headers.clone(), s.env.keys().cloned().collect()))
                    })
                    .unwrap_or_default()
            } else {
                parse_claude_config(path)
                    .ok()
                    .and_then(|c| {
                        c.mcp_servers
                            .get(name)
                            .map(|s| (s.headers.clone(), s.env.keys().cloned().collect()))
                    })
                    .unwrap_or_default()
            }
        }
        _ => (HashMap::new(), HashSet::new()),
    };

    // Interpolate ${VAR} references — only vars declared in the MCP's own env block
    raw_headers
        .into_iter()
        .map(|(k, v)| {
            let resolved = interpolate_env_vars(&v, &allowed_vars);
            (k, resolved)
        })
        .collect()
}

/// Interpolate ${VAR} references in a string, restricted to an allowlist of env var names.
/// Only resolves variables that are explicitly declared in the MCP's own env config block.
/// Logs a warning and leaves the reference unresolved for vars not in the allowlist.
fn interpolate_env_vars(value: &str, allowed_vars: &HashSet<String>) -> String {
    let mut result = value.to_string();
    let mut search_from = 0;
    // Find all ${VAR} patterns and replace only if allowed
    while let Some(rel_start) = result[search_from..].find("${") {
        let start = search_from + rel_start;
        if let Some(end) = result[start..].find('}') {
            let var_name = &result[start + 2..start + end];
            if allowed_vars.contains(var_name) {
                let replacement = std::env::var(var_name).unwrap_or_default();
                result = format!(
                    "{}{}{}",
                    &result[..start],
                    replacement,
                    &result[start + end + 1..]
                );
                // Continue searching from after the replacement
                search_from = start + replacement.len();
            } else {
                log::warn!(
                    "Skipping interpolation of ${{{}}} — not declared in this MCP's env block",
                    var_name
                );
                // Skip past this reference to avoid infinite loop
                search_from = start + end + 1;
            }
        } else {
            break;
        }
    }
    result
}

/// Try to read an OAuth token for an HTTP MCP from Claude Code's Keychain storage.
/// Claude Code stores MCP OAuth tokens in the macOS Keychain under "Claude Code-credentials".
#[cfg(target_os = "macos")]
fn read_keychain_oauth_token(server_name: &str) -> Option<String> {
    let username = std::env::var("USER").unwrap_or_default();
    if username.is_empty() {
        return None;
    }

    let password_bytes = get_generic_password("Claude Code-credentials", &username).ok()?;
    let json_str = std::str::from_utf8(&password_bytes).ok()?;
    let creds: serde_json::Value = serde_json::from_str(json_str).ok()?;

    let mcp_oauth = creds.get("mcpOAuth")?;
    // Keys are formatted as "{serverName}|{hash}", find by prefix
    for (key, entry) in mcp_oauth.as_object()? {
        if !key.starts_with(&format!("{}|", server_name)) {
            continue;
        }
        let access_token = entry.get("accessToken")?.as_str()?;
        if access_token.is_empty() {
            return None; // Token exists but is empty (expired)
        }
        // Check expiry
        let expires_at = entry.get("expiresAt")?.as_u64()?;
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .ok()?
            .as_millis() as u64;
        if expires_at > 0 && now_ms > expires_at {
            return None; // Token expired
        }
        return Some(access_token.to_string());
    }
    None
}

#[cfg(not(target_os = "macos"))]
fn read_keychain_oauth_token(_server_name: &str) -> Option<String> {
    None // Keychain only available on macOS
}

/// Fetch tool definitions from an HTTP MCP.
/// When `use_keychain` is false, skips Keychain OAuth lookup — auth errors will surface
/// to the frontend so it can show a consent prompt before requesting Keychain access.
async fn fetch_http_mcp_tools(
    name: &str,
    url: Option<String>,
    config_path: &str,
    use_keychain: bool,
) -> Result<MCPToolsResult, String> {
    let endpoint = url.ok_or("No URL specified for HTTP MCP")?;

    // Resolve auth: config headers > Keychain OAuth (if allowed) > none
    let config_headers = read_real_headers(name, config_path);
    let has_auth_header = config_headers
        .keys()
        .any(|k| k.to_lowercase() == "authorization");

    let oauth_token = if !has_auth_header && use_keychain {
        read_keychain_oauth_token(name)
    } else {
        None
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Helper to add auth headers to a request
    let add_auth = |mut req: reqwest::RequestBuilder| -> reqwest::RequestBuilder {
        // Add config headers first
        for (key, value) in &config_headers {
            req = req.header(key.as_str(), value.as_str());
        }
        // Add OAuth token if no Authorization header from config
        if !has_auth_header {
            if let Some(ref token) = oauth_token {
                req = req.header("Authorization", format!("Bearer {}", token));
            }
        }
        req
    };

    // Step 1: Initialize
    let init_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "loadout-context-check",
                "version": "0.1.0"
            }
        }
    });

    let req = client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream")
        .json(&init_request);
    let init_response = add_auth(req)
        .send()
        .await
        .map_err(|e| format!("Initialize request failed: {}", e))?;

    let status = init_response.status().as_u16();
    if status == 401 || status == 403 {
        if oauth_token.is_none() && !has_auth_header {
            return Err(format!(
                "Authentication required (HTTP {}). Re-authenticate via Claude Code or add headers to your MCP config.",
                status
            ));
        }
        return Err(format!("Authentication failed (HTTP {}). Token may be expired — re-authenticate via Claude Code.", status));
    }
    if !init_response.status().is_success() {
        return Err(format!("Initialize failed with HTTP {}", status));
    }

    // Try to extract session ID from response headers for session continuity
    let session_id = init_response
        .headers()
        .get("mcp-session-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    // Consume init response body (needed before next request)
    let _ = init_response.text().await;

    // Step 2: Send tools/list
    let tools_request = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    });

    let mut req = client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream")
        .json(&tools_request);

    if let Some(ref sid) = session_id {
        req = req.header("mcp-session-id", sid);
    }

    let tools_response = add_auth(req)
        .send()
        .await
        .map_err(|e| format!("tools/list request failed: {}", e))?;

    let body = tools_response
        .text()
        .await
        .map_err(|e| format!("Failed to read tools/list response body: {}", e))?;

    // Handle SSE responses (text/event-stream) — extract JSON from data lines
    let json_str = if body.starts_with("data:") || body.contains("\ndata:") {
        body.lines()
            .filter(|l| l.starts_with("data:"))
            .map(|l| l.strip_prefix("data:").unwrap_or(l).trim())
            .find(|l| !l.is_empty())
            .unwrap_or(&body)
            .to_string()
    } else {
        body
    };

    let response: serde_json::Value =
        serde_json::from_str(&json_str).map_err(|e| format!("Invalid tools/list JSON: {}", e))?;

    parse_tools_response(&response)
}

/// Test an HTTP MCP by sending a JSON-RPC initialize request via POST.
/// Per the MCP Streamable HTTP spec, all client messages MUST use POST.
async fn test_http_mcp(url: Option<String>) -> Result<HealthTestResult, String> {
    let endpoint = url.ok_or("No URL specified for HTTP MCP")?;

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Send a proper MCP initialize request per the Streamable HTTP transport spec
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

    match client
        .post(&endpoint)
        .header("Content-Type", "application/json")
        .header("Accept", "application/json, text/event-stream")
        .json(&request)
        .send()
        .await
    {
        Ok(response) => {
            // Any HTTP response means the server is reachable.
            // Auth errors (401/403) are expected since we don't send credentials.
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

#[cfg(test)]
mod tests {
    use super::{interpolate_env_vars, resolve_command};
    use std::collections::HashSet;

    #[test]
    fn resolve_command_parses_quoted_args() {
        let (bin, args) =
            resolve_command(r#"node "/tmp/my dir/server.js" --mode stdio"#, &[]).unwrap();
        assert_eq!(bin, "node");
        assert_eq!(args, vec!["/tmp/my dir/server.js", "--mode", "stdio"]);
    }

    #[test]
    fn resolve_command_uses_explicit_args_when_provided() {
        let (bin, args) = resolve_command(
            "npx -y @modelcontextprotocol/server-github",
            &["--foo".to_string()],
        )
        .unwrap();
        assert_eq!(bin, "npx -y @modelcontextprotocol/server-github");
        assert_eq!(args, vec!["--foo"]);
    }

    #[test]
    fn resolve_command_falls_back_for_invalid_quotes() {
        let (bin, args) = resolve_command(r#"npx "-y"#, &[]).unwrap();
        assert_eq!(bin, "npx");
        assert_eq!(args, vec![r#""-y"#]);
    }

    #[test]
    fn interpolate_resolves_allowed_vars() {
        std::env::set_var("TEST_ALLOWED_VAR", "secret123");
        let allowed: HashSet<String> = ["TEST_ALLOWED_VAR"].iter().map(|s| s.to_string()).collect();
        let result = interpolate_env_vars("Bearer ${TEST_ALLOWED_VAR}", &allowed);
        assert_eq!(result, "Bearer secret123");
        std::env::remove_var("TEST_ALLOWED_VAR");
    }

    #[test]
    fn interpolate_skips_disallowed_vars() {
        std::env::set_var("TEST_SECRET_VAR", "should_not_appear");
        let allowed: HashSet<String> = HashSet::new();
        let result = interpolate_env_vars("Bearer ${TEST_SECRET_VAR}", &allowed);
        assert_eq!(result, "Bearer ${TEST_SECRET_VAR}");
        std::env::remove_var("TEST_SECRET_VAR");
    }

    #[test]
    fn interpolate_mixed_allowed_and_disallowed() {
        std::env::set_var("TEST_OK_VAR", "good");
        std::env::set_var("TEST_BAD_VAR", "bad");
        let allowed: HashSet<String> = ["TEST_OK_VAR"].iter().map(|s| s.to_string()).collect();
        let result = interpolate_env_vars("${TEST_OK_VAR}:${TEST_BAD_VAR}", &allowed);
        assert_eq!(result, "good:${TEST_BAD_VAR}");
        std::env::remove_var("TEST_OK_VAR");
        std::env::remove_var("TEST_BAD_VAR");
    }
}
