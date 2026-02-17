# Issue 13: Skill Icons — Keyword-Based Icon Matching & User Overrides

**Phase:** 2 (Enhancement)
**Status:** Pending

---

## Summary

Replace the generic `Sparkles` icon on every skill card with a contextual icon selected by keyword-matching the skill name against a curated dictionary. This mirrors the favicon/letter-avatar approach already used for MCPs and gives each skill a distinct visual identity at a glance. Users can also override the auto-selected icon with one they prefer, persisted via Zustand + localStorage (same pattern as the workspace store).

## Acceptance Criteria

### Keyword-Based Icon Selection
- [ ] Maintain a curated mapping of keywords → Lucide icon names (e.g., `commit` → `GitCommit`, `review` → `Eye`, `test` → `FlaskConical`, `deploy` → `Rocket`)
- [ ] Match against the skill `name` field using whole-token matching only (no AI, no network calls, no substring matching)
- [ ] Fall back to a deterministic letter-avatar (same style as stdio MCPs) when no keyword matches
- [ ] Icon + background color are deterministic — same skill name always produces the same result

### SkillIcon Component
- [ ] New `SkillIcon` component in `src/components/skills/` (mirrors `MCPIcon` pattern)
- [ ] Accepts `name: string` and optional `overrideIcon?: string` props
- [ ] Renders a 40×40 rounded-lg container with icon (same dimensions as MCP icons)
- [ ] Uses the existing `getColorForName()` hash function for consistent coloring
- [ ] Integrates into `SkillCard` replacing the hardcoded `Sparkles` icon

### User Icon Override (Optional — Can Be Deferred)
- [ ] Clicking the icon on a skill card (or a small edit button) opens an icon picker popover
- [ ] Icon picker shows a grid of available Lucide icons, filterable by search
- [ ] Selected override is stored in a Zustand store with `persist` middleware (localStorage)
- [ ] Override keyed by skill `path` (file path is stable even when the frontmatter `name` field changes — note: `id` is a hash of `name + source + scope` so it changes on rename)
- [ ] "Reset to default" option to clear the override and revert to auto-detected icon
- [ ] Overrides persist across app restarts

## Technical Details

### Keyword → Icon Dictionary

A flat map of keywords to Lucide icon component names. Order matters — first match wins. Keep the list focused (30–50 entries) to avoid bloat.

```typescript
// src/components/skills/skillIconMap.ts

type IconEntry = {
  keywords: string[];
  icon: string; // Lucide icon name
};

export const SKILL_ICON_MAP: IconEntry[] = [
  // Version control
  { keywords: ["commit", "git"], icon: "GitCommit" },
  { keywords: ["branch"], icon: "GitBranch" },
  { keywords: ["merge", "pull-request"], icon: "GitMerge" },

  // Code & development
  { keywords: ["code", "coding"], icon: "Code" },
  { keywords: ["debug", "bug"], icon: "Bug" },
  { keywords: ["test", "spec", "jest", "vitest"], icon: "FlaskConical" },
  { keywords: ["build", "compile"], icon: "Hammer" },
  { keywords: ["deploy", "ship", "release"], icon: "Rocket" },
  { keywords: ["refactor", "clean"], icon: "Recycle" },
  { keywords: ["lint", "format"], icon: "AlignLeft" },

  // Review & analysis
  { keywords: ["review"], icon: "Eye" },
  { keywords: ["analyze", "analysis"], icon: "BarChart3" },
  { keywords: ["audit", "security"], icon: "Shield" },
  { keywords: ["search", "find", "explore"], icon: "Search" },

  // Documentation
  { keywords: ["doc", "docs", "document", "readme"], icon: "FileText" },
  { keywords: ["write", "draft", "blog"], icon: "PenTool" },
  { keywords: ["translate", "i18n", "locale"], icon: "Languages" },

  // Data & API
  { keywords: ["api", "endpoint", "rest", "graphql"], icon: "Plug" },
  { keywords: ["database", "sql", "migration"], icon: "Database" },
  { keywords: ["data", "transform", "etl"], icon: "ArrowRightLeft" },

  // Infrastructure
  { keywords: ["docker", "container"], icon: "Container" },
  { keywords: ["monitor", "alert", "observe"], icon: "Activity" },
  { keywords: ["config", "setting", "env"], icon: "Settings" },

  // Communication
  { keywords: ["email", "mail", "notify"], icon: "Mail" },
  { keywords: ["chat", "message", "slack"], icon: "MessageSquare" },
  { keywords: ["comment", "feedback"], icon: "MessageCircle" },

  // AI & automation
  { keywords: ["llm", "agent", "prompt"], icon: "Brain" },
  { keywords: ["automate", "workflow", "pipeline"], icon: "Workflow" },
  { keywords: ["generate", "create", "scaffold"], icon: "Wand2" },

  // Planning
  { keywords: ["plan", "design", "architect"], icon: "Compass" },
  { keywords: ["task", "todo", "ticket"], icon: "CheckSquare" },
  { keywords: ["schedule", "calendar", "cron"], icon: "Calendar" },
];
```

