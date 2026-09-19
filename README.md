# OSMF Evidence Desk

Search-and-browse app for the [OSMF Shared Evidence Graph](https://github.com/MattH55/osmf-evidence-graph) — conditions, biomarkers, agents, trials, papers, and claims with provenance and evidence tiers.

**Status:** ED-1 app scaffold (Astro + TypeScript, static output). Dump ingest is ED-2.

**Production host (planned):** [desk.opensourcemed.info](https://desk.opensourcemed.info) — DNS/deploy in ED-17.

## Stack

- **[Astro](https://astro.build/)** + TypeScript, static `output` (no auth, no DB)
- Default static `dist/` for later Vercel static hosting
- Soft-launch example banner component ready (`ExampleDataBanner`; wired from dump meta in ED-2)

## Develop

```bash
npm install
npm run dev      # local preview, typically http://localhost:4321
npm run build    # static site → dist/
npm run preview  # serve the production build
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
