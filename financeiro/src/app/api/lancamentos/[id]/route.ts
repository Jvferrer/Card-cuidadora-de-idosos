import { isAuthorized, unauthorized } from "@/lib/auth";
import { parseStatus, updateStatus } from "@/lib/financeiro";

const ID_PATTERN = /^[a-z0-9-]{1,64}$/;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isAuthorized(request)) return unauthorized();
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) {
    return Response.json({ error: "id inválido" }, { status: 400 });
  }
  const body = (await request.json().catch(() => null)) as { status?: string } | null;
  const status = parseStatus(body?.status);
  if (!status) return Response.json({ error: "status inválido" }, { status: 400 });
  const lancamento = await updateStatus(id, status);
  if (!lancamento) return Response.json({ error: "não encontrado" }, { status: 404 });
  return Response.json(lancamento, { headers: { "cache-control": "private, no-store" } });
}
