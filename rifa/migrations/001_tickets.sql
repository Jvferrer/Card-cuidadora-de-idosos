create table if not exists tickets (
  n integer primary key,
  bilhete text not null,
  comprador text not null default '',
  telefone text not null default '',
  pagamento text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists tickets_pagamento_idx on tickets (pagamento);
create index if not exists tickets_comprador_idx on tickets (comprador);
