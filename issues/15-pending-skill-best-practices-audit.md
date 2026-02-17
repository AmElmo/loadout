# Issue 15: Skill Best Practices Audit & Auto-Fix Pipeline

**Phase:** 3 (AI Integration)
**Status:** Pending

---

## Summary

Add a feature that audits user skills against Anthropic's official skill authoring best practices, surfaces a scored report in the UI, and lets users selectively fix issues by dispatching corrections to a locally installed AI CLI (Claude Code, Codex, or Gemini).

The pipeline has three stages:
1. **Audit** — Send skill content + best practices reference to an AI CLI, receive a structured JSON report
2. **Review** — Display the report in a rich UI with scores, pass/fail checks, and actionable findings
3. **Fix** — User selects findings to fix, Loadout pushes them back to the CLI which rewrites the skill

## Acceptance Criteria

### Best Practices Reference

- [ ] Store Anthropic's official best practices as a Markdown file at `src-tauri/resources/skill-best-practices.md`
- [ ] File is bundled with the app binary (Tauri resource)
- [ ] Tauri command `get_skill_best_practices()` returns the content to the frontend

### Audit Flow

- [ ] "Audit" button on each `SkillCard` and in `SkillViewer`
- [ ] User selects which AI CLI to use (Claude Code / Codex / Gemini) — only installed CLIs shown
- [ ] Loadout spawns the CLI in non-interactive mode with a prompt containing:
  - The skill's full `SKILL.md` content
  - The best practices reference document
  - A JSON output schema for the audit report
- [ ] CLI runs in the background with a progress spinner (60s timeout, cancel button)
- [ ] CLI output is parsed as JSON; parsing errors show a retry option
- [ ] Audit results are displayed in a dedicated Audit Report view

### Audit Report JSON Schema

- [ ] CLI is prompted to return a JSON object matching this structure
- [ ] `overallScore` is determined holistically by the LLM (no deterministic formula enforced client-side). The prompt instructs the model to weigh categories based on relevance to the specific skill — e.g., "Code Quality" matters less for a markdown-only skill. If deterministic scoring is later preferred, compute it client-side as a weighted average of category scores.

```jsonc
{
  "skillName": "processing-pdfs",
  "overallScore": 82,              // 0-100
  "summary": "Well-structured skill with minor naming and description issues.",
  "categories": [
    {
      "name": "Naming",
      "score": 70,
      "maxScore": 100,
      "findings": [
        {
          "id": "naming-gerund",
          "severity": "warning",     // "error" | "warning" | "info"
          "title": "Name should use gerund form",
          "description": "Skill name 'pdf-tools' should use gerund form like 'processing-pdfs'.",
          "suggestion": "Rename to 'processing-pdfs'",
          "autoFixable": true
        }
      ]
    },
    {
      "name": "Description",
      "score": 90,
      "maxScore": 100,
      "findings": []
    },
    {
      "name": "Structure",
      "score": 85,
      "maxScore": 100,
      "findings": [
        {
          "id": "body-length",
          "severity": "info",
          "title": "SKILL.md body is under 500 lines",
          "description": "Body is 120 lines — well within the recommended limit.",
          "suggestion": null,
          "autoFixable": false
        }
      ]
    },
    {
      "name": "Content Quality",
      "score": 80,
      "maxScore": 100,
      "findings": []
    },
    {
      "name": "Progressive Disclosure",
      "score": 75,
      "maxScore": 100,
      "findings": []
    },
    {
      "name": "Terminology & Consistency",
      "score": 90,
      "maxScore": 100,
      "findings": []
    },
    {
      "name": "Workflows",
      "score": 85,
      "maxScore": 100,
      "findings": []
    },
    {
      "name": "Code Quality",
      "score": 70,
      "maxScore": 100,
      "findings": [
        {
          "id": "magic-constants",
          "severity": "warning",
          "title": "Unexplained constants in scripts",
          "description": "TIMEOUT = 47 has no justification comment.",
          "suggestion": "Add a comment explaining why this value was chosen.",
          "autoFixable": true
        }
      ]
    }
  ]
}
```

### Audit Report UI

- [ ] Overall score displayed as a colored ring/badge (green >=80, yellow >=60, red <60)
- [ ] Category breakdown with individual scores and expandable findings
- [ ] Each finding shows severity icon, title, description, and suggestion
- [ ] Findings with `autoFixable: true` have a selectable checkbox
- [ ] "Fix Selected" button at the bottom (disabled when nothing selected)
- [ ] "Re-audit" button to run the audit again after fixes

### Auto-Fix Flow

