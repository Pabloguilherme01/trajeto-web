# Contribuindo

## Fluxo

1. Crie uma branch curta a partir de main.
2. Faça uma mudança de responsabilidade única.
3. Rode npm run check.
4. Rode npm test.
5. Rode npm run build.
6. Abra um Pull Request descrevendo problema, solução e risco.

## Padrões

- TypeScript estrito.
- Validação de entrada com Zod.
- Componentes React pequenos quando houver separação clara de responsabilidade.
- Lógica de negócio compartilhada deve ficar em server/lib ou módulos de domínio.
- Evite novas dependências quando a plataforma ou uma biblioteca já presente resolver o problema.
- Toda funcionalidade persistente deve considerar autenticação, autorização, privacidade e migração.

## UX

Mudanças de interface devem funcionar em telas pequenas, teclado e leitores de tela. Não esconda informação crítica apenas por estética.
