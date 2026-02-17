# Issue 17: MCP Marketplace

**Phase:** 3 (Discovery)
**Status:** Pending

---

## Summary

Add MCP servers to the marketplace experience so users can browse, evaluate, and install MCPs with one click.

Unlike skills discovery (GitHub `SKILL.md` crawling), MCP discovery should be **registry-first**:
- ingest official MCP Registry metadata,
- sync incrementally using pagination + timestamp filters,
- enrich with optional third-party signals,
- audit for security/trust before surfacing as "recommended".

This issue introduces MCP-specific backend ingestion/scoring plus marketplace UI integration.

---

## Acceptance Criteria

### Phase A: MCP Source Ingestion

#### Official Registry Sync
- [ ] Add a standalone MCP ingestion job (outside Tauri app)
- [ ] Pull from official MCP Registry API (`/v0.1/servers`)
- [ ] Support incremental sync via:
  - cursor pagination (`nextCursor`)
  - `updated_since` filter
- [ ] Persist registry status transitions (`active`, `deprecated`, `deleted`)
- [ ] Keep "last successful sync" checkpoint for resumable ingestion
- [ ] Backfill mode for first full import

#### Normalization
- [ ] Normalize package/source metadata (npm, PyPI, Docker, GitHub, URL/custom)
- [ ] Normalize transport/runtime shape (stdio vs HTTP/SSE)
- [ ] Extract installation hints usable by Loadout add/sync flows
- [ ] Track source provenance (`official`, `third_party`, `curated`)

#### Optional Enrichment Sources
- [ ] Add optional enrichment ingest from curated registries/directories
- [ ] Never override official registry identity fields with enrichment data
- [ ] Store enrichment data separately with source + freshness metadata

---

### Phase B: MCP Trust + Audit Pipeline

#### Static Audit (Rule-based)
- [ ] Detect risky install commands or shell chains
- [ ] Flag unknown/suspicious domains in HTTP endpoints
- [ ] Flag broad or sensitive env var requirements (tokens, cloud keys)
- [ ] Flag risky runtime hints (root/sudo/bypass patterns)
- [ ] Generate audit findings with severity (`low`/`medium`/`high`)

#### Supply-Chain Signals
- [ ] Validate package existence and publisher metadata where possible
- [ ] Capture basic maturity signals (release recency, repo stars if available)
- [ ] Flag package typosquat heuristics (near-match names) for review

#### Runtime Health Integration
- [ ] Reuse Issue 6 health testing model for opt-in runtime checks
- [ ] Track latest handshake health result separately from static trust
- [ ] Display "health unknown" by default until explicitly tested

#### Trust Grade
- [ ] Assign marketplace trust grade: `verified` / `review` / `flagged`
- [ ] Keep reasoning payload for each grade for explainability in UI

---

### Phase C: Backend API + Database

#### Database
- [ ] `mcp_servers` table with canonical metadata + status
- [ ] `mcp_audits` table for rule findings + trust grade history
- [ ] `mcp_install_events` table for aggregate install counts
- [ ] Indexes on: name, status, trust_grade, install_count, updated_at

#### API Endpoints
- [ ] `GET /mcps` — paginated MCP list with sort/filter
- [ ] `GET /mcps/:id` — full MCP detail + audit summary
- [ ] `GET /mcps/search?q=` — full-text search
- [ ] `POST /mcps/:id/install` — aggregate install telemetry
- [ ] `POST /mcps/:id/test` (optional proxy) — hook into existing health test flow

---

### Phase D: Marketplace UI Integration

#### Unified Marketplace Shell
- [ ] Marketplace adds content-type switch: `Skills` | `MCPs` | `Agents`
- [ ] Preserve shared UX patterns (search, filters, sort, card/list views)

#### MCP Browse View
- [ ] MCP cards display: name, description, source, status, trust badge, install count
- [ ] Show transport/runtime details (stdio/http) and compatibility by tool
- [ ] Show deprecated/deleted status prominently
- [ ] Filter by trust grade, status, transport, tool compatibility

#### MCP Install Flow
- [ ] Click "Install" pre-fills existing Add MCP dialog/write flow (Issue 5)
- [ ] Preview exact command/args/env mapping before write
- [ ] Optional "Test after install" hook into Issue 6
- [ ] Emit anonymous install telemetry

#### Offline/Error States
- [ ] Cache MCP marketplace index in local store
- [ ] Offline: show cached data with "stale" indicator
- [ ] API failures: retry UX and partial rendering support

---

## Technical Details

### Sync Strategy

1. Full sync once (paged by cursor)
2. Save checkpoint `{last_updated_since, last_cursor}`
3. Incremental runs use `updated_since=<checkpoint>`
4. Continue paging with `cursor` until exhausted
5. Upsert new/changed items, apply status updates, record sync watermark

### Proposed Types

```typescript
interface MarketplaceMCP {
  mcpId: string;
  name: string;
  description: string;
  source: "official" | "third_party" | "curated";
  status: "active" | "deprecated" | "deleted";
  trustGrade: "verified" | "review" | "flagged";
  transport: "stdio" | "http" | "sse" | "unknown";
  installCount: number;
  compatibleTools: ("claude" | "codex" | "gemini" | "cursor")[];
  lastUpdatedAt: string;
}
```

### Files to Create/Modify

```
# Backend service
marketplace/
├── mcp-ingest/
│   ├── registry-client.ts
│   ├── incremental-sync.ts
│   └── normalizer.ts
├── mcp-audit/
│   ├── static-rules.ts
│   ├── supply-chain.ts
│   └── trust-grade.ts
├── api/
│   └── mcp-routes.ts
└── schema-mcp.sql

# Tauri app
src/
├── components/marketplace/MCPCard.tsx
├── components/marketplace/MCPFilters.tsx
├── lib/api/marketplace.ts              # add MCP endpoints
└── types/index.ts                      # add MarketplaceMCP types
```

---

## Test Plan

1. Run full MCP ingest from empty DB -> records imported with canonical IDs
2. Run incremental sync with `updated_since` -> only changed/new records processed
3. Registry item marked deprecated -> UI shows deprecated badge and warning
4. Registry item marked deleted -> item hidden from default browse, visible in admin/debug
5. Static audit flags suspicious endpoint -> trust grade downgraded to `review`/`flagged`
6. Install MCP from marketplace -> existing write flow creates tool config entries
7. Optional test flow -> health result stored/displayed without auto-running commands
8. Offline browse -> cached MCP data visible with stale indicator

---

## Dependencies

- Issue 2: MCP Registry (done)
- Issue 5: Sync MCP + Skill (done, reuse write flow)
- Issue 6: MCP Health Testing (pending, runtime validation)
- Issue 16: Skills Marketplace (pending, shared marketplace shell/API patterns)

---

## Notes

- Discovery model differs from skills: **registry-first**, not GitHub-file-first.
- Keep official registry metadata authoritative.
- Treat enrichment signals as advisory, not source of truth.
- Never execute untrusted commands automatically during ingestion/audit.
