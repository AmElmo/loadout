# Issue 16: Skills Marketplace

**Phase:** 3 (Discovery)
**Status:** Pending
**Supersedes:** Issue 9 (Browse & Install from Skill Registry)

---

## Summary

Build a full skills marketplace: a backend pipeline that discovers SKILL.md files on GitHub, scores them for quality and security, stores them in a database, and serves them through an API. The Tauri app consumes this API to let users browse, search, and install community skills. A companion web page provides the same browsing experience outside the app.

This replaces Issue 9's assumption of consuming an external registry API. Instead, we build and own the entire pipeline: scraper, scoring, database, API, and both native + web frontends.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER-FACING                           │
│                                                         │
│   Native App (Tauri)          Web Page (same data)      │
│   ┌───────────────┐          ┌───────────────┐          │
│   │ Browse/Search  │          │ Browse/Search  │         │
│   │ Quality Scores │          │ Quality Scores │         │
│   │ 1-Click Install│          │ Copy Command   │         │
│   │ Install Stats  │          │ Install Stats  │         │
│   └───────┬───────┘          └───────┬───────┘          │
│           │                          │                   │
└───────────┼──────────────────────────┼───────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                           │
│                                                         │
│   Skills Database (SQLite via D1 or Postgres)           │
│   ┌─────────────────────────────────────────┐           │
│   │ skill_id, name, description, repo_url,  │           │
│   │ author, stars, forks, last_updated,     │           │
│   │ quality_score, security_grade,          │           │
│   │ install_count, category, role_tags      │           │
│   └─────────────────────────────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
            ▲                          ▲
            │                          │
┌───────────┼──────────────────────────┼───────────────────┐
│           │     PIPELINE (Cron)      │                   │
│           │                          │                   │
│   ┌───────┴───────┐   ┌─────────────┴─────────┐        │
│   │ GitHub Scraper │   │ Quality + Security    │        │
│   │ (Daily)        │   │ Scorer (On new skills)│        │
│   └───────────────┘   └───────────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Phase A: GitHub Scraper Pipeline

#### Discovery (daily cron)
- [ ] Use GitHub Code Search API: `filename:SKILL.md` with YAML frontmatter pattern
- [ ] Crawl known mega-repos directly via Contents API (anthropics/skills, alirezarezvani/claude-skills, VoltAgent/awesome-agent-skills, coreyhaines31/marketingskills, obra/superpowers)
- [ ] For each result, fetch the raw SKILL.md content
- [ ] Also fetch the repo tree listing for the skill's directory (siblings of SKILL.md) to detect supporting files (scripts/, references/, templates/) — needed for structural scoring and security scanning
- [ ] Support incremental scans (only fetch new/updated since last run)

#### Parsing
- [ ] Extract YAML frontmatter (name, description)
- [ ] Extract full markdown body
- [ ] Pull repo-level metadata via GitHub REST API: stars, forks, last commit, contributor count, license, topics
- [ ] Derive compatible agents from the skill's directory path context:
  - Found under `.claude/skills/` or `.claude/commands/` → Claude Code
  - Found under `.agents/skills/` or `.codex/skills/` → Codex
  - Found under `.gemini/skills/` → Gemini
  - Found under a generic `skills/` directory → all agents (standard SKILL.md format)
  - Also check repo topics for agent-specific tags (e.g., `claude-code`, `cursor`, `codex`)

#### Deduplication
- [ ] Hash SKILL.md content to detect duplicates across forks
- [ ] Keep the version from the repo with highest stars (canonical source)

#### Licensing
- [ ] Only index skills from repos with an OSI-approved license (MIT, Apache-2.0, BSD, ISC, etc.) or no license (treated as permissive for display, with a "No license" indicator)
- [ ] Store license type in database; display on skill cards
- [ ] Skills from repos with copyleft licenses (GPL, AGPL) are indexed but flagged — raw content is not served via API, only metadata + link to source repo
- [ ] Include license attribution in the skill detail view when serving raw content

#### Storage
- [ ] Upsert into database with all metadata
- [ ] Flag new/changed skills for quality scoring pipeline

#### GitHub API Budget

| API | Rate Limit | Cost |
|-----|-----------|------|
| Search API (code) | 30 requests/min (authenticated) | Free |
| REST API (repo metadata) | 5,000 requests/hour (authenticated) | Free |
| Contents API (fetch SKILL.md) | Part of 5,000/hour budget | Free |