### Matching Logic

Token-only matching: split the skill name on delimiters (`-`, `_`, spaces) and match whole tokens. No `includes()` substring matching — this prevents short keywords from false-positive matching (e.g., `pr` matching `sprint`, `ai` matching `maintain`, `db` matching `sandbox`). Multi-word keywords like `pull-request` are also split into tokens and matched if all parts appear.

```typescript
// src/components/skills/skillIconMap.ts

export function matchSkillIcon(name: string): string | null {
  const tokens = new Set(name.toLowerCase().split(/[-_\s]+/));

  for (const entry of SKILL_ICON_MAP) {
    for (const keyword of entry.keywords) {
      // Multi-word keywords (e.g., "pull-request") → all parts must be present as tokens
      const keywordParts = keyword.split("-");
      if (keywordParts.every((part) => tokens.has(part))) {
        return entry.icon;
      }
    }
  }
  return null; // No match → fall back to letter avatar
}
```

### SkillIcon Component

**Important implementation notes:**

1. **Tailwind class detection**: Dynamic template strings like `` `bg-${color}-500/10` `` won't be detected by Tailwind's static analysis and will be purged in production. The existing `getColorForName()` in `MCPIcon.tsx` correctly returns full static class strings (e.g., `"bg-red-500/10 text-red-500"`). `SkillIcon` must follow the same pattern.

2. **Export `getColorForName`**: Currently `getColorForName` is a private function in `MCPIcon.tsx` (not exported). Phase A must either export it from `MCPIcon.tsx`, or (preferred) extract it into a shared utility at `src/lib/colors.ts` so both components import from there without cross-feature coupling.

3. **Direct icon imports for Phase A**: Do NOT use `import { icons } from "lucide-react"` for Phase A — that's `import * as index` under the hood and pulls ~1500 icon components into the bundle. Instead, build a lookup map from direct imports of only the ~35 icons in the dictionary. Reserve the `icons` wildcard import for Phase B's icon picker, and lazy-load it.

```typescript
// src/lib/colors.ts — extracted from MCPIcon.tsx

/**
 * Get a consistent color class string for a given name.
 * Returns full Tailwind class strings (e.g., "bg-red-500/10 text-red-500")
 * so they are statically detectable by Tailwind's purge/scan.
 */
export function getColorForName(name: string): string {
  const colors = [
    "bg-red-500/10 text-red-500",
    "bg-orange-500/10 text-orange-500",
    // ... same 16-color palette as MCPIcon.tsx
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}
```

