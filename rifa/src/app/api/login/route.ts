import {
  accessCode,
  clientIp,
  isAuthorized,
  loginBlocked,
  loginCookie,
  recordLoginFailure,
  recordLoginSuccess,
  tooManyAttempts,
  unauthorized,
} from "@/lib/auth";
import { timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ok = isAuthorized(request);
  return Response.json(
    { ok, needsCode: !ok },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (loginBlocked(ip)) return tooManyAttempts();

  const expected = accessCode();
  if (expected === "") {
    recordLoginFailure(ip);
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as { code?: string } | null;
  const got = String(body?.code ?? "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && timingSafeEqual(a, b);
  if (!valid) {
    recordLoginFailure(ip);
    return unauthorized();
  }

  recordLoginSuccess(ip);
  return Response.json(
    { ok: true },
    {
      headers: {
        "cache-control": "private, no-store",
        "set-cookie": loginCookie(expected, request),
      },
    },
  );
}
