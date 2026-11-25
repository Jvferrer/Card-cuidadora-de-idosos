import { isAuthorized, sameOrigin, unauthorized } from "@/lib/auth";
import { markBuyerPaid } from "@/lib/tickets";

export async function POST(request: Request) {
  if (!sameOrigin(request) || !isAuthorized(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as { comprador?: string } | null;
  const comprador = String(body?.comprador ?? "").trim().slice(0, 120);
  if (!comprador) return Response.json({ error: "comprador obrigatório" }, { status: 400 });
  const updated = await markBuyerPaid(comprador);
  return Response.json({ updated }, { headers: { "cache-control": "private, no-store" } });
}
