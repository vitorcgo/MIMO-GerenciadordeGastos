const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Executa as funções reais do app sem inicializar a interface.
function app(saved) {
  const storage = new Map(saved === undefined ? [] : [['mimo.itens.v2', saved]]);
  const context = {
    Intl, console, getComputedStyle: () => ({ getPropertyValue: () => "#000" }), matchMedia: () => ({ matches: false }),
    document: { addEventListener() {} },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
  vm.runInContext(source.replace('  document.addEventListener("DOMContentLoaded", iniciar);', `
    globalThis.api = { carregarItens, carregarLimite, parseNum, dividirEmParcelas, dataAdiante, derivar,
      get itens() { return state.itens; }, get leituraInvalida() { return leituraInvalida; },
      setItens(itens) { state.itens = itens; }, setMes(mes) { state.mesRef = mes; } };
  `), context);
  return { api: context.api, storage };
}
const registro = (patch = {}) => ({ id: 1, tipo: 'entrada', descricao: 'Registro de teste', categoria: 'Outros', valor: 100, data: '2026-01-31', status: 'pago', ...patch });

test('primeira visita inicia vazia e sem limite', () => {
  const { api, storage } = app();
  assert.equal(api.itens.length, 0);
  assert.equal(api.carregarLimite(), null);
  assert.equal(storage.size, 0);
});
test('lista vazia continua vazia após nova leitura', () => {
  assert.equal(app('[]').api.itens.length, 0);
});
test('preserva registros existentes na mesma chave', () => {
  const saved = JSON.stringify([registro()]);
  const { api, storage } = app(saved);
  assert.equal(JSON.stringify(api.itens), saved);
  assert.equal(storage.get('mimo.itens.v2'), saved);
});
test('dados inválidos não geram exemplos nem sobrescrevem o original', () => {
  for (const saved of ['{', '{}', '[null]', JSON.stringify([registro({data:'2026-02-31'})])]) {
    const { api, storage } = app(saved);
    assert.equal(api.itens.length, 0);
    assert.equal(api.leituraInvalida, true);
    assert.equal(storage.get('mimo.itens.v2'), saved);
  }
});
test('valores brasileiros são lidos integralmente', () => {
  const { api } = app();
  assert.equal(api.parseNum('1.234,56'), 1234.56);
  for (const input of ['12abc', 'Infinity', '1,234', '1.2', '1 2', '']) assert.ok(Number.isNaN(api.parseNum(input)));
});
test('parcelamento preserva centavos e ajusta o fim do mês', () => {
  const { api } = app();
  assert.deepEqual(Array.from(api.dividirEmParcelas(100, 3)), [33.34, 33.33, 33.33]);
  assert.equal(api.dataAdiante('2026-01-31', 1), '2026-02-28');
  assert.equal(api.dataAdiante('2024-01-31', 1), '2024-02-29');
});
test('saldo disponível exclui pendências e mantém valores de meses anteriores', () => {
  const { api } = app();
  api.setMes('2026-02');
  api.setItens([registro(), registro({id:2,tipo:'saida',valor:20}), registro({id:3,tipo:'saida',valor:30,status:'pendente'}), registro({id:4,valor:50,status:'pendente',data:'2026-02-02'})]);
  const d = api.derivar();
  assert.equal(d.saldo, 80);
  assert.equal(d.aPagar, 30);
  assert.equal(d.saldo - d.aPagar, 50);
  assert.equal(d.entradas, 50);
});
test('todas as categorias participam dos totais', () => {
  const { api } = app();
  api.setMes('2026-01');
  api.setItens(['Moradia','Mercado','Transporte','Lazer','Saúde','Assinaturas'].map((categoria, index) => registro({id:index+1,tipo:'saida',categoria,valor:10})));
  const d = api.derivar();
  assert.equal(d.categorias.length, 6);
  assert.equal(d.totalCategorias, 60);
});

