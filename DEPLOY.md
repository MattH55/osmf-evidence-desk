# Deploying Evidence Desk (ED-17)

Production target: **[desk.opensourcemed.info](https://desk.opensourcemed.info)** on **Vercel** (static Astro `dist/`).

Desk does **not** vendor the evidence-graph dump. Every deploy must **fetch and build the dump over the network** before `astro build`.

## How Vercel builds the dump

| Piece | Role |
|-------|------|
| `scripts/fetch-dump.mjs` | Shallow-clones `MattH55/osmf-evidence-graph` @ `main` into `.cache/`, runs `npm ci` + `npm run build:dump`, copies `dist/dump/latest.json` → `data/dump/latest.json` and `public/dump/latest.json`, then builds the search index |
| `scripts/check-dump-refs.mjs` | Fails the build if entity/claim ids duplicate or claims reference missing entities |
| `astro.config.mjs` | `output: 'static'`, `site: 'https://desk.opensourcemed.info'` |
| `vercel.json` | Static project: `installCommand` / `buildCommand` / `outputDirectory: dist` |

**`vercel.json` buildCommand** (must have outbound network to GitHub):

```text
npm run fetch-dump && npm run check:dump && npx astro build
```

Vercel’s build environment needs:

1. **Network** to `github.com` (clone graph) and npm registry (graph + Desk deps).
2. **Node.js 20+** (see `engines` in `package.json`).
3. No secrets for the public graph repo today. If the graph becomes private, add a deploy token as a Vercel env var and teach `fetch-dump.mjs` to use it.

Do **not** set a build command that only runs `astro build` without `fetch-dump` — the dump files are gitignored and the build will fail.

## One-time: connect the GitHub repo to Vercel

1. Sign in to [Vercel](https://vercel.com) with an account that can create projects for OSMF.
2. **Add New Project** → Import `MattH55/osmf-evidence-desk`.
3. Confirm settings match `vercel.json`:
   - Framework Preset: **Other** (static; `framework: null`)
   - Install Command: `npm ci`
   - Build Command: `npm run fetch-dump && npm run check:dump && npx astro build`
   - Output Directory: `dist`
4. Deploy. Root production URL will be `*.vercel.app` until the custom domain is attached.
5. Enable the **Vercel GitHub app** on the repo so every PR gets a **Preview Deployment** URL in the GitHub Checks / PR timeline.

### PR previews

Once the Vercel ↔ GitHub integration is connected:

- Pushing a PR branch triggers a preview deploy with the same `buildCommand` (including `fetch-dump`).
- Preview URLs are ephemeral (`*.vercel.app`); use them to review entity/claim pages before merge.
- CI in `.github/workflows/build.yml` remains the gate for dump integrity + `dist/` artifact; Vercel previews are complementary.

## Custom domain: desk.opensourcemed.info

1. In the Vercel project → **Settings → Domains** → add `desk.opensourcemed.info`.
2. At your DNS host for `opensourcemed.info`, create a **CNAME**:

   | Host | Type | Value |
   |------|------|-------|
   | `desk` | CNAME | `cname.vercel-dns.com` (or the exact target Vercel shows) |

3. Wait for TLS provisioning (Vercel issues the certificate automatically).
4. Optional later: redirect `opensourcemed.info/desk` → `https://desk.opensourcemed.info` on the hub (see DECISIONS.md).

Until DNS + domain are verified in Vercel, **production is not live** at `desk.opensourcemed.info` even if a `*.vercel.app` preview exists.

## Local parity

```bash
npm ci
npm run fetch-dump
npm run check:dump
npx astro build          # or: npm run build  (prebuild runs fetch-dump again)
npm run check:dist       # optional smoke: every entity/claim has a dist page
npm run preview
```

## Checklist (ops — outside this repo)

- [ ] Vercel project created and linked to `MattH55/osmf-evidence-desk`
- [ ] GitHub integration installed (PR preview comments/checks)
- [ ] `desk.opensourcemed.info` added in Vercel Domains
- [ ] DNS CNAME `desk` → Vercel target
- [ ] Confirm `https://desk.opensourcemed.info/` serves the soft-launch banner + seed entities
- [ ] Confirm `/dump/latest.json` is reachable from production

## Related

- ED-0 hosting decision: [DECISIONS.md](./DECISIONS.md)
- CI (ED-16): `.github/workflows/build.yml` — fetch-dump → check:dump → build → check:dist → upload `dist/` artifact
