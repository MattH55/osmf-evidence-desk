# Evidence Desk — ED-0 decisions

Recorded 2026-09-19. Closes ED-0.

## Repo
- **Decision:** Separate repository `MattH55/osmf-evidence-desk` (not an app folder inside `osmf-evidence-graph`).
- **Why:** Desk is a product UI with its own deploy cadence; graph stays schema/data infrastructure.

## Hosting
- **Decision:** Production host is `desk.opensourcemed.info`.
- **Why:** Clear product URL, independent Vercel project, stable deep links (`/entity/...`, `/claim/...`).
- **Note:** Optional later: `opensourcemed.info/desk` redirect to the subdomain for hub discovery.

## Dump source (MVP)
- **Decision:** Desk CI (and local bootstrap) clones `MattH55/osmf-evidence-graph` at `main`, runs `npm run build:dump` there, then Desk builds from that `dist/dump/latest.json`.
- **Why:** Graph dump is gitignored today; this unblocks Desk without waiting on EG-8 public dump publishing.
- **Later:** When EG-8 lands, prefer fetching a published dump artifact/URL and drop the clone+build coupling.

## Soft launch
- **Decision:** Soft-launch on example / illustrative data (`meta.is_example: true`) with a **persistent, unmistakable banner**.
- **Why:** Validate UX and IA while curated claims catch up (graph EG-7+).
- **Requirements:** Banner on all pages; `/about` states example vs curated honestly; no marketing as endorsed clinical guidance.

## Out of scope for ED-0 (deferred)
- Framework choice (Astro vs Vite/Next) — decide in ED-1 scaffold.
- DNS/TLS cutover details — handle in ED-17 deploy ticket.
