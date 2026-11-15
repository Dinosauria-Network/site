const requests = new Map<string, number[]>();
const MAX_REQUESTS = 30;
const WINDOW_MS = 60000;

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const history = requests.get(ip) || [];
  const recent = history.filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  requests.set(ip, recent);
  return recent.length <= MAX_REQUESTS;
}