Initial scrape of the full universe (~10,000-20,000 unique skills) takes a few hours. Daily incremental scans need ~100-200 API calls total.

---

### Phase B: Quality & Security Scoring

#### Structural Score (rule-based, free)
- [ ] Has YAML frontmatter with name + description? (+1)
- [ ] Description includes trigger phrases / "use when"? (+1)
- [ ] Has examples section? (+1)
- [ ] Has clear step-by-step instructions? (+1)
- [ ] Uses progressive disclosure (references separate files)? (+1)
- [ ] Total instructions < 500 lines (not bloated)? (+1)
- [ ] Has supporting files (scripts/, references/, templates/)? (+1) — derived from repo tree listing fetched in Phase A, not from SKILL.md content
- [ ] Score: 0-7, normalized to 0-100

#### Author Reputation Score (rule-based, free)
- [ ] Official team (Anthropic, Vercel, Stripe, Cloudflare, Google, etc.) → 100
- [ ] Repo 1000+ stars → 80
- [ ] Repo 100+ stars → 60
- [ ] Repo 10+ stars → 40
- [ ] Repo 2+ stars → 20
- [ ] Below 2 stars → 0

#### Freshness Score (rule-based, free)
- [ ] Updated in last 30 days → 100
- [ ] Updated in last 90 days → 75
- [ ] Updated in last 6 months → 50
- [ ] Updated in last year → 25
- [ ] Older than 1 year → 0

#### AI Quality Score (LLM-based)
- [ ] Use Claude Code headless mode with Sonnet (`claude -p --model sonnet --output-format json`)
- [ ] Evaluate: clarity, specificity, applicability, trigger quality, completeness (each 0-20, total 0-100)
- [ ] Gate on structural score: skip AI scoring if structural score < 30
- [ ] Hash-gated: only re-score when content changes
- [ ] Run overnight to avoid interfering with daytime Opus usage

#### Security Scanning
- [ ] Rule-based scanner checks SKILL.md content and bundled scripts (fetched via repo tree listing from Phase A) for:
  - URLs/endpoints to unknown domains (potential exfiltration)
  - `curl`, `wget`, `fetch` commands to unknown domains
  - References to environment variables, API keys, tokens
  - Base64 encoded content (obfuscation)
  - Instructions to ignore previous instructions (prompt injection)
- [ ] Assign security grade: Verified / Review / Flagged
- [ ] Optional: integrate Cisco skill-scanner static + behavioral analyzers

#### Composite Score Formula
```
final_score = (
    structural_score × 0.25 +
    author_reputation × 0.20 +
    freshness_score  × 0.15 +
    ai_quality_score × 0.30 +
    log(install_count + 1) × 0.10  # normalized 0-100
)
```

---

### Phase C: Backend API + Database

#### Database Schema
- [ ] `skills` table: skill_id, name, description, repo_url, author, stars, forks, last_updated, content_hash, quality_score, security_grade, install_count, category, role_tags, raw_content
- [ ] `scoring_history` table: skill_id, score_type, score, scored_at, content_hash
- [ ] Indexes on: name, quality_score, install_count, category, role_tags

#### API Endpoints
- [ ] `GET /skills` — paginated list with sort/filter (by score, category, role, freshness)
- [ ] `GET /skills/:id` — full skill detail including raw SKILL.md content
- [ ] `GET /skills/search?q=` — full-text search on name + description + tags
- [ ] `GET /skills/collections` — role-based collections with counts
- [ ] `POST /skills/:id/install` — anonymous install telemetry (no user ID, just aggregate count)
- [ ] `GET /health` — service health check

#### Hosting
- [ ] Cloudflare Workers + D1 (SQLite) recommended for cost ($0-5/mo)
- [ ] Alternative: Railway or Fly.io with Postgres if more flexibility needed

---

### Phase D: Marketplace UI in Tauri App

#### Browse View
- [ ] "Marketplace" tab/page accessible from main navigation
- [ ] Default view: role-based collections (not a giant list)
  - Product Manager, Software Engineer, UX/UI Designer, Content Marketing, Sales, Customer Success, Operations
  - "Browse All (N skills)" link
  - Trending This Week, Staff Picks, Recently Added, Official sections
- [ ] Search bar with full-text search on name + description + tags
- [ ] Filter by category/role tag
- [ ] Sort by: quality score, install count, freshness, stars

