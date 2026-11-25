import { isAuthorized, unauthorized } from "@/lib/auth";
import { listTickets } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const tickets = await listTickets();
  return Response.json(tickets, { headers: { "cache-control": "private, no-store" } });
}
