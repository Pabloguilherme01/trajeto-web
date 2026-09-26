# Trajeto

O Trajeto é uma ferramenta de decisão para quem se desloca de carro pelo Entorno do Distrito Federal.

## Objetivo

**Ajudar quem dirige pelo Entorno a escolher onde parar e por onde seguir, economizando tempo, combustível e desvio.**

A missão do produto é simples: transformar uma busca de posto ou rota em uma decisão prática. O Trajeto não tenta substituir o aplicativo de mapas; ele organiza contexto para responder **onde parar, quanto desviar, o que realmente pode ser economizado e de onde veio cada dado**.

O fluxo principal é:

**buscar → comparar → decidir → navegar**

Toda nova funcionalidade deve justificar seu espaço por melhorar uma dessas quatro etapas. Se não melhorar a decisão ou o uso recorrente, fica fora da experiência principal.

A plataforma começa pública e simples: o usuário informa uma cidade, bairro, posto ou destino e recebe opções de abastecimento, contexto de rota e referências de fonte. Cadastro é opcional e só entra quando traz valor recorrente.

O foco inicial é o corredor **Águas Lindas de Goiás ↔ Distrito Federal**. A expansão para outros corredores deve acontecer somente quando houver cobertura de dados e uso real.

## O que o usuário ganha

- encontra postos sem precisar abrir várias fontes;
- compara distância e impacto do desvio;
- entende quando um preço é referência oficial e quando é dado de terceiros;
- calcula cenários de combustível quando informa veículo e consumo;
- abre a navegação no aplicativo de mapas escolhido;
- pode salvar favoritos, veículos, rotas e alertas quando isso fizer sentido para uso recorrente.

## Princípio de produto

Cada tela deve responder a uma pergunta prática:

1. **Onde abastecer?**
2. **Quanto vou desviar?**
3. **O que realmente economizo?**
4. **Posso confiar na origem desse dado?**

Se uma funcionalidade não ajuda uma dessas decisões, não deve ganhar espaço na experiência principal.

## Experiência pública

A página inicial tem uma única chamada principal: **consultar uma parada ou destino**.

O fluxo recomendado é:

**buscar → comparar → decidir → navegar**

Não exigimos cadastro para descobrir valor. A conta aparece depois, como ferramenta de retenção para quem quer histórico, favoritos, veículo ou alertas.

## Crescimento

O crescimento do Trajeto deve vir de utilidade repetível, não de excesso de funcionalidades:

- buscas rápidas para os corredores mais usados;
- páginas compartilháveis para consultas e rotas concretas;
- aquisição por necessidades reais, como “postos na BR-070” ou “onde parar entre Águas Lindas e Brasília”;
- resultados fáceis de compartilhar;
- páginas que resolvem uma dúvida específica;
- transparência sobre fontes e datas;
- melhoria contínua baseada em eventos agregados de produto;
- conteúdo útil para motoristas do Entorno.

O objetivo de crescimento é que alguém use o Trajeto em uma viagem, resolva uma decisão concreta e tenha um motivo claro para voltar na próxima rota.

## O que não é prioridade

Não tratamos como objetivo principal:

- dashboards públicos de operação;
- páginas institucionais sem decisão prática;
- mapas de cobertura que apenas repetem os corredores já disponíveis;
- excesso de filtros antes da primeira resposta;
- cadastro obrigatório;
- métricas de vaidade;
- recursos sociais sem utilidade direta para a viagem.

Funcionalidades administrativas continuam disponíveis apenas para operação e qualidade interna.

## Fontes e confiança

O Trajeto separa:

- **dados oficiais**, como referências da ANP;
- **dados de terceiros**, como mapas e trânsito;
- **estimativas próprias**, como cálculos de custo e impacto.

Preço de referência da ANP não é apresentado como preço de bomba nem como oferta comercial.

## Arquitetura

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS.
- **API:** tRPC 11 sobre Express.
- **Dados:** MySQL + Drizzle ORM.
- **Autenticação:** OAuth + sessão JWT em cookie HTTP-only.
- **Mapas e rotas:** integrações externas encapsuladas no servidor.
- **Validação:** Zod na fronteira das procedures.
- **Testes:** Vitest + Testing Library.
- **CI:** typecheck, testes e build.
- **Segurança:** headers, limites de payload, validação de ambiente, rate limiting de endpoints de maior custo, timeouts de provedores e auditoria de dependências.

## Estrutura

- `client/src/pages`: fluxos de produto.
- `client/src/components`: componentes reutilizáveis.
- `client/src/lib`: utilitários e regras de apresentação.
- `server/routers`: contratos de API e autorização.
- `server/lib`: regras de negócio e integrações de domínio.
- `server/_core`: infraestrutura HTTP, autenticação e runtime.
- `drizzle`: modelo persistente.
- `shared`: contratos compartilhados.

## Desenvolvimento

Requisitos:

- Node 22.
- Variáveis de ambiente conforme o ambiente de execução.

Comandos:

`npm install`

`npm run dev`

`npm run check`

`npm test`

`npm run build`

`npm start`

## Qualidade

Toda alteração deve preservar:

- typecheck sem erros;
- testes passando;
- build de produção;
- experiência mobile;
- navegação por teclado;
- autorização server-side;
- validação de entrada;
- separação entre dado oficial, dado de terceiro e estimativa.

## Segurança

Consulte `SECURITY.md` para reporte responsável e princípios de segurança.

## Contribuição

Consulte `CONTRIBUTING.md` antes de abrir um Pull Request.

## Licença

MIT
