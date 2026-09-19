# OSMF Evidence Desk

Search-and-browse app for the [OSMF Shared Evidence Graph](https://github.com/MattH55/osmf-evidence-graph) — conditions, biomarkers, agents, trials, papers, and claims with provenance and evidence tiers.

**Status:** ED-12–15 network links, embed stub, empty-state polish, dump download (Astro + TypeScript, static output).

**Production host (planned):** [desk.opensourcemed.info](https://desk.opensourcemed.info) — DNS/deploy in ED-17.

## Stack

- **[Astro](https://astro.build/)** + TypeScript, static `output` (no auth, no DB)
- Default static `dist/` for later Vercel static hosting
- Soft-launch example banner driven from dump `meta.is_example`

## Evidence dump (ED-2)

Desk does **not** vendor the graph dump in git. A prebuild step fetches and builds it:

| Path | Role |
|------|------|
| `.cache/osmf-evidence-graph/` | Shallow clone of `MattH55/osmf-evidence-graph` @ `main` (gitignored) |
| `data/dump/latest.json` | Copied from the graph’s `dist/dump/latest.json` after `npm run build:dump` (gitignored) |
| `public/dump/latest.json` | Same file copied for site fetch at `/dump/latest.json` (ED-15; gitignored) |
| `src/lib/dump.ts` | Build-time loader; fails the build if the file is missing or `meta.schema_version` ≠ `0.1.0` |

```bash
npm run fetch-dump   # clone/update graph cache → build dump → copy to data/dump/
npm run build        # runs fetch-dump via prebuild, then astro build
```

**Network:** required for the first `fetch-dump` (and whenever `.cache/` is cold). CI uses the same flow (see `.github/workflows/build.yml`).

**Schema gate:** only `meta.schema_version` `"0.1.0"` is accepted today. Unsupported or missing dumps abort `astro build`.

**Helpers:** `getDump()`, `getMeta()`, `getAllEntities()`, `getEntity(id)`, `getAllClaims()`, `getClaim(id)`, `getClaimsForEntity(id)`, `getRelatedEntities(id)`, `getSeedConditions()`, `getEntitiesByType(type)`, `getEntitySearchIndex()`.

When EG-8 publishes a public dump artifact, prefer fetching that URL and drop the clone+build coupling (see [DECISIONS.md](./DECISIONS.md)).

## Tier chrome (ED-3)

Shared UI: `TierBadge`, `ClaimStatusChip`, `ClaimCard`, `TierLegend` under `src/components/`. C/D limitations always render inline. Source links (DOI/PMID/NCT/URL) via `src/lib/sources.ts`. Dev preview: `/dev/claim-preview`.

## Entity pages (ED-4)

Every dump entity gets a static page at build time via `getStaticPaths`.

| Piece | Role |
|-------|------|
| `src/lib/ids.ts` | `entityIdToPath`, `pathPartsToEntityId`, `entityHref` — reversible `osmf:condition:pacvs` ↔ `/entity/osmf/condition/pacvs` |
| `src/pages/entity/[...id].astro` | One HTML page per dump entity: summary, aliases, external IDs, outbound `urls[]`, claims in/out, superseded history, one-hop related entities |
| Homepage seed list | Links to real entity pages via `entityHref` |

**404:** Only entities present in the dump are generated. Requests to unknown ids (paths not in `dist/`) 404 naturally on static hosts. Deep links for the same entity id stay stable across builds.

**URL scheme:** split the `osmf:` id on `:`, join with `/` under `/entity/`. Example: `osmf:condition:pacvs` → `/entity/osmf/condition/pacvs`.

## Claim pages (ED-5)

Every dump claim gets a static page at build time via `getStaticPaths`.

| Piece | Role |
|-------|------|
| `src/lib/ids.ts` | Also `claimIdToPath`, `pathPartsToClaimId`, `claimHref` — same split-on-`:` / join-with-`/` pattern under `/claim/` |
| `src/pages/claim/[...id].astro` | Claim detail: id, predicate, tier, status, subject/object links (or `object_literal`), sources as links, limitations (always visible for C/D), reviewed_at/by, license, supersedes_id |
| `src/lib/sources.ts` | Shared DOI / PMID / NCT / URL → href helpers used by ClaimCard and claim pages |
| ClaimCard on entity pages | Claim id links to the claim page via `claimHref` (“View claim”) |

**404:** Only claims present in the dump are generated.

**URL scheme:** `osmf:claim:ex-pem-of-long-covid` → `/claim/osmf/claim/ex-pem-of-long-covid`.

## Home, search, about (ED-6 / ED-7)

| Piece | Role |
|-------|------|
| `/` | One-screen explainer, not-advice notice, featured `meta.seed_conditions`, CTA to Search / About / Download |
| `/search` | Entity search (upgraded in ED-8 — see below) |
| `/about` | Not-advice policy, `TierLegend` (aligned with graph `SCHEMA.md`), citation example (entity id + Desk URL + `generated_at`), CC-BY-4.0 license, links to graph repo + SCHEMA.md raw |
| `/download` | Dump meta (`schema_version`, `generated_at`, `is_example`, publisher, license) + vendored-build note + `/dump/latest.json` + graph/SCHEMA links (ED-15) |
| Nav | Home · Search · About · Download (+ header search form) |

Example-data banner remains driven by `meta.is_example` (unchanged).

## Search (ED-8)

Compile-time entity index + client MiniSearch. **No claim full-text** in MVP.

| Piece | Role |
|-------|------|
| `scripts/build-search-index.mjs` | Reads `data/dump/latest.json`, writes `public/search-index.json` (labels, aliases, id, type, href + seed suggestions) |
| `npm run build-search-index` | Standalone index build (also runs at the end of `fetch-dump` / `prebuild`) |
| `public/search-index.json` | Generated artifact (gitignored); copied into `dist/` on `astro build` |
| `/search?q=` | MiniSearch over `label` + `aliases` + `id`; results **grouped by entity type**; empty query and zero-hit states show seed suggestions |
| Header form | `GET /search?q=` (works without JS for navigation; search page enhances with MiniSearch) |
| Homepage CTA | Links to `/search` (optional `?q=` supported) |

**Alias matching:** MiniSearch indexes each entity’s `aliases[]` (joined for indexing). Example: query `PASC` matches **Long COVID** because `PASC` is an alias on `osmf:condition:long-covid`.

```bash
npm run fetch-dump          # dump + search-index.json
npm run build-search-index  # index only (dump must already exist)
```

## Entity exports (ED-9 / ED-10 / ED-11)

On each entity page: client-side CSV / BibTeX download and one-click copy citation (no auth).

| Piece | Role |
|-------|------|
| `src/lib/export.ts` | `buildCsv`, `buildBibtex`, `buildCiteSnippet` |
| `src/components/EntityExportActions.astro` | Download CSV, Download BibTeX, Copy citation (Blob + clipboard) |
| `/about#exports` | CSV column list, BibTeX limitations (`url` / `osmf_page` omitted), cite-snippet format |

**CSV columns (stable):** `id`, `subject`, `predicate`, `object`, `tier`, `sources`, `reviewed_at`, `status` — only claims involving that entity (in or out).

**BibTeX:** DOI/PMID → `@article`; NCT → `@misc`; `url` / `osmf_page` omitted (not full bibliographic records).

**Cite snippet:** graph id, Desk URL, `generated_at`, `schema_version` (documented on `/about`).

## Develop

```bash
npm install
npm run fetch-dump   # once (or whenever you need a fresh dump)
npm run dev          # local preview, typically http://localhost:4321
npm run build        # fetch-dump + static site → dist/
npm run preview      # serve the production build
```

Requires Node.js 20+.

## ED-0 decisions (locked)

See [DECISIONS.md](./DECISIONS.md).

| Topic | Decision |
|-------|----------|
| Repo | `MattH55/osmf-evidence-desk` |
| Host | `desk.opensourcemed.info` |
| Dump (MVP) | CI clones `osmf-evidence-graph` + `npm run build:dump` |
| Soft launch | Example data with persistent banner |

## Related

- Evidence graph: https://github.com/MattH55/osmf-evidence-graph
- Network hub: https://opensourcemed.info/
- MVP ticket plan: [GITHUB_TICKETS.md](./GITHUB_TICKETS.md)

## Not medical advice

Evidence Desk surfaces curated research claims and sources. It does not provide clinical recommendations or dosing guidance.

## Network, embed, empty states, download (ED-12–15)

| Piece | Role |
|-------|------|
| `EntityNetworkLinks` | Labeled outbound `urls[]` (tracker, spikeprotein, navigator, summit, canonical, other); hidden when empty; `target=_blank` + `rel="noopener noreferrer"` |
| `Copy embed` on entity | Preview / unstable iframe snippet with entity id + Desk URL (next to CSV / BibTeX / cite) |
| Entity empty states | Callouts for no claims, draft-only, C/D-only, superseded-only; draft cards dashed; mobile tap targets on entity + search |
| `/download` | Meta fields + vendored-build note + download `/dump/latest.json` + graph repo + SCHEMA.md |

