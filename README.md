# Mimo — Controle de Gastos

SPA de controle financeiro pessoal em **HTML + CSS + JavaScript puro**. Sem framework e sem build: basta abrir o `index.html`. As duas únicas bibliotecas são carregadas por CDN — **Chart.js** para os gráficos e **Lucide** para os ícones.

![Mimo](assets/mimo-logo.png)

---

## Sumário

- [Como rodar](#como-rodar)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Bibliotecas](#bibliotecas)
- [Requisitos atendidos](#requisitos-atendidos)
- [Como o dinheiro é contado](#como-o-dinheiro-é-contado)
- [Arquitetura do JavaScript](#arquitetura-do-javascript)
  - [1. Dados](#1-dados)
  - [2. Helpers](#2-helpers)
  - [3. Estado](#3-estado)
  - [4. Derivações](#4-derivações)
  - [5. Renderização](#5-renderização)
  - [6. Ações](#6-ações)
  - [7. Eventos](#7-eventos)
- [Modelo de dados](#modelo-de-dados)
- [Parcelamento](#parcelamento)
- [Validação](#validação)
- [Temas](#temas)
- [Responsividade](#responsividade)
- [Diferenciais implementados](#diferenciais-implementados)

---

## Como rodar

Abrir `index.html` direto no navegador já funciona. Para servir via HTTP (recomendado, pois o `localStorage` em `file://` é restrito em alguns navegadores):

```bash
python -m http.server 8000
# http://127.0.0.1:8000/index.html
```

---

## Estrutura de arquivos

```
index.html     estrutura semântica: 3 views, painel lateral, dock, 2 modais
               e as definições SVG do mascote
styles.css     design tokens, componentes e a versão desktop
mobile.css     tudo que muda em tela pequena, num arquivo só
app.js         toda a lógica da aplicação, comentada por seção
assets/        logo, símbolo da marca e ícone da aba
```

## Bibliotecas

Duas, ambas por CDN e com versão fixada:

| Biblioteca | Versão | Para quê |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.5.1 | gráfico de barras dos 12 meses e rosca das categorias |
| [Lucide](https://lucide.dev/) | 1.37.0 | ícones da interface |

Como vêm de CDN, a **primeira** abertura precisa de internet (depois o navegador usa o cache). Sem elas o app continua rodando: os gráficos deixam de aparecer e os ícones ficam vazios, mas cadastro, edição, exclusão, totais e listagem seguem funcionando — as duas chamadas são protegidas por `if (window.Chart)` e `if (window.lucide)`.

O mascote, o avatar e a sparkline diária continuam sendo SVG e CSS escritos à mão, porque não são ícones nem gráficos de dados.

O `app.js` é envolvido por uma **IIFE** com `"use strict"` — nada vaza para o escopo global:

```js
(() => {
  "use strict";
  /* ... */
})();
```

---

## Requisitos atendidos

| # | Requisito | Onde está |
|---|---|---|
| 1 | Cadastrar movimentação | `abrirNova()` + `salvar()` |
| 2 | Definir Entrada ou Saída | botões `.switch__option` → `setForm({ tipo })` |
| 3 | Descrição, categoria e valor | `formVazio()` e o formulário do modal (também data e status) |
| 4 | Editar movimentação | `abrirEdicao(id)` |
| 5 | Excluir movimentação | `confirmarExclusao()` com modal de confirmação |
| 6 | Listar movimentações | view "Movimentações" (`renderLista`) + "recentes" na visão geral |
| 7 | Total de Entradas | `somaTipo(itens, "entrada")` — exibido em `#valor-entradas` e `#total-entradas` |
| 8 | Total de Saídas | `somaTipo(itens, "saida")` — `#valor-saidas` e `#total-saidas` |
| 9 | Saldo Final | rodapé da lista, rotulado "Saldo final", via `reduce` em `renderLista` |
| 10 | Validar antes de cadastrar | `salvar()` — descrição, valor e data antes de gravar |
| 11 | Arrays e objetos | `state.itens` é um array de objetos; toda derivação usa `map/filter/reduce`. Uma compra parcelada vira N objetos por `map` |
| 12 | UI dinâmica a partir dos dados | `setState()` → `render()` — a UI é sempre função do estado |
| 13 | Funções com responsabilidade definida | 7 seções isoladas: dados, helpers, estado, derivações, render, ações, eventos |

> **Sobre os totais:** a visão geral e a tela de categorias mostram o **mês em foco**, escolhido pelo seletor de mês. Os totais **globais** ficam no rodapé da view "Movimentações", rotulados como "Total de entradas", "Total de saídas" e "Saldo final". Essa lista nunca é filtrada por mês, justamente para que esses três números existam. Como os filtros de tipo, status e busca recalculam os totais, o contador acima da tabela ("13 de 13 registros") diz sempre quantos registros estão sendo somados.

---

## Como o dinheiro é contado

A distinção central do app é entre **o que é do mês** e **o que é seu**. Elas não se comportam igual quando o mês vira.

| Número | Zera no dia 1º? | Por quê |
|---|---|---|
| Resultado do mês (entradas − saídas) | sim | é o desempenho daquele mês |
| Limite mensal, média/dia, regra 50/30/20 | sim | são orçamento e comportamento do mês |
| Categorias | sim | descrevem onde o dinheiro do mês foi |
| **Saldo** | **não** | é acumulado: dinheiro não evapora no dia 1º |
| **Contas em aberto** | **não** | dívida não some porque o calendário virou |

O saldo soma tudo que aconteceu até o fim do mês em foco:

```js
// datas ISO comparam como texto, e nenhum dia passa de 31
const ateAqui = ordenados.filter(i => i.data <= `${state.mesRef}-31`);
const saldo = somaTipo(ateAqui, "entrada") - somaTipo(ateAqui, "saida");
```

As pendências usam o mesmo recorte, então uma conta de agosto continua cobrando em setembro — mas **não** aparece se você voltar para julho. Pendência carrega para frente, nunca retroativamente.

O mês em foco é estado (`state.mesRef`), navegável pelas setas `‹ ›` que existem na visão geral e em categorias. `andarMes()` respeita os limites: do lançamento mais antigo até o mês corrente.

---

## Arquitetura do JavaScript

O fluxo é unidirecional e sempre o mesmo:

```
evento do usuário → ação → setState() → render() → DOM
                                ↑
                          derivar() lê o estado
                          e devolve tudo pronto
```

Nenhuma função de render calcula número: elas só desenham o que `derivar()` entregou. Isso mantém cálculo e apresentação separados.

### 1. Dados

Constantes no topo do arquivo: `CATS` (categorias), `CORES` (paleta dos gráficos), `MESES`, `ESSENCIAIS`/`DESEJOS` (regra 50/30/20), `LIMITE_MENSAL`, `STORAGE_KEY` e `SEED` (13 movimentações de exemplo, espalhadas por 4 meses, para a primeira visita).

As datas do `SEED` **não** são fixas: cada exemplo guarda há quantos meses ele acontece, e `dataSeed()` transforma isso em data real na hora que a página carrega.

```js
const dataSeed = (mesesAtras, dia) => {
  const mes = new Date(HOJE.getFullYear(), HOJE.getMonth() - mesesAtras, 1);
  const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  return `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}-${pad(Math.min(dia, ultimoDia))}`;
};

{ id: 1, tipo: "entrada", descricao: "Salário", /* ... */ data: dataSeed(0, 5) }
```

Com data fixa o painel abriria vazio assim que o mês virasse, já que a visão geral mostra o mês corrente. O `Math.min(dia, ultimoDia)` cobre o dia 31 caindo em mês de 30 dias e em fevereiro.

### 2. Helpers

Funções puras e pequenas, cada uma com um trabalho só:

| Função | O que faz |
|---|---|
| `$(sel)` | atalho para `document.querySelector` |
| `pad(n)` / `isoDe(date)` | montam data no formato `YYYY-MM-DD` |
| `mesAnterior(chave)` | `"2026-08"` → `"2026-07"` (cruza a virada de ano corretamente) |
| `esc(valor)` | escapa `& < > " '` — usado em **todo** dado que entra via `innerHTML` |
| `parseNum(texto)` | `"1.234,56"` → `1234.56` (formato brasileiro) |
| `dataFmt(iso)` | `"2026-08-05"` → `"05 ago 2026"` |
| `dataBr(iso)` / `isoDeBr(texto)` | convertem entre `2026-09-01` e `01/09/2026`, nos dois sentidos |
| `mascaraData(texto)` | vai pondo as barras conforme se digita |
| `dataAdiante(iso, meses)` | mesma data N meses à frente, sem estourar mês curto |
| `dividirEmParcelas(total, n)` | divide em centavos e devolve as N fatias |
| `pct(parte, total)` | percentual arredondado, protegido contra divisão por zero |
| `fmt(valor)` | moeda via `Intl.NumberFormat("pt-BR")`, ou `••••••` no modo privado |

As datas de referência (`HOJE`, `MES_REF`, `DIA_HOJE`, `DIAS_NO_MES`) são calculadas uma vez, a partir do relógio real.

### 3. Estado

Um único objeto guarda **tudo** que a tela precisa saber:

```js
let state = {
  view: "geral",          // geral | lista | categorias
  itens: carregarItens(),
  mesRef: MES_REF,        // mês em foco, navegável
  pagina: 1,              // página da lista
  query: "", tipoFiltro: "todos", statusFiltro: "todos",
  drawer: false, privado: false, tema: temaSalvo(), flip: false,
  modal: false, editando: null, excluir: null,
  erro: "", form: formVazio()
};
```

Dois atalhos em cima de `setState` deixam clara a intenção de cada mudança:

```js
const setForm = patch => setState({ form: { ...state.form, ...patch }, erro: "" });

// mexer em filtro ou busca muda o tamanho da lista: voltar à primeira página
const setFiltro = patch => setState({ ...patch, pagina: 1 });
```

A única forma de mudar o estado é `setState`, que **nunca muta** — cria um objeto novo com spread e redesenha:

```js
const setState = patch => {
  state = { ...state, ...patch };
  render();
};

const setForm = patch => setState({ form: { ...state.form, ...patch }, erro: "" });
```

`carregarItens()` lê o `localStorage` e cai no `SEED` se não houver nada salvo ou se o JSON estiver corrompido; `persistir(itens)` grava. Ambos usam `try/catch` — se o navegador bloquear o storage, o app continua funcionando em memória.

### 4. Derivações

Funções puras que transformam `state.itens` no que a tela precisa. É aqui que vivem `map`, `filter` e `reduce`:

```js
// soma de um tipo: filtra e acumula
const somaTipo = (itens, tipo) => itens
  .filter(i => i.tipo === tipo)
  .reduce((total, i) => total + i.valor, 0);

// ordena sem mutar o array original
const ordenar = itens => [...itens].sort((a, b) => (
  a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id
));
```

`decorar(item)` recebe uma movimentação crua e devolve **uma cópia** com os campos de apresentação prontos (sinal `+`/`-`, classe de cor, valor formatado, rótulo de status):

```js
const decorar = item => ({
  ...item,
  sinal: item.tipo === "entrada" ? "+" : "-",
  valorFmt: `${item.tipo === "entrada" ? "+ " : "- "}${fmt(item.valor)}`,
  dataLabel: dataFmt(item.data),
  statusLabel: item.status === "pendente" ? "Pendente" : "Concluído",
  /* ... */
});
```

`porCategoria` agrupa as saídas do mês encadeando quatro operações — `filter` → `reduce` (vira um mapa `{categoria: total}`) → `Object.entries` → `map` → `sort`:

```js
const porCategoria = itensMes => Object.entries(
  itensMes
    .filter(i => i.tipo === "saida")
    .reduce((acc, i) => ({ ...acc, [i.categoria]: (acc[i.categoria] || 0) + i.valor }), {})
)
  .map(([nome, valor]) => ({ nome, valor }))
  .sort((a, b) => b.valor - a.valor)
  .map((cat, indice) => ({ ...cat, cor: CORES[indice % CORES.length] }));
```

`serieMeses` monta os últimos 12 meses com `Array.from` e soma cada um. `porDia` agrupa por dia do mês para a sparkline. `filtrarVisiveis` aplica os três filtros da lista em cadeia (tipo, status e busca textual).

`derivar()` é o **ponto único de verdade**: chama todas as funções acima e devolve um objeto com saldo acumulado, resultado do mês, entradas, saídas, pendentes, variação vs. mês anterior, série do gráfico, categorias, regra 50/30/20, o calendário do mês em foco e a lista já filtrada e paginada.

A paginação também nasce aqui, e de propósito **os totais continuam somando a lista filtrada inteira**, não a página:

```js
const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
const pagina = Math.min(state.pagina, paginas);   // apagar itens não deixa numa página fantasma
const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
```

### 5. Renderização

`render()` decide o que está visível e delega. Cada `render*` cuida de um pedaço da tela e **não calcula nada**:

| Função | Responsabilidade |
|---|---|
| `renderCabecalho` | período, % do limite, estados dos botões |
| `renderPainel` | limite mensal, sobra, média/dia, regra 50/30/20, contas em aberto |
| `renderSparkline` | barra por dia do mês |
| `renderCartao` | cartão 3D com frente/verso das pendências |
| `renderGrafico` | gráfico de barras dos 12 meses (Chart.js) |
| `renderDonut` | rosca das categorias (Chart.js) + legenda |
| `renderGeral` | saldo, variação, totais e as recentes |
| `renderLista` | filtros, tabela agrupada por mês, paginação, totais, estado vazio |
| `renderCategorias` | 4 indicadores + detalhamento por categoria |
| `renderModal` / `renderExclusao` | formulário (com parcelamento) e confirmação |

Listas são geradas com `map(...).join("")` e injetadas via `innerHTML`, sempre passando os dados por `esc()`.

#### Os gráficos e o ciclo de render

`render()` roda inteiro a cada mudança de estado — inclusive a cada tecla digitada na busca. Criar um `new Chart()` toda vez vazaria instâncias e reanimaria o gráfico sem parar, então as duas instâncias ficam guardadas fora das funções: na primeira passada são criadas, nas seguintes só recebem os dados novos.

```js
if (graficoFluxo) {
  graficoFluxo.data.datasets[0].data = entradas;
  graficoFluxo.data.datasets[1].data = saidas;
  graficoFluxo.update("none");   // "none" = sem reanimar
  return;
}
graficoFluxo = new Chart($("#grafico-meses"), { /* ... */ });
```

Os dados continuam vindo prontos de `derivar()` — o Chart.js só recebe três arrays (`map` sobre `d.serie`) e cuida da escala, da grade e dos tooltips. Quem formata o valor do tooltip é o mesmo `fmt()` do resto do app, então o **modo privado** mascara o gráfico junto com a tela; o eixo Y também some nesse modo, via `callback` do tick.

#### Números que contam

Os valores em dinheiro não trocam de golpe: `escreverValor()` anima do número antigo para o novo em ~620ms. Ao mudar de mês, isso é a diferença entre o painel parecer que atualizou e parecer que piscou. Um `WeakMap` guarda o alvo de cada elemento, então um render que não mudou nada também não reanima nada. No modo privado a contagem é pulada, porque o valor está mascarado.

Todos os valores usam `font-variant-numeric: tabular-nums`, o que dá largura igual a cada dígito: as colunas alinham e o número não treme enquanto conta.

#### Avisos

`avisar(texto, rosto)` cria um toast no canto e o remove sozinho. Ele vive **fora** das três views, senão o próprio redesenho disparado pela ação o apagaria no mesmo instante. A pilha é limitada a três.

#### Os ícones

Os ícones ficam no HTML como `<i data-lucide="pencil">` e o Lucide troca cada um por um `<svg>`. Como `createIcons()` varre o documento inteiro e as linhas da tabela são recriadas a cada render, a chamada é dividida em duas: uma geral na inicialização e outra escopada só na tabela, logo depois do `innerHTML`.

```js
const desenharIcones = raiz => {
  if (window.lucide) lucide.createIcons({ root: raiz, attrs: { "stroke-width": 1.7 } });
};

desenharIcones($("#tabela-corpo"));   // só as linhas que acabaram de nascer
```

### 6. Ações

| Função | O que faz |
|---|---|
| `abrirNova()` | abre o modal com o formulário zerado na data de hoje |
| `abrirEdicao(id)` | busca o item, converte o valor para o formato brasileiro e preenche o form |
| `salvar()` | valida e grava (criação ou edição) |
| `confirmarExclusao()` | remove por `id` com `filter` |
| `exportarCsv()` | gera CSV com BOM e dispara o download via `Blob` |
| `alternarPainel()` | abre/fecha o painel esperando a animação de saída |
| `andarMes(passo)` | anda um mês para trás ou para frente, dentro dos limites |
| `alternarTema()` | troca claro/escuro, guarda a escolha e recria os gráficos |
| `avisar(texto)` | mostra o toast de confirmação |
| `ronronar()` | carinho no mascote: ele vibra, fecha os olhos e solta corações |

`salvar()` resolve criação e edição no mesmo lugar, e em nenhum dos casos muta o array:

```js
// uma entrada de formulário vira N registros, um por mês
const novos = dividirEmParcelas(numero, quantas).map((fatia, i) => ({
  ...registro,
  id: ultimoId + 1 + i,
  descricao: quantas > 1 ? `${registro.descricao} (${i + 1}/${quantas})` : registro.descricao,
  valor: fatia,
  data: dataAdiante(dataIso, i),
  status: i === 0 ? status : "pendente"   // parcela futura ainda não foi paga
}));

const itens = state.editando
  ? state.itens.map(i => (i.id === state.editando ? { ...i, ...registro } : i))
  : [...novos, ...state.itens];
```

- **Edição:** `map` troca só o item alvo, mesclando os campos novos por spread.
- **Criação:** `dividirEmParcelas` devolve uma fatia por mês (uma só, se for à vista), e `map` vira os registros. O próximo `id` sai de um `reduce` que acha o maior existente.

### 7. Eventos

Um único listener de clique no `document` cobre a navegação, edição, exclusão, filtros, troca de tipo e fechamento dos modais — **event delegation** via `data-*`, então elementos criados depois já funcionam sem precisar religar nada:

```js
document.addEventListener("click", evento => {
  const alvo = evento.target.closest("[data-ir], [data-editar], [data-excluir], [data-filtro], [data-fechar], [data-type], [data-mes]");
  if (!alvo) return;

  const { ir, editar, excluir, filtro, valor, type, mes } = alvo.dataset;

  if (ir) setState({ view: ir });
  if (editar) abrirEdicao(Number(editar));
  /* ... */
});
```

O seletor de mês existe **duas vezes** na página (visão geral e categorias). Por isso ele é `data-mes` e não `id`: a delegação atende os dois, e `renderCabecalho` atualiza ambos de uma vez com `querySelectorAll`.

Os campos do formulário são ligados por uma tabela `[seletor, chave]`, evitando listeners repetidos. Há ainda atalhos de teclado: **Esc** fecha (na ordem: confirmação → modal → painel) e **Enter** salva com o modal aberto.

---

## Modelo de dados

Cada movimentação é um objeto simples, e a coleção é um array:

```js
{
  id: 3,
  tipo: "saida",          // "entrada" | "saida"
  descricao: "Mercado da semana",
  categoria: "Mercado",   // uma das 11 de CATS
  valor: 612.4,           // number, sempre positivo
  data: "2026-08-12",     // ISO, ordenável como string
  status: "pago"          // "pago" | "pendente"
}
```

A data em ISO permite ordenar e agrupar por mês (`data.slice(0, 7)`) sem instanciar `Date` a cada comparação.

---

## Parcelamento

O modal tem uma caixa **Compra parcelada**. Marcando, aparece um select de 2x a 24x e uma prévia (`3× de R$ 33,33`). O valor digitado é o **total**, e ele é dividido pelos meses.

A divisão acontece em **centavos inteiros**, e o que sobra vai para a primeira parcela:

```js
const dividirEmParcelas = (total, quantas) => {
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / quantas);
  const resto = centavos - base * quantas;
  return Array.from({ length: quantas }, (_, i) => (i === 0 ? base + resto : base) / 100);
};
```

Sem isso, `R$ 100,00` em 3x daria três parcelas de `33,33` — e um centavo sumiria. Assim a soma bate exatamente: `33,34 + 33,33 + 33,33`.

Cada parcela cai no mesmo dia dos meses seguintes, com `dataAdiante()` cuidando de mês curto (comprou dia 31/01, a parcela de fevereiro cai no dia 28). Só a primeira herda o status escolhido; as demais nascem `pendente`, porque ainda não aconteceram — e vão aparecendo em "Contas em aberto" conforme os meses passam.

Ao **editar**, o bloco some: mexe-se numa parcela só, senão reparcelar no meio da edição criaria duplicatas.

---

## Validação

`salvar()` bloqueia a gravação e mostra a mensagem no próprio modal:

| Regra | Mensagem |
|---|---|
| Descrição vazia (após `trim`) | "Informe uma descrição para a movimentação." |
| Valor não numérico ou ≤ 0 | "Informe um valor maior que zero." |
| Data ausente, incompleta ou inexistente (31/02) | "Informe uma data válida, no formato dd/mm/aaaa." |

O valor passa por `parseNum`, que aceita o formato brasileiro (`1.234,56`) antes de virar número.

A data é um campo de **texto com máscara**, e não um `<input type="date">`. O motivo é que o navegador exibe o campo nativo no formato da língua **dele**: num Chrome em inglês, `01/09/2026` apareceria como `09/01/2026`. Como não dá para controlar a língua de quem abre o app, a máscara garante `dd/mm/aaaa` sempre. Um botão ao lado ainda abre o calendário nativo via `showPicker()`. Internamente o registro continua guardando ISO.

---

## Temas

Claro e escuro. O botão sol/lua fica no cabeçalho, a escolha vai para o `localStorage` e, sem escolha salva, o app segue o `prefers-color-scheme` do sistema. Um script curto no `<head>` aplica o tema **antes da primeira pintura** — sem ele a tela pisca branca ao abrir no escuro.

O escuro não duplica regras: ele troca os mesmos tokens. Para isso as cores viram **canais RGB**, e dezenas de variações de opacidade se recalculam sozinhas.

```css
:root       { --ink-rgb: 28, 31, 43;    --line: rgba(var(--ink-rgb), 0.09); }
[data-theme="dark"] { --ink-rgb: 226, 232, 244; }   /* --line inverte junto */
```

Uma separação importante: **borda inverte, sombra não**. Se as duas usassem o mesmo canal, as sombras do cartão e dos modais virariam brilho branco no escuro. Por isso existe um `--shadow-rgb` próprio, que fica preto nos dois temas.

A troca não acontece de estalo: usando a View Transitions API, o tema novo **se abre em círculo a partir do botão**.

```css
@keyframes temaAbrindo {
  from { clip-path: circle(0px at var(--tema-x) var(--tema-y)); }
  to   { clip-path: circle(var(--tema-r) at var(--tema-x) var(--tema-y)); }
}
```

O JS mede o botão e escreve `--tema-x/y/r` em `:root`. Onde a API não existe, a troca é direta. Como o Chart.js guarda as cores de quando o gráfico nasce, `alternarTema()` destrói e recria os dois gráficos.

---

## Responsividade

Tudo que muda em tela pequena mora em `mobile.css`, com cinco cortes:

| Corte | O que muda |
|---|---|
| 1080px | painel lateral vira sobreposição; colunas da tabela encolhem |
| 900px | o topo deixa de ser lado a lado |
| 720px | dock compacto, **tabela vira lista de cartões**, painel em tela cheia |
| 380px | celular pequeno |
| `hover: none` | efeitos de mouse que ficariam presos depois do toque |

No celular a tabela não rola de lado: cada linha vira um cartão de três linhas, com descrição e valor em cima, categoria e data no meio, status e ações embaixo. O reposicionamento é só `grid-template-areas`, sem JS.

Dois detalhes que valem registro. O cabeçalho é `position: fixed` no celular, e não `sticky`, porque o `overflow-x: hidden` do `.app` faz dele o container de rolagem do sticky — e como quem rola é o documento, a barra não grudaria. E os campos do formulário usam `font-size: 16px` no celular, abaixo disso o iOS dá zoom sozinho ao focar.

---

## Diferenciais implementados

- **Navegação por mês** que reescopa visão geral, painel e categorias, com botão "Hoje"
- **Saldo acumulado** que não zera na virada do mês, e pendências que carregam adiante
- **Parcelamento** em até 24x, dividido em centavos, uma parcela por mês
- **Dark mode** com troca animada abrindo a partir do botão
- **Busca** por descrição ou categoria, combinável com os filtros
- **Filtros** por tipo e status, com totais recalculados
- **Paginação** de 8 em 8, com a lista agrupada por mês
- **Gráficos:** barras dos 12 meses e rosca das categorias no Chart.js, mais uma sparkline diária em CSS
- **`localStorage`** com fallback para o seed e proteção contra storage bloqueado
- **Exportação CSV** com BOM (abre certo no Excel em pt-BR)
- **Modo privado** que mascara todos os valores da tela, inclusive nos gráficos
- **Painel lateral** com limite mensal, sobra, média/dia e regra 50/30/20
- **Cartão 3D** com flip mostrando as contas pendentes no verso
- **Toasts** de confirmação depois de cadastrar, editar e excluir
- **Data em dd/mm/aaaa** garantida por máscara, independente da língua do navegador
- **Números que contam** ao mudar, com dígitos de largura fixa
- **Responsividade** em cinco cortes, de 320px ao desktop
- **Acessibilidade:** HTML semântico, `aria-label`/`aria-expanded`, foco visível, `role="dialog"` nos modais e `aria-live` nos avisos
- **Segurança:** todo dado do usuário passa por `esc()` antes de ir para o `innerHTML`

### O mascote

O Mimo não é enfeite: ele é desenhado uma vez e reusado com `<use>`, com o **corpo separado das expressões**. Cada aparição é um `<use>` do mesmo corpo mais o seu par de olhos, então nada é duplicado.

| Onde | Expressão |
|---|---|
| Topo da visão geral | olhos redondos, que piscam |
| Topo, quando o mês fecha no vermelho | apreensivo, sobrancelhas caídas |
| Categorias | curioso, olhando para cima, com uma interrogação flutuando |
| Movimentações sem resultado | atento, olhos apertados, com uma lupa varrendo |
| Aviso de mês sem lançamentos | tranquilo, olhos fechados em arco |
| Faixa do donut | só o rabo, saindo por trás da rosca |

A expressão do topo é **indicador**: ela muda sozinha quando as saídas passam as entradas no mês. E clicar nele faz o gato ronronar, fechar os olhos e soltar corações.

### Fora de escopo

**Categorias personalizadas pelo usuário** não foram implementadas — as 11 são fixas em `CATS`.
