# Issue 9: AI-Assisted Skill Creation

**Phase:** 3 (AI Integration)
**Status:** Pending

---

## Summary

Let users create skills by invoking any locally installed AI CLI (Claude Code, Codex, Gemini) to generate a draft SKILL.md. The draft lives as a temporary file that the user can iterate on by invoking any CLI with a free-form prompt — each invocation edits the same draft. When the user is satisfied, they install the skill across their tools.

The key design principle: **the draft file is the shared artifact, and the user controls which model touches it and what they ask it to do.** No predefined steps — just "pick a CLI, type a prompt, it edits the draft."

## Acceptance Criteria

### Initial Generation
- [ ] "Create with AI" button in Skills page
- [ ] User describes the skill in a text field (e.g., "A skill that reviews PRs for security issues")
- [ ] User selects which AI CLI to use for generation (only installed CLIs shown)
- [ ] Loadout spawns the CLI in headless mode, scoped to produce SKILL.md content
- [ ] Generated draft is shown in an editable preview
- [ ] Draft is persisted to a temp file so subsequent CLIs can read/edit it

### Multi-Model Iteration
- [ ] After initial generation, an "Invoke CLI" action is always available alongside the draft preview
- [ ] User picks any installed CLI (can be different from the one that generated the draft)
- [ ] User types a free-form prompt (e.g., "review this for best practices", "add error handling examples", "rewrite the description to be clearer", "test if this would work for a Go project")
- [ ] The selected CLI receives the current draft content + the user's prompt
- [ ] CLI output replaces the draft content (shown in the editable preview)
- [ ] User can invoke CLIs as many times as they want, in any order
- [ ] User can also manually edit the draft between CLI invocations

### Install
- [ ] When the user is done iterating, they click "Install"
- [ ] User selects target tools and confirms
- [ ] Skill files are written to the appropriate locations (reuse Issue 5 sync infrastructure)
- [ ] Temp draft file is cleaned up after install

### CLI Integration
- [ ] Detect which CLIs are installed (check `which claude`, `which codex`, `which gemini`)
- [ ] Only show installed CLIs as options
- [ ] Handle CLI not found gracefully with install instructions
- [ ] Timeout handling for slow generation (30s default, configurable)
- [ ] Show progress/spinner during CLI invocation
- [ ] Each CLI invocation is scoped to editing the single draft file only

### Generated Skill Quality
- [ ] Initial generation prompt instructs CLI to produce valid YAML frontmatter (name, description)
- [ ] Content follows the SKILL.md format conventions
- [ ] Iteration prompts include the current draft as context so the CLI can edit intelligently

## Technical Details

### Draft File Management

```rust
use std::path::PathBuf;
use tokio::fs;

/// Create a temp draft file for skill creation session
fn draft_path(session_id: &str) -> PathBuf {
    std::env::temp_dir().join(format!("loadout-skill-draft-{}.md", session_id))
}

#[tauri::command]
async fn create_skill_draft(session_id: String, content: String) -> Result<(), String> {
    fs::write(draft_path(&session_id), content).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn read_skill_draft(session_id: String) -> Result<String, String> {
    fs::read_to_string(draft_path(&session_id)).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn cleanup_skill_draft(session_id: String) -> Result<(), String> {
    let path = draft_path(&session_id);
    if path.exists() {
        fs::remove_file(path).await.map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

### CLI Invocation (Unified for Generate + Iterate)

```rust
use tokio::process::Command;

