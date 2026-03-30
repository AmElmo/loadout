//! Tauri commands for repo scanning (find repos without rules)

use crate::scanners::repos::{scan_repos_without_rules as do_scan, RepoScanResult};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use tauri::Emitter;

/// Scan home directory for git repos without any AI rules files.
/// Runs on a blocking thread so the main thread stays free for UI rendering.
#[tauri::command]
pub async fn scan_repos_without_rules(max_depth: Option<u32>) -> Result<RepoScanResult, String> {
    let depth = max_depth.unwrap_or(5);
    tauri::async_runtime::spawn_blocking(move || do_scan(depth))
        .await
        .map_err(|e| format!("Task join error: {}", e))?
}

/// Result of CLI rule generation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRulesResult {
    pub success: bool,
    pub file_created: Option<String>,
    pub error: Option<String>,
}

/// A single line of CLI output, scoped to a repo path
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliOutputLine {
    pub repo_path: String,
    pub line: String,
}

/// Spawn a CLI tool to generate rules for a repo, streaming output via events
#[tauri::command]
pub async fn create_rules_with_cli(
    app: tauri::AppHandle,
    tool: String,
    repo_path: String,
    prompt: String,
) -> Result<CreateRulesResult, String> {
    let target_file = match tool.as_str() {
        "claude" => "CLAUDE.md",
        "codex" => "AGENTS.md",
        "gemini" => "GEMINI.md",
        _ => return Err(format!("Unknown tool: {}", tool)),
    };

    let repo = Path::new(&repo_path);
    if !repo.is_dir() {
        return Err(format!("Repo path does not exist: {}", repo_path));
    }

    // All three CLIs support streaming JSON (NDJSON) for real-time output:
    //   Claude: --output-format stream-json --verbose --include-partial-messages
    //   Codex:  exec --json
    //   Gemini: -p --output-format stream-json
    let (cmd_name, args) = match tool.as_str() {
        "claude" => ("claude", vec![
            "-p".into(), prompt.clone(),
            "--output-format".into(), "stream-json".into(),
            "--verbose".into(),
            "--include-partial-messages".into(),
            "--allowedTools".into(), "Read,Write,Edit,Glob,Grep,Bash".into(),
        ]),
        "codex" => ("codex", vec![
            "exec".into(),
            "--json".into(),
            "--full-auto".into(),
            prompt.clone(),
        ]),
        "gemini" => ("gemini", vec![
            "-p".into(), prompt.clone(),
            "--output-format".into(), "stream-json".into(),
            "-y".into(),
        ]),
        _ => unreachable!(),
    };

    let tool_kind = tool.clone();

    // Check if the CLI is available
    let which_result = Command::new("which")
        .arg(cmd_name)
        .output()
        .map_err(|e| format!("Failed to check for {}: {}", cmd_name, e))?;

    if !which_result.status.success() {
        return Err(format!(
            "{} is not installed or not found in PATH",
            cmd_name
        ));
    }

    // Spawn the CLI process
    let mut child = Command::new(cmd_name)
        .args(&args)
        .current_dir(repo)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn {}: {}", cmd_name, e))?;

    // Stream stdout — parse each tool's NDJSON format to extract meaningful events
    if let Some(stdout) = child.stdout.take() {
        let app_clone = app.clone();
        let rp = repo_path.clone();
        let tk = tool_kind.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for raw in reader.lines().map_while(Result::ok) {
                let parsed = match tk.as_str() {
                    "claude" => parse_claude_stream_line(&raw),
                    "codex" => parse_codex_stream_line(&raw),
                    "gemini" => parse_gemini_stream_line(&raw),
                    _ => Some(raw),
                };
                if let Some(text) = parsed {
                    if !text.is_empty() {
                        let _ = app_clone.emit("cli-output", CliOutputLine {
                            repo_path: rp.clone(),
                            line: text,
                        });
                    }
                }
            }
        });
    }

    // Stream stderr (all tools — raw lines, skip known noise)
    if let Some(stderr) = child.stderr.take() {
        let app_clone = app.clone();
        let rp = repo_path.clone();
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                // Skip noisy stderr lines (credential caching, model refresh errors, etc.)
                let trimmed = line.trim();
                if trimmed.is_empty()
                    || trimmed.starts_with("Loaded cached")
                    || trimmed.contains("failed to refresh available models")
                {
                    continue;
                }
                let _ = app_clone.emit("cli-output", CliOutputLine {
                    repo_path: rp.clone(),
                    line,
                });
            }
        });
    }

    // Wait for the process to finish
    let status = child
        .wait()
        .map_err(|e| format!("Failed to wait for {}: {}", cmd_name, e))?;

    // Check if the target file was created
    let target_path = repo.join(target_file);
    let file_created = if target_path.is_file() {
        Some(target_path.to_string_lossy().to_string())
    } else {
        None
    };

    if status.success() && file_created.is_some() {
        Ok(CreateRulesResult {
            success: true,
            file_created,
            error: None,
        })
    } else if !status.success() {
        Ok(CreateRulesResult {
            success: false,
            file_created: None,
            error: Some(format!(
                "{} exited with code {}",
                cmd_name,
                status.code().unwrap_or(-1)
            )),
        })
    } else {
        // CLI succeeded but file wasn't created
        Ok(CreateRulesResult {
            success: false,
            file_created: None,
            error: Some(format!(
                "{} completed but {} was not created. The CLI may need different flags.",
                cmd_name, target_file
            )),
        })
    }
}

