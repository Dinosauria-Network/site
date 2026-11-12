/**
 * Backwards-compatible wrapper around the multi-provider resolver
 * (lib/ingestion/abstracts.ts). Prefer resolveAbstract() directly — it returns
 * a typed outcome (found / not-deposited / publisher-access-unavailable / error)
 * instead of collapsing everything to null.
 */
import { resolveAbstract } from './abstracts';

export async function fetchOpenAlexAbstract(doi: string): Promise<string | null> {
  const result = await resolveAbstract(doi, { providers: ['openalex'] });
  return result.status === 'found' ? result.abstract : null;
}
