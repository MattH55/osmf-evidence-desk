# Deploying Evidence Desk (ED-17)

Production target: **[desk.opensourcemed.info](https://desk.opensourcemed.info)** on **GitHub Pages** (static Astro `dist/`).

Desk does **not** vendor the evidence-graph dump. Every deploy must **fetch and build the dump over the network** before `astro build`.

## How GitHub Actions builds the dump

| Piece | Role |
|-------|------|
| `scripts/fetch-dump.mjs` | Shallow-clones `MattH55/osmf-evidence-graph` @ `main` into `.cache/`, runs `npm ci` + `npm run build:dump`, copies `dist/dump/latest.json` → `data/dump/latest.json` and `public/dump/latest.json`, then builds the search index |
| `scripts/check-dump-refs.mjs` | Fails the build if entity/claim ids duplicate or claims reference missing entities |
| `astro.config.mjs` | `output: 'static'`, `site: 'https://desk.opensourcemed.info'`, `base: '/'` (custom domain) |
| `public/CNAME` | Publishes custom domain `desk.opensourcemed.info` with the Pages site |
| `.github/workflows/deploy-pages.yml` | On push to `main` (and `workflow_dispatch`): fetch-dump → check → build → upload Pages artifact → deploy |

**Deploy workflow** (needs outbound network on Actions runners):

```text
npm ci
npm run fetch-dump
npm run check:dump
npm run build
npm run check:dist
→ actions/upload-pages-artifact (path: dist)
→ actions/deploy-pages
```

GitHub Actions needs:

1. **Network** to `github.com` (clone graph) and the npm registry (graph + Desk deps). The graph repo is public today — no secrets required.
2. **Node.js 20** (`actions/setup-node`).
3. If the graph becomes private, add a deploy token as a repo secret and teach `fetch-dump.mjs` to use it.

Do **not** deploy a `dist/` that was built without `fetch-dump` — the dump files are gitignored and the site will be empty or fail checks.

PR CI (`.github/workflows/build.yml`) runs the same fetch/check/build/smoke steps but only uploads a regular Actions artifact — it does **not** deploy. Production deploy runs only from `deploy-pages.yml` after merge to `main`.

## One-time: enable GitHub Pages (Actions)

1. Repo **Settings → Pages** (or API):
   - Source: **GitHub Actions** (not “Deploy from a branch”).
2. Or via `gh`:

   ```bash
   gh api -X POST repos/MattH55/osmf-evidence-desk/pages -f build_type=workflow
   # If already configured: PATCH the same endpoint / update source to workflow
   ```

3. Merge to `main` (or run **Deploy GitHub Pages** → **Run workflow**). The first successful `deploy-pages` job publishes the site.
4. Default Pages URL (until custom domain DNS works): `https://MattH55.github.io/osmf-evidence-desk/` is **not** used when a custom domain + `base: '/'` is set — expect `https://desk.opensourcemed.info/` once DNS is live. While DNS is pending, check the deployment URL shown on the Actions run / Pages settings (often `https://matth55.github.io/osmf-evidence-desk/` only if base were a project path; with custom domain CNAME file, GitHub serves the apex of the configured custom domain after DNS).

### Apex vs subdomain

| Hostname | Typical DNS | Notes |
|----------|-------------|--------|
| `desk.opensourcemed.info` (subdomain) | **CNAME** → `MattH55.github.io` | Preferred for Desk; matches this repo’s `public/CNAME` |
| Apex `opensourcemed.info` | A/AAAA to GitHub IPs (or ALIAS/ANAME) | Not used for Desk; keep apex on the hub |

Use a **subdomain** CNAME for Desk. Do not point the apex at Pages unless you intend the whole domain to be this site.

## Custom domain: desk.opensourcemed.info

1. Ensure `public/CNAME` contains exactly `desk.opensourcemed.info` (committed; this PR).
2. In GitHub → **Settings → Pages → Custom domain**, confirm `desk.opensourcemed.info` (GitHub may auto-detect from `CNAME`).
3. At your DNS host for `opensourcemed.info`, create:

   | Host | Type | Value |
   |------|------|-------|
   | `desk` | CNAME | `MattH55.github.io` |

4. In Pages settings, enable **Enforce HTTPS** after DNS has propagated and the certificate is ready (can take minutes to hours).
5. Optional later: redirect `opensourcemed.info/desk` → `https://desk.opensourcemed.info` on the hub (see DECISIONS.md).

Until DNS points at GitHub and HTTPS is enforced, **production is not reliably live** at `desk.opensourcemed.info` even if Actions deploys succeed.

## Local parity

```bash
npm ci
npm run fetch-dump
npm run check:dump
npx astro build          # or: npm run build  (prebuild runs fetch-dump again)
npm run check:dist       # optional smoke: every entity/claim has a dist page
npm run preview
```

## Checklist (ops — outside / after this repo)

- [ ] Pages source = **GitHub Actions** (`build_type=workflow`)
- [ ] `deploy-pages.yml` green on `main`
- [ ] Custom domain `desk.opensourcemed.info` shown in Pages settings
- [ ] DNS CNAME `desk` → `MattH55.github.io`
- [ ] **Enforce HTTPS** enabled
- [ ] Confirm `https://desk.opensourcemed.info/` serves the soft-launch banner + seed entities
- [ ] Confirm `/dump/latest.json` is reachable from production

## Related

- ED-0 hosting decision: [DECISIONS.md](./DECISIONS.md)
- PR CI (ED-16): `.github/workflows/build.yml` — fetch-dump → check:dump → build → check:dist → upload `dist/` artifact (no deploy)
- Production deploy: `.github/workflows/deploy-pages.yml`
