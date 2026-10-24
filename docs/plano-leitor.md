# O Leitor — plano de desenvolvimento do protótipo web

Base: `leitor.html` (fonte de verdade), `BRIEFING.md`, `system-prompt-v1.md` e as duas imagens (capa e mesa).
Status: **proposta, aguardando aprovação do autor.** Nenhum código foi escrito.

---

## 1. A história deste plano

- **Situação.** O protótipo funciona dentro do Claude: um arquivo só, chamando o modelo por uma ponte de artefato e guardando dados no `db` da conta. O autor já o validou com leituras reais.
- **Problema.** Fora do Claude não existe ponte. Precisamos de um servidor que guarde a chave, converse com a API da Anthropic, repasse o streaming e persista tudo, **sem mudar uma vírgula do comportamento nem do visual**. Também falta construir o que o protótipo nunca teve: o **Ponto de Quebra** com travamento.
- **Escalada.** Primeiro o servidor que lê (o risco de custo e de contrato). Depois a mesa. Depois o desenho. Depois a conversa. Por último a parada, que depende de comportamento do modelo que só se conhece testando.
- **Fim.** Um cliente real lê um roteiro de 6 blocos, recarrega a página no meio, e nada se perde.

---

## 2. O que o repositório atual é, e uma decisão que precisa vir primeiro

O repositório `Talker-Translate` já contém **outro produto**: tradutor com Gemini (React 19 + Vite + Express em `server.ts`, Tailwind, totem J6 em three.js). Nada disso pertence ao Leitor.

O padrão técnico, porém, serve: Express na frente do Vite, chave só no servidor.

**Recomendação:** o Leitor vive numa pasta própria, `leitor/`, com `package.json` próprio. Não toca em `src/`, `server.ts` nem nas dependências do Talker Translate. Se preferir um repositório novo, o plano não muda, só o caminho.

---

## 3. Decisões que o briefing deixou em aberto (com recomendação)

| # | Decisão | Recomendação | Por quê |
|---|---|---|---|
| D1 | Onde o código mora | Pasta `leitor/` neste repositório | Esta sessão só alcança este repositório; separar depois é barato |
| D2 | Front-end | **TypeScript + Vite, sem framework**, portando o JS imperativo do protótipo | O núcleo do protótipo pinta `<mark>`, setas e SVG direto no DOM, a partir de posições de texto. Reescrever isso em React é onde nascem regressões nos grifos sincronizados. Os trechos puros viram módulos testáveis. React fica como opção posterior |
| D3 | Servidor | Node + Express + `@anthropic-ai/sdk`, streaming repassado por SSE | Já é o padrão do repo; chave nunca vai ao navegador |
| D4 | Banco | **SQLite** (arquivo) | Protótipo para um cliente por alguns dias. Exige hospedagem com disco persistente. Se for serverless, troca-se por Postgres sem mudar o modelo de dados |
| D5 | Hospedagem | Um serviço Node pequeno com volume (Fly.io, Railway ou Render) | Casa com SQLite e com SSE longo (leituras duram dezenas de segundos) |
| D6 | Login | **Senha única por leitor**, cookie `httpOnly` assinado | Link mágico exige provedor de e-mail. Serve para o primeiro cliente |
| D7 | Tela "ver o prompt" | Sai da interface; vira rota `/admin/prompt` protegida | O briefing a lista como andaime; o autor ainda a vê quando quiser |
| D8 | Dados do cliente | Cada leitor só vê as próprias sessões (filtro por `userId` em toda consulta) | Sem isso, dois clientes se leem um ao outro |

---

## 4. Arquitetura

```
leitor/
  prompts/system-prompt-v1.md      # texto do autor, byte a byte. Entra em `system`
  public/img/capa.jpg, mesa.jpg    # as duas imagens (ver nota abaixo)
  shared/                          # puro, sem DOM nem rede; roda no navegador e nos testes
    grafico.ts    separarGrafico, limparLeitura, grafDe, TEMPOS
    citacoes.ts   normMap, limparQuote, chaveQuote, acharMarcas
    quebra.ts     detectarPontoDeQuebra
    tipos.ts      Sessao, Bloco, Contest, Nota, Uso
  server/
    index.ts      Express, cookies, SSE
    auth.ts       login, sessão, isolamento por usuário
    db.ts         SQLite
    conversa.ts   montarTurnos(), blocoMsg()   <- único lugar que monta o que o Leitor recebe
    leitor.ts     chamada à API: system + cache_control + stream + usage real + abort
    rotas/        sessoes, blocos (ler, retentar, contestar), notas
  web/            ports das telas, em módulos pequenos
    capa, mesa, entrega, bloco, prosa, pagina (fresta), tempos (SVG), notas, leituras, api (cliente SSE)
    css/leitor.css   copiado do protótipo; tokens do :root, tema escuro único, Oswald/Caveat/Newsreader
  test/           unit, API, e2e
```

