import fs from 'fs';
import path from 'path';

export interface BoostRule {
  term: string;
  boost: number;
  match?: 'title' | 'title+abstract';
}

const MAX_TOTAL_BOOST = 0.25;

let cachedRules: BoostRule[] | null = null;

/** Load boost rules from config/boost-rules.json (cached after first read). */
export function loadBoostRules(): BoostRule[] {
  if (cachedRules) return cachedRules;
  const filePath = path.join(process.cwd(), 'config', 'boost-rules.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedRules = parsed.filter((r: any) =>
        typeof r?.term === 'string' && typeof r?.boost === 'number' && r.boost > 0
      ) as BoostRule[];
    } else {
      cachedRules = [];
    }
  } catch {
    cachedRules = [];
  }
  return cachedRules;
}

/** Clear the cached rules (useful for tests). */
export function clearBoostCache(): void {
  cachedRules = null;
}

export interface BoostResult {
  effectiveScore: number;
  boosts: string[];
}

/**
 * Apply configured boost rules to a paper's score. The raw score is never
 * mutated; the boost is computed at gate time and capped at +0.25 total.
 * Boosts only raise the score, never lower it.
 */
export function computeBoost(title: string, abstract: string, rawScore: number): BoostResult {
  const rules = loadBoostRules();
  const haystacks = {
    title: (title || '').toLowerCase(),
    abstract: (abstract || '').toLowerCase(),
  };
  const boosts: string[] = [];
  let totalBoost = 0;
  for (const rule of rules) {
    const term = rule.term.toLowerCase();
    const scope = rule.match === 'title'
      ? haystacks.title
      : (haystacks.title + ' ' + haystacks.abstract);
    if (scope.includes(term)) {
      totalBoost += rule.boost;
      boosts.push(`${rule.term} +${rule.boost}`);
    }
  }
  totalBoost = Math.min(totalBoost, MAX_TOTAL_BOOST);
  const effectiveScore = Math.min(1.0, rawScore + totalBoost);
  return { effectiveScore, boosts };
}
