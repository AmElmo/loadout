# Issue 7: Import Skills & MCPs from File or URL

**Phase:** 2 (Write Capabilities)
**Status:** Pending

---

## Summary

Add the ability to import skills from a local file (drag-and-drop or file picker) or from a URL (GitHub repo or raw URL). Extends the existing write infrastructure with network fetching and file input.

## Acceptance Criteria

### Import from File
- [ ] "Import from File" button in Skills page opens Tauri file dialog
- [ ] Accepts `.md` files (filtered in dialog)
- [ ] Parses SKILL.md frontmatter to extract name and description
- [ ] Shows preview of parsed skill before installing
- [ ] User selects target tools and confirms install
- [ ] Drag-and-drop onto the Skills page area also triggers import

### Import from URL
- [ ] "Import from URL" input field in install dialog
- [ ] Supports GitHub repo URLs (auto-converts to raw content URL)
  - `https://github.com/org/repo/blob/main/SKILL.md` → raw URL
  - `https://github.com/org/repo` → looks for `SKILL.md` at root
- [ ] Supports raw URLs directly (any `.md` URL)
- [ ] Shows loading spinner while fetching
- [ ] Displays fetched skill preview (name, description, content)
- [ ] User selects target tools and confirms install
- [ ] Error handling: invalid URL, 404, network failure, invalid SKILL.md

## Technical Details

### Rust Crates

```toml
reqwest = { version = "0.12", features = ["rustls-tls"] }
```

### GitHub URL Conversion

```rust
fn github_to_raw_url(url: &str) -> Option<String> {
    // github.com/org/repo/blob/main/path → raw.githubusercontent.com/org/repo/main/path
    // github.com/org/repo → raw.githubusercontent.com/org/repo/main/SKILL.md
}
```

### New Tauri Command

```rust
#[tauri::command]
async fn fetch_skill_from_url(url: String) -> Result<FetchedSkill, String> {
    // 1. Convert GitHub URL if needed
    // 2. HTTP GET the content
    // 3. Parse SKILL.md frontmatter
    // 4. Return parsed skill for preview
}
```

### File Import via Tauri Dialog

Use existing `tauri-plugin-dialog` (already a dependency) for file picker:

```typescript
import { open } from "@tauri-apps/plugin-dialog";
const path = await open({ filters: [{ name: "Markdown", extensions: ["md"] }] });
```

Then read file content via `tauri-plugin-fs` and pass to existing `install_skill_to_tools`.

### Files to Create/Modify

```
src-tauri/src/commands/sync.rs    # Add fetch_skill_from_url command
src/components/sync/ImportSkillDialog.tsx  # New dialog with URL + file modes
src/pages/Skills.tsx              # Add import button
```

## Test Plan

### Import from File
1. Click "Import from File" on Skills page
2. Select a valid SKILL.md file from disk
3. Preview shows parsed name, description, content
4. Select tools, click Install
5. Verify SKILL.md written to correct paths

### Import from URL
1. Enter a GitHub repo URL containing SKILL.md
2. Verify URL is converted and content fetched
3. Preview shows parsed skill
4. Select tools, click Install
5. Verify files created

### Error Cases
1. Enter invalid URL → shows error message
2. Enter URL to non-existent file → shows 404 error
3. Enter URL to non-SKILL.md file → shows parse error
4. Select file that isn't valid SKILL.md → shows parse error

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure)

## Notes

- Use `reqwest` with `rustls-tls` to avoid OpenSSL dependency
- Consider rate limiting for GitHub API (raw.githubusercontent.com is not rate-limited)
- File drag-and-drop may require additional Tauri permissions
- Could extend to MCP import too (import `.mcp.json` or similar), but start with skills
