# Trajeto

O Trajeto é uma **plataforma mobile de utilidade pública e mobilidade para Águas Lindas de Goiás e o Entorno do Distrito Federal**. O núcleo público funciona sem conta e preserva uma experiência útil mesmo com conexão limitada ou indisponível.

## Objetivo

**Resolver necessidades locais e decisões de deslocamento com poucos toques, dados verificáveis e continuidade offline.**

O produto combina rotas, postos, serviços públicos, contatos úteis e recursos de preparação de viagem sem tentar substituir um aplicativo completo de navegação. Para mapas curva a curva, o Trajeto pode encaminhar o usuário ao navegador de sua escolha; dentro do app, prioriza contexto, dados locais, estimativas claramente identificadas e ações práticas.

O fluxo principal é:

**buscar → resolver → decidir → navegar**

Toda nova funcionalidade deve justificar seu espaço por reduzir tempo, toques, dados, custo ou incerteza para o cidadão. Recursos que apenas aumentam complexidade sem melhorar uma decisão concreta ficam fora do núcleo.

A experiência pública começa simples: pesquisar uma necessidade, serviço, lugar, posto ou destino; receber a próxima ação adequada; e continuar com conteúdo preparado no aparelho quando possível. Cadastro e backend permanecem opcionais.

O foco inicial é **Águas Lindas de Goiás e o corredor com o Distrito Federal**. A expansão territorial depende de cobertura de dados, fontes e utilidade comprovada.

## Direção de produto

O Trajeto evoluiu de uma ferramenta de postos para um **copiloto local de utilidade pública e deslocamento**.

A promessa é:

> **Encontre o que precisa. Saiba por onde seguir.**

O produto deve reduzir decisões desnecessárias, preservar privacidade de localização e manter a próxima ação pronta no celular.

### Loop principal

**Detectar → Decidir → Navegar → Lembrar → Compartilhar → Reutilizar**

- Detectar o contexto disponível no aparelho, como destino recorrente, última viagem, último posto, conexão e disponibilidade offline.
- Decidir com contexto de distância, desvio, preço de referência e origem dos dados.
- Navegar por Google Maps ou Waze quando o usuário escolher.
- Lembrar rotas, destinos e preferências de uso recorrente localmente.
- Compartilhar a decisão, não apenas um link ou nome de posto.
- Reutilizar o que já funcionou na próxima viagem.

### Objetivos

1. Tornar a primeira decisão útil possível em poucos toques.
2. Transformar uso ocasional em hábito de viagem recorrente.
3. Preservar transparência entre dados oficiais, dados de terceiros e estimativas.
4. Funcionar bem com conexão lenta, pouca bateria e períodos sem internet.
5. Criar compartilhamento natural de resultados concretos, especialmente rotas e decisões de parada.
6. Manter cadastro opcional e usar armazenamento local quando isso for suficiente.

### Recursos estratégicos

- **Próxima ação:** uma ação principal contextual em vez de um painel de funcionalidades.
- **Destinos inteligentes:** Casa, Trabalho e Destino com frequência e recência local.
- **Painel de viagem:** última viagem, último posto, rotas offline, economia e estado de conexão.
- **Perfil local do veículo:** consumo, combustível, tanque e autonomia estimada sem exigir login.
- **Kit de viagem:** checklist automático para saber se a viagem está preparada.
- **Decisão compartilhável:** compartilhamento com posto, contexto, preço de referência, desvio e justificativa.
- **Atalhos adaptativos:** o acesso rápido prioriza o comportamento recorrente do aparelho.
- **PWA e offline:** continuidade do fluxo mesmo quando serviços externos não estão disponíveis.
- **Navegação externa:** Google Maps, Waze e Apple Maps como opções de execução quando o usuário escolher, sem torná-los dependências do núcleo.

### Loop de crescimento por utilidade

O Trajeto não deve depender de gamificação vazia.

O mecanismo de crescimento é:

**decisão útil → compartilhamento → descoberta → primeira consulta → salvamento → retorno**

Uma página compartilhável deve resolver uma pergunta real, como:

- onde parar neste caminho;
- quanto vou desviar;
- qual parada vale considerar;
- qual rota já está salva;
- como abrir a navegação.

Cada recurso novo deve economizar **tempo, toques, dados ou dinheiro**. Recursos que não melhoram uma decisão concreta ficam fora do fluxo principal.

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

