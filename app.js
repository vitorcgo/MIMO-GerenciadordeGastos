(() => {
  "use strict";

  const CATS = [
    "Salário", "Freelance", "Investimentos", "Moradia", "Mercado",
    "Transporte", "Lazer", "Saúde", "Assinaturas", "Educação", "Outros"
  ];

  const CORES = ["#6f5cf0", "#10a88f", "#d94f6e", "#b3771a", "#6fb1ff", "#c58bff", "#8790a6"];

  const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  const MESES_LONGOS = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const ESSENCIAIS = ["Moradia", "Mercado", "Transporte", "Saúde"];
  const DESEJOS = ["Lazer", "Assinaturas", "Outros"];

  const LIMITE_MENSAL = 2000;
  // v2: o seed mudou (menos lançamentos, valores menores). Subir a versão faz
  // quem já tinha dados da v1 recomeçar do exemplo novo, em vez de ficar preso
  // a um mês antigo e ver o painel vazio.
  const STORAGE_KEY = "mimo.itens.v2";
  const TEMA_KEY = "mimo.tema";

  const $ = (sel, root = document) => root.querySelector(sel);

  const pad = n => String(n).padStart(2, "0");

  const isoDe = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  const HOJE = new Date();
  const HOJE_ISO = isoDe(HOJE);
  const MES_REF = HOJE_ISO.slice(0, 7);
  const DIA_HOJE = HOJE.getDate();
  const DIAS_NO_MES = new Date(HOJE.getFullYear(), HOJE.getMonth() + 1, 0).getDate();

  // Monta a data de um exemplo a partir de quantos meses atrás ele fica
  const dataSeed = (mesesAtras, dia) => {
    const mes = new Date(HOJE.getFullYear(), HOJE.getMonth() - mesesAtras, 1);
    const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    return `${mes.getFullYear()}-${pad(mes.getMonth() + 1)}-${pad(Math.min(dia, ultimoDia))}`;
  };

  // Exemplos da primeira visita. As datas são relativas ao mês atual: se fossem
  // fixas, o painel abriria vazio assim que o mês virasse.
  const SEED = [
    { id: 1, tipo: "entrada", descricao: "Salário", categoria: "Salário", valor: 3200, data: dataSeed(0, 5), status: "pago" },
    { id: 2, tipo: "saida", descricao: "Aluguel", categoria: "Moradia", valor: 950, data: dataSeed(0, 6), status: "pago" },
    { id: 3, tipo: "saida", descricao: "Mercado", categoria: "Mercado", valor: 380, data: dataSeed(0, 12), status: "pago" },
    { id: 4, tipo: "saida", descricao: "Assinaturas", categoria: "Assinaturas", valor: 55, data: dataSeed(0, 20), status: "pendente" },
    { id: 5, tipo: "entrada", descricao: "Salário", categoria: "Salário", valor: 3200, data: dataSeed(1, 5), status: "pago" },
    { id: 6, tipo: "saida", descricao: "Aluguel", categoria: "Moradia", valor: 950, data: dataSeed(1, 6), status: "pago" },
    { id: 7, tipo: "saida", descricao: "Mercado", categoria: "Mercado", valor: 420, data: dataSeed(1, 14), status: "pago" },
    { id: 8, tipo: "saida", descricao: "Curso online", categoria: "Educação", valor: 120, data: dataSeed(1, 22), status: "pendente" },
    { id: 9, tipo: "entrada", descricao: "Salário", categoria: "Salário", valor: 3200, data: dataSeed(2, 5), status: "pago" },
    { id: 10, tipo: "saida", descricao: "Aluguel", categoria: "Moradia", valor: 950, data: dataSeed(2, 6), status: "pago" },
    { id: 11, tipo: "saida", descricao: "Transporte", categoria: "Transporte", valor: 210, data: dataSeed(2, 11), status: "pago" },
    { id: 12, tipo: "entrada", descricao: "Freelance", categoria: "Freelance", valor: 600, data: dataSeed(3, 8), status: "pago" },
    { id: 13, tipo: "saida", descricao: "Cinema", categoria: "Lazer", valor: 90, data: dataSeed(3, 16), status: "pago" }
  ];

  // Devolve a chave do mês anterior no formato ano e mês
  const mesAnterior = chave => {
    const [ano, mes] = chave.split("-").map(Number);
    const d = new Date(ano, mes - 2, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  };

  // Escapa caracteres especiais antes de inserir texto no HTML
  const esc = valor => String(valor).replace(/[&<>"']/g, ch => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));

  const formatador = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2
  });

  // Converte um valor digitado no formato brasileiro em número
  const parseNum = texto => {
    const limpo = String(texto).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    const n = parseFloat(limpo);
    return Number.isNaN(n) ? NaN : n;
  };

  // "2026-09-01" -> "01/09/2026"
  const dataBr = iso => {
    const [ano, mes, dia] = String(iso).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
  };

  // "01/09/2026" -> "2026-09-01"; devolve "" se não for uma data completa e real
  const isoDeBr = texto => {
    const partes = String(texto).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!partes) return "";
    const [, dia, mes, ano] = partes;
    const d = new Date(Number(ano), Number(mes) - 1, Number(dia));
    const existe = d.getFullYear() === Number(ano)
      && d.getMonth() === Number(mes) - 1
      && d.getDate() === Number(dia);
    return existe ? `${ano}-${mes}-${dia}` : "";
  };

  const MAX_PARCELAS = 24;

  // A mesma data, N meses adiante, sem estourar mês curto (31/01 -> 28/02)
  const dataAdiante = (iso, meses) => {
    const [ano, mes, dia] = String(iso).split("-").map(Number);
    const alvo = new Date(ano, mes - 1 + meses, 1);
    const ultimoDia = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
    return `${alvo.getFullYear()}-${pad(alvo.getMonth() + 1)}-${pad(Math.min(dia, ultimoDia))}`;
  };

  // Divide um total em N parcelas trabalhando em centavos: o que sobra da
  // divisão vai para a primeira, então a soma das parcelas bate com o total.
  const dividirEmParcelas = (total, quantas) => {
    const centavos = Math.round(total * 100);
    const base = Math.floor(centavos / quantas);
    const resto = centavos - base * quantas;
    return Array.from({ length: quantas }, (_, i) => (i === 0 ? base + resto : base) / 100);
  };

  // Vai pondo as barras conforme se digita, e ignora o que não é dígito
  const mascaraData = texto => {
    const n = String(texto).replace(/\D/g, "").slice(0, 8);
    if (n.length <= 2) return n;
    if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
    return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
  };

  // Formata uma data ISO no padrão dia mês ano
  const dataFmt = iso => {
    const [ano, mes, dia] = String(iso).split("-");
    return `${dia} ${MESES[Number(mes) - 1]} ${ano}`;
  };

  // Calcula a porcentagem arredondada e evita divisão por zero
  const pct = (parte, total) => Math.round((parte / (total || 1)) * 100);

  // Cria um formulário em branco com a data de hoje
  const formVazio = () => ({
    tipo: "saida",
    descricao: "",
    valor: "",
    data: dataBr(HOJE_ISO),
    categoria: "Mercado",
    status: "pago",
    parcelado: false,
    parcelas: "2"
  });

  // Lê as movimentações salvas no navegador ou usa a lista de exemplo
  const carregarItens = () => {
    try {
      const bruto = localStorage.getItem(STORAGE_KEY);
      const salvos = bruto ? JSON.parse(bruto) : null;
      return Array.isArray(salvos) && salvos.length ? salvos : [...SEED];
    } catch (e) {
      return [...SEED];
    }
  };

  // Lê um token de cor do CSS, para os gráficos acompanharem o tema
  const token = nome => getComputedStyle(document.documentElement)
    .getPropertyValue(nome)
    .trim();

  // Escolha salva; sem escolha, segue a preferência do sistema
  const temaSalvo = () => {
    try {
      return localStorage.getItem(TEMA_KEY)
        || (matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro");
    } catch (e) {
      return "claro";
    }
  };

  // Grava as movimentações no navegador
  const persistir = itens => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch (e) {
      // sem acesso ao armazenamento, a aplicação segue apenas em memória
    }
  };

  const POR_PAGINA = 8;

  let state = {
    view: "geral",
    itens: carregarItens(),
    // mês em foco na visão geral, no painel e em categorias; navegável
    mesRef: MES_REF,
    pagina: 1,
    query: "",
    tipoFiltro: "todos",
    statusFiltro: "todos",
    drawer: false,
    privado: false,
    tema: temaSalvo(),
    flip: false,
    modal: false,
    editando: null,
    excluir: null,
    erro: "",
    form: formVazio()
  };

  // Cria um estado novo a partir do anterior e redesenha a tela
  const setState = patch => {
    state = { ...state, ...patch };
    render();
  };

  // Atualiza um campo do formulário e limpa a mensagem de erro
  const setForm = patch => setState({ form: { ...state.form, ...patch }, erro: "" });

  // Mexer em filtro ou busca muda o tamanho da lista: voltar à primeira página
  const setFiltro = patch => setState({ ...patch, pagina: 1 });

  // Meses que fazem sentido visitar: dos lançamentos até o mês corrente
  const limitesDeMes = itens => {
    const chaves = itens.map(i => i.data.slice(0, 7)).concat(MES_REF);
    return { primeiro: chaves.reduce((a, b) => (a < b ? a : b)), ultimo: chaves.reduce((a, b) => (a > b ? a : b)) };
  };

  // Anda meses para trás ou para frente, sem passar dos limites
  const andarMes = passo => {
    const [ano, mes] = state.mesRef.split("-").map(Number);
    const d = new Date(ano, mes - 1 + passo, 1);
    const alvo = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const { primeiro, ultimo } = limitesDeMes(state.itens);
    if (alvo < primeiro || alvo > ultimo) return;
    setState({ mesRef: alvo });
  };

  // Formata um valor em reais ou oculta quando o modo privado está ligado
  const fmt = valor => (state.privado ? "••••••" : formatador.format(valor || 0));

  // Ordena as movimentações da mais recente para a mais antiga
  const ordenar = itens => [...itens].sort((a, b) => (
    a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id
  ));

  // Separa apenas as movimentações do mês de referência
  const doMesRef = itens => itens.filter(i => i.data.slice(0, 7) === state.mesRef);

  // Soma os valores de um tipo, entrada ou saída
  const somaTipo = (itens, tipo) => itens
    .filter(i => i.tipo === tipo)
    .reduce((total, i) => total + i.valor, 0);

  // Soma os valores de uma lista de movimentações
  const somaValores = itens => itens.reduce((total, i) => total + i.valor, 0);

  // Devolve uma cópia da movimentação com os campos prontos para exibição
  const decorar = item => ({
    ...item,
    sinal: item.tipo === "entrada" ? "+" : "-",
    classeCor: item.tipo === "entrada" ? "is-in-text" : "is-out-text",
    iconBg: item.tipo === "entrada" ? `rgba(${token("--in-rgb")}, 0.16)` : `rgba(${token("--out-rgb")}, 0.16)`,
    valorFmt: `${item.tipo === "entrada" ? "+ " : "- "}${fmt(item.valor)}`,
    valorSimples: fmt(item.valor),
    dataLabel: dataFmt(item.data),
    statusLabel: item.status === "pendente" ? "Pendente" : "Concluído",
    statusClasse: item.status === "pendente" ? "is-pending" : "is-done"
  });

  // Monta a série dos últimos doze meses até o mês de referência
  const serieMeses = itens => Array.from({ length: 12 }, (_, i) => {
    const [a, m] = state.mesRef.split("-").map(Number);
    const d = new Date(a, m - 1 - (11 - i), 1);
    return { chave: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, label: MESES[d.getMonth()] };
  }).map(({ chave, label }) => {
    const doMes = itens.filter(i => i.data.slice(0, 7) === chave);
    return { chave, label, entradas: somaTipo(doMes, "entrada"), saidas: somaTipo(doMes, "saida") };
  });

  // Agrupa as saídas do mês por categoria, da maior para a menor
  const porCategoria = itensMes => Object.entries(
    itensMes
      .filter(i => i.tipo === "saida")
      .reduce((acc, i) => ({ ...acc, [i.categoria]: (acc[i.categoria] || 0) + i.valor }), {})
  )
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor)
    .map((cat, indice) => ({ ...cat, cor: CORES[indice % CORES.length] }));

  // Soma os totais de cada dia do mês para desenhar a sparkline
  const porDia = itensMes => itensMes.reduce((acc, i) => {
    const dia = Number(i.data.slice(8));
    const atual = acc[dia] || { entradas: 0, saidas: 0 };
    return {
      ...acc,
      [dia]: i.tipo === "entrada"
        ? { ...atual, entradas: atual.entradas + i.valor }
        : { ...atual, saidas: atual.saidas + i.valor }
    };
  }, {});

  // Aplica os filtros de tipo, de status e a busca por texto
  const filtrarVisiveis = itens => {
    const busca = state.query.trim().toLowerCase();
    return itens
      .filter(i => state.tipoFiltro === "todos" || i.tipo === state.tipoFiltro)
      .filter(i => state.statusFiltro === "todos" || i.status === state.statusFiltro)
      .filter(i => !busca
        || i.descricao.toLowerCase().includes(busca)
        || i.categoria.toLowerCase().includes(busca));
  };

  // Calcula tudo o que a tela precisa a partir do estado atual
  const derivar = () => {
    const ordenados = ordenar(state.itens);
    const mes = doMesRef(ordenados);

    const entradas = somaTipo(mes, "entrada");
    const saidas = somaTipo(mes, "saida");

    // Quanto o mês rendeu por si só: é isto que zera quando o mês vira
    const resultado = entradas - saidas;

    // O saldo, não. Ele é acumulado: soma tudo que já aconteceu até o fim do
    // mês em foco. O dinheiro de quem usa não desaparece no dia 1º.
    // Datas ISO comparam como texto, e nenhum dia passa de 31.
    const ateAqui = ordenados.filter(i => i.data <= `${state.mesRef}-31`);
    const saldo = somaTipo(ateAqui, "entrada") - somaTipo(ateAqui, "saida");

    // Conta em aberto também não deixa de existir quando o mês vira:
    // uma pendência de agosto continua devendo em setembro.
    const pendentes = ateAqui
      .filter(i => i.tipo === "saida" && i.status === "pendente")
      .sort((a, b) => (a.data < b.data ? -1 : 1));
    const aPagar = somaValores(pendentes);

    const ateMesAnterior = ordenados.filter(i => i.data <= `${mesAnterior(state.mesRef)}-31`);
    const saldoAnt = somaTipo(ateMesAnterior, "entrada") - somaTipo(ateMesAnterior, "saida");
    const variacao = saldoAnt ? Math.round(((saldo - saldoAnt) / Math.abs(saldoAnt)) * 100) : 0;

    const serie = serieMeses(ordenados);

    const categorias = porCategoria(mes);
    const totalCategorias = somaValores(categorias) || 1;

    const saidasMes = mes.filter(i => i.tipo === "saida");
    const gastoMedio = saidasMes.length ? somaValores(saidasMes) / saidasMes.length : 0;
    const maiorSaida = [...saidasMes].sort((a, b) => b.valor - a.valor)[0];

    const somaDeCategorias = lista => saidasMes
      .filter(i => lista.includes(i.categoria))
      .reduce((total, i) => total + i.valor, 0);

    const essenciais = somaDeCategorias(ESSENCIAIS);
    const desejos = somaDeCategorias(DESEJOS);
    const futuro = Math.max(0, saidas - essenciais - desejos) + Math.max(0, resultado);

    // o calendário do mês em foco, que nem sempre é o mês do relógio
    const [anoRef, numeroMes] = state.mesRef.split("-").map(Number);
    const diasDoMes = new Date(anoRef, numeroMes, 0).getDate();
    const ehMesAtual = state.mesRef === MES_REF;
    const diaDeHoje = ehMesAtual ? DIA_HOJE : 0;
    // média por dia: no mês corrente só os dias já vividos contam
    const diasCorridos = ehMesAtual ? DIA_HOJE : diasDoMes;

    const visiveis = filtrarVisiveis(ordenados).map(decorar);

    // os totais continuam somando a lista filtrada inteira, não só a página
    const paginas = Math.max(1, Math.ceil(visiveis.length / POR_PAGINA));
    const pagina = Math.min(state.pagina, paginas);
    const daPagina = visiveis.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

    return {
      diasDoMes,
      diaDeHoje,
      diasCorridos,
      ehMesAtual,
      paginas,
      pagina,
      daPagina,
      ordenados,
      mes,
      entradas,
      saidas,
      saldo,
      resultado,
      pendentes: pendentes.map(i => decorar(i)),
      aPagar,
      variacao,
      serie,
      categorias,
      totalCategorias,
      gastoMedio,
      maiorSaida,
      regra: [
        { nome: "Essenciais", valor: essenciais, cor: "#6f5cf0" },
        { nome: "Desejos", valor: desejos, cor: "#d94f6e" },
        { nome: "Futuro", valor: futuro, cor: "#10a88f" }
      ],
      baseRegra: essenciais + desejos + futuro || 1,
      limite: LIMITE_MENSAL,
      limitePct: pct(saidas, LIMITE_MENSAL),
      dias: porDia(mes),
      visiveis
    };
  };

  // Carinho no mascote: ele vibra, fecha os olhos e solta corações que sobem
  // por trás da cabeça. Enquanto dura, o render não mexe na expressão dele.
  let ronronando = false;
  const CORACOES = 5;
  const RONRONO_MS = 1550;

  const ronronar = () => {
    if (ronronando) return;
    ronronando = true;

    $("#mascote-topo").setAttribute("href", "#mimo-gato-feliz");
    $("#mascote-clicavel").classList.add("is-ronronando");

    const ninho = $("#coracoes");
    for (let k = 0; k < CORACOES; k += 1) {
      const coracao = document.createElement("span");
      coracao.className = "coracao";
      coracao.style.left = `${58 + Math.random() * 116}px`;
      coracao.style.width = `${21 + Math.random() * 12}px`;
      coracao.style.animationDelay = `${k * 110}ms`;
      coracao.style.setProperty("--dx", `${Math.random() * 44 - 22}px`);
      coracao.style.setProperty("--giro", `${Math.random() * 44 - 22}deg`);
      coracao.innerHTML = '<svg viewBox="0 0 32 30" aria-hidden="true"><use href="#mimo-coracao"></use></svg>';
      ninho.appendChild(coracao);
      setTimeout(() => coracao.remove(), 2700 + k * 110);
    }

    setTimeout(() => {
      $("#mascote-clicavel").classList.remove("is-ronronando");
      ronronando = false;
      // volta para a expressão que o mês estiver pedindo
      render();
    }, RONRONO_MS);
  };

  // Aviso rápido depois de uma ação. Some sozinho e vive fora das views,
  // então não é apagado pelo redesenho que a própria ação dispara.
  const TOASTS_NA_TELA = 3;

  const avisar = (texto, rosto = "#mimo-gato-feliz") => {
    const caixa = $("#toasts");
    if (!caixa) return;

    // com cliques seguidos a pilha não cresce sem fim
    while (caixa.children.length >= TOASTS_NA_TELA) caixa.firstElementChild.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="toast__gato"><svg viewBox="0 0 320 300" aria-hidden="true"><use href="${rosto}"></use></svg></span>
      <span>${esc(texto)}</span>`;
    caixa.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("is-saindo");
      setTimeout(() => toast.remove(), 320);
    }, 2600);
  };

  // Anima a troca de um valor em dinheiro, contando do anterior até o novo.
  // Os números são o conteúdo deste app: trocar de mês sem transição faz o
  // painel parecer que piscou. Guarda o alvo por elemento num WeakMap.
  const contagens = new WeakMap();
  const DURACAO_CONTAGEM = 620;

  const escreverValor = (seletor, valor) => {
    const el = $(seletor);
    if (!el) return;

    const anterior = contagens.get(el);
    if (anterior && anterior.id) cancelAnimationFrame(anterior.id);

    const de = anterior ? anterior.valor : valor;
    const direto = state.privado
      || de === valor;

    if (direto) {
      contagens.set(el, { valor, id: 0 });
      el.textContent = fmt(valor);
      return;
    }

    const inicio = performance.now();
    const passo = agora => {
      const t = Math.min(1, (agora - inicio) / DURACAO_CONTAGEM);
      const suave = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(de + (valor - de) * suave);
      contagens.set(el, { valor, id: t < 1 ? requestAnimationFrame(passo) : 0 });
    };
    contagens.set(el, { valor, id: requestAnimationFrame(passo) });
  };

  // Troca as tags <i data-lucide> por SVG. Sem raiz, varre a página inteira.
  const desenharIcones = raiz => {
    if (window.lucide) lucide.createIcons({ root: raiz, attrs: { "stroke-width": 1.7 } });
  };

  // Desenha o cabeçalho e o estado dos botões
  const renderCabecalho = d => {
    const [ano, mes] = state.mesRef.split("-");
    $("#rotulo-periodo").textContent = `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`;

    // há um seletor de mês por tela (visão geral e categorias), então todos
    // são atualizados juntos por atributo, e não por id
    const { primeiro, ultimo } = limitesDeMes(state.itens);
    const rotuloMes = `${MESES_LONGOS[Number(mes) - 1]} de ${ano}`;
    document.querySelectorAll(".mes-nav__label").forEach(el => { el.textContent = rotuloMes; });
    document.querySelectorAll('[data-mes="anterior"]').forEach(b => { b.disabled = state.mesRef <= primeiro; });
    document.querySelectorAll('[data-mes="proximo"]').forEach(b => { b.disabled = state.mesRef >= ultimo; });
    // atalho de volta ao mês corrente, escondido quando já se está nele
    document.querySelectorAll('[data-mes="hoje"]').forEach(b => { b.hidden = d.ehMesAtual; });
    $("#rotulo-limite-pct").textContent = `${d.limitePct}%`;
    $("#rotulo-painel").textContent = state.drawer ? "Recolher painel" : "Expandir painel";
    $("#dica-painel").textContent = state.drawer ? "Recolher painel" : "Expandir painel";
    $("#dica-privacidade").textContent = state.privado ? "Mostrar valores" : "Ocultar valores";
    $("#botao-painel").classList.toggle("is-on", state.drawer);
    $("#botao-painel").setAttribute("aria-expanded", String(state.drawer));
    $("#dock-painel").classList.toggle("is-on", state.drawer);
    $("#botao-privacidade").classList.toggle("is-on", state.privado);
    
    const rotuloTema = state.tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";
    
    $("#botao-tema").title = rotuloTema;
    
    $("#botao-tema").setAttribute("aria-label", rotuloTema);
  };

  // Desenha o painel lateral com limite, sobra e contas em aberto
  const renderPainel = d => {
    const painel = $("#painel");
    painel.hidden = !state.drawer;
    if (!state.drawer) return;

    const sobra = Math.max(0, d.limite - d.saidas);

    escreverValor("#painel-saidas", d.saidas);
    $("#painel-limite").textContent = fmt(d.limite);
    $("#painel-barra").style.width = `${Math.min(100, d.limitePct)}%`;
    $("#painel-sobra").textContent = fmt(sobra);
    $("#painel-media-dia").textContent = fmt(d.saidas / d.diasCorridos);

    $("#painel-regra").innerHTML = d.regra
      .map(({ nome, valor, cor }) => {
        const p = pct(valor, d.baseRegra);
        return `
          <div class="rule">
            <div class="rule__head"><span>${esc(nome)}</span><span>${esc(fmt(valor))} · ${p}%</span></div>
            <div class="rule__track"><div class="rule__fill" style="width:${p}%;background:${cor}"></div></div>
          </div>`;
      })
      .join("");

    $("#painel-pendentes").innerHTML = d.pendentes.length
      ? d.pendentes
        .map(p => `
          <button class="pending" type="button" data-editar="${p.id}">
            <span class="pending__text">
              <strong>${esc(p.descricao)}</strong>
              <span>${esc(p.dataLabel)}</span>
            </span>
            <span class="pending__value">${esc(p.valorSimples)}</span>
          </button>`)
        .join("")
      : `<div class="empty-line">Nenhuma conta pendente neste mês.</div>`;

    $("#painel-leitura").textContent = d.limitePct > 100
      ? `As saídas passaram o limite planejado em ${d.limitePct - 100}%. Reveja as categorias com maior peso antes do fechamento.`
      : `Ainda restam ${fmt(Math.max(0, d.limite - d.saidas))} dentro do limite planejado, com ${d.pendentes.length} conta(s) em aberto para quitar.`;
  };

  // Desenha a barra de cada dia do mês
  const renderSparkline = d => {
    const maxDia = Object.values(d.dias)
      .reduce((max, { entradas, saidas }) => Math.max(max, entradas + saidas), 1);

    $("#sparkline").innerHTML = Array.from({ length: d.diasDoMes }, (_, i) => i + 1)
      .map(dia => {
        const reg = d.dias[dia];
        const total = reg ? reg.entradas + reg.saidas : 0;
        const altura = total ? `${Math.max(14, Math.round((total / maxDia) * 100))}%` : "3px";
        const cor = !total
          ? `rgba(${token("--ink-rgb")}, 0.14)`
          : reg.entradas >= reg.saidas ? token("--in") : token("--out");
        const dica = `Dia ${dia}${total ? `: ${fmt(total)}` : ": sem movimentação"}`;
        return `<div class="sparkline__day${dia === d.diaDeHoje ? " is-today" : ""}" title="${esc(dica)}"><i style="height:${altura};background:${cor}"></i></div>`;
      })
      .join("");

    $("#rotulo-hoje").textContent = d.diaDeHoje ? `hoje ${d.diaDeHoje}` : "";
    $("#rotulo-ultimo-dia").textContent = String(d.diasDoMes);
  };

  // Desenha o cartão com o total a pagar e as contas pendentes
  const renderCartao = d => {
    $("#cartao").classList.toggle("is-flipped", state.flip);
    const detalhe = `${d.pendentes.length} ${d.pendentes.length === 1 ? "conta pendente" : "contas pendentes"}`;
    const [proxima] = d.pendentes;

    escreverValor("#cartao-total", d.aPagar);
    $("#cartao-total-verso").textContent = fmt(d.aPagar);
    $("#cartao-detalhe").textContent = detalhe;
    $("#cartao-detalhe-verso").textContent = detalhe;
    $("#cartao-vencimento").textContent = proxima
      ? `Próxima: ${proxima.dataLabel}`
      : "Nenhuma conta pendente";

    const linhas = d.pendentes.slice(0, 3)
      .map(p => `
        <span class="card__row">
          <span><strong>${esc(p.descricao)}</strong><small>${esc(p.dataLabel)}</small></span>
          <span>${esc(p.valorSimples)}</span>
        </span>`)
      .join("");

    const resto = d.pendentes.length > 3
      ? `<span class="card__rest">+ ${d.pendentes.length - 3} no painel lateral</span>`
      : "";

    $("#cartao-lista").innerHTML = d.pendentes.length
      ? linhas + resto
      : `<span class="card__rest">Nenhuma conta pendente neste mês.</span>`;
  };

  // Os dois gráficos do Chart.js são criados uma vez e depois só atualizados
  let graficoFluxo = null;
  let graficoCategorias = null;

  // Visual dos tooltips, compartilhado pelos dois gráficos.
  // É função, e não objeto fixo, para reler as cores quando o tema muda.
  const estiloTooltip = () => ({
    backgroundColor: token("--surface"),
    titleColor: token("--ink"),
    bodyColor: token("--muted"),
    borderColor: `rgba(${token("--ink-rgb")}, 0.14)`,
    borderWidth: 1,
    padding: 11,
    cornerRadius: 10,
    boxPadding: 5,
    titleFont: { weight: "700" },
    displayColors: true
  });

  // Desenha o gráfico de entradas e saídas dos últimos meses
  const renderGrafico = d => {
    const [primeiro] = d.serie;
    const ultimo = d.serie[d.serie.length - 1];
    $("#rotulo-intervalo").textContent =
      `${primeiro.label} de ${primeiro.chave.slice(0, 4)} até ${ultimo.label} de ${ultimo.chave.slice(0, 4)}`;

    if (!window.Chart) return;

    const rotulos = d.serie.map(m => m.label);
    const entradas = d.serie.map(m => m.entradas);
    const saidas = d.serie.map(m => m.saidas);

    if (graficoFluxo) {
      graficoFluxo.data.labels = rotulos;
      graficoFluxo.data.datasets[0].data = entradas;
      graficoFluxo.data.datasets[1].data = saidas;
      graficoFluxo.update("none");
      return;
    }

    graficoFluxo = new Chart($("#grafico-meses"), {
      type: "bar",
      data: {
        labels: rotulos,
        datasets: [
          { label: "Entradas", data: entradas, backgroundColor: token("--in"), borderRadius: 6, maxBarThickness: 15 },
          { label: "Saídas", data: saidas, backgroundColor: token("--out"), borderRadius: 6, maxBarThickness: 15 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            ...estiloTooltip(),
            callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.parsed.y)}` }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: token("--faint") }
          },
          y: {
            beginAtZero: true,
            grid: { color: `rgba(${token("--ink-rgb")}, 0.08)` },
            border: { display: false },
            ticks: {
              color: token("--faint-2"),
              maxTicksLimit: 5,
              // no modo privado o eixo também é escondido
              callback: valor => {
                if (state.privado) return "";
                return valor >= 1000 ? `${String(valor / 1000).replace(".", ",")} mil` : valor;
              }
            }
          }
        }
      }
    });
  };

  // Desenha o gráfico de rosca e a legenda das categorias
  const renderDonut = d => {
    const topCategorias = d.categorias.slice(0, 5);
    const semDados = topCategorias.length === 0;

    escreverValor("#donut-total", d.saidas);

    if (window.Chart) {
      // sem saídas no mês a rosca vira um anel neutro, só para não sumir da tela
      const rotulos = semDados ? ["Sem saídas"] : topCategorias.map(c => c.nome);
      const valores = semDados ? [1] : topCategorias.map(c => c.valor);
      const cores = semDados ? ["rgba(255,255,255,.18)"] : topCategorias.map(c => c.cor);

      if (graficoCategorias) {
        graficoCategorias.data.labels = rotulos;
        graficoCategorias.data.datasets[0].data = valores;
        graficoCategorias.data.datasets[0].backgroundColor = cores;
        graficoCategorias.options.plugins.tooltip.enabled = !semDados;
        graficoCategorias.update("none");
      } else {
        graficoCategorias = new Chart($("#donut-grafico"), {
          type: "doughnut",
          data: {
            labels: rotulos,
            datasets: [{ data: valores, backgroundColor: cores, borderWidth: 0, hoverOffset: 0 }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "62%",
            plugins: {
              legend: { display: false },
              tooltip: {
                ...estiloTooltip(),
                enabled: !semDados,
                displayColors: false,
                callbacks: { label: ctx => ` ${fmt(ctx.parsed)}` }
              }
            }
          }
        });
      }
    }

    $("#lista-categorias").innerHTML = topCategorias
      .map(({ nome, valor, cor }) => {
        const ultimos = d.mes
          .filter(i => i.tipo === "saida" && i.categoria === nome)
          .slice(0, 3)
          .map(i => `${i.data.slice(8)}/${i.data.slice(5, 7)} ${i.descricao}`)
          .join("  ·  ");
        return `
          <div class="cat">
            <div class="cat__head">
              <span class="cat__name">
                <i style="background:${cor}"></i>
                <span class="cat__label">${esc(nome)}</span>
                <span class="cat__detail">${esc(ultimos || nome)}</span>
              </span>
              <span class="cat__value">${esc(fmt(valor))}</span>
            </div>
            <div class="cat__track"><div class="cat__fill" style="width:${pct(valor, d.totalCategorias)}%;background:${cor}"></div></div>
          </div>`;
      })
      .join("");
  };

  // Monta o HTML de uma linha da lista de movimentações recentes
  const linhaRecente = (it, indice) => `
    <div class="recent" style="--i:${indice}">
      <div class="badge ${it.classeCor}" style="background:${it.iconBg}">${it.sinal}</div>
      <div class="recent__text">
        <strong>${esc(it.descricao)}</strong>
        <span>${esc(it.categoria)}</span>
      </div>
      <span class="recent__date">${esc(it.dataLabel)}</span>
      <span class="recent__status ${it.statusClasse}">${esc(it.statusLabel)}</span>
      <span class="recent__value ${it.classeCor}">${esc(it.valorFmt)}</span>
    </div>`;

  // Desenha a visão geral com saldo, totais e movimentações recentes
  const renderGeral = d => {
    const vazio = d.mes.length === 0;
    const mes = state.mesRef.slice(5);

    // O aviso é uma faixa acima do painel, e não uma tela cheia: quando o mês
    // vira, o gráfico dos 12 meses, o histórico recente e o cartão continuam
    // tendo o que mostrar. Esconder tudo deixava o app parecendo quebrado.
    $("#mes-vazio").hidden = !vazio;
    $("#mes-vazio-texto").textContent =
      `${MESES_LONGOS[Number(mes) - 1]} ainda está em silêncio. Registre a primeira movimentação do mês.`;
    // a frase do topo repetiria o mesmo recado logo abaixo da faixa
    $("#frase-resumo").hidden = vazio;

    const projetado = Math.max(0, d.saldo - d.aPagar);

    escreverValor("#valor-saldo", d.saldo);
    $("#valor-variacao").textContent = `${d.variacao >= 0 ? "+" : ""}${d.variacao}% vs ${MESES[Number(mesAnterior(state.mesRef).slice(5)) - 1]}`;
    $("#valor-variacao").classList.toggle("is-negative", d.variacao < 0);
    $("#valor-projetado").textContent = `sobra ${fmt(projetado)}`;
    $("#hero-saldo").style.setProperty(
      "--projected",
      `${d.saldo > 0 ? Math.max(2, pct(projetado, d.saldo)) : 0}%`
    );
    $("#frase-resumo").textContent =
      `Você registrou ${d.mes.length} movimentações em ${MESES_LONGOS[Number(mes) - 1].toLowerCase()}.`
      + ` No mês, ${d.resultado >= 0 ? "sobraram" : "faltaram"} ${fmt(Math.abs(d.resultado))}.`;

    escreverValor("#valor-entradas", d.entradas);
    escreverValor("#valor-saidas", d.saidas);
    $("#valor-total-itens").textContent = String(d.mes.length);

    // o mascote do topo vira indicador: só muda de cara quando o mês fecha no


    // vermelho. Durante o carinho quem manda na expressão é o ronronar.


    if (!ronronando) {


      $("#mascote-topo").setAttribute("href", d.resultado < 0 ? "#mimo-gato-preocupado" : "#mimo-gato");


    }

    renderSparkline(d);
    renderCartao(d);
    renderGrafico(d);
    renderDonut(d);

    $("#lista-recentes").innerHTML = d.ordenados.slice(0, 6).map(decorar).map(linhaRecente).join("");
  };

  // Monta o HTML de um botão de filtro
  const chip = (ativo, label, grupo, valor) =>
    `<button class="chip${ativo ? " is-on" : ""}" type="button" data-filtro="${grupo}" data-valor="${valor}">${esc(label)}</button>`;

  // Desenha a lista completa com filtros e totais
  const renderLista = d => {
    $("#filtros-tipo").innerHTML = [
      ["Tudo", "todos"], ["Entradas", "entrada"], ["Saídas", "saida"]
    ].map(([label, valor]) => chip(state.tipoFiltro === valor, label, "tipo", valor)).join("");

    $("#filtros-status").innerHTML = [
      ["Todos", "todos"], ["Concluídos", "pago"], ["Pendentes", "pendente"]
    ].map(([label, valor]) => chip(state.statusFiltro === valor, label, "status", valor)).join("");

    $("#rotulo-contagem").textContent = d.paginas > 1
      ? `${d.visiveis.length} de ${state.itens.length} registros · página ${d.pagina} de ${d.paginas}`
      : `${d.visiveis.length} de ${state.itens.length} registros`;

    // um cabeçalho aparece toda vez que o mês muda dentro da página
    let mesDaLinha = "";

    $("#tabela-corpo").innerHTML = d.daPagina
      .map((it, indice) => {
        const chave = it.data.slice(0, 7);
        const trocouDeMes = chave !== mesDaLinha;
        mesDaLinha = chave;
        const [ano, numero] = chave.split("-");
        const cabecalho = trocouDeMes
          ? `<div class="table__mes"><span>${MESES_LONGOS[Number(numero) - 1]} de ${ano}</span></div>`
          : "";
        return cabecalho + `
        <div class="table__row" style="--i:${indice}">
          <div class="table__desc">
            <span class="badge ${it.classeCor}" style="background:${it.iconBg}">${it.sinal}</span>
            <strong>${esc(it.descricao)}</strong>
          </div>
          <span class="table__cell">${esc(it.categoria)}</span>
          <span class="table__cell">${esc(it.dataLabel)}</span>
          <span class="recent__status ${it.statusClasse}">${esc(it.statusLabel)}</span>
          <span class="table__value ${it.classeCor}">${esc(it.valorFmt)}</span>
          <div class="table__actions">
            <button class="icon-button" type="button" data-editar="${it.id}" title="Editar" aria-label="Editar ${esc(it.descricao)}">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-button icon-button--danger" type="button" data-excluir="${it.id}" title="Excluir" aria-label="Excluir ${esc(it.descricao)}">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>`;
      })
      .join("");

    // as linhas foram recriadas agora, então os ícones delas precisam ser gerados de novo
    desenharIcones($("#tabela-corpo"));

    $("#paginacao").hidden = d.paginas < 2;
    $("#pagina-atual").textContent = `${d.pagina} de ${d.paginas}`;
    $("#pagina-anterior").disabled = d.pagina <= 1;
    $("#pagina-proxima").disabled = d.pagina >= d.paginas;

    const temItens = d.visiveis.length > 0;
    $("#tabela-totais").hidden = !temItens;
    $("#tabela-vazia").hidden = temItens;
    if (!temItens) return;

    $("#total-entradas").textContent = `+ ${fmt(somaTipo(d.visiveis, "entrada"))}`;
    $("#total-saidas").textContent = `- ${fmt(somaTipo(d.visiveis, "saida"))}`;
    $("#total-saldo").textContent = fmt(
      d.visiveis.reduce((total, i) => total + (i.tipo === "entrada" ? i.valor : -i.valor), 0)
    );
  };

  // Desenha os indicadores e o detalhamento por categoria
  const renderCategorias = d => {
    const taxa = d.entradas ? Math.round((d.resultado / d.entradas) * 100) : 0;

    $("#indicadores").innerHTML = [
      { label: "Gasto médio", valor: fmt(d.gastoMedio), cor: "#ffffff", nota: "por lançamento de saída" },
      { label: "Maior saída", valor: fmt(d.maiorSaida ? d.maiorSaida.valor : 0), cor: "#ffb3c2", nota: d.maiorSaida ? d.maiorSaida.descricao : "sem saídas no mês" },
      { label: "Taxa de sobra", valor: `${taxa}%`, cor: "#8ce6cf", nota: "do total que entrou" },
      { label: "Total a pagar", valor: fmt(d.aPagar), cor: "#f4d79a", nota: `${d.pendentes.length} em aberto` }
    ]
      .map(({ label, valor, cor, nota }) => `
        <div class="kpi">
          <span class="kpi__label">${esc(label)}</span>
          <span class="kpi__value" style="color:${cor}">${esc(valor)}</span>
          <span class="kpi__note">${esc(nota)}</span>
        </div>`)
      .join("");

    $("#categorias-detalhe").innerHTML = d.categorias
      .map(({ nome, valor, cor }, indice) => {
        const n = d.mes.filter(i => i.tipo === "saida" && i.categoria === nome).length;
        const p = pct(valor, d.totalCategorias);
        return `
          <div class="cat-row" style="--i:${indice}">
            <div class="cat-row__main">
              <span class="cat-row__name"><i style="background:${cor}"></i>${esc(nome)}</span>
              <span class="cat-row__detail">${n} ${n === 1 ? "lançamento neste mês" : "lançamentos neste mês"}</span>
              <div class="cat-row__track"><div class="cat__fill" style="width:${p}%;background:${cor}"></div></div>
            </div>
            <span class="cat-row__value">${esc(fmt(valor))}</span>
            <span class="cat-row__pct">${p}%</span>
          </div>`;
      })
      .join("");
  };

  // Desenha o formulário de cadastro e edição
  const renderModal = () => {
    const overlay = $("#overlay-form");
    overlay.hidden = !state.modal;
    if (!state.modal) return;

    const { form } = state;
    $("#modal-titulo").textContent = state.editando ? "Editar movimentação" : "Nova movimentação";
    $("#modal-sub").textContent = state.editando
      ? "Ajuste os dados e salve as alterações."
      : "Registre uma entrada ou saída da sua carteira.";
    $("#botao-salvar").textContent = state.editando ? "Salvar alterações" : "Adicionar";

    document.querySelectorAll(".switch__option").forEach(botao => {
      botao.classList.toggle("is-on", botao.dataset.type === form.tipo);
    });

    // só reescreve o campo quando o valor mudou, para não mover o cursor
    const sincronizar = (seletor, valor) => {
      const campo = $(seletor);
      if (campo.value !== valor) campo.value = valor;
    };
    sincronizar("#campo-descricao", form.descricao);
    sincronizar("#campo-valor", form.valor);
    sincronizar("#campo-data", form.data);
    sincronizar("#campo-categoria", form.categoria);
    sincronizar("#campo-status", form.status);

        // parcelar só aparece ao criar; ao editar, altera-se uma parcela só
    const parcelavel = !state.editando;
    $("#bloco-parcelamento").hidden = !parcelavel;
    $("#campo-parcelado").checked = Boolean(form.parcelado);
    $("#bloco-parcelas").hidden = !form.parcelado;
    if ($("#campo-parcelas").value !== form.parcelas) $("#campo-parcelas").value = form.parcelas;

    const totalDigitado = parseNum(form.valor);
    const qtd = Number(form.parcelas);
    $("#dica-parcelas").textContent = form.parcelado && !Number.isNaN(totalDigitado) && totalDigitado > 0
      ? `${qtd}× de ${fmt(dividirEmParcelas(totalDigitado, qtd)[qtd - 1])}`
      : "";

$("#form-erro").hidden = !state.erro;
    $("#form-erro").textContent = state.erro;
  };

  // Desenha a confirmação de exclusão
  const renderExclusao = () => {
    const overlay = $("#overlay-excluir");
    overlay.hidden = !state.excluir;
    if (!state.excluir) return;

    const { descricao, valor } = state.excluir;
    $("#excluir-texto").textContent =
      `"${descricao}" no valor de ${fmt(valor)} será removida do painel. A ação não pode ser desfeita.`;
  };

  // Mostra a view atual e chama o desenho de cada parte da tela
  function render() {
    const d = derivar();

    document.querySelectorAll("[data-ir]").forEach(botao => {
      if (botao.classList.contains("dock__button")) {
        botao.classList.toggle("is-on", botao.dataset.ir === state.view);
      }
    });

    $("#view-geral").hidden = state.view !== "geral";
    $("#view-lista").hidden = state.view !== "lista";
    $("#view-categorias").hidden = state.view !== "categorias";

    renderCabecalho(d);
    renderPainel(d);

    if (state.view === "geral") renderGeral(d);
    if (state.view === "lista") renderLista(d);
    if (state.view === "categorias") renderCategorias(d);

    renderModal();
    renderExclusao();
  }

  // Abre o formulário para cadastrar uma movimentação
  const abrirNova = () => setState({
    modal: true,
    editando: null,
    erro: "",
    form: formVazio()
  });

  // Abre o formulário preenchido com os dados de uma movimentação
  const abrirEdicao = id => {
    const item = state.itens.find(i => i.id === id);
    if (!item) return;
    setState({
      modal: true,
      editando: id,
      erro: "",
      form: { ...item, valor: String(item.valor).replace(".", ","), data: dataBr(item.data), parcelado: false, parcelas: "2" }
    });
  };

  // Fecha o formulário e descarta a edição em andamento
  const fecharModal = () => setState({ modal: false, editando: null, erro: "" });

  // Valida os dados e grava a movimentação, criando ou editando
  const salvar = () => {
    const { descricao, valor, data, tipo, categoria, status, parcelado, parcelas } = state.form;
    const numero = parseNum(valor);

    if (!descricao.trim()) return setState({ erro: "Informe uma descrição para a movimentação." });
    if (Number.isNaN(numero) || numero <= 0) return setState({ erro: "Informe um valor maior que zero." });
    const dataIso = isoDeBr(data);
    if (!dataIso) return setState({ erro: "Informe uma data válida, no formato dd/mm/aaaa." });

    const registro = { tipo, descricao: descricao.trim(), categoria, valor: numero, data: dataIso, status };
    const ultimoId = state.itens.reduce((max, i) => Math.max(max, i.id), 0);

    // parcelar só faz sentido ao criar; editando, mexe-se numa parcela só
    const quantas = !state.editando && parcelado ? Number(parcelas) : 1;

    // uma entrada vira N registros, um por mês, cada um com a sua fatia
    const novos = dividirEmParcelas(numero, quantas).map((fatia, i) => ({
      ...registro,
      id: ultimoId + 1 + i,
      descricao: quantas > 1 ? `${registro.descricao} (${i + 1}/${quantas})` : registro.descricao,
      valor: fatia,
      data: dataAdiante(dataIso, i),
      // as parcelas futuras ainda não aconteceram
      status: i === 0 ? status : "pendente"
    }));

    const itens = state.editando
      ? state.itens.map(i => (i.id === state.editando ? { ...i, ...registro } : i))
      : [...novos, ...state.itens];

    persistir(itens);
    // lido antes do setState, que zera o editando
    const eraEdicao = Boolean(state.editando);
    setState({ itens, modal: false, editando: null, erro: "" });

    if (eraEdicao) avisar("Alterações salvas");
    else if (quantas > 1) avisar(`${quantas} parcelas adicionadas`);
    else avisar("Movimentação adicionada");
    return undefined;
  };

  // avisa depois do setState, que e sincrono e ja redesenhou a tela

  // Remove a movimentação escolhida
  const confirmarExclusao = () => {
    const itens = state.itens.filter(i => i.id !== state.excluir.id);
    persistir(itens);
    setState({ itens, excluir: null });
    avisar("Movimentação excluída", "#mimo-gato-preocupado");
  };

  // Gera um arquivo CSV com todas as movimentações
  const exportarCsv = () => {
    const cabecalho = ["Data", "Tipo", "Descricao", "Categoria", "Status", "Valor"];

    const corpo = ordenar(state.itens)
      .map(({ data, tipo, descricao, categoria, status, valor }) =>
        [data, tipo, descricao, categoria, status, String(valor).replace(".", ",")]);

    const csv = [cabecalho, ...corpo]
      .map(linha => linha.map(celula => `"${String(celula).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "mimo-movimentacoes.csv" });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Aplica o tema oposto ao atual
  const trocarTema = () => {
    const tema = state.tema === "escuro" ? "claro" : "escuro";

    if (tema === "escuro") document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;

    try {
      localStorage.setItem(TEMA_KEY, tema);
    } catch (e) {
      // sem armazenamento a escolha vale só nesta sessão
    }

    // os gráficos guardam as cores de quando nasceram: recria com as do tema novo
    if (window.Chart) Chart.defaults.color = token("--faint");
    if (graficoFluxo) {
      graficoFluxo.destroy();
      graficoFluxo = null;
    }
    if (graficoCategorias) {
      graficoCategorias.destroy();
      graficoCategorias = null;
    }

    setState({ tema });
  };

  // Abre o tema novo a partir do botão, num círculo que cresce até cobrir a tela
  const alternarTema = () => {
    const semAnimacao = !document.startViewTransition;

    if (semAnimacao) return trocarTema();

    // a abertura nasce no botão, e não no centro da tela
    const area = $("#botao-tema").getBoundingClientRect();
    const x = area.left + area.width / 2;
    const y = area.top + area.height / 2;

    // raio até o canto mais distante, para o círculo cobrir a tela inteira
    const raio = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const raiz = document.documentElement;
    raiz.style.setProperty("--tema-x", `${x}px`);
    raiz.style.setProperty("--tema-y", `${y}px`);
    raiz.style.setProperty("--tema-r", `${Math.ceil(raio)}px`);

    return document.startViewTransition(trocarTema);
  };

  // Abre ou fecha o painel lateral respeitando a animação
  const alternarPainel = () => {
    const painel = $("#painel");
    if (!state.drawer) return setState({ drawer: true });

    painel.classList.add("is-leaving");
    return setTimeout(() => {
      painel.classList.remove("is-leaving");
      setState({ drawer: false });
    }, 330);
  };

  // Registra os eventos de clique, digitação e teclado
  const ligarEventos = () => {
    $("#campo-categoria").innerHTML = CATS
      .map(nome => `<option value="${esc(nome)}">${esc(nome)}</option>`)
      .join("");

    $("#campo-parcelas").innerHTML = Array.from({ length: MAX_PARCELAS - 1 }, (_, i) => i + 2)
      .map(n => `<option value="${n}">${n}x</option>`)
      .join("");

    document.addEventListener("click", evento => {
      const alvo = evento.target.closest("[data-ir], [data-editar], [data-excluir], [data-filtro], [data-fechar], [data-type], [data-mes]");
      if (!alvo) return;

      const { ir, editar, excluir, filtro, valor, type, mes } = alvo.dataset;

      if (ir) setState({ view: ir });
      if (editar) abrirEdicao(Number(editar));
      if (excluir) setState({ excluir: state.itens.find(i => i.id === Number(excluir)) || null });
      if (filtro === "tipo") setFiltro({ tipoFiltro: valor });
      if (filtro === "status") setFiltro({ statusFiltro: valor });
      if (mes === "anterior") andarMes(-1);
      if (mes === "proximo") andarMes(1);
      if (mes === "hoje") setState({ mesRef: MES_REF });

      if (type) setForm({ tipo: type, categoria: type === "entrada" ? "Salário" : "Mercado" });
      if ("fechar" in alvo.dataset) fecharModal();
    });

    $("#overlay-form").addEventListener("click", evento => {
      if (evento.target === $("#overlay-form")) fecharModal();
    });

    $("#overlay-excluir").addEventListener("click", evento => {
      if (evento.target === $("#overlay-excluir")) setState({ excluir: null });
    });

    $("#botao-painel").addEventListener("click", alternarPainel);
    $("#dock-painel").addEventListener("click", alternarPainel);
    $("#botao-nova").addEventListener("click", abrirNova);
    $("#botao-salvar").addEventListener("click", salvar);
    $("#botao-csv").addEventListener("click", exportarCsv);
    $("#botao-manter").addEventListener("click", () => setState({ excluir: null }));
    $("#botao-confirmar-exclusao").addEventListener("click", confirmarExclusao);
    $("#botao-privacidade").addEventListener("click", () => setState({ privado: !state.privado }));
    $("#botao-tema").addEventListener("click", alternarTema);

    $("#pagina-anterior").addEventListener("click", () => setState({ pagina: state.pagina - 1 }));
    $("#pagina-proxima").addEventListener("click", () => setState({ pagina: state.pagina + 1 }));
    $("#cartao").addEventListener("click", () => setState({ flip: !state.flip }));
    $("#mascote-clicavel").addEventListener("click", ronronar);

    $("#busca").addEventListener("input", evento => setFiltro({ query: evento.target.value }));

    $("#campo-data").addEventListener("input", evento => setForm({ data: mascaraData(evento.target.value) }));
    $("#campo-parcelado").addEventListener("change", evento => setForm({ parcelado: evento.target.checked }));
    $("#campo-parcelas").addEventListener("change", evento => setForm({ parcelas: evento.target.value }));

    // o campo nativo fica escondido so para emprestar o calendario do sistema
    $("#botao-calendario").addEventListener("click", () => {
      const nativo = $("#campo-data-nativo");
      nativo.value = isoDeBr(state.form.data) || HOJE_ISO;
      try {
        nativo.showPicker();
      } catch (e) {
        nativo.focus();
      }
    });
    $("#campo-data-nativo").addEventListener("change", evento => {
      if (evento.target.value) setForm({ data: dataBr(evento.target.value) });
    });

    const campos = [
      ["#campo-descricao", "descricao"],
      ["#campo-valor", "valor"],
      ["#campo-categoria", "categoria"],
      ["#campo-status", "status"]
    ];
    campos.forEach(([seletor, chave]) => {
      $(seletor).addEventListener("input", evento => setForm({ [chave]: evento.target.value }));
    });

    document.addEventListener("keydown", evento => {
      if (evento.key === "Escape") {
        if (state.excluir) return setState({ excluir: null });
        if (state.modal) return fecharModal();
        if (state.drawer) return alternarPainel();
      }
      if (evento.key === "Enter" && state.modal) salvar();
      return undefined;
    });
  };

  // Liga os eventos, desenha a tela e esconde a abertura
  const iniciar = () => {
    if (window.Chart) {
      Chart.defaults.font.family = '"Manrope", system-ui, sans-serif';
      Chart.defaults.font.size = 11;
      Chart.defaults.color = token("--faint");
    }

    ligarEventos();
    render();
    desenharIcones();

    const preloader = $("#preloader");
    setTimeout(() => preloader.classList.add("is-leaving"), 1150);
    setTimeout(() => { preloader.hidden = true; }, 1750);
  };

  document.addEventListener("DOMContentLoaded", iniciar);
})();
