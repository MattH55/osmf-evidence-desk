/**
 * Entity-page export builders (ED-9 CSV, ED-10 BibTeX, ED-11 cite snippet).
 * Pure string builders — safe for build-time and client Blob downloads.
 */
import type { DumpClaim, DumpClaimSource, DumpMeta } from './dump';
import { sourceHref, sourceText, type ClaimSourceLink } from './sources';

/** Stable CSV column order (ED-9). */
export const CSV_COLUMNS = [
  'id',
  'subject',
  'predicate',
  'object',
  'tier',
  'sources',
  'reviewed_at',
  'status',
] as const;

export type CsvColumn = (typeof CSV_COLUMNS)[number];

/** Escape one CSV field (RFC 4180-ish). */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function claimObject(claim: DumpClaim): string {
  if (typeof claim.object_literal === 'string' && claim.object_literal.length > 0) {
    return claim.object_literal;
  }
  return claim.object_id ?? '';
}

/** Compact source list for CSV: `type:value` joined with ` | `. */
function formatSourcesForCsv(sources: DumpClaimSource[] | undefined): string {
  if (!sources || sources.length === 0) return '';
  return sources
    .map((s) => {
      const type = (s.type ?? '').trim() || 'source';
      const value = (s.value ?? s.label ?? '').trim();
      return value ? `${type}:${value}` : type;
    })
    .join(' | ');
}

/**
 * CSV of claims involving an entity (in + out). Stable header row.
 * Dedupes by claim id (an entity can appear as both subject and object only once).
 */
export function buildCsv(claims: DumpClaim[]): string {
  const seen = new Set<string>();
  const rows: string[] = [CSV_COLUMNS.join(',')];

  for (const claim of claims) {
    if (seen.has(claim.id)) continue;
    seen.add(claim.id);

    const cells: Record<CsvColumn, string> = {
      id: claim.id ?? '',
      subject: claim.subject_id ?? '',
      predicate: claim.predicate ?? '',
      object: claimObject(claim),
      tier: String(claim.evidence_tier ?? ''),
      sources: formatSourcesForCsv(claim.sources),
      reviewed_at: claim.reviewed_at ?? '',
      status: String(claim.status ?? ''),
    };
    rows.push(CSV_COLUMNS.map((col) => csvField(cells[col])).join(','));
  }

  return rows.join('\n') + '\n';
}

/** Sanitize a string for use inside a BibTeX brace group. */
function bibtexEscape(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable citation key from type + value. */
function bibtexKey(type: string, value: string, index: number): string {
  const raw = `${type}_${value}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
  return raw || `source_${index}`;
}

function normalizeDoi(value: string): string {
  return value.replace(/^doi:\s*/i, '').trim();
}

function normalizePmid(value: string): string {
  return value.replace(/^pmid:\s*/i, '').trim();
}

export interface BibtexBuildResult {
  /** Full .bib file contents (may be header-only if no bibliographic sources). */
  text: string;
  /** Number of usable DOI/PMID (and optional NCT/url) entries written. */
  entryCount: number;
  /** Sources skipped because they are url/osmf_page without a DOI/PMID. */
  skippedNonBib: number;
}

/**
 * BibTeX from claim sources (ED-10).
 * DOI → @article with doi=; PMID → @article with eprint/pubmed;
 * NCT → @misc when present; url/osmf_page → omitted (documented limitation).
 */
export function buildBibtex(claims: DumpClaim[]): BibtexBuildResult {
  const seenKeys = new Set<string>();
  const entries: string[] = [];
  let skippedNonBib = 0;
  let index = 0;

  const header = [
    '% OSMF Evidence Desk — BibTeX export of claim sources',
    '% DOI and PMID map to usable entries. NCT becomes @misc when present.',
    '% Limitation: url / osmf_page sources are omitted (not full bibliographic',
    '% records). Prefer DOI/PMID on claims for citability. See /about.',
    '',
  ];

  for (const claim of claims) {
    for (const raw of claim.sources ?? []) {
      const source = raw as ClaimSourceLink;
      const type = (source.type ?? '').toLowerCase();
      const value = (source.value ?? '').trim();
      if (!value) continue;

      index += 1;
      const title = bibtexEscape(sourceText(source));
      const note = bibtexEscape(`Evidence Desk claim ${claim.id}`);

      if (type === 'doi' || /^doi:/i.test(value)) {
        const doi = normalizeDoi(value);
        if (!doi) continue;
        const key = bibtexKey('doi', doi, index);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const href = sourceHref({ type: 'doi', value: doi }) ?? `https://doi.org/${doi}`;
        entries.push(
          [
            `@article{${key},`,
            `  title = {${title}},`,
            `  doi = {${bibtexEscape(doi)}},`,
            `  url = {${bibtexEscape(href)}},`,
            `  note = {${note}}`,
            `}`,
          ].join('\n'),
        );
        continue;
      }

      if (type === 'pmid' || /^pmid:/i.test(value)) {
        const pmid = normalizePmid(value);
        if (!/^\d+$/.test(pmid)) continue;
        const key = bibtexKey('pmid', pmid, index);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const href =
          sourceHref({ type: 'pmid', value: pmid }) ??
          `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
        entries.push(
          [
            `@article{${key},`,
            `  title = {${title}},`,
            `  eprint = {${pmid}},`,
            `  eprinttype = {pubmed},`,
            `  url = {${bibtexEscape(href)}},`,
            `  note = {${note}}`,
            `}`,
          ].join('\n'),
        );
        continue;
      }

      if (type === 'nct' || /^nct\d+$/i.test(value)) {
        const nct = value.replace(/^nct:\s*/i, '').toUpperCase();
        const key = bibtexKey('nct', nct, index);
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
        const href = sourceHref({ type: 'nct', value: nct });
        const lines = [
          `@misc{${key},`,
          `  title = {${title}},`,
          `  howpublished = {ClinicalTrials.gov ${bibtexEscape(nct)}},`,
        ];
        if (href) lines.push(`  url = {${bibtexEscape(href)}},`);
        lines.push(`  note = {${note}}`, `}`);
        entries.push(lines.join('\n'));
        continue;
      }

      if (type === 'url' || type === 'osmf_page') {
        // Not full bibliographic records — omit per ED-10 limitations.
        skippedNonBib += 1;
        continue;
      }

      // Unknown types: skip rather than invent a record.
      skippedNonBib += 1;
    }
  }

  const body =
    entries.length > 0
      ? entries.join('\n\n') + '\n'
      : '% (No DOI/PMID/NCT sources on claims for this entity.)\n';

  return {
    text: header.join('\n') + body,
    entryCount: entries.length,
    skippedNonBib,
  };
}

export interface CiteSnippetInput {
  entityId: string;
  deskUrl: string;
  meta: Pick<DumpMeta, 'generated_at' | 'schema_version'>;
}

/**
 * One-click cite snippet (ED-11): graph id, Desk URL, dump generated_at, schema_version.
 * Format documented on /about.
 */
export function buildCiteSnippet(input: CiteSnippetInput): string {
  const { entityId, deskUrl, meta } = input;
  return [
    entityId,
    deskUrl,
    `generated_at: ${meta.generated_at}`,
    `schema_version: ${meta.schema_version}`,
  ].join('\n');
}

/** Safe download basename from an osmf: id (no path separators). */
export function exportBasename(entityId: string): string {
  return entityId.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'entity';
}
