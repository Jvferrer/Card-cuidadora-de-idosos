import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "rifa_ok";
const MAX_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

type Attempts = { fails: number; blockedUntil: number };
const attempts = new Map<string, Attempts>();

export function accessCode(): string {
  return process.env.RIFA_ACCESS_CODE?.trim() ?? "";
}

function tokenFor(code: string): string {
  return createHmac("sha256", code).update("rifa_ok").digest("hex");
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function loginBlocked(ip: string): boolean {
  const row = attempts.get(ip);
  return Boolean(row && row.blockedUntil > Date.now());
}

export function recordLoginFailure(ip: string): void {
  const now = Date.now();
  const row = attempts.get(ip) ?? { fails: 0, blockedUntil: 0 };
  if (row.blockedUntil > now) return;
  row.fails += 1;
  if (row.fails >= MAX_FAILS) {
    row.blockedUntil = now + LOCK_MS;
    row.fails = 0;
  }
  attempts.set(ip, row);
}

export function recordLoginSuccess(ip: string): void {
  attempts.delete(ip);
}

export function isAuthorized(request: Request): boolean {
  const code = accessCode();
  if (code === "") return false;
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE}=`));
  if (!match) return false;
  const got = match.slice(COOKIE.length + 1);
  const expected = tokenFor(code);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function loginCookie(code: string, request?: Request): string {
  const value = tokenFor(code);
  const proto = request?.headers.get("x-forwarded-proto") ?? "";
  const secure = proto.includes("https") || Boolean(request?.url.startsWith("https:"));
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure ? "; Secure" : ""}`;
}

export function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "cache-control": "private, no-store" } },
  );
}

export function tooManyAttempts(): Response {
  return Response.json(
    { error: "too many attempts" },
    { status: 429, headers: { "cache-control": "private, no-store", "retry-after": "900" } },
  );
}