#### Skill Card
- [ ] Name + 1-line description
- [ ] Quality badge (S/A/B/C rank from composite score)
- [ ] Security badge (Verified / Review / Flagged)
- [ ] Install count
- [ ] Source repo + stars
- [ ] Compatible agents (Claude Code, Cursor, Codex, etc.)
- [ ] "Install" button (1-click)

#### Install Flow
- [ ] Click "Install" → fetches full SKILL.md content from API
- [ ] Show preview with tool selector (reuse existing InstallSkillDialog from Issue 5)
- [ ] Installs to selected tools using existing write infrastructure
- [ ] Sends anonymous install telemetry event to backend API
- [ ] Shows success confirmation
- [ ] Skill appears in local skills list after refresh

#### Offline/Error States
- [ ] Cache marketplace index locally via `tauri-plugin-store` for fast browsing
- [ ] No internet → show cached results or "Marketplace unavailable" message
- [ ] API error → show error with retry
- [ ] Skill fetch fails → show error on specific skill

---

### Phase E: Install Telemetry

- [ ] On skill install from marketplace, send anonymous event: `{skill_id, timestamp, agent_type}`
- [ ] No user ID, no device ID — aggregate counts only
- [ ] API increments `install_count` in database
- [ ] Surface as "installed X times" on skill cards
- [ ] Batch pending events and retry on network failure

---

### Phase F: Web Companion Page

- [ ] Standalone web page consuming the same backend API
- [ ] Browse/search skills with same data as native app
- [ ] Quality scores, security badges, install counts displayed
- [ ] "Copy command" instead of 1-click install (no native write access)
- [ ] SEO-friendly for discoverability (server-rendered or static)

---

## Technical Details

### Phase A: Scraper Implementation

The scraper runs as a standalone script/service, not inside the Tauri app.

```bash
# GitHub Code Search for SKILL.md files
curl -H "Authorization: token $GITHUB_PAT" \
  "https://api.github.com/search/code?q=filename:SKILL.md"
```

Known mega-repos to crawl directly:
- `anthropics/skills`
- `alirezarezvani/claude-skills`
- `VoltAgent/awesome-agent-skills`
- `coreyhaines31/marketingskills`
- `obra/superpowers`

### Phase B: AI Scoring Pipeline

Uses Claude Code headless mode with Sonnet to score skills at $0 incremental cost (existing Claude Max subscription).

```bash
# Score a single skill
cat skill.md | claude -p \
    "$(cat scoring-prompt.txt)" \
    --model sonnet \
    --output-format json \
    --dangerously-skip-permissions
```

**Scoring prompt template:**
```text
You are evaluating an AI agent skill file (SKILL.md). Read the content provided via stdin
and score it on 5 dimensions. Return ONLY valid JSON, no markdown fences, no other text.

Dimensions (each 0-20, total 0-100):
1. clarity — How clear and unambiguous are the instructions?
2. specificity — Concrete steps, patterns, examples? Or vague hand-waving?
3. applicability — Does this solve a real, practical task?
4. trigger_quality — Is the description/trigger section clear about when to activate?
5. completeness — Edge cases, errors, sufficient context?

Return exactly this JSON shape:
{"clarity":N,"specificity":N,"applicability":N,"trigger_quality":N,"completeness":N,"total":N,"rationale":"1-2 sentence summary"}
```

**Token budget:** ~2,700 tokens per skill (2,500 input + 200 output). 10,000 skills = ~27M tokens total overnight.

**Rate limit note:** Sonnet pool is separate from Opus. Daytime coding on Opus is unaffected.

**Alternative (TypeScript):** Claude Agent SDK for tighter integration:
```typescript
import { query } from "@anthropic-ai/claude-code";

for await (const message of query({
  prompt: `${SCORING_PROMPT}\n\nSKILL.md content:\n${skillContent}`,
  options: { model: "sonnet", allowedTools: [] }
})) { /* collect response */ }
```

Start with bash script to validate the approach. Migrate to Agent SDK when building the integrated backend.

### Phase C: Database Schema

