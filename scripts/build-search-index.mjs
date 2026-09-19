#!/usr/bin/env node
/**
 * ED-8: Build public/search-index.json from data/dump/latest.json.
 *
 * Fields: id, type, label, aliases, href — consumed by MiniSearch on /search.
 * Run after fetch-dump (wired into prebuild).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DUMP_PATH = path.join(ROOT, 'data', 'dump', 'latest.json');
const OUT_PATH = path.join(ROOT, 'public', 'search-index.json');

function entityHref(id) {
  return `/entity/${id.split(':').map(encodeURIComponent).join('/')}`;
}

function main() {
  if (!fs.existsSync(DUMP_PATH)) {
    throw new Error(
      `Missing dump at ${DUMP_PATH}. Run \`npm run fetch-dump\` before build-search-index.`,
    );
  }

  const dump = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  if (!dump?.meta || !Array.isArray(dump.entities)) {
    throw new Error('Dump must include meta and entities[].');
  }

  const byId = new Map(dump.entities.map((e) => [e.id, e]));
  const documents = dump.entities
    .map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      aliases: Array.isArray(e.aliases) ? e.aliases : [],
      href: entityHref(e.id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const seedIds = dump.meta.seed_conditions ?? [];
  const suggestions = seedIds.map((id) => {
    const found = byId.get(id);
    return {
      id,
      type: found?.type ?? 'condition',
      label: found?.label ?? id,
      href: entityHref(id),
    };
  });

  const payload = {
    schema_version: dump.meta.schema_version,
    generated_at: dump.meta.generated_at,
    document_count: documents.length,
    documents,
    suggestions,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(
    `Wrote search index → ${path.relative(ROOT, OUT_PATH)} (${documents.length} entities, ${suggestions.length} suggestions)`,
  );
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
