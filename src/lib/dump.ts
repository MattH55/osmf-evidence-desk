/**
 * Build-time evidence-graph dump loader (ED-2).
 *
 * Reads `data/dump/latest.json` produced by `npm run fetch-dump`.
 * Missing file or unsupported `meta.schema_version` fails the Astro build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Locked for MVP — bump deliberately when Desk supports a new dump schema. */
export const SUPPORTED_SCHEMA_VERSION = '0.1.0';

export interface DumpMeta {
  schema_version: string;
  generated_at: string;
  publisher: string;
  is_example: boolean;
  license: string;
  notes?: string;
  seed_conditions?: string[];
}

export interface DumpEntity {
  id: string;
  type: string;
  label: string;
  aliases?: string[];
  summary?: string;
  status?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface DumpClaim {
  id: string;
  [key: string]: unknown;
}

export interface EvidenceDump {
  meta: DumpMeta;
  entities: DumpEntity[];
  claims: DumpClaim[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DUMP_PATH = path.join(ROOT, 'data', 'dump', 'latest.json');

let cached: EvidenceDump | null = null;

function fail(message: string): never {
  throw new Error(`[dump] ${message}`);
}

function loadDump(): EvidenceDump {
  if (!fs.existsSync(DUMP_PATH)) {
    fail(
      `Missing dump at ${DUMP_PATH}. Run \`npm run fetch-dump\` before build (requires network).`,
    );
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  } catch (err) {
    fail(`Could not parse ${DUMP_PATH}: ${err instanceof Error ? err.message : err}`);
  }

  if (!raw || typeof raw !== 'object') {
    fail('Dump root must be an object.');
  }

  const dump = raw as Partial<EvidenceDump>;
  if (!dump.meta || typeof dump.meta !== 'object') {
    fail('Dump missing `meta` object.');
  }
  if (!Array.isArray(dump.entities)) {
    fail('Dump missing `entities` array.');
  }
  if (!Array.isArray(dump.claims)) {
    fail('Dump missing `claims` array.');
  }

  const version = dump.meta.schema_version;
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    fail(
      `Unsupported meta.schema_version ${JSON.stringify(version)}; Desk requires "${SUPPORTED_SCHEMA_VERSION}".`,
    );
  }

  if (typeof dump.meta.is_example !== 'boolean') {
    fail('Dump meta.is_example must be a boolean.');
  }

  return dump as EvidenceDump;
}

/** Full validated dump (cached per process). */
export function getDump(): EvidenceDump {
  if (!cached) {
    cached = loadDump();
  }
  return cached;
}

export function getMeta(): DumpMeta {
  return getDump().meta;
}

export function getEntitiesByType(type: string): DumpEntity[] {
  return getDump().entities.filter((e) => e.type === type);
}

/**
 * Seed conditions listed in `meta.seed_conditions`, resolved to entities
 * when present. Falls back to id-only stubs if an id is missing from entities.
 */
export function getSeedConditions(): DumpEntity[] {
  const dump = getDump();
  const ids = dump.meta.seed_conditions ?? [];
  const byId = new Map(dump.entities.map((e) => [e.id, e]));
  return ids.map((id) => {
    const found = byId.get(id);
    if (found) return found;
    return { id, type: 'condition', label: id };
  });
}

/** Absolute path to the dump file (for docs / debugging). */
export function getDumpPath(): string {
  return DUMP_PATH;
}
