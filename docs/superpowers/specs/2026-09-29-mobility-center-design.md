# Trajeto — Centro de Mobilidade Contextual

**Data:** 2026-09-29  
**Status:** proposta para revisão do usuário  
**Escopo:** evolução arquitetural do fluxo público/mobile do Trajeto

## 1. Objetivo

Evoluir o Trajeto de um conjunto de ferramentas de rota, postos e custos para uma central de mobilidade cotidiana que responde à situação atual do usuário com uma ação principal clara.

O produto deve organizar o ciclo:

**Planejar → Preparar → Navegar → Registrar → Aprender → Repetir**

A evolução deve reutilizar os componentes e dados locais já existentes, reduzindo duplicação visual e lógica paralela.

## 2. Princípios

- Mobile-first; desktop continua funcional.
- Uma ação principal por contexto.
- Visual premium sem aumentar dependências.
- Dados externos somente quando vierem de uma fonte/provedor real.
- Estimativas locais sempre identificadas como estimativas.
- Funcionalidade offline não deve prometer o que o navegador não consegue executar.
- Dados pessoais locais permanecem no dispositivo.
- Compatibilidade com GitHub Pages e `BASE_URL` existente.
- Nenhuma alteração deve remover ou quebrar navegação Google/Waze/Apple já existente.
- Toda lógica pura nova deve ser testável.
- Acessibilidade: foco visível, toque mínimo adequado, sem autoFocus em mobile, reduced motion e sem depender apenas de cor.

## 3. Arquitetura escolhida

### 3.1 Centro de Viagem unificado

Criar uma camada de contexto que coordena os blocos atuais em vez de adicionar novos cards independentes.

Estados operacionais:

- `idle`: ainda não há contexto suficiente.
- `planning`: destino/veículo permitem iniciar planejamento.
- `route_ready`: existe uma viagem recente reutilizável.
- `preparing`: falta uma configuração relevante antes da saída.
- `navigating`: modo condução/rota em andamento.
- `offline`: há rota local utilizável sem conexão.
- `completed`: viagem encerrada e pronta para registro/aprendizado.

A ação principal será derivada do contexto, por exemplo:

- Planejar viagem
- Configurar destino
- Repetir viagem
- Continuar rota offline
- Preparar viagem

A camada de contexto não buscará dados externos nem fará navegação. Ela somente sintetizará estado local e resultados já disponíveis.

## 4. Memória local de mobilidade

Expandir a memória local existente para representar uso real, sem inferir dados que não foram registrados.

Registrar, quando disponível:

- origem/destino;
- data/hora do uso;
- frequência de uma rota;
- último uso;
- veículo selecionado;
- última estação consultada;
- rota offline salva;
- intenção recente.

A recorrência será calculada por eventos com timestamp. Não será permitido dividir uma contagem histórica por uma janela de dias e apresentá-la como frequência temporal real.

Limites:

- armazenamento local com limites explícitos;
- descarte seguro de registros inválidos;
- estruturas versionáveis para futuras migrações;
- falha de localStorage não pode derrubar a interface.

## 5. Preparação da viagem

A preparação seguirá uma sequência compacta:

**Destino → Rota → Veículo → Combustível → Offline → Navegação**

Cada etapa poderá ser omitida quando não fizer sentido.

Exemplos:

- sem destino: solicitar destino;
- com destino recorrente: oferecer repetição;
- com rota offline fresca: permitir continuar offline;
- sem veículo: permitir planejar sem custo de combustível;
- sem preço de combustível registrado: não inventar preço.

Os dados devem mostrar procedência:

- **Real/externo:** veio de provedor ou fonte identificável;
- **Registrado:** foi informado/registrado pelo usuário;
- **Estimado:** calculado a partir de parâmetros locais.

## 6. Comparação de rotas

A comparação existente será consolidada em uma superfície única.

Critérios disponíveis somente quando os dados existirem:

- mais rápida;
- menor distância;
- menor combustível estimado;
- menor custo conhecido;
- evitar pedágios;
- menor impacto de trânsito.

Não haverá ranking universal ou nota artificial.

Cada alternativa exibirá seus dados disponíveis e a origem/procedência quando relevante. Pedágio só será exibido quando fornecido por uma fonte de roteamento que realmente o suporte.

## 7. Cofre offline

Criar uma visão única das rotas locais:

- rota recente;
- rota favorita;
- data de salvamento;
- idade da cópia;
- estado: disponível, antiga ou indisponível;
- ação para preparar/abrir quando possível.

Rotas antigas serão claramente marcadas. Nenhuma tela deve sugerir que uma rota offline garante trânsito atual ou navegação online.

## 8. Diário de mobilidade

Consolidar o histórico local em registros simples:

- origem;
- destino;
- data;
- distância;
- duração;
- veículo;
- combustível registrado;
- custo registrado/estimado;
- observação opcional.

Visões:

- hoje;
- últimos 7 dias;
- últimos 30 dias;
- histórico.

A primeira versão priorizará dados já disponíveis no Trajeto para evitar criar um banco paralelo desnecessário.

## 9. Economia e custos

Unificar os recursos atuais de combustível, despesas e calculadora local.

Indicadores possíveis:

- custo por km;
- combustível por viagem;
- litros registrados;
- preço médio registrado;
- gasto no período;
- média diária;
- projeção baseada em dados registrados;
- comparação entre períodos quando houver amostra suficiente.

Separação obrigatória:

