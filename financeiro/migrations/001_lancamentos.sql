create table if not exists lancamentos (
  id text primary key,
  nome text not null,
  valor_centavos integer not null,
  status text not null,
  grupo text not null,
  vencimento date,
  lote text not null default '',
  lote_titulo text not null default '',
  lote_valor_centavos integer,
  ordem integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists caixinha (
  id text primary key,
  saldo_centavos integer not null default 0,
  negativo_centavos integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists lancamentos_grupo_idx on lancamentos (grupo, ordem);
create index if not exists lancamentos_status_idx on lancamentos (status);
