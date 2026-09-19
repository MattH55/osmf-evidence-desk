# OSMF Evidence Desk — MVP ticket list

Epic: **Evidence Desk MVP**  
Depends on: Evidence Desk product brief; Shared Evidence Graph dump from `MattH55/osmf-evidence-graph` (EG-1/EG-2 on main)  
Default labels: `evidence-desk`, `mvp`  
Suggested milestones: **ED-M1 Foundations** → **ED-M2 Entity desk** → **ED-M3 Search + export** → **ED-M4 Network polish** → **ED-M5 Soft launch**

Open product decisions (resolve in ED-0 or first PR):
- Host: `desk.opensourcemed.info` vs hub path
- Repo: `MattH55/osmf-evidence-desk` (recommended) vs app inside evidence-graph
- Soft-launch on `is_example` data vs wait for curated published claims

---

## ED-0 — Repo, hosting, and dump source decision
**Milestone:** ED-M1  
**Priority:** P0  
**Estimate:** S  

### Description
Create (or designate) the Desk repo, record hosting target, and document how Desk consumes the evidence-graph dump (git submodule, npm package, CI fetch from graph `main` / release URL, or vendored copy).

### Acceptance criteria
- [ ] Repo exists and is linked from this ticket list / epic
- [ ] ADR or short `DECISIONS.md`: host + dump ingestion approach
- [ ] README stub with local run instructions placeholder

### Blocked by
—

---

## ED-1 — App scaffold (static-first)
**Milestone:** ED-M1  
**Priority:** P0  
**Estimate:** M  

### Description
Scaffold a lean site (Astro, Vite+React, or Next static export — pick one and stick to it). TypeScript preferred. Deployable to Vercel.

### Acceptance criteria
- [ ] `npm run dev` and `npm run build` work
- [ ] Base layout: header, footer, content region
- [ ] Global “Not medical advice” footer on every page
- [ ] `is_example` banner component ready (wired in ED-2)

### Blocked by
ED-0  

---

## ED-2 — Ingest evidence-graph dump at build time
**Milestone:** ED-M1  
**Priority:** P0  
**Estimate:** M  

### Description
Build step loads `latest.json` (or per-entity files), validates minimally against expected shape, and produces an in-repo or generated index Desk can render.

### Acceptance criteria
- [ ] Documented dump path / fetch step
- [ ] Build fails if dump missing or `schema_version` unsupported
- [ ] `meta.is_example` exposed to UI
- [ ] Seed conditions from dump available to pages

### Blocked by
ED-1  

---

## ED-3 — Tier legend + uncertainty chrome
**Milestone:** ED-M1  
**Priority:** P0  
**Estimate:** S  

### Description
Shared UI for evidence tiers A–D, limitations visibility rules (C/D always inline), claim status chips (draft/published/superseded).

### Acceptance criteria
- [ ] Tier badge component with accessible labels
- [ ] C/D claims never hide `limitations` behind a click
- [ ] About blurb for tiers reusable on `/about`

### Blocked by
ED-1  

---

## ED-4 — Entity page (core desk view)
**Milestone:** ED-M2  
**Priority:** P0  
**Estimate:** M  

### Description
Stable route `/entity/:id` (URL-encode or slugify `osmf:…` safely). Show summary, aliases, external IDs, claims in/out, one-hop related entities, outbound network URLs.

### Acceptance criteria
- [ ] All seed entities in dump resolve to a page
- [ ] Claims show tier, sources, limitations, reviewed_at, status
- [ ] Superseded claims in collapsed history
- [ ] 404 for unknown IDs
- [ ] Deep link stable across builds for same entity id

### Blocked by
ED-2, ED-3  

---

## ED-5 — Claim page
**Milestone:** ED-M2  
**Priority:** P0  
**Estimate:** S  

### Description
`/claim/:id` detail view with subject/predicate/object links back to entity pages.

### Acceptance criteria
- [ ] All claims in dump resolvable
- [ ] Subject and object (when entity) are links
- [ ] Sources rendered as links (DOI/PMID/NCT/URL)
- [ ] License displayed

