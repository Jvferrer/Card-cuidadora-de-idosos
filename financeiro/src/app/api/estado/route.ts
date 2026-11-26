import { isAuthorized, unauthorized } from "@/lib/auth";
import { getEstado } from "@/lib/financeiro";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const estado = await getEstado();
  return Response.json(estado, { headers: { "cache-control": "private, no-store" } });
}
