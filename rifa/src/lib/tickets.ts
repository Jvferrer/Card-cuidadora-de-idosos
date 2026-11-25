import seed from "../../data/seed.json";
import { sql } from "./db";

export type Ticket = {
  n: number;
  bilhete: string;
  comprador: string;
  telefone: string;
  pagamento: string;
  situacao: "Livre" | "Pago" | "Pendente" | "Reservado";
};

export type Resumo = {
  total: number;
  livres: number;
  pagos: number;
  pendentes: number;
  reservados: number;
  preco: number;
  caixa: number;
  aReceber: number;
  aVender: number;
  faltaSeteMil: number;
  faltaCompletar: number;
  numerosParaSeteMil: number;
};

const PRECO = 20;
const META = 7000;

const SITUACAO_SQL = `case
  when btrim(comprador) = '' then 'Livre'
  when pagamento = 'Pago' then 'Pago'
  when pagamento = 'Pendente' then 'Pendente'
  else 'Reservado'
end`;

let seeding: Promise<void> | undefined;

export async function ensureSeeded(): Promise<void> {
  seeding ??= seedOnce().catch((error: unknown) => {
    seeding = undefined;
    throw error;
  });
  await seeding;
}

async function seedOnce(): Promise<void> {
  const rows = await sql<{ c: string }>("select count(*)::text as c from tickets");
  if (Number(rows[0]?.c ?? 0) > 0) return;

  const items = seed as Array<{
    n: number;
    bilhete: string;
    comprador: string;
    telefone: string;
    pagamento: string;
  }>;
  const chunkSize = 100;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const values: unknown[] = [];
    const placeholders = chunk.map((t, idx) => {
      const base = idx * 5;
      values.push(t.n, t.bilhete, t.comprador ?? "", t.telefone ?? "", t.pagamento ?? "");
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    });
    await sql(
      `insert into tickets (n, bilhete, comprador, telefone, pagamento) values ${placeholders.join(",")}
       on conflict (n) do nothing`,
      values,
    );
  }
}

export async function listTickets(): Promise<Ticket[]> {
  await ensureSeeded();
  return sql<Ticket>(
    `select n, bilhete, comprador, telefone, pagamento, ${SITUACAO_SQL} as situacao
     from tickets
     order by n`,
  );
}

export async function getResumo(): Promise<Resumo> {
  await ensureSeeded();
  const [row] = await sql<{
    total: string;
    livres: string;
    pagos: string;
    pendentes: string;
    reservados: string;
  }>(`select
      count(*)::text as total,
      count(*) filter (where btrim(comprador) = '')::text as livres,
      count(*) filter (where pagamento = 'Pago')::text as pagos,
      count(*) filter (where btrim(comprador) <> '' and pagamento = 'Pendente')::text as pendentes,
      count(*) filter (where btrim(comprador) <> '' and pagamento <> 'Pago' and pagamento <> 'Pendente')::text as reservados
    from tickets`);
  if (!row) {
    return {
      total: 0,
      livres: 0,
      pagos: 0,
      pendentes: 0,
      reservados: 0,
      preco: PRECO,
      caixa: 0,
      aReceber: 0,
      aVender: 0,
      faltaSeteMil: META,
      faltaCompletar: 0,
      numerosParaSeteMil: Math.ceil(META / PRECO),
    };
  }
  const livres = Number(row.livres);
  const pagos = Number(row.pagos);
  const pendentes = Number(row.pendentes);
  const reservados = Number(row.reservados);
  const caixa = pagos * PRECO;
  return {
    total: Number(row.total),
    livres,
    pagos,
    pendentes,
    reservados,
    preco: PRECO,
    caixa,
    aReceber: (pendentes + reservados) * PRECO,
    aVender: livres * PRECO,
    faltaSeteMil: Math.max(0, META - caixa),
    faltaCompletar: Math.max(0, Number(row.total) * PRECO - caixa),
    numerosParaSeteMil: Math.ceil(Math.max(0, META - caixa) / PRECO),
  };
}

export async function updateTicket(
  n: number,
  patch: { comprador?: string; telefone?: string; pagamento?: string },
): Promise<Ticket | null> {
  await ensureSeeded();
  const comprador = patch.comprador ?? undefined;
  const telefone = patch.telefone ?? undefined;
  const pagamento = patch.pagamento ?? undefined;

  const rows = await sql<Ticket>(
    `update tickets set
       comprador = coalesce($2, comprador),
       telefone = coalesce($3, telefone),
       pagamento = coalesce($4, pagamento),
       updated_at = now()
     where n = $1
     returning n, bilhete, comprador, telefone, pagamento, ${SITUACAO_SQL} as situacao`,
    [n, comprador ?? null, telefone ?? null, pagamento ?? null],
  );
  return rows[0] ?? null;
}

export async function markBuyerPaid(comprador: string): Promise<number> {
  await ensureSeeded();
  const rows = await sql<{ c: string }>(
    `update tickets set pagamento = 'Pago', updated_at = now()
     where lower(btrim(comprador)) = lower(btrim($1))
     returning n`,
    [comprador],
  );
  return rows.length;
}