- [ ] User selects findings to fix via checkboxes, clicks "Fix Selected"
- [ ] User selects which CLI to use for the fix (can differ from audit CLI)
- [ ] Loadout spawns the CLI with a prompt containing:
  - The current `SKILL.md` content
  - The selected findings with their suggestions
  - The best practices reference
  - Instruction to output only the updated `SKILL.md` content
- [ ] Updated content shown in an editable diff/preview before applying
- [ ] User confirms → Loadout writes the updated file atomically (write to `.tmp`, rename over original)
- [ ] A `.bak` backup of the original file is kept so the user can revert
- [ ] After applying, auto-trigger a re-audit to show the new score

### Audit Categories

The audit should evaluate against these categories derived from the best practices:

| Category | What it checks |
|----------|---------------|
| **Naming** | Gerund form, lowercase/hyphens, no reserved words, <=64 chars |
| **Description** | Third person, specific terms, includes "when to use", <=1024 chars, no XML tags |
| **Structure** | Body under 500 lines, progressive disclosure, one-level-deep refs, TOC for long files |
| **Content Quality** | Conciseness, no unnecessary explanations, appropriate degrees of freedom |
| **Progressive Disclosure** | Separate files for advanced content, no deeply nested refs |
| **Terminology & Consistency** | Consistent terms, no time-sensitive info, forward-slash paths |
| **Workflows** | Clear steps, feedback loops, checklists for complex tasks |
| **Code Quality** | Scripts solve vs punt, no magic constants, explicit error handling, deps listed |

## Technical Details

### Best Practices Resource File

Bundle the Anthropic best practices as a Tauri resource:

```rust
// src-tauri/tauri.conf.json — add to resources
"bundle": {
  "resources": ["resources/skill-best-practices.md"]
}
```

```rust
// src-tauri/src/commands/audit.rs
#[tauri::command]
fn get_skill_best_practices(app: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app.path()
        .resolve("resources/skill-best-practices.md", tauri::path::BaseDirectory::Resource)
        .map_err(|e| e.to_string())?;
    std::fs::read_to_string(resource_path).map_err(|e| e.to_string())
}
```

### Audit Command

```rust
#[tauri::command]
async fn audit_skill(
    skill_content: String,
    best_practices: String,
    cli: String,  // "claude", "codex", "gemini"
) -> Result<SkillAuditReport, String> {
    let prompt = format!(
        "You are a skill quality auditor. Analyze the following SKILL.md against \
         the best practices reference and output a JSON audit report.\n\n\
         ## Best Practices Reference\n{}\n\n\
         ## SKILL.md to Audit\n{}\n\n\
         ## Output Format\n\
         Output ONLY valid JSON matching the schema (no markdown fences).\n\
         {}", // JSON schema here
        best_practices, skill_content, AUDIT_SCHEMA
    );

    let output = spawn_cli(&cli, &prompt).await?;
    serde_json::from_str(&output).map_err(|e| format!("Failed to parse audit JSON: {}", e))
}
```

### Fix Command

```rust
#[tauri::command]
async fn fix_skill(
    skill_content: String,
    findings: Vec<AuditFinding>,
    best_practices: String,
    cli: String,
) -> Result<String, String> {
    let findings_text = findings.iter()
        .map(|f| format!("- {}: {}", f.title, f.suggestion.as_deref().unwrap_or("")))
        .collect::<Vec<_>>().join("\n");

    let prompt = format!(
        "Update the following SKILL.md to fix these issues. \
         Follow the best practices reference. Output ONLY the updated SKILL.md content.\n\n\
         ## Issues to Fix\n{}\n\n\
         ## Best Practices Reference\n{}\n\n\
         ## Current SKILL.md\n{}",
        findings_text, best_practices, skill_content
    );

    let output = spawn_cli(&cli, &prompt).await?;
    Ok(strip_markdown_fences(&output))
}
```

### Shared CLI Spawner

Reuse the CLI detection and spawning logic from Issue 8 (`src-tauri/src/commands/ai.rs`).

> **Important**: The exact CLI flags for non-interactive mode must be verified against each CLI's `--help` output at implementation time. Issue 8 owns the canonical `spawn_cli` implementation; this issue should not duplicate it.

**Prompt delivery via stdin, not args**: The audit prompt (best practices + skill content + schema) can easily exceed OS `ARG_MAX` limits (~256KB on macOS). The `spawn_cli` helper must pipe the prompt via stdin rather than passing it as a command-line argument.

