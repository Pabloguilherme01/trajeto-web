# Segurança

## Reporte responsável

Não publique credenciais, tokens ou detalhes de uma vulnerabilidade explorável em uma issue pública.

Para problemas de segurança, abra um contato privado pelo proprietário do repositório no GitHub e inclua descrição, impacto, passos mínimos para reprodução, versão/commit afetado e evidência sem dados pessoais ou segredos.

## Princípios

- Segredos somente no ambiente de execução.
- Sessões usam cookies HTTP-only quando possível.
- Rotas autenticadas passam por protectedProcedure.
- Rotas administrativas usam adminProcedure.
- Entradas são validadas com Zod.
- APIs externas têm timeout e tratamento explícito de falha.
- O CI bloqueia falhas de typecheck, testes ou build.

Nunca envie .env, tokens OAuth, chaves de mapas, credenciais de banco ou chaves de storage para o Git.
