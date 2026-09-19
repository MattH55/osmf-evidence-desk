/**
 * Stable, reversible encoding of `osmf:` entity IDs for URL paths (ED-4).
 *
 * `osmf:condition:pacvs` ↔ `/entity/osmf/condition/pacvs`
 * Split on `:`, join with `/` (and the reverse). Readable and build-stable.
 */

/** Path segments under `/entity/` (no leading slash). */
export function entityIdToPath(id: string): string {
  if (!id || typeof id !== 'string') {
    throw new Error(`[ids] invalid entity id: ${JSON.stringify(id)}`);
  }
  if (id.includes('/')) {
    throw new Error(`[ids] entity id must not contain "/": ${JSON.stringify(id)}`);
  }
  return id.split(':').map(encodeURIComponent).join('/');
}

/** Reassemble entity id from rest-route path parts (decoded). */
export function pathPartsToEntityId(parts: string | string[]): string {
  const list = Array.isArray(parts)
    ? parts
    : parts.split('/').filter((p) => p.length > 0);
  if (list.length === 0) {
    throw new Error('[ids] empty path parts for entity id');
  }
  return list.map((p) => decodeURIComponent(p)).join(':');
}

/** Absolute site path for an entity (leading slash, no trailing slash). */
export function entityHref(id: string): string {
  return `/entity/${entityIdToPath(id)}`;
}
