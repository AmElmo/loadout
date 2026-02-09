# Issue 9: Browse & Install from Skill Registry

**Phase:** 3 (Discovery)
**Status:** Pending

---

## Summary

Let users browse a curated skill registry (agentskills.io or similar) from within Loadout and install skills with one click. Brings discoverability to the skill ecosystem.

## Acceptance Criteria

### Registry Browsing
- [ ] "Browse Registry" tab or button in Skills page
- [ ] Fetch skill index from registry API
- [ ] Display skills in a searchable/filterable list
- [ ] Show skill name, description, author, download count (if available)
- [ ] Search by keyword
- [ ] Filter by category/tag

### One-Click Install
- [ ] "Install" button on each registry skill
- [ ] Fetches full SKILL.md content from registry
- [ ] Shows preview with tool selector
- [ ] Installs to selected tools using existing write infrastructure
- [ ] Shows success confirmation

### Registry Integration
- [ ] Support agentskills.io (Open Agent Skills Standard) if API available
- [ ] Fallback: curated GitHub-based index (JSON file with skill metadata + URLs)
- [ ] Cache registry index locally for fast browsing (refresh on demand)
- [ ] Handle offline gracefully (show cached results or empty state)

## Technical Details

### Registry API (to be researched)

```rust
#[tauri::command]
async fn fetch_skill_registry() -> Result<Vec<RegistrySkill>, String> {
    // Fetch index from agentskills.io API or GitHub-hosted JSON
}

struct RegistrySkill {
    name: String,
    description: String,
    author: String,
    url: String,       // URL to fetch full SKILL.md
    tags: Vec<String>,
    downloads: Option<u64>,
}
```

### Caching Strategy

Use `tauri-plugin-store` (already a dependency) to cache the registry index:

```typescript
import { Store } from "@tauri-apps/plugin-store";
const store = new Store("registry-cache");
await store.set("skills-index", { data: skills, fetchedAt: Date.now() });
```

### Files to Create/Modify

```
src-tauri/src/commands/registry.rs     # Registry fetch commands
src/components/registry/              # New feature directory
  RegistryBrowser.tsx                  # Main browsing component
  RegistrySkillCard.tsx                # Individual skill card
  index.ts
src/lib/api/registry.ts               # API wrapper
src/pages/Skills.tsx                   # Add "Browse Registry" option
```

## Test Plan

1. Click "Browse Registry" on Skills page
2. Verify registry index loads (or shows loading state)
3. Search for "commit" → shows matching skills
4. Click "Install" on a skill
5. Preview shows skill content with tool selector
6. Install and verify files created
7. Skill appears in local skills list after refresh

### Offline/Error Cases
1. No internet → show cached results or "Registry unavailable" message
2. Registry API error → show error with retry
3. Skill fetch fails → show error on specific skill

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure)
- Issue 7: Import from URL (for fetching skill content)
- External: agentskills.io API availability

## Notes

- **Research needed**: Check if agentskills.io has a public API for listing/searching skills
- If no API exists, consider a community-maintained GitHub repo with a skills index JSON
- Could build a simple registry ourselves as a separate project
- Start with read-only browsing — publishing skills to registry is a separate concern
- Consider showing "popular" or "recommended" skills as a starting point
- MCP registries (like mcp.run, glama.ai) could follow the same pattern in a future issue
