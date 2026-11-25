import { isAuthorized, unauthorized } from "@/lib/auth";
import { getResumo } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const resumo = await getResumo();
  return Response.json(resumo, { headers: { "cache-control": "private, no-store" } });
}
