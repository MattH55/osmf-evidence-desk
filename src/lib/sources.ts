/**
 * Shared claim-source link helpers (ED-4 / ED-5).
 * DOI / PMID / NCT / URL (and https values of any type) → outbound hrefs.
 */

export interface ClaimSourceLink {
  type?: string;
  value?: string;
  label?: string;
}

/** Resolve a dump source to an absolute http(s) URL when possible. */
export function sourceHref(s: ClaimSourceLink): string | undefined {
  if (!s.value) return undefined;
  if (/^https?:\/\//i.test(s.value)) return s.value;

  const type = (s.type ?? '').toLowerCase();
  const value = s.value.trim();

  if (type === 'doi' || /^doi:/i.test(value)) {
    const doi = value.replace(/^doi:/i, '');
    if (!doi) return undefined;
    return `https://doi.org/${doi}`;
  }

  if (type === 'pmid' || /^pmid:/i.test(value)) {
    const pmid = value.replace(/^pmid:/i, '');
    if (!/^\d+$/.test(pmid)) return undefined;
    return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  }

  if (type === 'nct' || /^nct\d+$/i.test(value)) {
    const nct = value.replace(/^nct:/i, '').toUpperCase();
    if (!/^NCT\d+$/i.test(nct)) return undefined;
    return `https://clinicaltrials.gov/study/${nct}`;
  }

  if (type === 'url' || type === 'osmf_page') {
    // Non-http values are not linkable without a scheme.
    return undefined;
  }

  return undefined;
}

export function sourceText(s: ClaimSourceLink): string {
  return s.label || s.value || s.type || 'Source';
}
