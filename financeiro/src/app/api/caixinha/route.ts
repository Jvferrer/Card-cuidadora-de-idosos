import { isAuthorized, unauthorized } from "@/lib/auth";
import { updateCaixinha } from "@/lib/financeiro";

function parseReais(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/[^\d.,]/g, "");
  if (!trimmed) return null;
  const parsed = trimmed.includes(",")
    ? Number(trimmed.replace(/\./g, "").replace(",", "."))
    : /^\d+[.,]\d{1,2}$/.test(trimmed)
      ? Number(trimmed)
      : Number(trimmed.replace(/\./g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100);
}

export async function PATCH(request: Request) {
  if (!isAuthorized(request)) return unauthorized();
  const body = (await request.json().catch(() => null)) as {
    saldo?: unknown;
    negativo?: unknown;
  } | null;
  if (!body) return Response.json({ error: "dados inválidos" }, { status: 400 });

  const saldoCentavos = body.saldo === undefined ? undefined : parseReais(body.saldo);
  const negativoCentavos = body.negativo === undefined ? undefined : parseReais(body.negativo);
  if (body.saldo !== undefined && saldoCentavos == null) {
    return Response.json({ error: "saldo inválido" }, { status: 400 });
  }
  if (body.negativo !== undefined && negativoCentavos == null) {
    return Response.json({ error: "negativo inválido" }, { status: 400 });
  }

  const caixinha = await updateCaixinha({
    saldoCentavos: saldoCentavos ?? undefined,
    negativoCentavos: negativoCentavos ?? undefined,
  });
  return Response.json(caixinha, { headers: { "cache-control": "private, no-store" } });
}
