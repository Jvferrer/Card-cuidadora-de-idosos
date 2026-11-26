import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "financeiro_ok";

export function accessCode(): string {
  return process.env.FINANCEIRO_ACCESS_CODE?.trim() ?? "";
}

function tokenFor(code: string): string {
  return createHmac("sha256", "controle-financeiro").update(code).digest("hex");
}

export function isAuthorized(request: Request): boolean {
  const code = accessCode();
  if (code === "") return true;
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
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`;
}

export function unauthorized(): Response {
  return Response.json(
    { error: "unauthorized" },
    { status: 401, headers: { "cache-control": "private, no-store" } },
  );
}
