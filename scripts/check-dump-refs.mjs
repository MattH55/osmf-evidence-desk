#!/usr/bin/env node
/**
 * ED-16: Validate evidence-graph dump referential integrity + optional dist smoke.
 *
 * Always (after dump exists):
 *   - Fail on duplicate entity ids / claim ids
 *   - Fail if any claim.subject_id is missing from dump nodes (entities ∪ claims)
 *   - Fail if claim.object_id is present but missing from dump nodes
 *   - Fail if claim.supersedes_id (when present) is missing from claims
 *
 * Notes:
 *   Graph schema allows claim→claim edges (e.g. supported_by with subject_id of
 *   another claim). Refs must resolve to an entity or claim id in the dump —
 *   "missing entity" in the ticket sense means a dangling id, not "must be type entity".
 *
 * Optional (`--dist` or CHECK_DIST=1):
 *   - After `astro build`, assert dist/entity/.../index.html and
 *     dist/claim/.../index.html exist for every entity/claim (same encoding as ids.ts)
 *
 * Usage:
 *   node scripts/check-dump-refs.mjs
 *   node scripts/check-dump-refs.mjs --dist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DUMP_PATH = path.join(ROOT, 'data', 'dump', 'latest.json');
const DIST_ROOT = path.join(ROOT, 'dist');

const checkDist =
  process.argv.includes('--dist') || process.env.CHECK_DIST === '1';

/** Same encoding as src/lib/ids.ts: split on `:`, encodeURIComponent each segment, join with `/`. */
function idToPath(id) {
  return id.split(':').map(encodeURIComponent).join('/');
}

function fail(message) {
  console.error(`[check-dump-refs] ${message}`);
  process.exitCode = 1;
}

function findDuplicates(ids) {
  const seen = new Set();
  const dups = new Set();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    else seen.add(id);
  }
  return [...dups].sort();
}

function main() {
  if (!fs.existsSync(DUMP_PATH)) {
    fail(
      `Missing dump at ${path.relative(ROOT, DUMP_PATH)}. Run \`npm run fetch-dump\` first.`,
    );
    process.exit(1);
  }

  let dump;
  try {
    dump = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  } catch (err) {
    fail(`Could not parse dump: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  if (!dump || typeof dump !== 'object') {
    fail('Dump root must be an object.');
    process.exit(1);
  }
  if (!Array.isArray(dump.entities)) {
    fail('Dump missing `entities` array.');
    process.exit(1);
  }
  if (!Array.isArray(dump.claims)) {
    fail('Dump missing `claims` array.');
    process.exit(1);
  }

  const entityIds = dump.entities.map((e) => e?.id);
  const claimIds = dump.claims.map((c) => c?.id);

  for (const [label, ids] of [
    ['entity', entityIds],
    ['claim', claimIds],
  ]) {
    const missing = ids
      .map((id, i) => (id == null || id === '' ? i : -1))
      .filter((i) => i >= 0);
    if (missing.length) {
      fail(`${label} entries missing id at indices: ${missing.join(', ')}`);
    }
    const dups = findDuplicates(ids.filter((id) => id != null && id !== ''));
    if (dups.length) {
      fail(`Duplicate ${label} ids: ${dups.join(', ')}`);
    }
  }

  const entitySet = new Set(
    entityIds.filter((id) => typeof id === 'string' && id.length > 0),
  );
  const claimSet = new Set(
    claimIds.filter((id) => typeof id === 'string' && id.length > 0),
  );
  /** Dump nodes that subject_id / object_id may reference (entities or claims). */
  const nodeSet = new Set([...entitySet, ...claimSet]);

  const missingSubject = [];
  const missingObject = [];
  const missingSupersedes = [];

  for (const claim of dump.claims) {
    if (!claim || typeof claim !== 'object') continue;
    const cid = claim.id ?? '(no id)';
    if (!claim.subject_id || !nodeSet.has(claim.subject_id)) {
      missingSubject.push(
        `${cid} → subject_id=${JSON.stringify(claim.subject_id)}`,
      );
    }
    if (
      claim.object_id != null &&
      claim.object_id !== '' &&
      !nodeSet.has(claim.object_id)
    ) {
      missingObject.push(
        `${cid} → object_id=${JSON.stringify(claim.object_id)}`,
      );
    }
    if (
      claim.supersedes_id != null &&
      claim.supersedes_id !== '' &&
      !claimSet.has(claim.supersedes_id)
    ) {
      missingSupersedes.push(
        `${cid} → supersedes_id=${JSON.stringify(claim.supersedes_id)}`,
      );
    }
  }

  if (missingSubject.length) {
    fail(
      `Claims reference missing subject node (${missingSubject.length}):\n  - ${missingSubject.join('\n  - ')}`,
    );
  }
  if (missingObject.length) {
    fail(
      `Claims reference missing object node (${missingObject.length}):\n  - ${missingObject.join('\n  - ')}`,
    );
  }
  if (missingSupersedes.length) {
    fail(
      `Claims reference missing supersedes_id claim (${missingSupersedes.length}):\n  - ${missingSupersedes.join('\n  - ')}`,
    );
  }

  if (process.exitCode) {
    console.error('[check-dump-refs] FAILED dump integrity checks.');
    process.exit(1);
  }

  console.log(
    `[check-dump-refs] OK — ${entitySet.size} entities, ${claimSet.size} claims; no duplicate ids; all subject_id / object_id / supersedes_id refs resolve.`,
  );

  if (!checkDist) return;

  if (!fs.existsSync(DIST_ROOT)) {
    fail(
      `Missing dist/ at ${path.relative(ROOT, DIST_ROOT)}. Run \`npm run build\` before --dist smoke.`,
    );
    process.exit(1);
  }

  const missingPages = [];
  for (const entity of dump.entities) {
    if (!entity?.id) continue;
    const page = path.join(
      DIST_ROOT,
      'entity',
      idToPath(entity.id),
      'index.html',
    );
    if (!fs.existsSync(page)) {
      missingPages.push(`entity ${entity.id} → ${path.relative(ROOT, page)}`);
    }
  }
  for (const claim of dump.claims) {
    if (!claim?.id) continue;
    const page = path.join(
      DIST_ROOT,
      'claim',
      idToPath(claim.id),
      'index.html',
    );
    if (!fs.existsSync(page)) {
      missingPages.push(`claim ${claim.id} → ${path.relative(ROOT, page)}`);
    }
  }

  if (missingPages.length) {
    fail(
      `Missing dist pages (${missingPages.length}):\n  - ${missingPages.join('\n  - ')}`,
    );
    console.error('[check-dump-refs] FAILED dist smoke.');
    process.exit(1);
  }

  console.log(
    `[check-dump-refs] OK — dist smoke: ${dump.entities.length} entity pages + ${dump.claims.length} claim pages present.`,
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
