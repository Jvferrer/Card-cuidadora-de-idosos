export type Status = "pago" | "em_aberto" | "pendente" | "atrasado";
export type Grupo = "mensalidade" | "extra" | "novo";

export type Lancamento = {
  id: string;
  nome: string;
  valorCentavos: number;
  status: Status;
  grupo: Grupo;
  vencimento: string | null;
  lote: string;
  loteTitulo: string;
  loteValorCentavos: number | null;
  ordem: number;
};

export type Caixinha = {
  saldoCentavos: number;
  negativoCentavos: number;
};

export type Resumo = {
  previstoCentavos: number;
  recebidoCentavos: number;
  pendenteCentavos: number;
  aReceberCentavos: number;
  atrasoCentavos: number;
};

const STATUS_LABEL: Record<Status, string> = {
  pago: "PAGO",
  em_aberto: "EM ABERTO",
  pendente: "PENDENTE",
  atrasado: "ATRASADO",
};

const STATUS_MARK: Record<Status, string> = {
  pago: "✅",
  em_aberto: "🟡",
  pendente: "⏳",
  atrasado: "🚨",
};

export function brl(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function computeResumo(lancamentos: Lancamento[]): Resumo {
  let previstoCentavos = 0;
  let recebidoCentavos = 0;
  let pendenteCentavos = 0;
  let atrasoCentavos = 0;

  for (const item of lancamentos) {
    previstoCentavos += item.valorCentavos;
    if (item.status === "pago") {
      recebidoCentavos += item.valorCentavos;
    } else if (item.status === "atrasado") {
      atrasoCentavos += item.valorCentavos;
      pendenteCentavos += item.valorCentavos;
    } else {
      pendenteCentavos += item.valorCentavos;
    }
  }

  return {
    previstoCentavos,
    recebidoCentavos,
    pendenteCentavos,
    aReceberCentavos: pendenteCentavos,
    atrasoCentavos,
  };
}

function formatDayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function lineFor(item: Lancamento): string {
  return `${STATUS_MARK[item.status]} ${item.nome} — ${brl(item.valorCentavos)} — ${STATUS_LABEL[item.status]}`;
}

function loteStatusMark(items: Lancamento[]): string {
  if (items.every((item) => item.status === "pago")) return "✅";
  if (items.some((item) => item.status === "atrasado")) return "🚨";
  return "🟡";
}

export function formatWhatsApp(
  competencia: string,
  lancamentos: Lancamento[],
  resumo: Resumo,
  caixinha: Caixinha,
): string {
  const [year, month] = competencia.split("-");
  const monthNames = [
    "JANEIRO",
    "FEVEREIRO",
    "MARÇO",
    "ABRIL",
    "MAIO",
    "JUNHO",
    "JULHO",
    "AGOSTO",
    "SETEMBRO",
    "OUTUBRO",
    "NOVEMBRO",
    "DEZEMBRO",
  ];
  const monthName = monthNames[Number(month) - 1] ?? month;
  const divider = "━━━━━━━━━━━━━━━";
  const lines: string[] = [
    `💰 CONTROLE FINANCEIRO DE CLIENTES – ${monthName}/${year}`,
    "",
    divider,
    "",
  ];

  const mensalidades = lancamentos.filter((item) => item.grupo === "mensalidade");
  const byDue = new Map<string, Lancamento[]>();
  for (const item of mensalidades) {
    const key = item.vencimento ?? "";
    const list = byDue.get(key) ?? [];
    list.push(item);
    byDue.set(key, list);
  }
  for (const [due, items] of byDue) {
    if (due) lines.push(`📅 VENCIMENTO ${formatDayMonth(due)}`, "");
    for (const item of items) lines.push(lineFor(item));
    lines.push("");
  }

  const extras = lancamentos.filter((item) => item.grupo === "extra");
  if (extras.length > 0) {
    lines.push(divider, "", "🧾 SERVIÇOS EXTRAS", "");
    const seenLotes = new Set<string>();
    for (const item of extras) {
      if (item.lote) {
        if (seenLotes.has(item.lote)) continue;
        seenLotes.add(item.lote);
        const parts = extras.filter((extra) => extra.lote === item.lote);
        const titulo = item.loteTitulo || item.nome;
        const loteValor = item.loteValorCentavos ?? parts.reduce((sum, part) => sum + part.valorCentavos, 0);
        lines.push(`${loteStatusMark(parts)} ${titulo} — ${brl(loteValor)}`);
        for (const part of parts) lines.push(lineFor(part));
        lines.push("");
      } else {
        lines.push(lineFor(item), "");
      }
    }
  }

  const novos = lancamentos.filter((item) => item.grupo === "novo");
  if (novos.length > 0) {
    lines.push(divider, "", "👥 CLIENTES NOVOS", "");
    for (const item of novos) lines.push(lineFor(item));
    lines.push("");
  }

  lines.push(
    divider,
    "",
    `📊 RESUMO FINANCEIRO – ${monthName}/${year}`,
    "",
    `💰 Total previsto: ${brl(resumo.previstoCentavos)}`,
    `✅ Total recebido: ${brl(resumo.recebidoCentavos)}`,
    `⏳ Total pendente: ${brl(resumo.pendenteCentavos)}`,
    `💵 Total a receber: ${brl(resumo.aReceberCentavos)}`,
    `🚨 Total em atraso: ${brl(resumo.atrasoCentavos)}`,
    "",
    divider,
    "",
    "💰 CAIXINHA",
    "",
    `🏦 Saldo atual: ${brl(caixinha.saldoCentavos)}`,
    `📉 Saldo negativo atual: ${brl(caixinha.negativoCentavos)}`,
    "",
    divider,
    "",
    "📈 FECHAMENTO GERAL",
    "",
    `💰 Total previsto: ${brl(resumo.previstoCentavos)}`,
    `✅ Total recebido: ${brl(resumo.recebidoCentavos)}`,
    `⏳ Total pendente: ${brl(resumo.pendenteCentavos)}`,
    `💵 Total a receber: ${brl(resumo.aReceberCentavos)}`,
    `🏦 Saldo da caixinha: ${brl(caixinha.saldoCentavos)}`,
    `📉 Saldo negativo atual: ${brl(caixinha.negativoCentavos)}`,
  );

  return lines.join("\n");
}

export function statusLabel(status: Status): string {
  return STATUS_LABEL[status];
}

export function formatVencimento(isoDate: string | null): string {
  if (!isoDate) return "";
  return formatDayMonth(isoDate);
}