**Registrado ≠ estimado ≠ projetado.**

Não serão criados números para preencher espaços vazios.

## 10. Radar de dados oficiais

Manter o radar existente como camada de procedência, sem transformá-lo em conteúdo decorativo.

Cada indicador deve ter:

- valor;
- data de atualização;
- fonte;
- natureza do dado;
- link quando disponível.

Fontes externas devem ser atualizadas somente após verificação real. Datas antigas não serão alteradas por suposição.

## 11. Segurança e privacidade

Reforçar a fronteira entre dados locais e APIs:

- validar entradas de localStorage;
- ignorar objetos corrompidos;
- limitar tamanho de listas;
- tratar parâmetros de URL como não confiáveis;
- validar destinos antes de gerar ações;
- usar URLs externas somente para destinos conhecidos;
- evitar inserir conteúdo não confiável diretamente em HTML;
- não armazenar segredos no cliente;
- manter dados pessoais locais fora de logs públicos;
- permitir limpeza explícita da memória local relevante.

## 12. UX mobile premium

A hierarquia visual será:

1. contexto atual;
2. ação principal;
3. próxima informação necessária;
4. detalhes secundários.

Regras:

- cards menores e consistentes;
- rolagem horizontal somente quando melhora comparação;
- barra de ação inferior no modo condução;
- safe-area;
- alvos de toque adequados;
- inputs com tamanho de fonte que evite zoom automático;
- estados vazios úteis;
- skeletons apenas quando existe carregamento real;
- reduced motion;
- sem teclado automático ao abrir busca;
- sem repetição das mesmas métricas em vários componentes.

A tela inicial deve parecer uma sequência de decisões, não um painel cheio de módulos.

## 13. Consolidação dos componentes atuais

A evolução deve aproximar:

- `DailyCommandCenter`
- `TripReadinessCard`
- `TripDecisionPanel`
- `TripFuelBriefing`
- `RecentTripsCard`
- memória de `mobilePreferences`

O objetivo não é necessariamente apagar os componentes. Eles devem passar a receber contexto comum e aparecer somente quando sua informação for relevante.

`MobileUtilityHub` continuará como camada secundária de exploração, evitando competir com a ação principal.

## 14. Fluxo pós-viagem

Quando houver dados suficientes, o Trajeto poderá registrar o encerramento da viagem e atualizar a memória local.

O ciclo será:

1. planejamento;
2. preparação;
3. navegação externa;
4. retorno ao Trajeto;
5. registro opcional;
6. atualização de frequência;
7. próxima viagem mais rápida de preparar.

Não haverá rastreamento contínuo de localização nesta fase.

## 15. Dados e fontes

Categorias de procedência:

- `external`: fonte/provedor externo;
- `recorded`: dado registrado pelo usuário;
- `estimated`: cálculo local;
- `projected`: projeção derivada;
- `offline`: cópia local com data de atualização.

A interface deve preferir transparência a falsa precisão.

## 16. Compatibilidade

Preservar:

- React 19;
- Vite;
- TypeScript;
- Vitest;
- Wouter;
- Tailwind existente;
- GitHub Pages;
- `appUrl` e `BASE_URL`;
- APIs tRPC existentes;
- navegação Google/Waze/Apple;
- funcionamento sem autenticação para os recursos locais.

Nenhuma biblioteca pesada nova será adicionada.

## 17. Testes

Cobertura mínima da evolução:

- estados do motor de contexto;
- recorrência baseada em timestamp;
- localStorage inválido;
- ausência de destino;
- ausência de veículo;
- rota offline fresca;
- rota offline antiga;
- dados estimados sem preço registrado;
- limites de histórico;
- transição entre contextos.

Para componentes React:

- hooks condicionais;
- estados de loading/empty/error;
- acessibilidade dos controles;
- comportamento mobile sem autoFocus;
- preservação dos fluxos existentes.

Antes de declarar a evolução concluída, deve haver evidência de testes/build quando o ambiente disponível permitir. Status vazio do GitHub não será interpretado como sucesso.

## 18. Critérios de aceite

A evolução será considerada pronta quando:

- o usuário consegue identificar a ação principal sem percorrer vários cards;
- uma rota recorrente pode ser repetida rapidamente;
- uma rota offline é claramente diferenciada de uma rota atual;
- custos distinguem registrado, estimado e projetado;
- nenhum pedágio ou trânsito é inventado;
- a memória temporal usa timestamps reais;
- os fluxos existentes de navegação continuam funcionando;
- o layout mobile permanece utilizável em telas pequenas;
- dados corrompidos locais não derrubam a aplicação;
- não são adicionadas dependências pesadas;
- testes relevantes existem para a lógica nova;
- o diff permanece focado no objetivo.

## 19. Fora do escopo desta fase

- navegação própria em tempo real;
- rastreamento contínuo de GPS;
- criação de uma base de dados de trânsito própria;
- promessa de preços de pedágio sem provedor real;
- monetização/pricing;
- conta obrigatória para uso básico;
- troca de stack;
- reescrita total do frontend.

## 20. Ordem de implementação

1. Motor de contexto e contratos de dados.
2. Memória local robusta e recorrência.
3. Centro de Viagem unificado.
4. Cofre offline.
5. Consolidação de custos e diário.
6. Comparação de rotas.
7. pós-viagem.
8. refinamento visual mobile.
9. testes de regressão e acessibilidade.
10. verificação final do diff e CI/build disponível.