// ---------------------------------------------------------------------------
// Stream-JSON parsers — one per CLI tool
// ---------------------------------------------------------------------------

/// Parse Claude's `--output-format stream-json --verbose --include-partial-messages`.
///
/// Events we care about:
///   - `"assistant"` with tool_use blocks → show what tool Claude is calling
///   - `"stream_event"` with text_delta  → real-time token output
fn parse_claude_stream_line(raw: &str) -> Option<String> {
    let v: Value = serde_json::from_str(raw).ok()?;
    match v.get("type")?.as_str()? {
        "assistant" => {
            let content = v.get("message")
                .and_then(|m| m.get("content"))
                .and_then(|c| c.as_array())?;
            for block in content {
                if block.get("type").and_then(|t| t.as_str()) == Some("tool_use") {
                    let name = block.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
                    let input = block.get("input").cloned().unwrap_or(Value::Null);
                    return Some(format!("⏵ {}: {}", name, summarise_tool_input(name, &input)));
                }
            }
            None
        }
        "stream_event" => {
            let delta = v.get("event")?.get("delta")?;
            if delta.get("type").and_then(|t| t.as_str()) == Some("text_delta") {
                let text = delta.get("text").and_then(|t| t.as_str()).unwrap_or("");
                if !text.is_empty() {
                    return Some(text.to_string());
                }
            }
            None
        }
        _ => None,
    }
}

/// Parse Codex's `exec --json` NDJSON stream.
///
/// Events we care about:
///   - `"item.started"` with command_execution → show the command being run
///   - `"item.completed"` with reasoning/agent_message → show text
///   - `"item.completed"` with file_change → show which file changed
fn parse_codex_stream_line(raw: &str) -> Option<String> {
    let v: Value = serde_json::from_str(raw).ok()?;
    let event_type = v.get("type")?.as_str()?;
    let item = v.get("item")?;
    let item_type = item.get("type").and_then(|t| t.as_str()).unwrap_or("");

    match event_type {
        "item.started" => {
            match item_type {
                "command_execution" => {
                    let cmd = item.get("command").and_then(|c| c.as_str()).unwrap_or("");
                    let display = truncate_str(cmd, 80);
                    Some(format!("⏵ exec: {}", display))
                }
                _ => None,
            }
        }
        "item.completed" => {
            match item_type {
                "reasoning" => {
                    let text = item.get("text").and_then(|t| t.as_str()).unwrap_or("");
                    if text.is_empty() { None } else { Some(format!("{}\n", text)) }
                }
                "agent_message" => {
                    let text = item.get("text").and_then(|t| t.as_str()).unwrap_or("");
                    if text.is_empty() { None } else { Some(format!("{}\n", text)) }
                }
                "command_execution" => {
                    let cmd = item.get("command").and_then(|c| c.as_str()).unwrap_or("cmd");
                    let exit = item.get("exit_code").and_then(|e| e.as_i64());
                    match exit {
                        Some(0) | None => None, // success — don't repeat
                        Some(code) => Some(format!("⏵ exec failed ({}): {}", code, truncate_str(cmd, 60))),
                    }
                }
                "file_change" => {
                    let path = item.get("file_path")
                        .or_else(|| item.get("path"))
                        .and_then(|p| p.as_str())
                        .unwrap_or("file");
                    Some(format!("⏵ write: {}", path))
                }
                _ => None,
            }
        }
        _ => None,
    }
}