### Contratos de arquitetura

1. **Envelope por construção, não por disciplina.** `montarTurnos()` no servidor lê só `texto`, `intencao`, `leituraRaw` e `contest`. Post-its ficam numa **tabela separada** que esse código nunca consulta. Quem conhece a intenção não lê; quem lê não conhece a intenção: aqui isso deixa de depender de lembrar. Um teste prova que um post-it com texto-isca nunca aparece no corpo da chamada.
2. **O navegador não monta prompt.** Ele manda "leia o bloco n da sessão X". O servidor monta os turnos a partir do que está guardado. É o que torna o cache previsível e a regra do envelope verificável.
3. **`leituraRaw` é guardado cru**, incluindo a linha `@@GRAFICO`. Os turnos seguintes devolvem exatamente esse texto ao Leitor (é a memória dele). Limpar na gravação mudaria a memória e invalidaria o cache. Limpa-se só na exibição (`limparLeitura`).
4. **Formato dos turnos igual ao do protótipo** (`turnosV1`): cada bloco anterior (`Bloco n — posição: x% a y% do texto`, texto, e `Selado pelo autor antes da leitura: …` se houver), a leitura do Leitor, as contestações e respostas, e por fim o bloco novo. A diferença é que o V1 vai em `system`, não colado na primeira mensagem do usuário.
5. **Cache.** `cache_control` no `system` e no último turno do histórico. O `usage` real (`input`, `output`, `cache_read`, `cache_write`) é gravado por bloco e por contestação.
6. **Parar.** O cliente aborta o fetch. O servidor detecta o fechamento, aborta a chamada à Anthropic e **grava o que já chegou**. Erro no meio do stream faz o mesmo.
7. **Teste A/B com uma variável.** `PROMPT_FILE` e `MODELO` vêm de configuração. Cada bloco grava `versaoPrompt` (rótulo + hash curto do arquivo) e `modelo` reais. Cada contestação grava os mesmos dois campos. Trocar só o arquivo do prompt, ou só o modelo, é uma mudança de uma linha.
8. **Salvaguarda de custo.** Um stream por usuário por vez, limite de tamanho do bloco e teto mensal por leitor em US$ calculado do `usage` real. Pelo briefing, uma leitura com Opus custa ≈ US$ 1,85 sem cache e ≈ US$ 0,53 com cache; sem teto, um erro de laço custa caro.

### Dados

Como na seção 7 do briefing, com três diferenças:

- `Bloco.versaoPrompt` (novo, pedido pelo briefing) e `modelo` real.
- `Bloco.quebra`: `null | 'aberta' | 'resolvida'` (para a parada, ato 5).
- `Nota` em tabela própria, ligada ao bloco por `(sessaoId, n)`.

---

## 5. Mapa do protótipo para o app

| Protótipo | No app |
|---|---|
| `Amostra` / `window.claude.use('sample')` | `server/leitor.ts` + SSE para `web/api.ts` |
| `Store`, `db`, `user` | `server/db.ts` + `auth.ts` |
| `turnosV1`, `blocoMsgV1` | `server/conversa.ts` |
| `separarGrafico`, `limparLeitura`, `grafDe`, `num` | `shared/grafico.ts` |
| `normMap`, `limparQuote`, `chaveQuote`, `acharMarcas` | `shared/citacoes.ts` |
| `TEMPOS` | `shared/grafico.ts` (faixas fixas: 0–2, 2–20, 20–85, 85–98, 98–100; formação 75–85) |
| `prosaMd`, `inlineMd`, `pintarPagina`, `irParaPagina`, `irParaLeitura`, `setasMao` | `web/prosa.ts`, `web/pagina.ts` |
| `desenharTempos`, `pintarTempos`, `pintarRascunho`, `caminhoMao`, `tremor` | `web/tempos.ts` |
| `renderEntrega`, `entregaValida`, `lerRascunho` | `web/entrega.ts` (rascunho segue em `localStorage`; nunca vai ao servidor antes da entrega) |
| `lerBloco`, `contestar`, `iniciarFrases` | `web/bloco.ts` + `rotas/blocos` |
| `pintarNotas`, `colarNota`, `avaliarSelecao` | `web/notas.ts` + `rotas/notas` |
| `pintarLeituras`, `apagarSessao`, `confirmarDuasVezes` | `web/leituras.ts` |
| `textoCopia` | `web/bloco.ts` |
| `atualizarUso` (estimativa por caracteres) | usa o `usage` real |

