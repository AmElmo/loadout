# Issue 14: Cross-Tool Skill Content Reconciliation

**Phase:** 2 (Write Capabilities)
**Status:** Pending

---

## Summary

Add a resolution flow for skills that have the same name but different content across tools. The backend already detects these conflicts (Issue 3) and the frontend already shows a warning banner (`ConflictWarning.tsx`), but there's no way for the user to **resolve** the discrepancy. This issue adds a side-by-side comparison view and a one-click sync to reconcile divergent skill versions.

## What Already Exists

- **Backend** (`src-tauri/src/scanners/skills.rs`): `SkillConflict` struct, `process_skill_entries()` groups by name, hashes content, returns conflicts
- **Frontend** (`src/components/skills/ConflictWarning.tsx`): Banner listing skills with mismatched content across tools
- Detection and warning are **done**. Resolution is **not**.

## Motivation

- Skills are often installed to multiple tools via Issue 5's sync feature, but subsequent edits happen in one tool's directory only
- Without reconciliation, users unknowingly run different versions of the same skill across tools
- The existing conflict warning tells users something is wrong but doesn't help them fix it
- This is specific to **skills** (which have meaningful content/instructions) — rules and MCPs are less likely to diverge in the same way since MCPs are config entries and rules tend to be tool-specific

## Acceptance Criteria

- [ ] User can click a conflict warning to open a resolution dialog
- [ ] Dialog lists each version with its source tool label and last-modified timestamp
- [ ] Dialog shows a GitHub-style unified diff so the user can see what changed
- [ ] User picks which version to keep
- [ ] On selection, the chosen version is written to all other tool locations that have that skill
- [ ] Uses the safe write infrastructure from Issue 5 (atomic writes, backups)
- [ ] Dismissible: user can acknowledge a difference and choose to keep versions divergent

## Technical Details

### Backend: Extend Existing Conflict Data

The existing `SkillConflict` struct has `name`, `conflicting_paths`, and `tools`. Extend it (or add a new command) to also return full content and last-modified timestamps for each version, so the frontend can display the comparison:

```rust
#[tauri::command]
async fn get_skill_conflict_details(skill_name: String, paths: Vec<String>) -> Result<Vec<SkillVersion>, String>

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SkillVersion {
    source_tool: String,
    scope: String,
    path: String,
    content: String,
    last_modified: Option<String>,  // filesystem mtime for "which is newer" hint
}
```

### Backend: Resolution Command

```rust
#[tauri::command]
async fn resolve_skill_conflict(
    skill_name: String,
    chosen_path: String,          // path of the version to keep
    target_paths: Vec<String>,    // paths to overwrite with chosen version
) -> Result<(), String>
```

### UI Components

```
src/components/skills/
├── ConflictResolutionDialog.tsx  # Side-by-side comparison + pick version
```

- Make `ConflictWarning.tsx` clickable → opens `ConflictResolutionDialog`
- **ConflictResolutionDialog**: Shows a GitHub-style unified diff between versions, with source tool labels and last-modified timestamps. User picks which version to keep or dismisses.
- Use a lightweight diff library like `react-diff-viewer-continued` for the GitHub-style rendering

### Files to Create/Modify

```
src-tauri/src/
├── commands/skills.rs         # Add get_skill_conflict_details, resolve_skill_conflict

src/
├── lib/api/skills.ts          # Add conflict resolution API wrappers
├── components/skills/
│   ├── ConflictWarning.tsx     # Make clickable → opens resolution dialog
│   └── ConflictResolutionDialog.tsx  # New
```

## Test Plan

1. Create a skill `my-skill` in Claude and Codex with **identical** content → no conflict shown
2. Edit the Codex version to differ → conflict indicator appears on the skill card
3. Click "Review" → dialog shows both versions with source labels
4. Pick the Claude version → Codex file is overwritten with Claude's content
5. Verify backup created in `~/.loadout/backups/` before overwrite
6. Verify both files now have identical content
7. Dismiss a conflict → it no longer shows as a warning (until content changes again)
8. Skill that exists in only one tool → no conflict indicator

## Dependencies

- Issue 3: Skills Scanner (conflict detection foundation)
- Issue 5: Sync MCP + Skill (safe write infrastructure)

## Notes

- This feature is specific to **skills**. MCPs are config entries (not free-form content), and rules tend to be tool-specific, so cross-tool content divergence is less of a concern for those.
- Consider scoping to user-level skills initially — project-level skills are tied to a specific workspace and less likely to be synced across tools.
- The `last_modified` timestamp helps users make an informed choice but shouldn't auto-resolve (the older version might be intentionally different).
