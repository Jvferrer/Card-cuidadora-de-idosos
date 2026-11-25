"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Situacao = "Livre" | "Pago" | "Pendente" | "Reservado";

type Ticket = {
  n: number;
  bilhete: string;
  comprador: string;
  telefone: string;
  pagamento: string;
  situacao: Situacao;
};

type Resumo = {
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

type Tab = "painel" | "cobrar" | "numeros";

function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function wa(telefone: string) {
  const digits = telefone.replace(/\D/g, "");
  if (digits.length < 10) return "";
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${withCountry}`;
}

export default function Page() {
  const [needsCode, setNeedsCode] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [tab, setTab] = useState<Tab>("painel");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | Situacao>("todos");
  const [edit, setEdit] = useState<Ticket | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function load() {
    const [tRes, rRes] = await Promise.all([fetch("/api/tickets"), fetch("/api/resumo")]);
    if (tRes.status === 401 || rRes.status === 401) {
      setNeedsCode(true);
      setAuthed(false);
      return;
    }
    if (!tRes.ok || !rRes.ok) return;
    setAuthed(true);
    setTickets(await tRes.json());
    setResumo(await rRes.json());
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

  async function saveTicket(ticket: Ticket) {
    setBusy(true);
    const res = await fetch(`/api/tickets/${ticket.n}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        comprador: ticket.comprador,
        telefone: ticket.telefone,
        pagamento: ticket.pagamento,
      }),
    });
    setBusy(false);
    if (!res.ok) return;
    setEdit(null);
    setToast("Salvo");
    await load();
  }

  async function markPaid(ticket: Ticket) {
    setBusy(true);
    await fetch(`/api/tickets/${ticket.n}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pagamento: "Pago" }),
    });
    setBusy(false);
    setToast(`${ticket.bilhete} marcado como pago`);
    await load();
  }

  async function markBuyerPaid(comprador: string) {
    setBusy(true);
    await fetch("/api/bulk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ comprador }),
    });
    setBusy(false);
    setToast(`Pagos de ${comprador} confirmados`);
    await load();
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filtro !== "todos" && t.situacao !== filtro) return false;
      if (!query) return true;
      return `${t.n} ${t.bilhete} ${t.comprador} ${t.telefone}`.toLowerCase().includes(query);
    });
  }, [tickets, q, filtro]);

  const cobrar = useMemo(() => {
    const map = new Map<
      string,
      { comprador: string; telefone: string; qtd: number; situacao: Situacao; bilhetes: string[] }
    >();
    for (const t of tickets) {
      if (t.situacao !== "Pendente" && t.situacao !== "Reservado") continue;
      const key = t.comprador.trim().toLowerCase();
      const cur = map.get(key) ?? {
        comprador: t.comprador,
        telefone: t.telefone,
        qtd: 0,
        situacao: t.situacao,
        bilhetes: [],
      };
      cur.qtd += 1;
      cur.bilhetes.push(t.bilhete);
      if (t.telefone) cur.telefone = t.telefone;
      if (t.situacao === "Reservado") cur.situacao = "Reservado";
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.qtd - a.qtd);
  }, [tickets]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  if (needsCode && !authed) {
    return (
      <div className="gate">
        <form onSubmit={login}>
          <p className="note">Rifa Inazuma</p>
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

  if (!resumo) {
    return (
      <div className="app">
        <p className="note">Carregando o painel…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="hero">
        <p>Rifa Inazuma 2016</p>
        <h1>Faltam {resumo.livres}</h1>
        <p className="sub">
          {brl(resumo.aVender)} para vender · {brl(resumo.caixa)} já no PIX
        </p>
      </header>

      <div className="grid">
        <div className="metric">
          <span>Já pago</span>
          <b>{brl(resumo.caixa)}</b>
        </div>
        <div className="metric">
          <span>Falta p/ R$ 7 mil</span>
          <b>{brl(resumo.faltaSeteMil)}</b>
        </div>
        <div className="metric">
          <span>A cobrar</span>
          <b>{resumo.pendentes + resumo.reservados}</b>
        </div>
        <div className="metric">
          <span>Pagos</span>
          <b>{resumo.pagos}</b>
        </div>
      </div>

      <div className="bar" aria-hidden="true">
        <i style={{ width: `${resumo.pagos / 10}%`, background: "var(--green)" }} />
        <i style={{ width: `${resumo.pendentes / 10}%`, background: "#e8b80e" }} />
        <i style={{ width: `${resumo.reservados / 10}%`, background: "#e67e22" }} />
      </div>
      <p className="note">
        {resumo.pagos} pagos · {resumo.pendentes + resumo.reservados} a cobrar · {resumo.livres}{" "}
        livres · {Math.round((resumo.pagos / resumo.total) * 100)}% da rifa
      </p>

      <nav className="tabs">
        <button className={tab === "painel" ? "active" : ""} onClick={() => setTab("painel")}>
          Painel
        </button>
        <button className={tab === "cobrar" ? "active" : ""} onClick={() => setTab("cobrar")}>
          Cobrar ({resumo.pendentes + resumo.reservados})
        </button>
        <button className={tab === "numeros" ? "active" : ""} onClick={() => setTab("numeros")}>
          Números
        </button>
      </nav>

      {tab === "painel" ? (
        <section className="list">
          <p>
            PIX <strong>409.004.048-50</strong> · R$ {resumo.preco} o número
          </p>
          <p className="note">
            Para vender: abra Números, busque um livre, preencha o comprador e marque Pendente ou
            Pago. O painel atualiza na hora para todo mundo que estiver no link.
          </p>
        </section>
      ) : null}

      {tab === "cobrar" ? (
        <section className="list">
          {cobrar.map((c) => {
            const link = wa(c.telefone);
            return (
              <article className="row" key={c.comprador}>
                <div>
                  <strong>{c.comprador}</strong>
                  <small>
                    {c.qtd} {c.qtd === 1 ? "número" : "números"} · {c.situacao}
                    {c.telefone ? ` · ${c.telefone}` : ""}
                  </small>
                  <small style={{ display: "block" }}>{c.bilhetes.join(", ")}</small>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {link ? (
                    <a className="ghost" href={link} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  ) : null}
                  <button className="pay" disabled={busy} onClick={() => markBuyerPaid(c.comprador)}>
                    Marcar pagos
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "numeros" ? (
        <section>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar bilhete, nome ou telefone"
          />
          <div className="filters">
            {(["todos", "Livre", "Pendente", "Pago", "Reservado"] as const).map((f) => (
              <button
                key={f}
                className={filtro === f ? "active" : ""}
                onClick={() => setFiltro(f)}
              >
                {f === "todos" ? "Todos" : f}
              </button>
            ))}
          </div>
          <div className="list">
            {filtered.slice(0, 80).map((t) => (
              <div className="row" key={t.n}>
                <button
                  type="button"
                  onClick={() => setEdit(t)}
                  style={{ background: "none", border: 0, padding: 0, textAlign: "left" }}
                >
                  <strong>
                    {t.bilhete} <span className={`tag ${t.situacao}`}>{t.situacao}</span>
                  </strong>
                  <small style={{ display: "block" }}>
                    {t.comprador || "Livre para vender"}
                    {t.telefone ? ` · ${t.telefone}` : ""}
                  </small>
                </button>
                {t.situacao !== "Pago" && t.comprador ? (
                  <button className="pay" disabled={busy} onClick={() => markPaid(t)}>
                    Pago
                  </button>
                ) : (
                  <button className="ghost" onClick={() => setEdit(t)}>
                    Editar
                  </button>
                )}
              </div>
            ))}
            {filtered.length > 80 ? (
              <p className="note">Mostrando 80 de {filtered.length}. Afine a busca.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {edit ? (
        <div className="sheet" onClick={() => setEdit(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              saveTicket(edit);
            }}
          >
            <h2>
              {edit.bilhete} <span className={`tag ${edit.situacao}`}>{edit.situacao}</span>
            </h2>
            <label>
              Comprador
              <input
                value={edit.comprador}
                onChange={(e) => setEdit({ ...edit, comprador: e.target.value })}
                placeholder="Nome de quem comprou"
              />
            </label>
            <label>
              Telefone
              <input
                value={edit.telefone}
                onChange={(e) => setEdit({ ...edit, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </label>
            <label>
              Pagamento
              <select
                value={edit.pagamento}
                onChange={(e) => setEdit({ ...edit, pagamento: e.target.value })}
              >
                <option value="">Sem status</option>
                <option value="Pendente">Pendente</option>
                <option value="Pago">Pago</option>
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

      {toast ? (
        <p
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            background: "var(--navy)",
            color: "#fff",
            padding: 12,
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          {toast}
        </p>
      ) : null}
    </div>
  );
}
