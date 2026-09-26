# Trajeto

Plataforma web para planejamento de deslocamentos, consulta de postos, referências de combustível e contexto operacional no corredor Águas Lindas–DF.

## Produto

O Trajeto organiza a decisão do motorista em quatro camadas:

1. **Descobrir**: buscar postos e localidades.
2. **Planejar**: montar uma rota e avaliar desvios.
3. **Comparar**: cruzar distância, trânsito e referências oficiais de preço quando disponíveis.
4. **Acompanhar**: salvar veículos, favoritos, alertas e solicitações na conta.

A aplicação distingue claramente dados de terceiros, referências oficiais e estimativas próprias. Preços da ANP são referências periódicas, não ofertas comerciais.

## Arquitetura

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS.
- **API**: tRPC 11 sobre Express.
- **Dados**: MySQL + Drizzle ORM.
- **Autenticação**: OAuth integrado e sessão JWT em cookie HTTP-only.
- **Mapas e rotas**: integrações externas encapsuladas no servidor.
- **Validação**: Zod na fronteira das procedures.
- **Testes**: Vitest + Testing Library.
- **CI**: typecheck, testes e build.
- **Segurança**: headers básicos, limites de payload, validação de ambiente, auditoria de dependências e Dependabot.

## Estrutura

- client/src/pages: fluxos de produto.
- client/src/components: componentes reutilizáveis.
- client/src/lib: utilitários e integrações de apresentação.
- server/routers: contratos de API e autorização.
- server/lib: regras de negócio e integrações de domínio.
- server/_core: infraestrutura HTTP, autenticação e runtime.
- drizzle: modelo persistente.
- shared: contratos compartilhados entre cliente e servidor.

## Desenvolvimento

Requisitos:

- Node 22 recomendado.
- Variáveis de ambiente conforme o ambiente de execução.

Comandos principais:

`npm install`

`npm run dev`

`npm run check`

`npm test`

`npm run build`

`npm start`

## Variáveis sensíveis

Nunca versione segredos. Em produção, o servidor exige JWT_SECRET, VITE_APP_ID e OAUTH_SERVER_URL. Integrações externas podem exigir credenciais adicionais.

## Qualidade

Toda alteração deve preservar:

- typecheck sem erros;
- testes passando;
- build de produção;
- navegação por teclado;
- comportamento mobile;
- autorização server-side;
- validação de entrada;
- separação entre dado oficial, dado de terceiro e estimativa.

## Segurança

Consulte SECURITY.md para o processo de reporte e os princípios de segurança do projeto.

## Contribuição

Consulte CONTRIBUTING.md antes de abrir um Pull Request.

## Licença

MIT
