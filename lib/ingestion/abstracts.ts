/**
 * Multi-provider abstract resolution.
 *
 * Providers are tried in order: OpenAlex, Crossref, Semantic Scholar (all free,
 * no key) and Elsevier's Abstract Retrieval API (uses ELSEVIER_API_KEY when
 * set). The first provider to return an abstract wins and nothing else is hit —
 * except that Elsevier is always attempted when no free provider has one,
 * because only the publisher can say *why* a paywalled abstract is missing.
 *
 * Outcomes are deliberately distinct:
 *   found                        — usable abstract retrieved
 *   not-deposited                — a provider answered and it does not hold an abstract
 *   publisher-access-unavailable — the publisher (Elsevier) refused access (401/403);
 *                                  the absence is unverified, not proven
 *   error                        — every non-skipped provider failed (network/5xx); nothing known
 *
 * Never throws. Callers should persist non-found outcomes (research_papers.metadata
 * .abstractStatus / .abstractAttempts) instead of mistaking them for "no abstract exists".
 */
import { stripTags } from '../license';

export type AbstractProvider = 'openalex' | 'crossref' | 'semantic-scholar' | 'elsevier';
export type AbstractAttemptOutcome =
  | 'found'
  | 'not-deposited'
  | 'publisher-access-unavailable'
  | 'error'
  | 'skipped';

export interface AbstractAttempt {
  provider: AbstractProvider;
  outcome: AbstractAttemptOutcome;
  detail?: string;
}

export type AbstractResult =
  | { status: 'found'; abstract: string; source: AbstractProvider; attempts: AbstractAttempt[] }
  | { status: 'not-deposited'; attempts: AbstractAttempt[] }
  | { status: 'publisher-access-unavailable'; attempts: AbstractAttempt[] }
  | { status: 'error'; attempts: AbstractAttempt[] };

const UA = 'DinosauriaNetwork/1.0 (mailto:admin@dinosauria.net)';
const TIMEOUT_MS = 12_000;

const cap = (s: string, n = 300) => s.slice(0, n);

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, {
    redirect: 'follow',
    ...init,
    signal: controller.signal,
    headers: { 'User-Agent': UA, ...(init.headers || {}) },
  }).finally(() => clearTimeout(timer));
}

interface ProviderHit { abstract?: string; attempt: AbstractAttempt }

async function openAlex(cleanDoi: string): Promise<ProviderHit> {
  try {
    const res = await fetchWithTimeout(
      `https://api.openalex.org/works/doi:${encodeURIComponent(cleanDoi)}?mailto=admin@dinosauria.net`
    );
    if (res.status === 404) return { attempt: { provider: 'openalex', outcome: 'not-deposited', detail: 'work not indexed' } };
    if (!res.ok) return { attempt: { provider: 'openalex', outcome: 'error', detail: `HTTP ${res.status}` } };
    const m = (await res.json()) as { abstract_inverted_index?: Record<string, number[]> };
    const inv = m.abstract_inverted_index;
    if (!inv) return { attempt: { provider: 'openalex', outcome: 'not-deposited', detail: 'no abstract_inverted_index' } };
    const positions: Array<[number, string]> = [];
    for (const [word, locs] of Object.entries(inv)) for (const p of locs) positions.push([p, word]);
    positions.sort((a, b) => a[0] - b[0]);
    const abstract = positions.map(([, w]) => w).join(' ').trim();
    if (!abstract) return { attempt: { provider: 'openalex', outcome: 'not-deposited', detail: 'empty inverted index' } };
    return { abstract, attempt: { provider: 'openalex', outcome: 'found' } };
  } catch (e) {
    return { attempt: { provider: 'openalex', outcome: 'error', detail: cap(e instanceof Error ? e.message : String(e)) } };
  }
}