```typescript
// src/components/skills/skillIconMap.ts — add icon component lookup

import {
  GitCommit, GitBranch, GitMerge, Code, Bug, FlaskConical,
  Hammer, Rocket, Recycle, AlignLeft, Eye, BarChart3, Shield,
  Search, FileText, PenTool, Languages, Plug, Database,
  ArrowRightLeft, Container, Activity, Settings, Mail,
  MessageSquare, MessageCircle, Brain, Workflow, Wand2,
  Compass, CheckSquare, Calendar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Direct imports only — no wildcard `icons` import
export const ICON_COMPONENTS: Record<string, LucideIcon> = {
  GitCommit, GitBranch, GitMerge, Code, Bug, FlaskConical,
  Hammer, Rocket, Recycle, AlignLeft, Eye, BarChart3, Shield,
  Search, FileText, PenTool, Languages, Plug, Database,
  ArrowRightLeft, Container, Activity, Settings, Mail,
  MessageSquare, MessageCircle, Brain, Workflow, Wand2,
  Compass, CheckSquare, Calendar,
};
```

```typescript
// src/components/skills/SkillIcon.tsx

import { cn } from "@/lib/utils";
import { getColorForName } from "@/lib/colors";
import { matchSkillIcon, ICON_COMPONENTS } from "./skillIconMap";

interface SkillIconProps {
  name: string;
  overrideIcon?: string;
  size?: "sm" | "md";
}

export function SkillIcon({ name, overrideIcon, size = "md" }: SkillIconProps) {
  const colorClass = getColorForName(name); // Returns "bg-red-500/10 text-red-500" etc.
  const dims = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  const iconName = overrideIcon || matchSkillIcon(name);
  const IconComponent = iconName ? ICON_COMPONENTS[iconName] : null;

  if (IconComponent) {
    // Split colorClass into bg and text parts for separate application
    const [bgClass, textClass] = colorClass.split(" ");
    return (
      <div className={cn(dims, bgClass, "flex shrink-0 items-center justify-center rounded-lg")}>
        <IconComponent className={cn(iconSize, textClass)} />
      </div>
    );
  }

  // Fallback: letter avatar (same pattern as stdio MCPs in MCPIcon.tsx)
  const letter = name.charAt(0).toUpperCase();
  return (
    <div className={cn(
      dims, colorClass,
      "flex shrink-0 items-center justify-center rounded-lg font-semibold"
    )}>
      {letter}
    </div>
  );
}
```

### Icon Override Persistence (Zustand Store)

Key overrides by `path` (the file path to the SKILL.md), not `id`. The `id` field is a hash of `name + source_tool + scope` (see `generate_skill_id` in `src-tauri/src/scanners/skills.rs:247`), so renaming a skill in its frontmatter changes the `id`. The `path` remains stable as long as the file isn't moved on disk — which is the more common case for "I renamed my skill."

```typescript
// src/stores/skillIconStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SkillIconState {
  overrides: Record<string, string>; // skill.path → Lucide icon name
  setOverride: (skillPath: string, iconName: string) => void;
  clearOverride: (skillPath: string) => void;
}

export const useSkillIconStore = create<SkillIconState>()(
  persist(
    (set) => ({
      overrides: {},
      setOverride: (skillPath, iconName) =>
        set((state) => ({
          overrides: { ...state.overrides, [skillPath]: iconName },
        })),
      clearOverride: (skillPath) =>
        set((state) => {
          const { [skillPath]: _, ...rest } = state.overrides;
          return { overrides: rest };
        }),
    }),
    {
      name: "loadout-skill-icons", // localStorage key
    }
  )
);
```

### Lucide Import Strategy

**Phase A (keyword icons):** Use direct named imports for the ~35 icons in the dictionary (e.g., `import { GitCommit, Rocket } from "lucide-react"`). These are tree-shaken normally and add negligible bundle size.

**Phase B (icon picker):** The picker needs access to all ~1500 icons by string name. Use `import { icons } from "lucide-react"` — but note this is backed by `import * as index` internally and pulls the entire icon set (~200KB gzipped). Lazy-load the `IconPicker` component via `React.lazy()` so this cost is only paid when the user actually opens the picker, not on initial page load.

### Files to Create/Modify