**Fica de fora**, conforme o briefing: prompts v3 e v3 ajustado, reações ao vivo, beats e antecipação, teste gêmeo e comparação, seletores de prompt e modelo, painel "condições deste teste". O chip "protótipo de teste" da capa fica como selo.

**Detalhes que o briefing não diz e o código mostra:**

- O V1 envia **todo** o histórico, sem o corte `recortarAnterior` (esse é só do v3). Mantemos assim; "texto grande demais" vira o erro `prompt_too_large`.
- A contestação no V1 existe só para o último bloco (`contestar` entra como turno de `b.n + 1`). O servidor passa a impor isso, em vez de só esconder o botão.
- O protótipo chama com `cache: false`. O cache é inteiramente novo.
- `<title>` está dentro do `<body>` no HTML original; no app vai para o `<head>`.

---

## 6. Os atos (marcos), com o critério de saída de cada um

Tamanho relativo: P < M < G.

### Ato 0 — Fundação (P)
- Criar `leitor/` com Vite + TS + Express, scripts `dev`, `build`, `lint`, `test`.
- Copiar as duas imagens para `public/img/`, o prompt para `prompts/` e o CSS do protótipo para `web/css/`. Fixar o hash do prompt.
- Extrair as funções puras para `shared/` **sem alterá-las**, com testes de caracterização.
- **Saída:** o app sobe, serve a capa e os testes de `shared/` passam contra fixtures.

### Ato 1 — O servidor que lê (G, o maior risco técnico)
- Login e isolamento por usuário. SQLite. CRUD de sessões e blocos.
- `montarTurnos()`, chamada com `system` e cache, SSE com texto, `fim` (com `usage`) e `erro`. Abortar, gravar parcial, um stream por usuário.
- Script de linha de comando que alimenta um roteiro fixture em 6 blocos, com uma contestação por bloco.
- **Spike do Ponto de Quebra** (ver ato 5): rodar um roteiro com ruptura plantada e **registrar exatamente como o modelo abre a resposta**.
- **Saída:** 6 blocos lidos pelo script; `cache_read > 0` a partir do bloco 2; custo real por leitura registrado; nenhuma chave em arquivo servido ao navegador.

### Ato 2 — A mesa (G)
- Capa (imagem, anel pulsante e botão sobre o ícone laranja), "continuar" e "começar outra leitura".
- Folha de entrega: título (só no bloco 1), de % a %, texto, intenção selada, validação, rascunho que sobrevive a recarregamento.
- Leitura em streaming: frases de ambiente na folha vazia, relógio, "parar", "tentar de novo".
- Prosa: seções, grifos numerados, selos `CHEIRO[...]`, setas ↗ e ↘. Fresta fixa no topo com aba "ampliar/recolher"; lado a lado no computador.
- **Saída:** um bloco lido de ponta a ponta no computador e em 390 px, sem rolagem horizontal; grifos funcionam nos dois sentidos.

### Ato 3 — O desenho (M)
- Gráfico geral dos cinco tempos e rascunho ampliado por bloco: faixas V1, cortes do autor, curva à mão com tremor determinístico, marcas sem sobreposição, fronteiras percebidas. No celular, o geral mostra só curva e pontos.
- Tolerância total: linha ausente, quebrada, entre crases, pela metade durante o stream. O bloco aparece normal, sem desenho.
- **Saída:** com fixtures reais, o desenho bate com o do protótipo; sem a linha, nenhum erro; nenhuma tela mostra "Ajustes:" nem `@@GRAFICO`.

### Ato 4 — A conversa (M)
- Contestação (só no último bloco; uma linha `@@GRAFICO` nova vale a mais recente).
- Post-its: "+ post-it" ao selecionar, "+ colar um post-it" no pé, edição, arrancar, persistência.
- Copiar leitura (limpa, com contestações e post-its).
- Leituras guardadas: lista, abrir, apagar com confirmação dupla; a última abre sozinha.
- Contador de uso real, por bloco e por leitura.
- **Saída:** post-its sobrevivem a recarregar e o teste do envelope passa.

### Ato 5 — A parada: Ponto de Quebra (M, depende do spike)
O que o briefing pede: destacar a acusação, travar a entrega do próximo bloco até o autor contestar ou mudar o texto, e **nunca** oferecer "seguir assim mesmo".

