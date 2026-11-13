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
 * Providers (first match wins, with automatic fallback):
 *   1. GEMINI_API_KEY → Google AI Studio Gemini API, OpenAI-compatible
 *      endpoint, Flash-Lite model by default (GEMINI_MODEL to override).
 *      Free tier, no credit card. https://aistudio.google.com/apikey
 *   2. OPENROUTER_API_KEY → OpenRouter (OPENROUTER_MODEL to override).
 *   Neither configured (or both fail) → null, propose degrades to the
 *   headline fallback with a logged reason.
 */
export async function generateDek(input: { title: string; journal?: string | null; year?: number | null }, opts: { apiKey?: string; model?: string; timeoutMs?: number } = {}): Promise<string | null> {
  const timeoutMs = opts.timeoutMs ?? 30_000;
  const ctx = [
    `Title: ${input.title}`,
    input.journal ? `Journal: ${input.journal}` : null,
    input.year ? `Year: ${input.year}` : null,
  ].filter(Boolean).join(' | ');
  const system = 'You write news deks for a dinosaur palaeontology news site. Given only a paper title, journal and year, write ONE sentence (max 220 characters), neutral and declarative, summarizing what the paper reports. Never invent numbers, methods, specimens, institutions or results beyond what the title implies. Output only the dek text — no quotes, no markdown, no "This paper…" filler.';

  const geminiKey = process.env.GEMINI_API_KEY ?? '';
  if (geminiKey) {
    const model = opts.model ?? process.env.GEMINI_MODEL ?? 'gemini-2.5-flash-lite';
    const dek = await callChatCompletions({
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      headers: { Authorization: `Bearer ${geminiKey}` },
      model,
      system,
      ctx,
      label: 'Gemini',
      timeoutMs,
    });
    if (dek) return dek;
    console.warn('dek: Gemini failed — trying OpenRouter fallback');
  }

  const openrouterKey = opts.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
  if (openrouterKey) {
    const model = opts.model ?? process.env.OPENROUTER_MODEL ?? 'google/gemma-4-31b-it:free';
    return callChatCompletions({
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://dinosauria.net',
        'X-Title': 'Dinosauria Network',
      },
      model,
      system,
      ctx,
      label: 'OpenRouter',
      timeoutMs,
    });
  }

  return null; // no provider configured — degrade to headline
}

async function callChatCompletions(args: {
  url: string;
  headers: Record<string, string>;
  model: string;
  system: string;
  ctx: string;
  label: string;
  timeoutMs: number;
}): Promise<string | null> {
  try {
    const res = await fetch(args.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...args.headers },
      body: JSON.stringify({
        model: args.model,
        messages: [
          { role: 'system', content: args.system },
          { role: 'user', content: args.ctx },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(args.timeoutMs),
    });
    if (!res.ok) {
      const detail = String(await res.text().catch(() => '')).slice(0, 120);
      console.warn(`dek: ${args.label} HTTP`, res.status, detail || '(no body)');
      return null;
    }
    const j: any = await res.json();
    let dek = String(j?.choices?.[0]?.message?.content ?? '').trim();
    // Strip accidental wrapper quotes / trailing punctuation artifacts.
    dek = dek.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').replace(/\s+/g, ' ').trim();
    if (dek.length < 20) return null; // model misfired — use the fallback instead
    return dek.slice(0, 300);
  } catch (e) {
    console.warn(`dek: ${args.label} request failed:`, String(e).slice(0, 120));
    return null;
  }
}