```
src/lib/colors.ts                          # New — extract getColorForName() from MCPIcon
src/components/mcps/MCPIcon.tsx            # Modify — import getColorForName from @/lib/colors
src/components/skills/skillIconMap.ts      # New — keyword dictionary + matcher + ICON_COMPONENTS map
src/components/skills/SkillIcon.tsx        # New — icon component
src/components/skills/SkillCard.tsx        # Modify — use SkillIcon instead of Sparkles
src/components/skills/index.ts             # Modify — export SkillIcon
src/stores/skillIconStore.ts               # New — override persistence (Phase B only)
src/components/skills/IconPicker.tsx        # New — lazy-loaded icon picker popover (Phase B only)
```

### Implementation Phases

**Phase A (Core — do this first):**
1. Extract `getColorForName()` from `MCPIcon.tsx` into `src/lib/colors.ts`; update `MCPIcon` to import from there
2. Create `skillIconMap.ts` with keyword dictionary, `matchSkillIcon()`, and `ICON_COMPONENTS` (direct imports only)
3. Create `SkillIcon` component with keyword matching + letter-avatar fallback
4. Replace `Sparkles` in `SkillCard` with `SkillIcon`

**Phase B (User Overrides — can be deferred):**
1. Create `skillIconStore.ts` with Zustand persist
2. Build `IconPicker` popover (grid of icons with search filter)
3. Wire up click-to-change on the skill icon in `SkillCard`

## Test Plan

### Keyword Matching
1. Skill named `commit-helper` → shows `GitCommit` icon
2. Skill named `code-review` → shows `Eye` icon (matches `review`)
3. Skill named `deploy-to-prod` → shows `Rocket` icon
4. Skill named `my-custom-thing` → shows letter avatar "M" with deterministic color
5. Two skills with the same name always show the same icon and color

### No False Positives (token-only matching)
1. Skill named `sprint-planner` → does NOT match `pr` → falls back to letter avatar or another keyword
2. Skill named `maintain-docs` → does NOT match `ai` → matches `doc` instead
3. Skill named `sandbox-setup` → does NOT match `db` → falls back to letter avatar

### Fallback Behavior
1. Skill with no keyword match → shows colored letter avatar (not blank)
2. Letter avatar color is consistent across app restarts
3. Verify the fallback visually matches the stdio MCP letter avatar style

### User Override (Phase B)
1. Click skill icon → icon picker appears
2. Search "rocket" in picker → filters to rocket-related icons
3. Select an icon → skill card updates immediately
4. Restart app → override persists
5. Click "Reset" → reverts to auto-detected icon
6. Override for one skill does not affect others

### Visual Consistency
1. Skill cards on the Skills page show varied, colorful icons instead of uniform Sparkles
2. Icons are legible at 40×40 size
3. Dark mode and light mode both render correctly (using existing color system)

## Dependencies

- Issue 3: Skills Scanner (done — provides `SkillItem` data)
- `lucide-react` (already installed)
- `getColorForName()` from MCPIcon (already implemented, needs extraction to shared utility)

## Notes

- **No AI required**: Pure keyword token matching is fast, deterministic, and works offline. The dictionary can grow over time without any performance concern.
- **No network calls**: Everything runs locally with bundled Lucide icons.
- **Bundle size**: Phase A uses direct imports (~35 icons, tree-shaken, negligible cost). Phase B's icon picker requires the full `icons` wildcard import (~200KB gzipped) — lazy-load the picker component via `React.lazy()` to defer this cost until the user actually opens it.
- **Extensibility**: The keyword dictionary is easy to extend — contributors can add entries without understanding complex code.
- **Shared utility**: Phase A step 1 extracts `getColorForName()` to `src/lib/colors.ts`. Update `MCPIcon.tsx` to import from there in the same PR to avoid two copies.
- **Icon picker UX**: Lucide has ~1500 icons. The picker should paginate or virtualize the grid, and search should filter by icon name. Consider showing "recently used" or "suggested" icons at the top.
