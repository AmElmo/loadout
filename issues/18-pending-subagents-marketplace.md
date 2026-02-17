# Issue 18: Subagents Marketplace

**Phase:** 3 (Discovery)
**Status:** Pending

---

## Summary

Add subagents (Agents) to the marketplace so users can discover and install reusable agent definitions from community sources.

Subagent discovery should not follow MCP's registry-first model because there is no strong canonical public registry yet. The right approach is:
- curated-source indexing first,
- targeted GitHub discovery for agent file patterns,
- frontmatter/body parsing and quality scoring,
- safety scanning before installation.

This issue adds subagent ingestion/scoring and integrates it into the same marketplace surface as Skills and MCPs.

---

## Acceptance Criteria

### Phase A: Agent Discovery Pipeline

#### Source Strategy
- [ ] Build curated source list (official docs/examples + high-quality repos)
- [ ] Add GitHub discovery for likely agent paths:
  - `.claude/agents/*.md`
  - `.gemini/agents/*.md`
  - `agents/*.md` (curated repos only)
- [ ] Support incremental scanning by commit timestamp/hash
- [ ] Keep source attribution (`official`, `curated`, `community`)

#### Parsing + Extraction
- [ ] Parse YAML frontmatter + markdown body
- [ ] Extract key fields: `name`, `description`, `tools`, `model`, `maxTurns`, `permissionMode`
- [ ] Support plain markdown fallback with filename-based identity
- [ ] Infer compatible tools from path + metadata:
  - Claude agents paths -> Claude
  - Gemini agents paths -> Gemini
  - Codex -> not supported (explicitly marked)

#### Dedup + Canonicalization
- [ ] Deduplicate by normalized content hash
- [ ] Pick canonical source based on trust rank (`official > curated > community`) then stars
- [ ] Keep alias mapping for duplicate copies/forks

---

### Phase B: Agent Quality + Safety Scoring

#### Structural Quality (Rule-based)
- [ ] Frontmatter presence and required fields quality
- [ ] Clarity of invocation conditions in description
- [ ] Prompt specificity and actionable steps
- [ ] Reasonable defaults for `maxTurns` and permission mode
- [ ] Structural score 0-100

#### AI Quality Review (Optional)
- [ ] LLM-based rubric for clarity/completeness/task fit
- [ ] Hash-gated scoring (re-score only on content change)
- [ ] Gate expensive scoring behind structural threshold

#### Safety Audit
- [ ] Flag instructions that push unsafe permission escalation by default
- [ ] Flag prompt-injection style patterns ("ignore previous instructions", hidden exfiltration cues)
- [ ] Flag suspicious external command guidance or secret-handling anti-patterns
- [ ] Assign safety grade: `verified` / `review` / `flagged`

---

### Phase C: Backend API + Database

#### Database
- [ ] `agents_marketplace` table with parsed fields + provenance
- [ ] `agent_scoring_history` table for quality/safety score history
- [ ] `agent_install_events` table for aggregate install counts
- [ ] Indexes on: name, score, safety_grade, source_type, compatible_tools

#### API Endpoints
- [ ] `GET /agents` — paginated list with filters/sort
- [ ] `GET /agents/:id` — full agent definition + metadata
- [ ] `GET /agents/search?q=` — search by name/description/tools
- [ ] `POST /agents/:id/install` — aggregate install telemetry

---

### Phase D: Marketplace UI Integration

#### Unified Marketplace Shell
- [ ] Marketplace content-type switch supports `Skills` | `MCPs` | `Agents`
- [ ] Shared search/filter UX with type-specific filter extensions

#### Agent Browse View
- [ ] Agent cards show: name, description, source, quality badge, safety badge, install count
- [ ] Show model/tools metadata at a glance
- [ ] Show compatibility badges (Claude, Gemini; Codex marked unsupported)
- [ ] Filter by source type, compatibility, score, recency

#### Agent Install Flow
- [ ] Click "Install" reuses `install_agent_to_tools` flow from Issue 10
- [ ] Show full preview (frontmatter + body) before install
- [ ] Let user choose scope (user/project) and target tools
- [ ] Emit anonymous install telemetry

#### Offline/Error States
- [ ] Cache agent marketplace index locally
- [ ] Offline: cached results + stale indicator
- [ ] Per-item fetch failures handled without breaking whole list

---

## Technical Details

### Discovery Heuristics

- Prioritize repositories that already match known agent conventions
- Restrict broad GitHub code search to avoid indexing arbitrary prompts as "agents"
- Record confidence score for each detected agent candidate

### Proposed Types

```typescript
interface MarketplaceAgent {
  agentId: string;
  name: string;
  description: string;
  sourceType: "official" | "curated" | "community";
  qualityScore: number;
  safetyGrade: "verified" | "review" | "flagged";
  installCount: number;
  model: string | null;
  tools: string | null;
  compatibleTools: ("claude" | "gemini" | "codex")[];
  lastUpdatedAt: string;
}
```

### Files to Create/Modify

```
# Backend service
marketplace/
├── agent-ingest/
│   ├── github-discovery.ts
│   ├── parser.ts
│   └── deduplicator.ts
├── agent-scoring/
│   ├── structural.ts
│   ├── ai-quality.ts
│   └── safety.ts
├── api/
│   └── agent-routes.ts
└── schema-agents.sql

# Tauri app
src/
├── components/marketplace/AgentCard.tsx
├── components/marketplace/AgentFilters.tsx
├── lib/api/marketplace.ts              # add Agent endpoints
└── types/index.ts                      # add MarketplaceAgent types
```

---

## Test Plan

1. Discover agents from curated repo set -> parsed fields populated correctly
2. Parse frontmatter agent + plain markdown fallback agent -> both supported
3. Duplicate agent content across repos -> deduplicator picks canonical source correctly
4. Agent with risky permission guidance -> flagged by safety audit
5. Browse Agents tab -> cards render compatibility badges correctly
6. Install agent from marketplace -> writes `.claude/agents`/`.gemini/agents` files via existing sync path
7. Attempt Codex target -> disabled with explicit "not supported" indicator
8. Offline mode -> cached agent results still browsable

---

## Dependencies

- Issue 10: Subagents Scanner + Sync (pending, provides parser/write/install primitives)
- Issue 16: Skills Marketplace (pending, shared marketplace shell/API patterns)
- Issue 17: MCP Marketplace (pending, aligns unified multi-type marketplace architecture)

---

## Notes

- UI label should remain "Agents" for consistency with existing product language.
- Subagent ecosystems are fragmented today; curated-source governance is critical.
- Keep discovery confidence and provenance visible to avoid over-trusting weak sources.