```sql
CREATE TABLE skills (
    skill_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repo_url TEXT NOT NULL,
    repo_owner TEXT,
    author TEXT,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    license TEXT,
    last_commit_at TEXT,
    content_hash TEXT NOT NULL,
    raw_content TEXT,
    structural_score INTEGER,
    author_score INTEGER,
    freshness_score INTEGER,
    ai_quality_score INTEGER,
    composite_score INTEGER,
    security_grade TEXT DEFAULT 'review',  -- 'verified', 'review', 'flagged'
    install_count INTEGER DEFAULT 0,
    category TEXT,
    role_tags TEXT,  -- JSON array
    topics TEXT,     -- JSON array from GitHub
    compatible_agents TEXT,  -- JSON array: ["claude", "codex", "gemini", "cursor", etc.]
    has_supporting_files BOOLEAN DEFAULT FALSE,  -- TRUE if repo tree has sibling dirs (scripts/, etc.)
    scraped_at TEXT NOT NULL,
    scored_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_skills_composite ON skills(composite_score DESC);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_name ON skills(name);
```

### Phase D: Tauri App Integration

#### Frontend Types

```typescript
// src/types/index.ts
interface MarketplaceSkill {
  skillId: string;
  name: string;
  description: string;
  repoUrl: string;
  author: string;
  stars: number;
  forks: number;
  lastCommitAt: string;
  compositeScore: number;
  securityGrade: "verified" | "review" | "flagged";
  installCount: number;
  category: string;
  roleTags: string[];
  compatibleAgents: string[];  // ["claude", "codex", "gemini", "cursor", etc.]
}

interface MarketplaceCollection {
  role: string;
  count: number;
  topSkills: MarketplaceSkill[];
}

interface MarketplaceSearchResult {
  skills: MarketplaceSkill[];
  total: number;
  page: number;
  pageSize: number;
}
```

#### API Wrapper

```typescript
// src/lib/api/marketplace.ts
const API_BASE = "https://api.loadout.dev"; // or env-configured

export async function fetchCollections(): Promise<MarketplaceCollection[]> { ... }
export async function searchSkills(query: string, filters: object): Promise<MarketplaceSearchResult> { ... }
export async function fetchSkillDetail(id: string): Promise<MarketplaceSkill & { rawContent: string }> { ... }
export async function reportInstall(skillId: string, agentType: string): Promise<void> { ... }
```

#### Caching

```typescript
import { Store } from "@tauri-apps/plugin-store";
const store = new Store("marketplace-cache");
await store.set("collections", { data: collections, fetchedAt: Date.now() });
// Serve from cache if < 1 hour old, refresh in background
```

### Files to Create/Modify

```
# Backend service (separate repo or monorepo subfolder)
marketplace/
├── scraper/
│   ├── github-scraper.ts         # GitHub Code Search + Contents API
│   ├── parser.ts                 # SKILL.md frontmatter + metadata extraction
│   └── deduplicator.ts           # Content-hash dedup across forks
├── scoring/
│   ├── structural.ts             # Rule-based structural scoring
│   ├── reputation.ts             # Author/repo reputation scoring
│   ├── freshness.ts              # Last-commit freshness scoring
│   ├── ai-scorer.sh              # Claude Code headless scoring script
│   ├── scoring-prompt.txt        # Scoring prompt template
│   └── security.ts               # Rule-based security scanner
├── api/
│   ├── worker.ts                 # Cloudflare Worker (or Express)
│   └── routes.ts                 # API route handlers
├── schema.sql                    # Database schema
└── wrangler.toml                 # Cloudflare config (if using Workers + D1)

# Tauri app changes (this repo)
src/
├── pages/Marketplace.tsx                    # New page
├── components/marketplace/
│   ├── MarketplaceBrowser.tsx               # Main browse view with collections
│   ├── MarketplaceSkillCard.tsx             # Individual skill card
│   ├── MarketplaceSearch.tsx                # Search + filter bar
│   ├── CollectionGrid.tsx                   # Role-based collection tiles
│   ├── QualityBadge.tsx                     # S/A/B/C rank display
│   ├── SecurityBadge.tsx                    # Verified/Review/Flagged
│   └── index.ts                             # Barrel export
├── lib/api/marketplace.ts                   # API wrapper
├── types/index.ts                           # Add marketplace types

# Web companion (separate repo or subfolder)
web/
├── src/
│   ├── pages/                    # Browse, search, skill detail pages
│   └── components/               # Reusable UI (can share with Tauri via package)
```

---

## Test Plan

