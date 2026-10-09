# Pacote de melhorias após a auditoria de 09/10/2026

## Rotas salvas

- Todas as transações têm prazo de cinco segundos, abortam em erro e fecham a conexão.
- Salvar, migrar registros antigos e aplicar o limite de 50 rotas agora acontece em uma única transação. A atualização só notifica a interface após o commit.
- Uma falha de clonagem ou gravação reverte a operação inteira, preservando os registros anteriores.
- Testes usam IndexedDB em memória para validar gravações simultâneas, limite, substituição, exclusão, limpeza e migração de origens privadas e IDs antigos. Também simulam travamentos e confirmação tardia.

## Fonte dos preços ANP

- O sincronizador escolhe a planilha datada mais recente e extrai seu período do próprio nome de arquivo. Um título de outra semana na página não será usado como período.
- Somente linhas explicitamente identificadas como Águas Lindas de Goiás/GO podem entrar na base municipal. Colunas ausentes não autorizam importar registros nacionais.
- Arquivos sem período verificável são rejeitados antes de alterar o snapshot. Não foram inventados preços nem atualizadas datas de coleta sem consulta válida.
- Regressões do seletor e do filtro rodam no CI.

## Limites deste pacote

O catálogo comercial completo ainda integra a instalação offline inicial. Separá-lo exige um contrato explícito de preparação e testes de atualização de aparelhos que já possuam o catálogo. A migração da ferramenta de testes e build deve ficar em PR separado. Este pacote não mede FPS ou memória em Android físico e não declara os contatos locais novamente verificados.
