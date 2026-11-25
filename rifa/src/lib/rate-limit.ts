type Bucket = { n: number; reset: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX = 8;

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || "local";
}

export function tooManyLogins(ip: string): boolean {
  const now = Date.now();
  const current = buckets.get(ip);
  if (!current || current.reset < now) {
    buckets.set(ip, { n: 1, reset: now + WINDOW_MS });
    return false;
  }
  current.n += 1;
  return current.n > MAX;
}
