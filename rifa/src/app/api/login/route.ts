import {
  accessCode,
  codesMatch,
  isAuthorized,
  isLocalOpen,
  loginCookie,
  sameOrigin,
  unauthorized,
} from "@/lib/auth";
import { clientIp, tooManyLogins } from "@/lib/rate-limit";

export async function GET(request: Request) {
  return Response.json(
    { ok: isAuthorized(request), needsCode: !isLocalOpen() },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return unauthorized();
  const expected = accessCode();
  if (expected === "") {
    if (isLocalOpen()) {
      return Response.json({ ok: true }, { headers: { "cache-control": "private, no-store" } });
    }
    return unauthorized();
  }
  if (tooManyLogins(clientIp(request))) {
    return Response.json(
      { error: "too_many" },
      { status: 429, headers: { "cache-control": "private, no-store" } },
    );
  }
  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const got = String(body?.code ?? "");
  if (!codesMatch(got, expected)) return unauthorized();
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
