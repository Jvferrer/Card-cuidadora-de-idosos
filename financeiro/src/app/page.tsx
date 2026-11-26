"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  type Caixinha,
  type Lancamento,
  type Resumo,
  type Status,
  brl,
  formatVencimento,
  statusLabel,
} from "@/lib/format";

type Estado = {
  competencia: string;
  lancamentos: Lancamento[];
  caixinha: Caixinha;
  resumo: Resumo;
  whatsapp: string;
};

type Tab = "receber" | "lancamentos" | "resumo";

function reaisInput(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function Page() {
  const [needsCode, setNeedsCode] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [estado, setEstado] = useState<Estado | null>(null);
  const [tab, setTab] = useState<Tab>("receber");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [edit, setEdit] = useState<Lancamento | null>(null);
  const [caixaOpen, setCaixaOpen] = useState(false);
  const [saldoDraft, setSaldoDraft] = useState("");
  const [negativoDraft, setNegativoDraft] = useState("");

  async function load() {
    const res = await fetch("/api/estado");
    if (res.status === 401) {
      setNeedsCode(true);
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setEstado(await res.json());
  }

  useEffect(() => {
    fetch("/api/login")
      .then((r) => r.json())
      .then((s: { ok: boolean; needsCode: boolean }) => {
        setNeedsCode(s.needsCode);
        if (s.ok) {
          setAuthed(true);
          return load();
        }
      })
      .catch(() => setNeedsCode(false));
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setLoginError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      setLoginError("Código incorreto.");
      return;
    }
    setAuthed(true);
    await load();
  }

  async function setStatus(id: string, status: Status) {
    setBusy(true);
    const res = await fetch(`/api/lancamentos/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    if (!res.ok) return;
    setEdit(null);
    setToast(status === "pago" ? "Marcado como pago" : "Status atualizado");
    await load();
  }

  async function saveCaixinha(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const res = await fetch("/api/caixinha", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ saldo: saldoDraft, negativo: negativoDraft }),
    });
    setBusy(false);
    if (!res.ok) {
      setToast("Não foi possível salvar a caixinha");
      return;
    }
    setCaixaOpen(false);
    setToast("Caixinha atualizada");
    await load();
  }

  async function copyWhatsApp() {
    if (!estado) return;
    try {
      await navigator.clipboard.writeText(estado.whatsapp);
      setToast("Resumo copiado para o WhatsApp");
    } catch {
      setToast("Não foi possível copiar");
    }
  }

  const abertos = useMemo(
    () => estado?.lancamentos.filter((item) => item.status !== "pago") ?? [],
    [estado],
  );

  const gruposMensalidade = useMemo(() => {
    const map = new Map<string, Lancamento[]>();
    for (const item of estado?.lancamentos.filter((l) => l.grupo === "mensalidade") ?? []) {
      const key = item.vencimento ?? "sem-vencimento";
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [estado]);

  const extras = useMemo(() => {
    const items = estado?.lancamentos.filter((item) => item.grupo === "extra") ?? [];
    const lotes = new Map<string, Lancamento[]>();
    const avulsos: Lancamento[] = [];
    for (const item of items) {
      if (!item.lote) {
        avulsos.push(item);
        continue;
      }
      const list = lotes.get(item.lote) ?? [];
      list.push(item);
      lotes.set(item.lote, list);
    }
    return { lotes: [...lotes.values()], avulsos };
  }, [estado]);

  const novos = estado?.lancamentos.filter((item) => item.grupo === "novo") ?? [];

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  if (needsCode && !authed) {
    return (
      <div className="gate">
        <form onSubmit={login}>
          <p className="note">Controle financeiro</p>
          <h1>Digite o código</h1>
          <p className="note">O mesmo código combinado no WhatsApp.</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            type="password"
            autoComplete="current-password"
            placeholder="Código de acesso"
          />
          {loginError ? <p className="error">{loginError}</p> : null}
          <button className="pay" type="submit">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (!estado) {
    return (
      <div className="app">
        <p className="note">Carregando o painel…</p>
      </div>
    );
  }

  const { resumo, caixinha } = estado;
  const pct = resumo.previstoCentavos
    ? Math.round((resumo.recebidoCentavos / resumo.previstoCentavos) * 100)
    : 0;

  return (
    <div className="app">
      <header className="hero">
        <p>Controle financeiro · novembro/2026</p>
        <h1>{brl(resumo.aReceberCentavos)}</h1>
        <p className="sub">a receber · {brl(resumo.recebidoCentavos)} já pagos de {brl(resumo.previstoCentavos)}</p>
        <div className="hero-actions">
          <button className="copy" type="button" onClick={copyWhatsApp}>
            Copiar resumo
          </button>
        </div>
      </header>

      <div className="grid">
        <div className="metric">
          <span>Previsto</span>
          <b>{brl(resumo.previstoCentavos)}</b>
        </div>
        <div className="metric">
          <span>Recebido</span>
          <b>{brl(resumo.recebidoCentavos)}</b>
        </div>
        <div className="metric">
          <span>Pendente</span>
          <b>{brl(resumo.pendenteCentavos)}</b>
        </div>
        <div className="metric">
          <span>Em atraso</span>
          <b>{brl(resumo.atrasoCentavos)}</b>
        </div>
        <button
          className="metric"
          type="button"
          onClick={() => {
            setSaldoDraft(reaisInput(caixinha.saldoCentavos));
            setNegativoDraft(reaisInput(caixinha.negativoCentavos));
            setCaixaOpen(true);
          }}
        >
          <span>Caixinha</span>
          <b>{brl(caixinha.saldoCentavos)}</b>
        </button>
        <div className="metric">
          <span>Saldo negativo</span>
          <b>{brl(caixinha.negativoCentavos)}</b>
        </div>
      </div>

      <div className="bar" aria-hidden="true">
        <i
          style={{
            width: `${pct}%`,
            background: "var(--green)",
          }}
        />
      </div>
      <p className="note">
        {pct}% recebido · {abertos.length} {abertos.length === 1 ? "item em aberto" : "itens em aberto"}
      </p>

      <nav className="tabs">
        <button className={tab === "receber" ? "active" : ""} onClick={() => setTab("receber")}>
          A receber ({abertos.length})
        </button>
        <button className={tab === "lancamentos" ? "active" : ""} onClick={() => setTab("lancamentos")}>
          Lançamentos
        </button>
        <button className={tab === "resumo" ? "active" : ""} onClick={() => setTab("resumo")}>
          Resumo
        </button>
      </nav>

      {tab === "receber" ? (
        <section className="list">
          {abertos.length === 0 ? (
            <p className="empty">Nada em aberto neste mês.</p>
          ) : (
            abertos.map((item) => (
              <article className="row" key={item.id}>
                <div>
                  <strong>
                    {item.nome} <span className={`tag ${item.status}`}>{statusLabel(item.status)}</span>
                  </strong>
                  <small>
                    {brl(item.valorCentavos)}
                    {item.vencimento ? ` · vence ${formatVencimento(item.vencimento)}` : ""}
                    {item.loteTitulo ? ` · ${item.loteTitulo}` : ""}
                  </small>
                </div>
                <button className="pay" disabled={busy} onClick={() => setStatus(item.id, "pago")}>
                  Pago
                </button>
              </article>
            ))
          )}
        </section>
      ) : null}

      {tab === "lancamentos" ? (
        <section>
          {gruposMensalidade.map(([due, items]) => (
            <div key={due}>
              <h2 className="section-title">Vencimento {formatVencimento(due)}</h2>
              <div className="list">
                {items.map((item) => (
                  <LancamentoRow
                    key={item.id}
                    item={item}
                    busy={busy}
                    onPaid={() => setStatus(item.id, "pago")}
                    onEdit={() => setEdit(item)}
                  />
                ))}
              </div>
            </div>
          ))}

          <h2 className="section-title">Serviços extras</h2>
          <div className="list">
            {extras.lotes.map((parts) => {
              const head = parts[0];
              const loteValor =
                head.loteValorCentavos ?? parts.reduce((sum, part) => sum + part.valorCentavos, 0);
              return (
                <article className="lote" key={head.lote}>
                  <div className="lote-head">
                    <strong>{head.loteTitulo}</strong>
                    <span>{brl(loteValor)}</span>
                  </div>
                  {parts.map((item) => (
                    <LancamentoRow
                      key={item.id}
                      item={item}
                      busy={busy}
                      onPaid={() => setStatus(item.id, "pago")}
                      onEdit={() => setEdit(item)}
                    />
                  ))}
                </article>
              );
            })}
            {extras.avulsos.map((item) => (
              <LancamentoRow
                key={item.id}
                item={item}
                busy={busy}
                onPaid={() => setStatus(item.id, "pago")}
                onEdit={() => setEdit(item)}
              />
            ))}
          </div>

          <h2 className="section-title">Clientes novos</h2>
          <div className="list">
            {novos.map((item) => (
              <LancamentoRow
                key={item.id}
                item={item}
                busy={busy}
                onPaid={() => setStatus(item.id, "pago")}
                onEdit={() => setEdit(item)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "resumo" ? (
        <section className="list">
          <article className="row">
            <div>
              <strong>Fechamento geral</strong>
              <small>
                Previsto {brl(resumo.previstoCentavos)} · recebido {brl(resumo.recebidoCentavos)}
              </small>
            </div>
          </article>
          <article className="row">
            <div>
              <strong>A receber</strong>
              <small>{brl(resumo.aReceberCentavos)} em aberto, sem atraso lançado</small>
            </div>
          </article>
          <article className="row">
            <div>
              <strong>Caixinha</strong>
              <small>
                Saldo {brl(caixinha.saldoCentavos)} · negativo {brl(caixinha.negativoCentavos)}
              </small>
            </div>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setSaldoDraft(reaisInput(caixinha.saldoCentavos));
                setNegativoDraft(reaisInput(caixinha.negativoCentavos));
                setCaixaOpen(true);
              }}
            >
              Editar
            </button>
          </article>
          <pre
            className="empty"
            style={{ whiteSpace: "pre-wrap", color: "var(--ink)", fontFamily: "inherit" }}
          >
            {estado.whatsapp}
          </pre>
        </section>
      ) : null}

      {edit ? (
        <div className="sheet" onClick={() => setEdit(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              setStatus(edit.id, edit.status);
            }}
          >
            <h2>{edit.nome}</h2>
            <p className="note">{brl(edit.valorCentavos)}</p>
            <label>
              Status
              <select
                value={edit.status}
                onChange={(e) => setEdit({ ...edit, status: e.target.value as Status })}
              >
                <option value="pago">Pago</option>
                <option value="em_aberto">Em aberto</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
              </select>
            </label>
            <button className="pay" disabled={busy} type="submit">
              Salvar
            </button>
            <button className="ghost" type="button" onClick={() => setEdit(null)}>
              Cancelar
            </button>
          </form>
        </div>
      ) : null}

      {caixaOpen ? (
        <div className="sheet" onClick={() => setCaixaOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={saveCaixinha}>
            <h2>Caixinha</h2>
            <label>
              Saldo atual
              <input
                value={saldoDraft}
                onChange={(e) => setSaldoDraft(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label>
              Saldo negativo
              <input
                value={negativoDraft}
                onChange={(e) => setNegativoDraft(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <button className="pay" disabled={busy} type="submit">
              Salvar
            </button>
            <button className="ghost" type="button" onClick={() => setCaixaOpen(false)}>
              Cancelar
            </button>
          </form>
        </div>
      ) : null}

      {toast ? <p className="toast">{toast}</p> : null}
    </div>
  );
}

function LancamentoRow({
  item,
  busy,
  onPaid,
  onEdit,
}: {
  item: Lancamento;
  busy: boolean;
  onPaid: () => void;
  onEdit: () => void;
}) {
  return (
    <article className="row">
      <button type="button" onClick={onEdit} style={{ background: "none", border: 0, padding: 0, textAlign: "left" }}>
        <strong>
          {item.nome} <span className={`tag ${item.status}`}>{statusLabel(item.status)}</span>
        </strong>
        <small>{brl(item.valorCentavos)}</small>
      </button>
      {item.status !== "pago" ? (
        <button className="pay" disabled={busy} onClick={onPaid}>
          Pago
        </button>
      ) : (
        <button className="ghost" type="button" onClick={onEdit}>
          Editar
        </button>
      )}
    </article>
  );
}
