import seed from "../../data/seed.json";
import { sql } from "./db";
import {
  type Caixinha,
  type Grupo,
  type Lancamento,
  type Resumo,
  type Status,
  computeResumo,
  formatWhatsApp,
} from "./format";

const COMPETENCIA = "2026-11";
const STATUSES: Status[] = ["pago", "em_aberto", "pendente", "atrasado"];

type SeedLancamento = {
  id: string;
  nome: string;
  valorCentavos: number;
  status: Status;
  grupo: Grupo;
  vencimento?: string;
  lote?: string;
  loteTitulo?: string;
  loteValorCentavos?: number;
  ordem: number;
};

type SeedFile = {
  competencia: string;
  caixinha: { saldoCentavos: number; negativoCentavos: number };
  lancamentos: SeedLancamento[];
};

function mapRow(row: {
  id: string;
  nome: string;
  valor_centavos: number | string;
  status: string;
  grupo: string;
  vencimento: string | Date | null;
  lote: string;
  lote_titulo: string;
  lote_valor_centavos: number | string | null;
  ordem: number | string;
}): Lancamento {
  const vencimento =
    row.vencimento == null
      ? null
      : typeof row.vencimento === "string"
        ? row.vencimento.slice(0, 10)
        : row.vencimento.toISOString().slice(0, 10);
  return {
    id: row.id,
    nome: row.nome,
    valorCentavos: Number(row.valor_centavos),
    status: row.status as Status,
    grupo: row.grupo as Grupo,
    vencimento,
    lote: row.lote ?? "",
    loteTitulo: row.lote_titulo ?? "",
    loteValorCentavos: row.lote_valor_centavos == null ? null : Number(row.lote_valor_centavos),
    ordem: Number(row.ordem),
  };
}

export async function ensureSeeded(): Promise<void> {
  const data = seed as SeedFile;
  await sql(`delete from lancamentos where id in ('gi-mei-1', 'gi-mei-2')`);
  for (const item of data.lancamentos) {
    await sql(
      `insert into lancamentos (
         id, nome, valor_centavos, status, grupo, vencimento, lote, lote_titulo, lote_valor_centavos, ordem
       ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       on conflict (id) do nothing`,
      [
        item.id,
        item.nome,
        item.valorCentavos,
        item.status,
        item.grupo,
        item.vencimento ?? null,
        item.lote ?? "",
        item.loteTitulo ?? "",
        item.loteValorCentavos ?? null,
        item.ordem,
      ],
    );
  }

  const caixa = await sql<{ c: string }>("select count(*)::text as c from caixinha");
  if (Number(caixa[0]?.c ?? 0) === 0) {
    await sql(
      `insert into caixinha (id, saldo_centavos, negativo_centavos) values ('atual', $1, $2)`,
      [data.caixinha.saldoCentavos, data.caixinha.negativoCentavos],
    );
  }
}

export async function listLancamentos(): Promise<Lancamento[]> {
  await ensureSeeded();
  const rows = await sql<{
    id: string;
    nome: string;
    valor_centavos: number | string;
    status: string;
    grupo: string;
    vencimento: string | Date | null;
    lote: string;
    lote_titulo: string;
    lote_valor_centavos: number | string | null;
    ordem: number | string;
  }>(
    `select id, nome, valor_centavos, status, grupo, vencimento, lote, lote_titulo, lote_valor_centavos, ordem
     from lancamentos
     order by ordem, id`,
  );
  return rows.map(mapRow);
}

export async function getCaixinha(): Promise<Caixinha> {
  await ensureSeeded();
  const [row] = await sql<{ saldo_centavos: number | string; negativo_centavos: number | string }>(
    `select saldo_centavos, negativo_centavos from caixinha where id = 'atual'`,
  );
  return {
    saldoCentavos: Number(row?.saldo_centavos ?? 0),
    negativoCentavos: Number(row?.negativo_centavos ?? 0),
  };
}

export async function getEstado(): Promise<{
  competencia: string;
  lancamentos: Lancamento[];
  caixinha: Caixinha;
  resumo: Resumo;
  whatsapp: string;
}> {
  const lancamentos = await listLancamentos();
  const caixinha = await getCaixinha();
  const resumo = computeResumo(lancamentos);
  return {
    competencia: COMPETENCIA,
    lancamentos,
    caixinha,
    resumo,
    whatsapp: formatWhatsApp(COMPETENCIA, lancamentos, resumo, caixinha),
  };
}

export function parseStatus(value: unknown): Status | null {
  return typeof value === "string" && STATUSES.includes(value as Status) ? (value as Status) : null;
}

export async function updateStatus(id: string, status: Status): Promise<Lancamento | null> {
  await ensureSeeded();
  const rows = await sql<{
    id: string;
    nome: string;
    valor_centavos: number | string;
    status: string;
    grupo: string;
    vencimento: string | Date | null;
    lote: string;
    lote_titulo: string;
    lote_valor_centavos: number | string | null;
    ordem: number | string;
  }>(
    `update lancamentos
     set status = $2, updated_at = now()
     where id = $1
     returning id, nome, valor_centavos, status, grupo, vencimento, lote, lote_titulo, lote_valor_centavos, ordem`,
    [id, status],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function updateCaixinha(patch: {
  saldoCentavos?: number;
  negativoCentavos?: number;
}): Promise<Caixinha> {
  await ensureSeeded();
  const [row] = await sql<{ saldo_centavos: number | string; negativo_centavos: number | string }>(
    `update caixinha
     set saldo_centavos = coalesce($1, saldo_centavos),
         negativo_centavos = coalesce($2, negativo_centavos),
         updated_at = now()
     where id = 'atual'
     returning saldo_centavos, negativo_centavos`,
    [patch.saldoCentavos ?? null, patch.negativoCentavos ?? null],
  );
  return {
    saldoCentavos: Number(row.saldo_centavos),
    negativoCentavos: Number(row.negativo_centavos),
  };
}