```rust
// Sketch — stdin-based approach
let mut child = Command::new(cli_binary)
    .args(cli_flags)        // non-interactive flags only, no prompt arg
    .stdin(Stdio::piped())
    .stdout(Stdio::piped())
    .spawn()
    .map_err(|e| e.to_string())?;

child.stdin.take().unwrap().write_all(prompt.as_bytes()).await?;
let output = child.wait_with_output().await?;
```

This design change applies to Issue 8 as well — any prompt with bundled reference docs will hit the same limit.

### Frontend Types

```typescript
// src/types/index.ts
interface AuditFinding {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  suggestion: string | null;
  autoFixable: boolean;
}

interface AuditCategory {
  name: string;
  score: number;
  maxScore: number;
  findings: AuditFinding[];
}

interface SkillAuditReport {
  skillName: string;
  overallScore: number;
  summary: string;
  categories: AuditCategory[];
}
```

### Files to Create/Modify

```
# New files
src-tauri/resources/skill-best-practices.md         # Anthropic best practices (bundled resource)
src-tauri/src/commands/audit.rs                      # Audit + fix Tauri commands
src/components/skills/AuditReport.tsx                # Audit report display
src/components/skills/AuditButton.tsx                # Trigger audit from card/viewer
src/lib/api/audit.ts                                 # API wrappers for audit commands

# Modified files
src-tauri/src/commands/mod.rs                        # Add audit module
src-tauri/src/commands/ai.rs                         # Extract shared spawn_cli helper
src-tauri/src/lib.rs                                 # Register audit commands
src-tauri/tauri.conf.json                            # Add resources bundle entry
src/components/skills/SkillCard.tsx                   # Add Audit button
src/components/skills/SkillViewer.tsx                 # Add Audit button
src/components/skills/index.ts                        # Export new components
src/types/index.ts                                   # Add audit types
```

## Test Plan

### Audit Flow
1. Open a skill card, click "Audit"
2. Verify only installed CLIs are shown as options
3. Select Claude Code, confirm spinner appears
4. Audit report appears with overall score and category breakdown
5. Expand a category — findings listed with severity icons
6. Click "Re-audit" — runs again, shows updated report

### Fix Flow
1. After audit, select 2-3 findings with `autoFixable: true`
2. Click "Fix Selected", choose CLI
3. Updated SKILL.md shown in editable preview
4. Confirm — file is written to disk
5. Verify `.bak` backup file was created alongside the original
6. Auto re-audit runs, new score reflects fixes
7. Verify the original file was actually updated on disk

### Edge Cases
1. Skill with perfect score → show congratulatory message, no fixable findings
2. CLI timeout → show error with retry option
3. CLI returns invalid JSON → show parse error, allow retry
4. No CLIs installed → disable Audit button, show install guidance
5. Skill file is read-only → show warning before attempting fix
6. Very large skill (>500 lines) → audit still works, flags the length issue
7. CLI takes >60s → timeout fires, cancel button works, partial output discarded
8. Fix applied → `.bak` file exists and contains original content

### JSON Validation
1. Manually verify audit JSON matches the schema for 3+ different skills
2. Test with minimal skill (name + description only)
3. Test with complex skill (multiple files, scripts, workflows)

## Dependencies

- Issue 8: AI-Assisted Skill Creation (shared CLI spawning infrastructure)
- Issue 3: Skills Scanner (skill content access — done)

## Notes

- **Best practices source**: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices — content should be copied as Markdown into `src-tauri/resources/skill-best-practices.md` and kept up to date periodically
- **JSON output reliability**: LLMs can produce malformed JSON — consider retrying once on parse failure with a "fix this JSON" prompt, or use a lenient JSON parser
- **Token budget**: The best practices doc is ~4k tokens. Combined with a skill and the schema prompt, this fits comfortably in a single CLI call. However, the raw character count (~16k+ chars) exceeds OS arg limits, so stdin piping is required (see Shared CLI Spawner section)
- **Batch audit**: Future enhancement — "Audit All" button that runs audits across all discovered skills and shows a dashboard summary
- **Score persistence**: Consider caching audit scores locally (Tauri store) so the SkillCard can show last-known score without re-running
- **Diff preview**: For the fix flow, consider using a side-by-side diff view (e.g., `react-diff-viewer`) to show exactly what will change
- Shares CLI detection logic with Issue 8 — extract into `src-tauri/src/commands/ai.rs` as a shared module
- **CLI flags**: Exact non-interactive flags for each CLI must be verified at implementation time against `--help` output. Issue 8 owns the canonical implementation; do not hardcode flags here
- **Write safety**: Fix flow uses atomic write (`.tmp` + rename) and keeps a `.bak` backup. Only one `.bak` is kept per skill (overwritten on subsequent fixes)
