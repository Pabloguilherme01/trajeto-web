# Segurança das ferramentas de desenvolvimento

A auditoria inicial encontrou 11 alertas no conjunto completo de dependências: 8 moderados, 1 alto e 2 críticos. As dependências de produção não tinham alertas.

## Alterações

- Vitest 2.1.9 → 4.1.11 e Vite 5.4.21 → 7.3.7, declarado explicitamente como dependência de desenvolvimento.
- Configuração de testes migra de `environmentMatchGlobs` para projetos Node e jsdom, preservando os padrões de arquivos e os aliases. A opção removida `minWorkers` sai dos scripts e CI; `maxWorkers=1` continua limitando a concorrência.
- Mocks das classes do mapa passam a usar funções construtoras. Não há mudança no comportamento do mapa em produção.
- Typography atualizado para 0.5.20; override restrito ao seu parser usa a versão corrigida 7.1.6.
- Override restrito a `@esbuild-kit/core-utils` usa esbuild 0.25.12, evitando o downgrade incompatível do drizzle-kit sugerido por `npm audit fix --force`.
- O workflow Security instala e audita também as ferramentas de build/teste e falha em alertas moderados ou superiores. A auditoria de produção continua explícita.

## Verificação

`npm audit` completo e `npm audit --omit=dev` retornaram zero alertas. TypeScript, custo zero, build de produção e build com base `/trajeto-web/` passaram. O gerador Drizzle leu as 20 tabelas e produziu SQL em diretório temporário, sem conexão ao banco e sem alterar migrações existentes.

A suíte local completa passou: 914 testes, com 2 integrações opcionais ignoradas. A integração depende da confirmação do CI e das verificações de navegador, acessibilidade, Mobile QA, Responsive browsers e CodeQL no PR.

Referência da migração: https://v4.vitest.dev/guide/migration.html

A instalação offline inicial do catálogo e os testes em Android físico continuam sendo trabalhos separados; nenhuma medição de hardware foi inventada.
