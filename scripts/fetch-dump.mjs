#!/usr/bin/env node
/**
 * ED-2: Clone/update osmf-evidence-graph, build its dump, copy into Desk.
 *
 * Cache:   .cache/osmf-evidence-graph  (gitignored)
 * Output:  data/dump/latest.json       (gitignored; generated each run)
 *          public/dump/latest.json     (gitignored; site-fetchable copy)
 *
 * Requires network on first run (and whenever the cache is cold).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const CACHE_DIR = path.join(ROOT, '.cache', 'osmf-evidence-graph');
const GRAPH_REPO = 'https://github.com/MattH55/osmf-evidence-graph.git';
const GRAPH_REF = 'main';
const DUMP_SRC = path.join(CACHE_DIR, 'dist', 'dump', 'latest.json');
const DUMP_DEST_DIR = path.join(ROOT, 'data', 'dump');
const DUMP_DEST = path.join(DUMP_DEST_DIR, 'latest.json');
const PUBLIC_DUMP_DIR = path.join(ROOT, 'public', 'dump');
const PUBLIC_DUMP = path.join(PUBLIC_DUMP_DIR, 'latest.json');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    encoding: 'utf8',
    ...opts,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function ensureGraphCache() {
  if (fs.existsSync(path.join(CACHE_DIR, '.git'))) {
    console.log(`Updating ${CACHE_DIR} (${GRAPH_REF})…`);
    run('git', ['fetch', '--depth', '1', 'origin', GRAPH_REF], { cwd: CACHE_DIR });
    run('git', ['checkout', '-f', 'FETCH_HEAD'], { cwd: CACHE_DIR });
    return;
  }

  fs.mkdirSync(path.dirname(CACHE_DIR), { recursive: true });
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
  }
  console.log(`Cloning ${GRAPH_REPO} (${GRAPH_REF}) → ${CACHE_DIR}…`);
  run('git', [
    'clone',
    '--depth',
    '1',
    '--branch',
    GRAPH_REF,
    GRAPH_REPO,
    CACHE_DIR,
  ]);
}

function buildDump() {
  console.log('Installing graph deps (npm ci)…');
  run('npm', ['ci'], { cwd: CACHE_DIR });
  console.log('Building dump (npm run build:dump)…');
  run('npm', ['run', 'build:dump'], { cwd: CACHE_DIR });
}

function copyDump() {
  if (!fs.existsSync(DUMP_SRC)) {
    throw new Error(`Graph dump missing after build: ${DUMP_SRC}`);
  }
  fs.mkdirSync(DUMP_DEST_DIR, { recursive: true });
  fs.copyFileSync(DUMP_SRC, DUMP_DEST);
  console.log(`Copied dump → ${path.relative(ROOT, DUMP_DEST)}`);
  // ED-15: also publish under public/ so /dump/latest.json is fetchable from the site.
  fs.mkdirSync(PUBLIC_DUMP_DIR, { recursive: true });
  fs.copyFileSync(DUMP_DEST, PUBLIC_DUMP);
  console.log(`Copied public dump → ${path.relative(ROOT, PUBLIC_DUMP)}`);
}

function buildSearchIndex() {
  console.log('Building entity search index…');
  run('node', [path.join(ROOT, 'scripts', 'build-search-index.mjs')], { cwd: ROOT });
}

function main() {
  ensureGraphCache();
  buildDump();
  copyDump();
  buildSearchIndex();
  console.log('fetch-dump complete.');
}

try {
  main();
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