### Phase A: Scraper
1. Run scraper against GitHub Code Search → verify SKILL.md files discovered
2. Parse 10+ diverse SKILL.md files → frontmatter + metadata extracted correctly
3. Create two repos with identical SKILL.md content → deduplicator keeps higher-star version
4. Run incremental scan after initial → only new/updated skills fetched
5. Verify repo metadata (stars, forks, license, topics) populated correctly

### Phase B: Scoring
1. Score a well-structured skill (frontmatter, examples, steps) → structural score > 70
2. Score a minimal skill (no frontmatter, no examples) → structural score < 30
3. Score a skill from anthropics/ repo → author reputation = 100
4. Score a skill updated today → freshness = 100
5. Run AI scorer on 10 skills → valid JSON responses with scores 0-100
6. Verify structural score < 30 gates AI scoring (skipped)
7. Re-score unchanged skill → hash match, scoring skipped
8. Run security scanner on skill with `curl` to unknown domain → flagged
9. Run security scanner on clean skill → verified

### Phase C: API
1. `GET /skills` → paginated list sorted by composite score
2. `GET /skills/search?q=commit` → returns matching skills
3. `GET /skills/:id` → full detail with raw SKILL.md content
4. `GET /skills/collections` → role-based collections with counts
5. `POST /skills/:id/install` → install count incremented
6. API returns proper error codes for missing skills, bad queries

### Phase D: Marketplace UI
1. Open Marketplace page → role-based collections displayed
2. Click a collection → filtered list of skills for that role
3. Search "commit" → matching skills shown
4. Skill card shows: name, description, quality badge, security badge, install count, stars
5. Click "Install" → preview dialog with tool selector
6. Install completes → skill appears in local Skills list
7. No internet → cached results shown or "unavailable" message
8. API error → error state with retry button

### Phase E: Telemetry
1. Install a skill from marketplace → install count increments on backend
2. Install while offline → event queued, sent when online
3. Verify no user ID or device ID in telemetry payload

### Phase F: Web Page
1. Browse skills → same data as native app
2. Search works → returns same results as API
3. Skill detail shows quality/security badges
4. "Copy command" button works (no Install button on web)

---

## Dependencies

- Issue 5: Sync MCP + Skill (write infrastructure for install flow) — done
- Issue 7: Import from URL (for fetching SKILL.md content from GitHub URLs)
- Issue 8: AI-Assisted Skill Creation (shared CLI spawning infrastructure for AI scoring)
- Supersedes Issue 9: Browse & Install from Skill Registry

---

## Cost Summary

### Monthly Running Costs (Steady State)

| Component | Cost | Notes |
|-----------|------|-------|
| GitHub API scraping | $0 | Free with PAT |
| Structural / reputation / freshness scoring | $0 | Rule-based |
| AI quality scoring (incremental) | $0 | Claude Code Sonnet (existing subscription) |
| Security scanning (static) | $0 | Rule-based |
| Database + API hosting | $5-20/mo | Cloudflare Workers + D1 or small VPS |
| **Total** | **$5-20/mo** | |

### One-Time Initial Costs

| Component | Cost | Notes |
|-----------|------|-------|
| Initial full scrape + AI scoring | $0 | Overnight run on Sonnet |
| Initial security scan | $0 | Static analysis |

---

## Notes

- **Start narrow**: Scrape top 20 repos + their forks first, expand later. Don't index 200K skills day one — most are junk.
- **Score lazily**: Only AI-score the top 2,000-3,000 skills (from repos with 10+ stars). Score lower-quality repos on demand (first search hit or first install).
- **Cache aggressively**: SKILL.md content rarely changes. Hash the content, only re-score on hash change.
- **Structural score as gate**: If structural score < 30, skip AI scoring entirely.
- **Run overnight**: Schedule AI scoring during off-hours when Opus development sessions are inactive.
- **Community signal as filter**: Once telemetry is live, only AI-score skills that get at least 1 install.
- **Monitor quota**: Check Sonnet usage after initial runs. If tighter than expected, reduce parallelism or add longer sleep intervals.
- **Fallback**: If scoring volume exceeds Sonnet subscription quota, fall back to Haiku Batch API at ~$0.00175/skill.
- **Cisco skill-scanner**: Consider integrating its static + behavioral analyzers (Apache 2.0) for deeper security scanning after MVP.
- **Web companion**: Could be a simple static site (Astro, Next.js) consuming the same API. SEO matters for discoverability.
- **This is the moat**: The unique combo of native app install telemetry + AI scoring + security scanning + role-based curation — nobody else has all four.
