/**
 * Entity network outbound URL helpers (ED-12).
 * Known `urls[].rel` values get stable UI labels; unknown rels fall back safely.
 */

export type NetworkRel =
  | 'tracker'
  | 'spikeprotein'
  | 'navigator'
  | 'summit'
  | 'canonical'
  | 'other'
  | string;

export interface NetworkUrl {
  rel: string;
  href: string;
}

const REL_LABELS: Record<string, string> = {
  tracker: 'Tracker',
  spikeprotein: 'Spike protein site',
  navigator: 'Navigator',
  summit: 'Summit',
  canonical: 'Canonical page',
  other: 'External link',
};

/** Human label for a `urls[].rel` value. */
export function networkRelLabel(rel: string): string {
  const key = (rel ?? '').trim().toLowerCase();
  if (!key) return 'External link';
  return REL_LABELS[key] ?? titleCaseRel(key);
}

function titleCaseRel(rel: string): string {
  return rel
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Filter to usable hrefs; hide empty / invalid entries. */
export function usableNetworkUrls(urls: NetworkUrl[] | undefined | null): NetworkUrl[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter(
    (u) =>
      u &&
      typeof u.href === 'string' &&
      u.href.trim().length > 0 &&
      /^https?:\/\//i.test(u.href.trim()),
  );
}
