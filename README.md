# Landing Page - Cuidadora de Idosos

Landing page em Vite + TypeScript para divulgar o atendimento de cuidadora de idosos da Priscila Ferrer e captar contatos pelo WhatsApp.

## Requisitos

- Node.js instalado.
- npm instalado.

## Como rodar

Instale as dependências:

```bash
npm install
```

Rode o ambiente de desenvolvimento:

```bash
npm run dev
```

Gere a versão final para publicação:

```bash
npm run build
```

Visualize a versão final localmente:

```bash
npm run preview
```

## Como configurar o WhatsApp

No arquivo `src/config.ts`, troque o valor de `whatsappPhone` pelo número real, usando o formato internacional:

```ts
whatsappPhone: "5511973531120";
```

Exemplo: para um número de São Paulo, use `55` + `11` + número, sem espaços, parênteses ou traços.

Também é possível editar a mensagem inicial em `whatsappMessage`.

## Como personalizar conteúdo

- Edite os textos comerciais, serviços e depoimentos em `index.html`.
- Edite cores, espaçamentos e responsividade em `style.css`.
- Edite dados comerciais e textos reutilizáveis em `src/config.ts`.
- Edite comportamentos de interação em `src/main.ts`.
- Edite regras reutilizáveis do WhatsApp em `src/whatsapp.ts`.
- Mantenha os depoimentos como conteúdo curado, sem permitir envio direto pelo visitante.

## Qualidade de código

Verifique problemas de código:

```bash
npm run lint
```

Formate os arquivos:

```bash
npm run format
```

Rode os testes automatizados:

```bash
npm run test
```

Antes de publicar, o fluxo recomendado é:

```bash
npm run lint
npm run test
npm run build
```

## Publicação

Após rodar `npm run build`, publique a pasta `dist` em Netlify, Vercel, GitHub Pages ou qualquer hospedagem estática.

Antes de publicar, confira:

- Número correto do WhatsApp em `src/config.ts`.
- Depoimentos reais autorizados pelas famílias.
- Informações de preço e disponibilidade atualizadas.
- Teste em celular, principalmente os botões de WhatsApp.
