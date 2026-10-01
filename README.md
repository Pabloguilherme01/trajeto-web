# Trajeto

O Trajeto é uma ferramenta mobile de utilidade pública para **Águas Lindas de Goiás**, reunindo serviços públicos, contatos oficiais, lugares úteis, postos e rotas em uma experiência simples e preparada para conexão instável.

## Objetivo

**Ajudar o cidadão a resolver uma necessidade local com poucos toques: encontrar o canal certo, ligar, abrir o serviço oficial, localizar um atendimento ou seguir uma rota.**

A mobilidade continua sendo um núcleo importante do produto, mas não define sozinha o Trajeto. O site deve responder tanto a necessidades de deslocamento quanto a tarefas cotidianas como saúde, assistência, cidadania, iluminação pública, limpeza urbana e emergência.

Os fluxos principais são:

**buscar → entender → agir**  
**planejar → decidir → navegar**

Toda nova funcionalidade deve justificar seu espaço por reduzir **tempo, toques, dados móveis ou incerteza**. Se apenas repetir informação já disponível, aumentar a densidade da tela ou depender de dado sem fonte confiável, deve ficar fora da experiência principal.

A plataforma é pública e simples: cadastro não é necessário para acessar os recursos essenciais. Preferências, destinos e rotas podem permanecer no aparelho quando isso for suficiente.

O foco territorial inicial é **Águas Lindas de Goiás**, com atenção especial ao deslocamento pelo corredor **Águas Lindas ↔ Distrito Federal**. Expansões devem acontecer somente quando houver fonte confiável, manutenção viável e utilidade pública clara.

## Nova narrativa de produto

O Trajeto evolui de uma ferramenta para encontrar postos para um **copiloto de deslocamento**.

A promessa passa a ser:

> **Decida onde parar. Saiba por onde seguir.**

O produto deve reduzir o número de decisões durante uma viagem e manter a próxima ação pronta no celular.

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
- **Navegação externa:** Google Maps e Waze como destinos de execução, sem tentar substituir mapas.

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

- encontra serviços públicos e contatos oficiais sem depender de várias páginas;
- acessa rapidamente saúde, assistência, cidadania, emergência e manutenção urbana;
- encontra postos e lugares úteis com contexto de fonte;
- compara distância e impacto do desvio em deslocamentos;
- entende quando um preço é referência oficial e quando é dado de terceiros;
- calcula cenários de combustível quando informa veículo e consumo;
- abre a navegação no aplicativo de mapas escolhido;
- mantém rotas, favoritos e preferências úteis no aparelho, inclusive para continuidade offline.

## Princípio de produto

Cada tela deve responder a uma pergunta prática:

1. **O que preciso resolver?**
2. **Qual canal, local ou rota me leva à próxima ação?**
3. **O que funciona mesmo com conexão ruim ou sem internet?**
4. **Posso confiar na origem e na data desse dado?**

Nos fluxos de mobilidade, o Trajeto também deve deixar claros distância, desvio, custo e fonte. Se uma funcionalidade não ajuda uma decisão ou ação concreta, não deve ganhar espaço na experiência principal.

## Experiência pública

A página inicial prioriza uma pergunta simples: **o que você precisa resolver ou para onde precisa ir?**

Os fluxos recomendados são:

**buscar serviço ou lugar → abrir a próxima ação**  
**planejar deslocamento → decidir → navegar**

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

## Arquitetura de produção

O frontend pode ser publicado no GitHub Pages como site estático. Quando o backend Express estiver hospedado separadamente, defina `VITE_API_BASE_URL` no build do frontend e `FRONTEND_ORIGIN` no backend para permitir apenas a origem pública do site.

Sem backend disponível, o produto não finge que a API está funcionando: planejamento e busca de postos oferecem fallback direto para o Google Maps, enquanto rotas e consultas já salvas continuam disponíveis localmente. Isso mantém uma ação útil mesmo diante de falha de infraestrutura.

O GitHub Pages é adequado para o frontend estático; o backend deve ser hospedado em uma plataforma que execute Node/Express. O Express é suportado diretamente como aplicação backend pela Vercel.

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
