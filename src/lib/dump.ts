/**
 * Build-time evidence-graph dump loader (ED-2 / ED-4 / ED-5).
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

export interface DumpExternalId {
  system: string;
  value: string;
}

export interface DumpEntityUrl {
  rel: string;
  href: string;
}

export interface DumpEntity {
  id: string;
  type: string;
  label: string;
  aliases?: string[];
  summary?: string;
  status?: string;
  updated_at?: string;
  external_ids?: DumpExternalId[];
  urls?: DumpEntityUrl[];
  [key: string]: unknown;
}

export type ClaimStatus = 'draft' | 'published' | 'superseded';
export type EvidenceTier = 'A' | 'B' | 'C' | 'D';

export interface DumpClaimSource {
  type?: string;
  value?: string;
  label?: string;
  [key: string]: unknown;
}

export interface DumpClaim {
  id: string;
  subject_id: string;
  predicate: string;
  /** Entity object id; mutually exclusive with object_literal in schema. */
  object_id?: string;
  /** Literal object when not an entity ref. */
  object_literal?: string;
  evidence_tier: EvidenceTier | string;
  sources?: DumpClaimSource[];
  limitations?: string;
  status: ClaimStatus | string;
  reviewed_by?: string;
  reviewed_at?: string;
  license?: string;
  confidence_notes?: string;
  supersedes_id?: string;
  [key: string]: unknown;
}

export interface EvidenceDump {
  meta: DumpMeta;
  entities: DumpEntity[];
  claims: DumpClaim[];
}

export interface EntityClaims {
  out: DumpClaim[];
  in: DumpClaim[];
  /** Published + draft (non-superseded), claims out then in. */
  main: DumpClaim[];
  /** Superseded claims for collapsed history. */
  superseded: DumpClaim[];
  /** All claims touching this entity. */
  all: DumpClaim[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DUMP_PATH = path.join(ROOT, 'data', 'dump', 'latest.json');

let cached: EvidenceDump | null = null;
let entityIndex: Map<string, DumpEntity> | null = null;
let claimIndex: Map<string, DumpClaim> | null = null;

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

function getEntityIndex(): Map<string, DumpEntity> {
  if (!entityIndex) {
    entityIndex = new Map(getDump().entities.map((e) => [e.id, e]));
  }
  return entityIndex;
}

function getClaimIndex(): Map<string, DumpClaim> {
  if (!claimIndex) {
    claimIndex = new Map(getDump().claims.map((c) => [c.id, c]));
  }
  return claimIndex;
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

export function getAllEntities(): DumpEntity[] {
  return getDump().entities;
}

export function getAllClaims(): DumpClaim[] {
  return getDump().claims;
}

export function getEntity(id: string): DumpEntity | undefined {
  return getEntityIndex().get(id);
}

export function getClaim(id: string): DumpClaim | undefined {
  return getClaimIndex().get(id);
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
  const byId = getEntityIndex();
  return ids.map((id) => {
    const found = byId.get(id);
    if (found) return found;
    return { id, type: 'condition', label: id };
  });
}

/** Claims where this entity is subject (out) or object (in). */
export function getClaimsForEntity(id: string): EntityClaims {
  const out: DumpClaim[] = [];
  const inClaims: DumpClaim[] = [];
  for (const claim of getDump().claims) {
    if (claim.subject_id === id) out.push(claim);
    if (claim.object_id && claim.object_id === id) inClaims.push(claim);
  }
  const all = [...out, ...inClaims];
  const isSuperseded = (c: DumpClaim) => c.status === 'superseded';
  const main = all.filter((c) => !isSuperseded(c));
  const superseded = all.filter(isSuperseded);
  return { out, in: inClaims, main, superseded, all };
}

/**
 * Unique dump entities on the other side of claims involving `id`
 * (one-hop related). Skips ids that are not entities in the dump.
 */
export function getRelatedEntities(id: string): DumpEntity[] {
  const { all } = getClaimsForEntity(id);
  const seen = new Set<string>();
  const related: DumpEntity[] = [];
  const index = getEntityIndex();
  for (const claim of all) {
    const other =
      claim.subject_id === id
        ? claim.object_id ?? null
        : claim.object_id === id
          ? claim.subject_id
          : null;
    if (!other || other === id || seen.has(other)) continue;
    const entity = index.get(other);
    if (!entity) continue;
    seen.add(other);
    related.push(entity);
  }
  related.sort((a, b) => a.label.localeCompare(b.label));
  return related;
}

/** Human label for an id if it is a dump entity; otherwise the raw id. */
export function getEntityLabel(id: string): string {
  return getEntity(id)?.label ?? id;
}

/** Absolute path to the dump file (for docs / debugging). */
export function getDumpPath(): string {
  return DUMP_PATH;
}
