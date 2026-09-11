# Recuperação de dados locais

O Mimo interrompe novas gravações quando não consegue ler os registros existentes. Isso evita substituir dados que ainda podem ser recuperados.

## Antes de alterar qualquer coisa

1. Confirme se está no mesmo navegador, perfil, endereço e porta usados anteriormente.
2. Abra as ferramentas de desenvolvedor do navegador e procure **Aplicativo / Application** ou **Armazenamento / Storage**.
3. Em **Local Storage**, selecione o endereço do Mimo e procure a chave `mimo.itens.v2`.
4. Se a chave existir, copie o valor completo para um arquivo de texto e guarde essa cópia antes de editar ou remover qualquer dado.

O valor esperado é uma lista JSON. Uma lista vazia válida é `[]`. Cada registro contém `id`, `tipo`, `descricao`, `categoria`, `valor`, `data` e `status`.

Se houver dados importantes, mantenha a cópia original e procure ajuda para corrigir o conteúdo. Não remova a chave para tentar resolver um erro sem antes salvar essa cópia.

## Recomeçar sem os registros anteriores

Somente depois de guardar a cópia e decidir descartar os registros, remova **apenas** a chave `mimo.itens.v2` e recarregue a página. O Mimo começará vazio. Não é necessário limpar todos os dados do navegador.

## O navegador não permite salvar

Se a leitura funciona, mas a gravação falha, verifique se o navegador permite armazenamento local para esse endereço e se há espaço disponível. Tente novamente no formulário depois de corrigir a permissão ou liberar espaço.

Em modo privado, o armazenamento pode ser limitado ou removido ao encerrar a sessão. Prefira um perfil comum para manter o histórico.