### Blocked by
ED-4  

---

## ED-6 — Home + featured seed conditions
**Milestone:** ED-M2  
**Priority:** P1  
**Estimate:** S  

### Description
Homepage explains Desk in one screen, lists five seed conditions, links to `/about` and dump download.

### Acceptance criteria
- [ ] Featured conditions from `meta.seed_conditions` or config
- [ ] Clear CTA into search
- [ ] Example-data banner when `is_example: true`

### Blocked by
ED-4  

---

## ED-7 — About / cite / license
**Milestone:** ED-M2  
**Priority:** P1  
**Estimate:** S  

### Description
`/about` — how tiers work, how to cite graph IDs + Desk URLs, license, link to SCHEMA.md / evidence-graph repo.

### Acceptance criteria
- [ ] Tier definitions match evidence-graph `SCHEMA.md`
- [ ] Citation examples for entity + dump date
- [ ] Not-advice policy stated plainly

### Blocked by
ED-3  

---

## ED-8 — Client search (entity-first)
**Milestone:** ED-M3  
**Priority:** P0  
**Estimate:** M  

### Description
Compile-time search index (FlexSearch/MiniSearch/etc.) over entity labels + aliases. `/search?q=` results grouped by type.

### Acceptance criteria
- [ ] Search from header + homepage
- [ ] Matches aliases (e.g. PASC → Long COVID)
- [ ] Empty state with suggestions
- [ ] No claim full-text required for MVP (optional stretch)

### Blocked by
ED-2, ED-6  

---

## ED-9 — Export CSV for entity claims
**Milestone:** ED-M3  
**Priority:** P0  
**Estimate:** S  

### Description
On entity page: download CSV of claims (id, subject, predicate, object, tier, sources, reviewed_at, status).

### Acceptance criteria
- [ ] CSV downloads with stable columns
- [ ] Only claims involving that entity (in or out)
- [ ] Works without auth

### Blocked by
ED-4  

---

## ED-10 — Export BibTeX from sources
**Milestone:** ED-M3  
**Priority:** P1  
**Estimate:** S  

### Description
Generate BibTeX entries from claim sources with DOI/PMID where present; skip or stub non-bibliographic sources cleanly.

### Acceptance criteria
- [ ] BibTeX download on entity page
- [ ] DOI/PMID mapped to usable entries
- [ ] Documented limitations for url/osmf_page-only sources

### Blocked by
ED-4  

---

## ED-11 — Cite-this-entity snippet
**Milestone:** ED-M3  
**Priority:** P1  
**Estimate:** S  

### Description
Copy button: graph ID, Desk URL, dump `generated_at` / schema version.

### Acceptance criteria
- [ ] One-click copy on entity page
- [ ] Format documented on `/about`

### Blocked by
ED-4, ED-7  

---

## ED-12 — Network outbound links
**Milestone:** ED-M4  
**Priority:** P0  
**Estimate:** S  

### Description
Render entity `urls[]` (tracker, spikeprotein, navigator, summit, canonical) as clear outbound actions.

### Acceptance criteria
- [ ] Rel types labeled in UI
- [ ] No broken button when urls empty
- [ ] External links `rel="noopener noreferrer"`

### Blocked by
ED-4  

---

## ED-13 — Embed snippet stub (Cite & Embed prep)
**Milestone:** ED-M4  
**Priority:** P2  
**Estimate:** S  

### Description
“Copy embed” returns a documented placeholder iframe/web component snippet pointing at the entity URL (kit can harden later).

### Acceptance criteria
- [ ] Snippet includes entity id + Desk URL
- [ ] Marked as preview / unstable API

### Blocked by
ED-4  

---

## ED-14 — Empty, draft, and uncertainty states polish
**Milestone:** ED-M4  
**Priority:** P1  
**Estimate:** S  

### Description
Polish UX for entities with no claims, only draft claims, only C/D claims, and superseded-only histories.

### Acceptance criteria
- [ ] No blank dead-ends
- [ ] Draft vs published visually distinct
- [ ] Mobile layout checked on entity + search

### Blocked by
ED-4, ED-8  

