import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "rifa_ok";
const MAX_CODE_LEN = 64;

export function accessCode(): string {
  return process.env.RIFA_ACCESS_CODE?.trim() ?? "";
}

export function isLocalOpen(): boolean {
  return accessCode() === "" && !process.env.DATABASE_URL?.trim();
}

function tokenFor(code: string): string {
  return createHmac("sha256", code).update("rifa-ok").digest("hex");
}

export function isAuthorized(request: Request): boolean {
  const code = accessCode();
  if (code === "") return isLocalOpen();
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

export function loginCookie(code: string): string {
  const value = tokenFor(code);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`;
}

export function codesMatch(got: string, expected: string): boolean {
  if (got.length > MAX_CODE_LEN || expected.length > MAX_CODE_LEN) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hostKey(host: string): string {
  const raw = host.trim().toLowerCase();
  const hostname = raw.startsWith("[") ? raw.slice(0, raw.indexOf("]") + 1) : raw.split(":")[0];
  const port = raw.startsWith("[")
    ? raw.slice(raw.lastIndexOf(":") + 1)
    : raw.includes(":")
      ? raw.split(":")[1]
      : "";
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  return `${loopback ? "loopback" : hostname}:${port}`;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const forwarded = request.headers.get("x-forwarded-host");
    const headerHost = (forwarded ?? request.headers.get("host") ?? "").split(",")[0]?.trim();
    if (headerHost && hostKey(originHost) === hostKey(headerHost)) return true;
    return hostKey(originHost) === hostKey(new URL(request.url).host);
  } catch {
    return false;
  }
}

export function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "cache-control": "private, no-store" } },
  );
}
