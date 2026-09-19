/**
 * Stable, reversible encoding of `osmf:` IDs for URL paths (ED-4 / ED-5).
 *
 * `osmf:condition:pacvs` ↔ `/entity/osmf/condition/pacvs`
 * `osmf:claim:ex-pem-of-long-covid` ↔ `/claim/osmf/claim/ex-pem-of-long-covid`
 * Split on `:`, join with `/` (and the reverse). Readable and build-stable.
 */

/** Shared path encoding: split on `:`, encode each segment, join with `/`. */
function idToPath(id: string, kind: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error(`[ids] invalid ${kind} id: ${JSON.stringify(id)}`);
  }
  if (id.includes('/')) {
    throw new Error(`[ids] ${kind} id must not contain "/": ${JSON.stringify(id)}`);
  }
  return id.split(':').map(encodeURIComponent).join('/');
}

/** Reassemble id from rest-route path parts (decoded). */
function pathPartsToId(parts: string | string[], kind: string): string {
  const list = Array.isArray(parts)
    ? parts
    : parts.split('/').filter((p) => p.length > 0);
  if (list.length === 0) {
    throw new Error(`[ids] empty path parts for ${kind} id`);
  }
  return list.map((p) => decodeURIComponent(p)).join(':');
}

/** Path segments under `/entity/` (no leading slash). */
export function entityIdToPath(id: string): string {
  return idToPath(id, 'entity');
}

/** Reassemble entity id from rest-route path parts (decoded). */
export function pathPartsToEntityId(parts: string | string[]): string {
  return pathPartsToId(parts, 'entity');
}

/** Absolute site path for an entity (leading slash, no trailing slash). */
export function entityHref(id: string): string {
  return `/entity/${entityIdToPath(id)}`;
}

/** Path segments under `/claim/` (no leading slash). */
export function claimIdToPath(id: string): string {
  return idToPath(id, 'claim');
}

/** Reassemble claim id from rest-route path parts (decoded). */
export function pathPartsToClaimId(parts: string | string[]): string {
  return pathPartsToId(parts, 'claim');
}

/** Absolute site path for a claim (leading slash, no trailing slash). */
export function claimHref(id: string): string {
  return `/claim/${claimIdToPath(id)}`;
}
