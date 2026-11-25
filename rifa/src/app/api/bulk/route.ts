import { isAuthorized, unauthorized } from "@/lib/auth";
import { markBuyerPaid } from "@/lib/tickets";

export async function POST(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as { comprador?: string } | null;
  const comprador = String(body?.comprador ?? "").trim();
  if (!comprador) return Response.json({ error: "comprador obrigatório" }, { status: 400 });
  const updated = await markBuyerPaid(comprador);
  return Response.json({ updated }, { headers: { "cache-control": "private, no-store" } });
}