/// Parse Gemini's `--output-format stream-json` NDJSON stream.
///
/// Events we care about:
///   - `"message"` with role=assistant → streaming text (delta:true)
///   - `"tool_use"` → show which tool Gemini is calling
fn parse_gemini_stream_line(raw: &str) -> Option<String> {
    let v: Value = serde_json::from_str(raw).ok()?;
    match v.get("type")?.as_str()? {
        "message" => {
            if v.get("role").and_then(|r| r.as_str()) == Some("assistant") {
                let content = v.get("content").and_then(|c| c.as_str()).unwrap_or("");
                if !content.is_empty() {
                    // Gemini sends complete message blocks, not token fragments
                    return Some(format!("{}\n", content));
                }
            }
            None
        }
        "tool_use" => {
            let name = v.get("name")
                .or_else(|| v.get("tool"))
                .and_then(|n| n.as_str())
                .unwrap_or("tool");
            let args = v.get("args")
                .or_else(|| v.get("arguments"))
                .cloned()
                .unwrap_or(Value::Null);
            Some(format!("⏵ {}: {}", name, summarise_tool_input(name, &args)))
        }
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Produce a short one-line summary of a tool call's input.
fn summarise_tool_input(name: &str, input: &Value) -> String {
    // Try common field names used across tools
    let path_field = |field: &str| input.get(field).and_then(|v| v.as_str()).map(String::from);

    match name {
        "Read" | "read_file" => path_field("file_path")
            .or_else(|| path_field("path"))
            .unwrap_or_else(|| "file".into()),
        "Edit" | "Write" | "edit_file" | "write_file" => path_field("file_path")
            .or_else(|| path_field("path"))
            .unwrap_or_else(|| "file".into()),
        "Glob" | "glob" => path_field("pattern").unwrap_or_else(|| "*".into()),
        "Grep" | "grep" | "search" => path_field("pattern")
            .or_else(|| path_field("query"))
            .unwrap_or_default(),
        "Bash" | "exec" | "shell" | "run_command" => {
            let cmd = input.get("command")
                .or_else(|| input.get("cmd"))
                .and_then(|v| v.as_str())
                .unwrap_or("");
            truncate_str(cmd, 80).to_string()
        }
        "Task" | "task" => path_field("description").unwrap_or_else(|| "subtask".into()),
        _ => {
            // Generic: show first short string value found
            if let Some(obj) = input.as_object() {
                for val in obj.values() {
                    if let Some(s) = val.as_str() {
                        return truncate_str(s, 60).to_string();
                    }
                }
            }
            String::new()
        }
    }
}

/// Truncate a string to `max_len` characters, appending "..." if truncated.
fn truncate_str(s: &str, max_len: usize) -> &str {
    if s.len() <= max_len {
        s
    } else {
        // Find a safe char boundary
        let mut end = max_len.min(s.len());
        while !s.is_char_boundary(end) && end > 0 {
            end -= 1;
        }
        &s[..end]
    }
}