async function crossref(cleanDoi: string): Promise<ProviderHit> {
  try {
    const res = await fetchWithTimeout(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
    if (res.status === 404) return { attempt: { provider: 'crossref', outcome: 'not-deposited', detail: 'DOI not in Crossref' } };
    if (!res.ok) return { attempt: { provider: 'crossref', outcome: 'error', detail: `HTTP ${res.status}` } };
    const m = (await res.json()) as { message?: { abstract?: string } };
    const raw = m.message?.abstract;
    if (!raw) return { attempt: { provider: 'crossref', outcome: 'not-deposited', detail: 'no deposited abstract' } };
    const abstract = stripTags(raw);
    if (!abstract) return { attempt: { provider: 'crossref', outcome: 'not-deposited', detail: 'deposited abstract stripped to empty' } };
    return { abstract, attempt: { provider: 'crossref', outcome: 'found' } };
  } catch (e) {
    return { attempt: { provider: 'crossref', outcome: 'error', detail: cap(e instanceof Error ? e.message : String(e)) } };
  }
}

async function semanticScholar(cleanDoi: string): Promise<ProviderHit> {
  try {
    const res = await fetchWithTimeout(
      `https://api.semanticscholar.org/graph/v1/paper/DOI:${encodeURIComponent(cleanDoi)}?fields=abstract`
    );
    if (res.status === 404) return { attempt: { provider: 'semantic-scholar', outcome: 'not-deposited', detail: 'paper not indexed' } };
    if (!res.ok) return { attempt: { provider: 'semantic-scholar', outcome: 'error', detail: `HTTP ${res.status}` } };
    const m = (await res.json()) as { abstract?: string | null };
    const abstract = (m.abstract || '').trim();
    if (!abstract) return { attempt: { provider: 'semantic-scholar', outcome: 'not-deposited', detail: 'no abstract on file' } };
    return { abstract, attempt: { provider: 'semantic-scholar', outcome: 'found' } };
  } catch (e) {
    return { attempt: { provider: 'semantic-scholar', outcome: 'error', detail: cap(e instanceof Error ? e.message : String(e)) } };
  }
}

async function elsevier(cleanDoi: string): Promise<ProviderHit> {
  const key = process.env.ELSEVIER_API_KEY;
  if (!key) return { attempt: { provider: 'elsevier', outcome: 'skipped', detail: 'ELSEVIER_API_KEY not set' } };
  try {
    const res = await fetchWithTimeout(
      `https://api.elsevier.com/content/abstract/doi/${encodeURIComponent(cleanDoi)}?view=META_ABS`,
      { headers: { 'X-ELS-APIKey': key, Accept: 'application/json' } }
    );
    if (res.status === 401 || res.status === 403) {
      return { attempt: { provider: 'elsevier', outcome: 'publisher-access-unavailable', detail: `HTTP ${res.status}` } };
    }
    if (res.status === 404) return { attempt: { provider: 'elsevier', outcome: 'not-deposited', detail: 'resource not found' } };
    if (!res.ok) return { attempt: { provider: 'elsevier', outcome: 'error', detail: `HTTP ${res.status}` } };
    const j = (await res.json()) as Record<string, any>;
    const core = j?.['abstracts-retrieval-response']?.coredata ?? {};
    const raw = core['dc:description'] || core?.coredata?.description || j?.['dc:description'];
    const abstract = stripTags(typeof raw === 'string' ? raw : '');
    if (!abstract) return { attempt: { provider: 'elsevier', outcome: 'not-deposited', detail: 'no dc:description in response' } };
    return { abstract, attempt: { provider: 'elsevier', outcome: 'found' } };
  } catch (e) {
    return { attempt: { provider: 'elsevier', outcome: 'error', detail: cap(e instanceof Error ? e.message : String(e)) } };
  }
}

export interface ResolveAbstractOptions {
  providers?: AbstractProvider[];
}

export async function resolveAbstract(doi: string, opts: ResolveAbstractOptions = {}): Promise<AbstractResult> {
  const clean = (doi || '').replace(/^https?:\/\/doi\.org\//i, '').trim();
  if (!clean) return { status: 'error', attempts: [{ provider: 'openalex', outcome: 'error', detail: 'empty DOI' }] };

  const order = opts.providers ?? ['openalex', 'crossref', 'semantic-scholar', 'elsevier'];
  const fns: Record<AbstractProvider, (d: string) => Promise<ProviderHit>> = {
    openalex: openAlex,
    crossref,
    'semantic-scholar': semanticScholar,
    elsevier,
  };

  const attempts: AbstractAttempt[] = [];

  // First provider to return an abstract wins; nothing after it is called.
  // (resolveAbstract stops early, so Elsevier is only reached when no free
  // provider holds the abstract.)
  for (const provider of order) {
    const hit = await fns[provider](clean);
    attempts.push(hit.attempt);
    if (hit.abstract) {
      return { status: 'found', abstract: hit.abstract, source: provider, attempts };
    }
  }

  if (attempts.some((a) => a.outcome === 'publisher-access-unavailable')) {
    return { status: 'publisher-access-unavailable', attempts };
  }
  if (attempts.some((a) => a.outcome === 'not-deposited')) {
    return { status: 'not-deposited', attempts };
  }
  return { status: 'error', attempts };
}

/** Merge the outcome into a paper's jsonb metadata (non-destructive). */
export function abstractOutcomeMetadata(previous: unknown, result: AbstractResult): Record<string, unknown> {
  const base = (previous && typeof previous === 'object' && !Array.isArray(previous)) ? { ...(previous as Record<string, unknown>) } : {};
  base.abstractStatus = result.status;
  base.abstractAttempts = result.attempts.map((a) => `${a.provider}:${a.outcome}${a.detail ? ` (${a.detail})` : ''}`);
  if (result.status === 'found') base.abstractSource = result.source;
  else delete base.abstractSource;
  return base;
}