- **Detecção** em `shared/quebra.ts`: a resposta começa com `PONTO DE QUEBRA`, ignorando acentos, caixa e marcadores como `**`, `#`, `>`. Durante o stream, o destaque aparece assim que as primeiras palavras chegam.
- **Travamento no servidor**: a rota de novo bloco responde `409` enquanto `quebra = 'aberta'`. Esconder o botão não basta.
- **Duas saídas**: contestar (vale para o bloco com quebra) ou reescrever o texto do bloco e relê-lo.
- **Ponto aberto de verdade**: o prompt não define um marcador para "o Leitor cedeu". Proposta a calibrar no spike: a quebra passa a `resolvida` quando a resposta à contestação, ou a nova leitura do texto reescrito, **não** abre com `PONTO DE QUEBRA`. Se o modelo cedendo ainda abrir de outro jeito, ajusto a regra com o autor antes de fechar o ato.
- **Saída:** com o roteiro de ruptura plantada, o bloco é destacado, a entrega seguinte é recusada pelo servidor, e as duas saídas destravam. Num roteiro limpo, nada dispara.

### Ato 6 — Prova e entrega (M)
- Percorrer todos os critérios de aceite (seção 7) com um roteiro real.
- Deploy, criação do login do primeiro cliente, conferência da chave e do cache em produção.
- **Saída:** checklist do briefing inteiro marcado, com evidência.

---

## 7. Critérios de aceite do briefing, e como cada um é provado

| Critério | Prova |
|---|---|
| 6 blocos, recarregar no meio restaura tudo | E2E (Playwright) com a API simulada, mais uma rodada manual com a API real |
| Gráfico aparece com a linha; sem ela, leitura normal e sem erro | Unit com fixtures: completa, ausente, quebrada, entre crases, truncada |
| Nunca mostra "Ajustes:" nem `@@GRAFICO` | Unit de `limparLeitura` e verificação no DOM do E2E |
| Grifos nos dois sentidos, computador e 390 px, sem rolagem horizontal | E2E em dois tamanhos de tela; compara `scrollWidth` com `clientWidth` |
| Post-its sobrevivem a recarregar e não vão à API | E2E, mais teste de servidor que inspeciona o corpo da chamada simulada |
| "Parar" interrompe e guarda o que chegou | Teste de servidor: aborta no meio, confere o parcial gravado |
| Chave não aparece em arquivo servido | Varredura do `dist/` e das respostas HTTP pelo padrão `sk-ant-` |
| Cache aparece no `usage` a partir do bloco 2 | Roteiro de 6 blocos com a API real; `cache_read > 0` |

**Fixtures:** o ideal é partir de leituras reais do protótipo, não inventadas. Peço ao autor 2 ou 3 (ver seção 9).

---

## 8. Riscos

1. **O Ponto de Quebra depende de comportamento do modelo.** Mitigação: spike no ato 1 e regra de resolução calibrada com o autor.
2. **Regressão nos grifos.** `normMap` e `chaveQuote` normalizam acentos, aspas e espaços e mapeiam de volta ao texto original. Mitigação: extração literal com testes de caracterização antes de qualquer mexida.
3. **Cache que não pega.** Qualquer diferença de bytes no prefixo o quebra. Mitigação: `leituraRaw` cru, montagem de turnos determinística e teste que compara dois prefixos.
4. **Custo.** Mitigação: salvaguardas do contrato 8.
5. **SSE por trás de proxies.** Alguns bufferizam. Mitigação: cabeçalhos corretos e `keep-alive` periódico; conferir no ambiente de deploy.
6. **Fidelidade visual.** O visual é o produto. Mitigação: CSS copiado literalmente, tokens do `:root` intocados, comparação por captura de tela com o protótipo, aberto ao lado, no fim dos atos 2 e 3.
7. **Cobertura da capa.** O botão e o anel são posicionados em percentagem sobre a imagem 572×1024. Qualquer troca de imagem exige recalibrar.

---

## 9. O que preciso do autor

1. **Aprovação deste plano**, com as decisões D1 a D8, como o briefing manda.
2. **Uma chave da API da Anthropic** para o servidor. O `.env.example` atual só tem a do Gemini.
3. **Dois roteiros de teste:** um limpo, com 6 blocos já cortados e as porcentagens; e outro com **uma ruptura plantada de propósito**, de continuidade (tempo, espaço ou causa) ou de gênero, para calibrar o Ponto de Quebra.
4. **Duas ou três leituras reais** do protótipo (`leituraRaw` ou o texto copiado), para as fixtures.
5. **Confirmação do mapeamento das imagens.** Mapeei por conteúdo, não pela ordem de envio: a do leitor na poltrona, com o título, é a **capa** (`capa.jpg`); a da mesa com roteiro anotado é o **fundo da mesa** (`mesa.jpg`). Se a numeração "página 1 / página 2" que você usou for outra, é só dizer.

---

## 10. Fora do escopo deste protótipo

Cadastro aberto de usuários, pagamento, múltiplos prompts na interface, comparação de leituras, tema claro, aplicativo móvel nativo, edição do roteiro depois de entregue (exceto o caso do Ponto de Quebra).
