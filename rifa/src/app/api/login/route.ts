import { accessCode, isAuthorized, loginCookie, unauthorized } from "@/lib/auth";
import { timingSafeEqual } from "node:crypto";

export async function GET(request: Request) {
  const code = accessCode();
  return Response.json(
    { ok: isAuthorized(request), needsCode: code !== "" },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const expected = accessCode();
  if (expected === "") {
    if (process.env.DATABASE_URL?.trim()) return unauthorized();
    return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
  }
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const got = String(body?.code ?? "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) return unauthorized();
  return Response.json(
    { ok: true },
    {
      headers: {
        "cache-control": "private, no-store",
        "set-cookie": loginCookie(expected),
      },
    },
  );
}
