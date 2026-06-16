# QA Checklist (Base ISTQB)

Este checklist aplica uma abordagem de QA orientada a risco, com foco em prevenção de defeitos antes de publicar.

## 1) Critérios de entrada (Entry Criteria)

- Requisitos de negócio atualizados (preço, WhatsApp, proposta de valor).
- Ambiente local funcional (`npm install` concluído).
- Dados de contato validados em `src/config.ts`.

## 2) Testes estáticos

- `npm run lint` sem erros.
- `npm run format:check` sem diferenças.
- Revisão manual de conteúdo crítico (headline, CTA, preço, confiança).

## 3) Testes dinâmicos automatizados

- `npm run test` com 100% de aprovação.
- Casos cobertos:
  - Geração correta do link WhatsApp.
  - Sanitização do telefone.
  - Tratamento de telefone inválido.
  - Atualização automática do ano atual.
  - Atalhos assistivos (Alt+W, Alt+S) e regras de segurança (ignorar Ctrl+Alt).

## 4) Testes funcionais manuais (alto risco)

- Clique em todos os botões `.whatsapp-link` no desktop e no mobile.
- Validar fluxo de contato abre conversa com a mensagem correta.
- Validar navegação por teclado (Tab e atalhos Alt+W, Alt+S, Alt+C).
- Validar leitura de anúncio assistivo (`#assistive-status`) após atalhos.

## 5) Testes não funcionais

- Responsividade em 3 larguras mínimas: 360px, 768px, 1280px.
- Sem overflow horizontal.
- Performance: página carrega sem travamentos visíveis.
- Compatibilidade mínima: Chrome e Edge atualizados.

## 6) Critérios de saída (Exit Criteria)

- Gate `npm run qa` aprovado.
- Sem defeitos críticos/altos abertos.
- Checklist manual revisado e aprovado.

## 7) Evidências de teste (recomendado)

Registrar em cada release:

- Data/hora da execução.
- Resultado dos comandos (`lint`, `test`, `build`).
- Versão liberada (ex.: `v1.0.x`).
- Defeitos encontrados e ação corretiva.
