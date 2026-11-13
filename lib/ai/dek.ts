/**
 * AI-generated news deks for publisher-blocked papers (abstract unavailable).
 *
 * One honest sentence, grounded ONLY in the title + journal + year — the
 * model is forbidden from inventing numbers, methods, specimen details or
 * results it cannot see. Used by propose as a fallback when the abstract
 * resolver comes back empty; a machine-written dek is marked with
 * body.dekGenerated so review can spot and replace it. Never overwrites a
 * human- or abstract-derived dek.
 *
 * Requires OPENROUTER_API_KEY (the .env value is a placeholder until you add
 * a real free-tier key: https://openrouter.ai/keys — `<model>:free` models
 * cost nothing). Silently degrades to the headline fallback without a key.
 */
export async function generateDek(input: { title: string; journal?: string | null; year?: number | null }, opts: { apiKey?: string; model?: string; timeoutMs?: number } = {}): Promise<string | null> {
  const apiKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
  if (!apiKey) return null; // no key configured — degrade to headline
  const model = opts.model ?? process.env.OPENROUTER_MODEL ?? 'google/gemma-4-31b-it:free';
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const ctx = [
    `Title: ${input.title}`,
    input.journal ? `Journal: ${input.journal}` : null,
    input.year ? `Year: ${input.year}` : null,
  ].filter(Boolean).join(' | ');
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dinosauria.net',
        'X-Title': 'Dinosauria Network',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You write news deks for a dinosaur palaeontology news site. Given only a paper title, journal and year, write ONE sentence (max 220 characters), neutral and declarative, summarizing what the paper reports. Never invent numbers, methods, specimens, institutions or results beyond what the title implies. Output only the dek text — no quotes, no markdown, no "This paper…" filler.',
          },
          { role: 'user', content: ctx },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const detail = String(await res.text().catch(() => '')).slice(0, 120);
      console.warn('dek: OpenRouter HTTP', res.status, detail || '(no body)', '→ using fallback');
      return null;
    }
    const j: any = await res.json();
    let dek = String(j?.choices?.[0]?.message?.content ?? '').trim();
    // Strip accidental wrapper quotes / trailing punctuation artifacts.
    dek = dek.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').replace(/\s+/g, ' ').trim();
    if (dek.length < 20) return null; // model misfired — use the fallback instead
    return dek.slice(0, 300);
  } catch {
    return null;
  }
}