---

## ED-15 — Dump download page
**Milestone:** ED-M4  
**Priority:** P1  
**Estimate:** S  

### Description
`/download` links to evidence-graph dump (release asset, raw main artifact, or proxied file) + schema docs.

### Acceptance criteria
- [ ] Points at real dump URL or clear “vendored in build” note
- [ ] Shows schema_version and generated_at from ingested meta

### Blocked by
ED-2  

---

## ED-16 — CI: build + link check for entity IDs
**Milestone:** ED-M5  
**Priority:** P0  
**Estimate:** S  

### Description
GitHub Actions: install, ingest dump, build site, fail if any claim references missing entity or routes fail basic smoke.

### Acceptance criteria
- [ ] CI on PR/push
- [ ] Build fails on missing referenced entity ids
- [ ] Artifact or pages build uploaded optional

### Blocked by
ED-2, ED-4  

---

## ED-17 — Deploy preview + production target
**Milestone:** ED-M5  
**Priority:** P0  
**Estimate:** M  

### Description
Wire Vercel (or chosen host) for PR previews and production per ED-0 decision.

### Acceptance criteria
- [ ] PR previews work
- [ ] Production URL live (subdomain or path)
- [ ] Env/docs for dump source on deploy

### Blocked by
ED-0, ED-16  

---

## ED-18 — Soft launch checklist
**Milestone:** ED-M5  
**Priority:** P0  
**Estimate:** S  

### Description
Ship soft launch: hub link, Tracker/spike “Open in Evidence Desk” where feasible, announce internally.

### Acceptance criteria
- [ ] Linked from opensourcemed.info (or agreed home)
- [ ] At least one network site links to a Desk entity
- [ ] Launch note states example vs curated status honestly
- [ ] Analytics light-touch optional (ED-19)

### Blocked by
ED-8, ED-17, ED-14  

---

## ED-19 — Lightweight metrics
**Milestone:** ED-M5  
**Priority:** P2  
**Estimate:** S  

### Description
Privacy-respecting events: search performed, entity viewed, CSV/BibTeX export, outbound network click.

### Acceptance criteria
- [ ] Events defined and documented
- [ ] No PII in event payloads
- [ ] Aligns with 30/90-day brief metrics

### Blocked by
ED-17  

---

## Out of scope for MVP (parked)
- ED-X1 AI chat / generated clinical guidance
- ED-X2 User accounts, comments, annotations
- ED-X3 Full-text claim search (stretch only)
- ED-X4 Curator in-app editing (keep git/PR)
- ED-X5 Gap Radar / RepurpOS / Criteria Workbench (separate apps)
- ED-X6 Native mobile apps

---

## Suggested first sprint
1. ED-0 Decisions + repo  
2. ED-1 Scaffold  
3. ED-2 Dump ingest  
4. ED-3 Tier chrome  
5. ED-4 Entity page  

## Dependency graph (high level)
```
ED-0 → ED-1 → ED-2 → ED-4 → ED-5/6/9/10/11/12/13
ED-1 → ED-3 → ED-4 / ED-7
ED-2 → ED-8 / ED-15 / ED-16
ED-4+ED-8 → ED-14
ED-0+ED-16 → ED-17 → ED-18 / ED-19
```

## GitHub issue title paste list
```
ED-0: Repo, hosting, and dump source decision
ED-1: App scaffold (static-first)
ED-2: Ingest evidence-graph dump at build time
ED-3: Tier legend + uncertainty chrome
ED-4: Entity page (core desk view)
ED-5: Claim page
ED-6: Home + featured seed conditions
ED-7: About / cite / license
ED-8: Client search (entity-first)
ED-9: Export CSV for entity claims
ED-10: Export BibTeX from sources
ED-11: Cite-this-entity snippet
ED-12: Network outbound links
ED-13: Embed snippet stub
ED-14: Empty, draft, and uncertainty states polish
ED-15: Dump download page
ED-16: CI build + entity ID link check
ED-17: Deploy preview + production target
ED-18: Soft launch checklist
ED-19: Lightweight metrics
```
