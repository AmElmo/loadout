# Issue 9: AI-Assisted Skill Creation

**Phase:** 3 (AI Integration)
**Status:** Pending

---

## Summary

Let users describe what they want a skill to do in natural language, then use the locally installed AI CLI (Claude Code, Codex, or Gemini) to generate the SKILL.md content. The user reviews, edits, and installs across tools.

## Acceptance Criteria

### Skill Generation Flow
- [ ] "Create with AI" button in Skills page
- [ ] User describes the skill in a text field (e.g., "A skill that reviews PRs for security issues")
- [ ] User selects which AI CLI to use for generation (Claude/Codex/Gemini)
- [ ] Loadout spawns the CLI in headless/non-interactive mode
- [ ] Generated SKILL.md content is shown in an editable preview
- [ ] User can edit the generated content before installing
- [ ] User selects target tools and confirms install

### CLI Integration
- [ ] Detect which CLIs are installed (check `which claude`, `which codex`, `which gemini`)
- [ ] Only show installed CLIs as options
- [ ] Handle CLI not found gracefully with install instructions
- [ ] Timeout handling for slow generation (30s default)
- [ ] Show generation progress/spinner

### Generated Skill Quality
- [ ] Generated SKILL.md has valid YAML frontmatter (name, description)
- [ ] Content follows the SKILL.md format conventions
- [ ] Prompt engineering: system prompt instructs CLI to generate proper SKILL.md format

## Technical Details

### CLI Invocation

```rust
use tokio::process::Command;

#[tauri::command]
async fn generate_skill_with_ai(
    description: String,
    cli: String,  // "claude", "codex", "gemini"
) -> Result<String, String> {
    let prompt = format!(
        "Generate a SKILL.md file with YAML frontmatter (name, description) \
         and markdown instructions for the following skill: {}\n\
         Output ONLY the SKILL.md content, nothing else.",
        description
    );

    let output = match cli.as_str() {
        "claude" => Command::new("claude")
            .args(["--print", "--no-input", &prompt])
            .output().await,
        "codex" => Command::new("codex")
            .args(["--quiet", "--prompt", &prompt])
            .output().await,
        "gemini" => Command::new("gemini")
            .args(["--prompt", &prompt])
            .output().await,
        _ => return Err("Unknown CLI".to_string()),
    };
    // Parse stdout, strip markdown fences if present
}
```

### CLI Detection

```rust
#[tauri::command]
async fn detect_installed_clis() -> Vec<String> {
    let mut installed = Vec::new();
    for cli in ["claude", "codex", "gemini"] {
        if Command::new("which").arg(cli).output().await.map(|o| o.status.success()).unwrap_or(false) {
            installed.push(cli.to_string());
        }
    }
    installed
}
```

### Files to Create/Modify

```
src-tauri/src/commands/ai.rs           # New command module for AI generation
src-tauri/src/commands/mod.rs          # Add ai module
src-tauri/src/lib.rs                   # Register new commands
src/components/sync/CreateSkillDialog.tsx  # AI-powered creation dialog
src/lib/api/ai.ts                      # API wrapper
src/pages/Skills.tsx                   # Add "Create with AI" button
```

## Test Plan

1. Click "Create with AI" on Skills page
2. Verify installed CLIs are detected and shown as options
3. Enter description: "A skill that helps write commit messages following conventional commits"
4. Select Claude Code as generator
5. Wait for generation (spinner shows)
6. Preview shows generated SKILL.md with frontmatter
7. Edit the description if needed
8. Select target tools, click Install
9. Verify skill files created correctly

### Error Cases
1. No CLI installed → show message with install links
2. CLI generation times out → show timeout error with retry option
3. CLI returns invalid SKILL.md → show error, allow manual edit

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure)
- Requires at least one AI CLI installed on the user's machine

## Notes

- **No API keys needed** — uses locally installed CLIs that handle their own auth
- Claude Code's `--print` flag runs non-interactively and outputs to stdout
- Research exact CLI flags for Codex and Gemini headless modes before implementing
- Consider caching the CLI detection result (check once per app launch)
- The generated content should be treated as a draft — always show editable preview
- Could extend to MCP creation too ("I want an MCP for GitHub") but start with skills