#[tauri::command]
async fn invoke_cli_on_draft(
    cli: String,           // "claude", "codex", "gemini"
    prompt: String,        // user's free-form prompt
    draft_content: String, // current draft (empty string for initial generation)
) -> Result<String, String> {
    // For initial generation, the prompt IS the description.
    // For iteration, we combine: "Here is the current SKILL.md:\n{draft}\n\n{user prompt}"
    let full_prompt = if draft_content.is_empty() {
        format!(
            "Generate a SKILL.md file with YAML frontmatter (name, description) \
             and markdown instructions for the following skill: {}\n\
             Output ONLY the SKILL.md content, nothing else.",
            prompt
        )
    } else {
        format!(
            "Here is the current SKILL.md content:\n\n{}\n\n\
             The user asks: {}\n\n\
             Output the complete updated SKILL.md content, nothing else.",
            draft_content, prompt
        )
    };

    let output = match cli.as_str() {
        "claude" => Command::new("claude")
            .args(["--print", "--no-input", &full_prompt])
            .output().await,
        "codex" => Command::new("codex")
            .args(["--quiet", "--prompt", &full_prompt])
            .output().await,
        "gemini" => Command::new("gemini")
            .args(["--prompt", &full_prompt])
            .output().await,
        _ => return Err("Unknown CLI".to_string()),
    };

    match output {
        Ok(o) if o.status.success() => {
            let content = String::from_utf8_lossy(&o.stdout).to_string();
            // Strip markdown fences if the CLI wraps output in ```
            Ok(strip_markdown_fences(&content))
        }
        Ok(o) => Err(String::from_utf8_lossy(&o.stderr).to_string()),
        Err(e) => Err(e.to_string()),
    }
}
```

### CLI Detection

```rust
#[tauri::command]
async fn detect_installed_clis() -> Vec<String> {
    let mut installed = Vec::new();
    for cli in ["claude", "codex", "gemini"] {
        if Command::new("which").arg(cli).output().await
            .map(|o| o.status.success()).unwrap_or(false)
        {
            installed.push(cli.to_string());
        }
    }
    installed
}
```

### UI Flow

```
┌─────────────────────────────────────────────┐
│  Create Skill with AI                       │
│                                             │
│  Describe your skill:                       │
│  ┌─────────────────────────────────────┐    │
│  │ A skill that reviews PRs for...     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Generate with: [Claude ▼]  [Generate]      │
│                                             │
├─────────────────────────────────────────────┤
│  Draft Preview (editable)                   │
│  ┌─────────────────────────────────────┐    │
│  │ ---                                 │    │
│  │ name: pr-security-review            │    │
│  │ description: Reviews PRs for...     │    │
│  │ ---                                 │    │
│  │ # Instructions                      │    │
│  │ ...                                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Invoke CLI on draft:                       │
│  ┌─────────────────────────────────────┐    │
│  │ review this for best practices      │    │
│  └─────────────────────────────────────┘    │
│  [Gemini ▼]  [Run]                          │
│                                             │
│                            [Install Skill]  │
└─────────────────────────────────────────────┘
```

### Files to Create/Modify

```
src-tauri/src/commands/ai.rs              # CLI detection, invocation, draft management
src-tauri/src/commands/mod.rs             # Add ai module
src-tauri/src/lib.rs                      # Register new commands
src/components/skills/CreateSkillDialog.tsx # Full creation/iteration dialog
src/lib/api/ai.ts                         # API wrapper
src/pages/Skills.tsx                      # Add "Create with AI" button
```

## Test Plan

### Happy Path: Single-Model Creation
1. Click "Create with AI" on Skills page
2. Verify installed CLIs are detected and shown
3. Enter description: "A skill that helps write conventional commit messages"
4. Select Claude Code, click Generate
5. Spinner shows during generation
6. Draft preview shows generated SKILL.md with valid frontmatter
7. Click Install, select target tools, confirm
8. Verify skill files created correctly

### Happy Path: Multi-Model Iteration
1. Generate initial draft with Claude
2. In the "Invoke CLI" section, select Gemini
3. Type: "review this skill for clarity and best practices"
4. Click Run — draft updates with Gemini's edits
5. Select Codex, type: "add examples for TypeScript projects"
6. Click Run — draft updates again
7. Manually tweak a line in the editor
8. Click Install
9. Verify final installed content matches the last draft state

### Edge Cases
1. No CLI installed → show message with install links
2. CLI generation times out → show timeout error with retry option
3. CLI returns invalid content → show in editor anyway (user can fix manually)
4. User manually edits draft, then invokes CLI → CLI sees the manual edits
5. User closes dialog before installing → draft is cleaned up (or prompt to save)
6. Multiple rapid CLI invocations → queue them, don't run in parallel

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure for install step)
- Requires at least one AI CLI installed on the user's machine

## Notes

- **No API keys needed** — uses locally installed CLIs that handle their own auth
- Claude Code's `--print` flag runs non-interactively and outputs to stdout
- Research exact CLI flags for Codex and Gemini headless modes before implementing
- Consider caching the CLI detection result (check once per app launch)
- The draft is always editable — the user is never locked out of manual control
- The "Invoke CLI" prompt is completely free-form: review, test, rewrite, translate, whatever the user wants
- Could extend to MCP creation too ("I want an MCP for GitHub") but start with skills
- Each CLI invocation produces a complete replacement of the draft (not a diff/patch) to keep things simple