O Trajeto mantém um **núcleo público de custo obrigatório R$ 0** que precisa funcionar no GitHub Pages sem banco, login ou API comercial.

- **Frontend público:** React 19 + Vite + TypeScript + Tailwind CSS.
- **Runtime estático:** GitHub Pages com PWA, service worker, dados locais e processamento no aparelho.
- **Dados essenciais:** catálogos locais/oficiais versionados, snapshots preparados e armazenamento local para continuidade offline.
- **Rotas públicas:** resolução local primeiro; geocodificação pública apenas como fallback moderado; OSRM para rotas públicas quando disponível; estimativa local quando a rede falha.
- **Localização atual:** GPS permanece no aparelho; o fluxo privado não envia a posição exata para o provedor de rota e não a grava em URL ou histórico.
- **Navegação externa:** Google Maps, Waze e Apple Maps são saídas opcionais escolhidas pelo usuário.
- **Backend opcional:** Express + tRPC + MySQL/Drizzle + OAuth podem habilitar recursos avançados, mas não são necessários para as funções essenciais públicas.
- **APIs comerciais:** Google Maps/Forge, TomTom, Mapbox ou equivalentes são complementos opcionais e não podem virar requisito silencioso do núcleo.
- **Validação e segurança:** Zod, limites de payload, rate limiting, timeouts, circuit breakers e auditoria de dependências.
- **Testes e CI:** typecheck, testes unitários/componentes/páginas, build, E2E/acessibilidade, smoke do GitHub Pages, Security e CodeQL.

## Estrutura

- `client/src/pages`: fluxos de produto.
- `client/src/components`: componentes reutilizáveis.
- `client/src/lib`: utilitários e regras de apresentação.
- `server/routers`: contratos de API e autorização.
- `server/lib`: regras de negócio e integrações de domínio.
- `server/_core`: infraestrutura HTTP, autenticação e runtime.
- `drizzle`: modelo persistente.
- `shared`: contratos compartilhados.

## Arquitetura de produção

O **deploy público padrão** pode ser somente o GitHub Pages. Nesse modo, busca local, serviços públicos, postos preparados, calculadora, PWA/offline e o planejamento público continuam úteis sem Express, banco, OAuth ou chave comercial.

A ordem de preferência do planejamento público é: **dados e coordenadas locais → cache do aparelho → geocodificador público de contingência → roteamento público → estimativa local**. Provedores públicos compartilhados são tratados como fallback, com cache, deduplicação, limitação de chamadas e circuit breaker; eles não devem ser usados como backend ilimitado.

Se um backend Express for implantado para recursos avançados, configure `VITE_API_BASE_URL` no frontend e `FRONTEND_ORIGIN` no servidor. Banco, OAuth e integrações comerciais pertencem a esse modo opcional e seus secrets não devem ser necessários para publicar o núcleo estático.

O CI contém uma verificação específica para impedir que o núcleo do GitHub Pages passe a depender silenciosamente de API comercial paga.

### Planejador e preparação offline

O catálogo oferece 2.561 pares de origem e destino, com atalhos de ida e volta e quatro modos de deslocamento. As 50 referências viárias selecionadas usam pontos aproximados do catálogo OpenStreetMap; não representam entradas de imóveis. Os postos usam coordenadas do cadastro ANP. Os atalhos preenchem os locais para cálculo: não são 2.561 trajetos pelas ruas previamente verificados.

No modo Offline, confira **Seu Trajeto sem internet** e prepare o acesso enquanto houver conexão. Calcule e salve a ida e a volta no modo que será usado. Uma rota viária preparada preserva sua geometria e as instruções disponíveis; locais conhecidos sem geometria salva recebem uma estimativa identificada. Endereços desconhecidos, trânsito atualizado e linhas/horários de transporte público não são garantidos offline.

O mapa aparece antes dos painéis complementares e permite selecionar uma referência, ver origem/destino, enquadrar o percurso e abrir em tela cheia. Quando o destino corresponde a um serviço público cadastrado, o card **Antes de sair** mostra endereço, horário informado, contato, fonte e orientações disponíveis, incluindo avisos de atendimento a confirmar. A fonte online exige conexão; chamadas exigem rede telefônica. Nenhum contato ou horário novo é inferido pela posição do mapa.

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
