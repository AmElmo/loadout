# Issue 6: Symlink-Based Skill Installation

**Phase:** 2 (Write Capabilities)
**Status:** Pending

---

## Summary

Replace the current "copy to each tool" skill installation with a symlink-based model following the [Vercel Labs skills](https://github.com/vercel-labs/skills) convention. Skills are written once to `~/.agents/skills/` (the open standard canonical directory) and symlinked into each agent's native directory. Edit once, updates everywhere.

### Why

The current copy-based sync creates independent files that drift silently. Users edit a skill in one tool and forget to re-sync. Symlinks eliminate this class of problem entirely — all tools read the same file through the filesystem.

### Design Principles

- **`.agents/skills/` is the canonical home** — not a Loadout-owned path. If Loadout is uninstalled, files and symlinks survive.
- **Codex, Amp, and Roo read from `.agents/skills/` natively** — no symlink needed for them.
- **Claude and Gemini get symlinks** from their tool-specific directories to the canonical.
- **Link is the default, Copy is the opt-out** for users who want per-tool customization.
- **No automatic migration** of existing copied skills. Migration is user-initiated.

---

## Acceptance Criteria

### 1. Canonical Write + Symlink Creation

- [ ] New `link_skill()` function writes canonical file to `~/.agents/skills/<name>/SKILL.md`
- [ ] Creates symlinks from `~/.claude/skills/<name>/` and `~/.gemini/skills/<name>/` to the canonical directory
- [ ] Skips symlink for Codex (it reads `.agents/skills/` natively)
- [ ] Uses relative symlink paths (more portable than absolute)
- [ ] Falls back to copy silently if symlink creation fails (with `symlinkFailed: true` in result)
- [ ] Existing `write_skill()` (copy path) remains as the Copy option
- [ ] Backups created before any file replacement (existing backup system)

### 2. Platform-Specific Linking

- [ ] macOS/Linux: use `std::os::unix::fs::symlink`
- [ ] Windows: use `std::os::windows::fs::symlink_dir` (junction, no admin required)
- [ ] If junction/symlink fails on any platform, fall back to copy without error
- [ ] `WriteResult` reports `method: "link" | "copy"` and optional `symlinkFailed: bool`

### 3. Scanner: Symlink Detection

- [ ] Use `fs::symlink_metadata()` to detect symlinks during skill scanning
- [ ] Add `isSymlinked: bool` and `symlinkTarget: Option<String>` to `SkillItem`
- [ ] Add `isBrokenSymlink: bool` for dangling symlinks
- [ ] Broken symlinks reported separately in `SkillScanResult.brokenSymlinks`
- [ ] Skills symlinked to the same canonical path are grouped into a single `SkillItem` with `availableIn: Vec<SourceTool>` (multiple tool badges on one card)
- [ ] Independent copies remain as separate `SkillItem` entries (current behavior)

### 4. Conflict Detection: Symlink Awareness

- [ ] Skills pointing to the same symlink target are NOT conflicts (same file by definition)
- [ ] Mixed state (some tools symlinked, some with divergent independent copies) IS a conflict
- [ ] `ConflictWarning` differentiates mixed-state conflicts with "Resolve: Link all" action

### 5. Linkable Detection + Migration Banner

- [ ] Scanner detects skills with same name AND identical content across tools as "linkable"
- [ ] `SkillScanResult` includes `linkableGroups: Vec<LinkableGroup>` (name, tools, paths)
- [ ] Blue info banner on Skills page: "{n} skills could be linked" with per-skill "Link" action
- [ ] "Link" action migrates: moves content to canonical, replaces originals with symlinks, creates backups
- [ ] "Dismiss" per skill, persisted in localStorage, doesn't reappear
- [ ] Organic migration: SyncDialog defaults to Link, migration happens naturally when adding to other tools

### 6. InstallSkillDialog: Method Choice

- [ ] Radio group below ToolSelector: "Link (recommended)" vs "Copy"
- [ ] Default: Link
- [ ] Link description: "Single file shared across all tools. Edit once, updates everywhere."
- [ ] Copy description: "Independent copy in each tool. Edit separately per tool."
- [ ] Path hint updates dynamically: Link shows `~/.agents/skills/name/SKILL.md (linked to selected tools)`, Copy shows per-tool paths
- [ ] Codex checkbox disabled with tooltip when Link selected: "Codex reads from .agents/skills directly"
- [ ] `InstallSkillRequest` includes `method: "link" | "copy"`

### 7. SyncDialog: Method Choice (Skills Only)

- [ ] Same Link/Copy radio for `type="skill"`
- [ ] Smart default: if source skill is already symlinked, default to Link. Otherwise still default to Link.
- [ ] When source is a regular file and Link is selected, explain: "This will move the source file to ~/.agents/skills/ and link both tools to it"
- [ ] Header renamed: "Sync Skill to Other Tools" -> "Add Skill to Other Tools"
- [ ] Share2 tooltip: "Copy this skill to other tools" -> "Add to other tools"

### 8. SuccessConfirmation: Reflect Method

- [ ] Link mode: show "Source file" (canonical path) + "Linked from" (agent paths) + "Native" (Codex)
- [ ] Copy mode: current behavior (flat list of created files)
- [ ] When symlink failed silently: show info note "Linking was not available on this system. Independent copies were created instead."

### 9. SkillCard: Link Indicator

- [ ] Linked skills show as **one card** with multiple `ToolBadge` components (grouped by canonical path)
- [ ] Small `Link2` icon (Lucide) next to tool badges with tooltip showing canonical path
- [ ] Broken symlinks show red `Unlink` icon with tooltip "Broken link: target file not found"
- [ ] Share2 button only appears if there are tools that truly don't have access to this skill

### 10. SkillViewer: Symlink Details

- [ ] Footer shows canonical path for linked skills: `~/.agents/skills/commit/SKILL.md`
- [ ] Below path: "Linked to Claude Code, Codex CLI, Gemini CLI"
- [ ] Broken symlinks show warning banner at top of viewer
- [ ] "Sync to Other Tools" renamed to "Add to Other Tools"
- [ ] New "Unlink" action for linked skills (converts symlink to independent copy for that tool)

### 11. Broken Symlink Warning

- [ ] New `BrokenSymlinkWarning` component (red banner, like `ConflictWarning` but red)
- [ ] Shows on Skills page alongside ConflictWarning
- [ ] Lists each broken symlink with name, tool, and expected target path
- [ ] Actions: "Remove broken link" (deletes dangling symlink) and "Recreate from another tool's copy" (if one exists)

### 12. Unlink Action

- [ ] Available in SkillViewer for linked skills
- [ ] Reads canonical file content, deletes symlink, writes independent copy in place
- [ ] The skill becomes an independent card for that tool; other tools remain linked
- [ ] Confirmation before unlinking: "This will create an independent copy for {tool}. Future edits won't sync."

---

## Technical Details

### Canonical Directory

```
~/.agents/skills/<name>/SKILL.md    ← canonical (real file)
~/.claude/skills/<name>/            ← symlink → ~/.agents/skills/<name>/
~/.gemini/skills/<name>/            ← symlink → ~/.agents/skills/<name>/
```

Codex, Amp, and Roo read from `.agents/skills/` natively. No symlink needed.

For project-level installs, same pattern under project root:
```
$ROOT/.agents/skills/<name>/SKILL.md    ← canonical
$ROOT/.claude/skills/<name>/            ← symlink
$ROOT/.gemini/skills/<name>/            ← symlink
```

### New Rust Types

```rust
// In scanners/skills.rs
pub struct SkillItem {
    // ... existing fields ...
    pub is_symlinked: bool,
    pub symlink_target: Option<String>,
    pub is_broken_symlink: bool,
    pub available_in: Vec<SourceTool>,  // for grouped linked skills
}

pub struct BrokenSymlinkInfo {
    pub name: String,
    pub path: String,
    pub expected_target: String,
    pub tool: SourceTool,
}

pub struct LinkableGroup {
    pub name: String,
    pub tools: Vec<SourceTool>,
    pub paths: Vec<String>,
    pub content_hash: u64,
}

pub struct SkillScanResult {
    pub skills: Vec<SkillItem>,
    pub conflicts: Vec<SkillConflict>,
    pub broken_symlinks: Vec<BrokenSymlinkInfo>,
    pub linkable_groups: Vec<LinkableGroup>,
}
```

```rust
// In commands/sync.rs
pub struct InstallSkillRequest {
    pub name: String,
    pub content: String,
    pub target_tools: Vec<String>,
    pub method: String,  // "link" or "copy"
}

pub struct WriteResult {
    pub success: bool,
    pub modified_files: Vec<String>,
    pub errors: Vec<String>,
    pub method: String,            // "link" or "copy"
    pub canonical_path: Option<String>,
    pub symlink_failed: bool,
}
```

### New TypeScript Types

```typescript
// In types/index.ts
interface SkillItem {
    // ... existing fields ...
    isSymlinked: boolean;
    symlinkTarget: string | null;
    isBrokenSymlink: boolean;
    availableIn: SourceTool[];
}

interface BrokenSymlinkInfo {
    name: string;
    path: string;
    expectedTarget: string;
    tool: SourceTool;
}

interface LinkableGroup {
    name: string;
    tools: SourceTool[];
    paths: string[];
}

interface SkillScanResult {
    skills: SkillItem[];
    conflicts: SkillConflict[];
    brokenSymlinks: BrokenSymlinkInfo[];
    linkableGroups: LinkableGroup[];
}

interface InstallSkillRequest {
    name: string;
    content: string;
    targetTools: SourceTool[];
    method: "link" | "copy";
}

interface WriteResult {
    success: boolean;
    modifiedFiles: string[];
    errors: string[];
    method: "link" | "copy";
    canonicalPath: string | null;
    symlinkFailed: boolean;
}
```

### Symlink Creation (Rust)

```rust
// In writers/skill_writer.rs
use std::path::{Path, PathBuf};

pub fn canonical_skill_dir(global: bool, workspace: Option<&str>) -> PathBuf {
    if global {
        dirs::home_dir().unwrap().join(".agents/skills")
    } else {
        PathBuf::from(workspace.unwrap()).join(".agents/skills")
    }
}

pub fn link_skill(name: &str, content: &str, target_tools: &[&str]) -> Result<WriteResult, String> {
    let canonical_dir = canonical_skill_dir(true, None).join(name);
    let canonical_path = canonical_dir.join("SKILL.md");

    // 1. Write canonical file (atomic)
    atomic_write(&canonical_path, content)?;

    let mut modified = vec![canonical_path.to_string_lossy().to_string()];
    let mut errors = vec![];
    let mut symlink_failed = false;

    for tool in target_tools {
        // Codex reads .agents/skills natively — skip
        if *tool == "codex" { continue; }

        let agent_dir = skill_dir_for_tool(tool)?.join(name);

        match create_tool_symlink(&canonical_dir, &agent_dir) {
            Ok(()) => modified.push(agent_dir.to_string_lossy().to_string()),
            Err(_) => {
                // Fallback: copy
                let agent_path = agent_dir.join("SKILL.md");
                atomic_write(&agent_path, content)?;
                modified.push(agent_path.to_string_lossy().to_string());
                symlink_failed = true;
            }
        }
    }

    Ok(WriteResult {
        success: true,
        modified_files: modified,
        errors,
        method: "link".to_string(),
        canonical_path: Some(canonical_path.to_string_lossy().to_string()),
        symlink_failed,
    })
}

fn create_tool_symlink(canonical_dir: &Path, agent_dir: &Path) -> Result<(), String> {
    // Remove existing file/symlink at agent_dir
    if agent_dir.exists() || agent_dir.symlink_metadata().is_ok() {
        std::fs::remove_dir_all(agent_dir).map_err(|e| e.to_string())?;
    }

    // Ensure parent exists
    if let Some(parent) = agent_dir.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    // Create relative symlink
    let relative = pathdiff::diff_paths(canonical_dir, agent_dir.parent().unwrap())
        .ok_or("Failed to compute relative path")?;

    #[cfg(unix)]
    std::os::unix::fs::symlink(&relative, agent_dir).map_err(|e| e.to_string())?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(&relative, agent_dir).map_err(|e| e.to_string())?;

    Ok(())
}
```

### Scanner: Symlink Detection

```rust
// In scan_skill_directory(), after finding SKILL.md:
fn check_symlink_status(path: &Path) -> (bool, Option<String>, bool) {
    match std::fs::symlink_metadata(path) {
        Ok(meta) if meta.file_type().is_symlink() => {
            match std::fs::read_link(path) {
                Ok(target) => {
                    let target_str = target.to_string_lossy().to_string();
                    let is_broken = !std::fs::metadata(path).is_ok(); // follows symlink
                    (true, Some(target_str), is_broken)
                }
                Err(_) => (true, None, true),
            }
        }
        _ => (false, None, false),
    }
}
```

### Grouping Logic

```rust
// In process_skill_entries():
// After building all SkillItems, group symlinked ones by canonical path:
// 1. Resolve all symlink targets to absolute canonical paths
// 2. Skills pointing to same canonical → merge into one SkillItem with
//    available_in = [all tools], source_tool = first tool found
// 3. Independent copies → keep as separate SkillItems (current behavior)
```

### Rust Crates

```toml
pathdiff = "0.2"  # For computing relative symlink paths
```

### Files to Create

```
src/components/skills/BrokenSymlinkWarning.tsx   # Red banner for broken symlinks
src/components/skills/LinkableBanner.tsx          # Blue banner for linkable skills
```

### Files to Modify

```
src-tauri/src/
├── writers/skill_writer.rs        # Add link_skill(), create_tool_symlink(),
│                                  # canonical_skill_dir(), unlink_skill()
├── writers/backup.rs              # Symlink-aware backup (minor)
├── commands/sync.rs               # method field, new unlink_skill command,
│                                  # remove_broken_symlink command
├── scanners/skills.rs             # Symlink detection, grouping, broken detection,
│                                  # linkable detection
├── lib.rs                         # Register new commands

src/
├── types/index.ts                 # New fields on SkillItem, SkillScanResult,
│                                  # InstallSkillRequest, WriteResult
├── lib/api/sync.ts                # Pass method through
├── components/sync/
│   ├── InstallSkillDialog.tsx     # Link/Copy radio, dynamic path hint
│   ├── SyncDialog.tsx             # Link/Copy radio for skills, rename header
│   ├── SuccessConfirmation.tsx    # Two display modes based on method
│   └── ToolSelector.tsx           # Codex disabled+tooltip when Link selected
├── components/skills/
│   ├── SkillCard.tsx              # Link2 icon, multiple ToolBadges, Share2 logic
│   ├── SkillViewer.tsx            # Canonical path, linked-to info, Unlink action,
│   │                              # broken warning banner
│   ├── SkillList.tsx              # Update empty state paths
│   ├── ConflictWarning.tsx        # Mixed-state conflict subtype
│   ├── BrokenSymlinkWarning.tsx   # NEW: red broken symlink banner
│   ├── LinkableBanner.tsx         # NEW: blue linkable skills banner
│   └── index.ts                   # Export new components
├── pages/Skills.tsx               # Render BrokenSymlinkWarning + LinkableBanner
└── stores/workspaceStore.ts       # dismissedLinkable persistent state
```

---

## Test Plan

### Install with Link (Default)

1. Click "Install Skill" on Skills page
2. Fill name (`commit`), description, instructions
3. Verify "Link (recommended)" is selected by default
4. Select Claude + Codex + Gemini
5. Verify Codex checkbox shows "reads from .agents/skills directly" tooltip
6. Click "Install"
7. Verify files:
   - `~/.agents/skills/commit/SKILL.md` exists (real file)
   - `~/.claude/skills/commit/` is a symlink → `~/.agents/skills/commit/`
   - `~/.gemini/skills/commit/` is a symlink → `~/.agents/skills/commit/`
8. Success screen shows canonical path + linked paths
9. Skill appears as ONE card with `[Claude] [Codex] [Gemini]` badges and link icon
10. Edit `~/.agents/skills/commit/SKILL.md` → change visible from all tools

### Install with Copy (Opt-Out)

11. Install another skill, select "Copy" method
12. Verify independent files created in each tool's directory (no symlinks)
13. Skill appears as separate cards per tool (current behavior)

### Sync/Add to Other Tools

14. Have skill only in Claude (regular file). Click Share2 icon.
15. Dialog shows "Add Skill to Other Tools" with Link/Copy radio
16. Select Link → dialog explains "This will move the source file to ~/.agents/skills/"
17. Confirm → original Claude file replaced with symlink, canonical created, Gemini symlinked
18. Card updates to show multiple tool badges

### Symlink Detection in Scanner

19. Manually create a symlink: `ln -s ~/.agents/skills/commit ~/.claude/skills/commit`
20. Refresh Skills page → skill shows with link icon and correct tool badges
21. Manually create a skill via Vercel CLI (`npx skills add ...`) → Loadout detects it correctly

### Broken Symlinks

22. Delete `~/.agents/skills/commit/` while symlinks exist
23. Refresh → red "Broken link" banner appears with affected tools listed
24. Click "Remove broken link" → dangling symlinks deleted
25. Alternative: "Recreate from another tool's copy" if an independent copy exists elsewhere

### Linkable Banner (Migration)

26. Have skill `review` in Claude and Codex as independent copies with identical content
27. Skills page shows blue "1 skill could be linked" banner
28. Click "Link" → content moved to canonical, both replaced with symlinks, backups created
29. "Dismiss" hides banner for that skill, persists across page refreshes

### Conflict Detection

30. Linked skill in Claude + independent copy with different content in Gemini
31. ConflictWarning shows "mixed link state" with "Resolve: Link all" option
32. Resolving picks canonical version, replaces Gemini copy with symlink

### Unlink

33. Open SkillViewer for a linked skill → "Unlink from Claude Code" action visible
34. Click Unlink → confirmation dialog
35. Confirm → symlink replaced with independent copy, card splits into linked + independent

### Edge Cases

36. Install skill when `.agents/skills/` directory doesn't exist → created automatically
37. Skill name collision: canonical already exists from another source → warn before overwriting
38. Circular symlink detection → reported as broken
39. Symlink target outside `.agents/skills/` (manually created) → displayed as-is, no special treatment
40. Project-level install → same pattern under `$ROOT/.agents/skills/`

### Windows-Specific (if testing on Windows)

41. Junction created instead of symlink → transparent to agents
42. Junction fails (FAT32, network drive) → falls back to copy with info note
43. No admin/Developer Mode prompt ever shown

---

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure, atomic writes, backups) — **Done**

---

## Notes

- **Follows the Vercel Labs convention**: The `.agents/skills/` canonical path is the emerging open standard adopted by Vercel's [`skills` CLI](https://github.com/vercel-labs/skills), Codex, Amp, and Roo. Loadout aligns with this rather than inventing a proprietary path.
- **No Loadout lock-in**: If the user uninstalls Loadout, canonical files and symlinks remain on disk. No tool functionality is broken.
- **Codex/Amp/Roo are "universal" agents**: They read directly from `.agents/skills/`. Installing a skill to the canonical location makes it immediately available to all three without any symlinks.
- **`pathdiff` crate**: Needed for computing relative paths for symlinks. Small, no transitive dependencies.
- **Backup before any replacement**: The existing backup system (`~/.loadout/backups/`) already handles this. Symlink operations (replacing real files with symlinks during migration) always create a backup first.
- **Import (Issue 8) and Registry (Issue 10) should use this**: When those features land, they should default to the Link method. This issue establishes the foundation they build on.
- **Expand Tool Support (Issue 12) benefits directly**: With more tools sharing `.agents/skills/`, symlinks become even more valuable. Tools like Amp and Roo get skills for free from the canonical location.
