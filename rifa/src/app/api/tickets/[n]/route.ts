import { isAuthorized, unauthorized } from "@/lib/auth";
import { updateTicket } from "@/lib/tickets";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ n: string }> },
) {
  if (!isAuthorized(request)) return unauthorized();
  const { n: raw } = await context.params;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 1000) {
    return Response.json({ error: "número inválido" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as {
    comprador?: string;
    telefone?: string;
    pagamento?: string;
  } | null;
  if (!body) return Response.json({ error: "dados inválidos" }, { status: 400 });

  const pagamento = body.pagamento;
  if (pagamento !== undefined && !["", "Pago", "Pendente"].includes(pagamento)) {
    return Response.json({ error: "pagamento inválido" }, { status: 400 });
  }

  const ticket = await updateTicket(n, {
    comprador: body.comprador !== undefined ? String(body.comprador).trim() : undefined,
    telefone: body.telefone !== undefined ? String(body.telefone).trim() : undefined,
    pagamento,
  });
  if (!ticket) return Response.json({ error: "não encontrado" }, { status: 404 });
  return Response.json(ticket, { headers: { "cache-control": "private, no-store" } });
}
