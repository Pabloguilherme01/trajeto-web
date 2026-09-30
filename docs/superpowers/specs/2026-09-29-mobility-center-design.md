# Trajeto — Centro de Mobilidade Contextual

**Data:** 2026-09-29  
**Status:** proposta expandida para revisão do usuário  
**Escopo:** evolução arquitetural do fluxo público/mobile do Trajeto

## 1. Objetivo

Evoluir o Trajeto de um conjunto de ferramentas de rota, postos e custos para uma central de mobilidade cotidiana que responde à situação atual do usuário com uma ação principal clara.

O produto deve organizar o ciclo:

**Planejar → Preparar → Navegar → Registrar → Aprender → Repetir**

A evolução deve reutilizar os componentes e dados locais já existentes, reduzindo duplicação visual e lógica paralela.

A expansão desta proposta adiciona uma camada de produto mais ampla sem transformar a Home em um painel congestionado. A inteligência deve crescer principalmente por trás do fluxo: contexto, memória local, rotinas, histórico, custos, veículo, offline e procedência.

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
- Mais capacidade não significa mais cards: a Home deve priorizar decisões, não quantidade de módulos.
- Nenhuma funcionalidade nova deve depender de dados inventados ou de permissões contínuas de localização.

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

### 3.2 Centro “Agora”

O Centro “Agora” será a superfície principal de decisão do usuário.

A regra é apresentar uma ação dominante, determinada pelo contexto, podendo assumir formas como:

- ir para destino recorrente;
- continuar uma rota offline;
- repetir a última viagem;
- preparar a próxima viagem;
- configurar o primeiro destino;
- abrir postos quando esse for o objetivo recente;
- registrar a viagem concluída;
- consultar custos quando o usuário estiver no fluxo de economia.

A ação secundária deve existir apenas quando houver uma próxima etapa clara. O Centro “Agora” não será uma nova grade de cards.

### 3.3 Navegação estrutural

A arquitetura de informação deverá convergir para:

- **Agora:** ação principal e estado atual.
- **Viajar:** planejar, rotas, preparar e navegar.
- **Minha mobilidade:** destinos, rotinas, histórico e diário.
- **Meu veículo:** garagem, combustível e manutenção.
- **Custos:** viagem, combustível e períodos.
- **Offline:** cofre de rotas.
- **Dados:** fontes, procedência e atualizações.

No mobile, essas áreas devem aparecer como destinos de navegação e superfícies contextuais, não como sete blocos simultâneos na Home.

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
- intenção recente;
- eventos de viagem;
- eventos de combustível;
- eventos de rota;
- eventos do veículo;
- eventos de estação;
- preferências relevantes.

A recorrência será calculada por eventos com timestamp. Não será permitido dividir uma contagem histórica por uma janela de dias e apresentá-la como frequência temporal real.

### 4.1 Destinos inteligentes

Para cada destino registrado, a camada local poderá derivar:

- mais usado;
- usado recentemente;
- frequência em 7/30/90 dias;
- último uso;
- rota mais associada;
- ação “Ir agora”;
- repetir;
- inverter origem/destino quando aplicável;
- favoritar/remover.

Padrões de horário só poderão ser exibidos quando houver amostra suficiente. O sistema não deve afirmar uma rotina com base em poucos eventos.

### 4.2 Sistema de eventos local

Quando útil, consolidar eventos em contratos pequenos e versionáveis:

- `TripEvent`;
- `FuelEvent`;
- `RouteEvent`;
- `VehicleEvent`;
- `StationEvent`;
- `PreferenceEvent`.

O objetivo é reduzir a dispersão de chaves e formatos de localStorage. A migração deve ser incremental e compatível com dados existentes.

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
- **Estimado:** calculado a partir de parâmetros locais;
- **Projetado:** projeção baseada em histórico registrado;
- **Offline:** cópia local com data de atualização.

### 5.1 Checklist automático da próxima viagem

A interface poderá condensar a preparação em um checklist:

1. destino;
2. rota;
3. veículo;
4. combustível;
5. custo conhecido/estimado;
6. cópia offline;
7. navegador externo.

Itens concluídos não devem reaparecer como tarefas redundantes. O checklist deve desaparecer ou reduzir-se quando a viagem estiver pronta.

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

### 6.1 Comparador de viagem

Além das rotas, o comparador poderá organizar uma decisão simples entre alternativas:

- distância;
- duração;
- impacto de trânsito quando fornecido;
- combustível estimado;
- pedágio somente quando conhecido;
- custo conhecido;
- observação de procedência.

A interface não deve transformar critérios incompletos em uma pontuação universal. Quando um dado não existir, mostrar “não informado” ou omitir o critério.

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

### 8.1 Resumo de rotina

Quando houver dados suficientes, o diário poderá calcular localmente:

- número de viagens;
- quilômetros registrados;
- destinos mais frequentes;
- gasto registrado;
- litros registrados;
- custo médio por km;
- comparação entre períodos.

Qualquer projeção deverá ser marcada como projeção e não substituir dados reais.

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
- comparação entre períodos quando houver amostra suficiente;
- custo de uma rotina recorrente;
- custo semanal/mensal estimado a partir de viagens registradas.

Separação obrigatória:

**Registrado ≠ estimado ≠ projetado.**

Não serão criados números para preencher espaços vazios.

### 9.1 “Quanto essa rotina custa?”

Para uma rota recorrente, quando houver dados suficientes, calcular:

- custo registrado por viagem;
- custo estimado por viagem;
- custo semanal;
- custo mensal;
- litros;
- custo por km;
- pedágio conhecido, se fornecido;
- estacionamento/outros somente quando registrados pelo usuário.

Não apresentar economia ou gasto como fato quando depender de hipótese.

## 10. Meu veículo

Expandir a garagem local sem transformar o Trajeto em sistema de diagnóstico mecânico.

Dados opcionais:

- veículo;
- combustível;
- consumo registrado;
- hodômetro;
- último abastecimento;
- manutenção;
- pneus;
- óleo;
- seguro;
- licenciamento/documentação;
- próximos itens cadastrados pelo usuário.

A interface deve indicar datas e registros, não diagnosticar defeitos.

### 10.1 Combustível inteligente

Consolidar o registro de abastecimentos para calcular, quando possível:

- preço médio registrado;
- litros;
- gasto;
- consumo derivado do hodômetro;
- custo/km;
- evolução do preço registrado;
- exportação CSV;
- comparação com dados oficiais somente quando a fonte oficial estiver disponível.

Dados registrados pelo usuário e preços oficiais não devem ser misturados como se fossem a mesma fonte.

## 11. Radar de dados oficiais

Manter o radar existente como camada de procedência, sem transformá-lo em conteúdo decorativo.

Cada indicador deve ter:

- valor;
- data de atualização;
- fonte;
- natureza do dado;
- link quando disponível.

Fontes externas devem ser atualizadas somente após verificação real. Datas antigas não serão alteradas por suposição.

O radar poderá crescer para categorias como combustível, transporte, vias e outros indicadores de mobilidade somente quando houver fonte verificável e utilidade prática.

## 12. Segurança e privacidade

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
- permitir limpeza explícita da memória local relevante;
- aplicar versionamento e migração segura de estruturas locais;
- evitar permissões persistentes desnecessárias.

### 12.1 Camada `storageSafety`

Criar, quando a implementação justificar, uma camada pequena para:

- parse seguro;
- schema/version;
- limites de tamanho;
- expiração;
- limpeza seletiva;
- fallback para estado vazio;
- recuperação de registros inválidos;
- proteção contra estruturas inesperadas.

Essa camada deve permanecer leve e sem biblioteca pesada de validação.

## 13. UX mobile premium

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

### 13.1 Modos de uso

A mesma arquitetura deverá suportar superfícies contextuais:

- **Rápido:** chegar ao destino recorrente com o mínimo de toques;
- **Economia:** custos, combustível e alternativas conhecidas;
- **Preparação:** checklist da próxima viagem;
- **Condução:** interface reduzida para ações essenciais;
- **Offline:** rotas locais e idade das cópias.

Esses modos não devem duplicar a lógica de negócio nem criar cinco versões independentes do produto.

### 13.2 Busca universal

A busca poderá localizar:

- destinos;
- rotas;
- postos;
- veículos;
- histórico;
- ações;
- configurações relevantes.

A busca deve reutilizar o mecanismo de busca já existente e não criar uma segunda command palette paralela.

## 14. Consolidação dos componentes atuais

A evolução deve aproximar:

- `DailyCommandCenter`
- `TripReadinessCard`
- `TripDecisionPanel`
- `TripFuelBriefing`
- `RecentTripsCard`
- memória de `mobilePreferences`
- `MobileUtilityHub`

O objetivo não é necessariamente apagar os componentes. Eles devem passar a receber contexto comum e aparecer somente quando sua informação for relevante.

`MobileUtilityHub` continuará como camada secundária de exploração, evitando competir com a ação principal.

A arquitetura deverá evitar a repetição das quatro ou cinco mesmas métricas em Home, Centro de Mobilidade, custos e histórico.

## 15. Fluxo pós-viagem

Quando houver dados suficientes, o Trajeto poderá registrar o encerramento da viagem e atualizar a memória local.

O ciclo será:

1. planejamento;
2. preparação;
3. navegação externa;
4. retorno ao Trajeto;
5. registro opcional;
6. atualização de frequência;
7. próxima viagem mais rápida de preparar.

O registro pós-viagem poderá perguntar de forma opcional:

- viagem concluída;
- distância/duração disponível;
- combustível/custo registrado;
- observação curta.

Não haverá rastreamento contínuo de localização nesta fase.

## 16. Dados e fontes

Categorias de procedência:

- `external`: fonte/provedor externo;
- `recorded`: dado registrado pelo usuário;
- `estimated`: cálculo local;
- `projected`: projeção derivada;
- `offline`: cópia local com data de atualização.

### 16.1 Sistema visual de procedência

Dados relevantes deverão usar uma linguagem visual curta e consistente:

- **REAL** para dado externo verificável;
- **REGISTRADO** para dado do usuário;
- **ESTIMADO** para cálculo;
- **PROJETADO** para projeção;
- **OFFLINE** para cópia local.

A procedência não deve ocupar espaço excessivo no mobile, mas precisa ser acessível e compreensível.

## 17. Compatibilidade

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

## 18. Testes

Cobertura mínima da evolução:

- estados do motor de contexto;
- recorrência baseada em timestamp;
- destinos 7/30/90 dias;
- localStorage inválido;
- ausência de destino;
- ausência de veículo;
- rota offline fresca;
- rota offline antiga;
- dados estimados sem preço registrado;
- limites de histórico;
- transição entre contextos;
- custo de rotina sem dados suficientes;
- custo de rotina com dados registrados;
- procedência dos dados;
- busca universal sem duplicar resultados indevidamente;
- migração/versão de storage quando introduzida.

Para componentes React:

- hooks condicionais;
- estados de loading/empty/error;
- acessibilidade dos controles;
- comportamento mobile sem autoFocus;
- preservação dos fluxos existentes;
- modo condução sem controles pequenos;
- navegação por teclado onde aplicável.

Antes de declarar a evolução concluída, deve haver evidência de testes/build quando o ambiente disponível permitir. Status vazio do GitHub não será interpretado como sucesso.

## 19. Critérios de aceite

A evolução será considerada pronta quando:

- o usuário consegue identificar a ação principal sem percorrer vários cards;
- uma rota recorrente pode ser repetida rapidamente;
- destinos recorrentes usam timestamps reais;
- uma rota offline é claramente diferenciada de uma rota atual;
- custos distinguem registrado, estimado e projetado;
- nenhum pedágio ou trânsito é inventado;
- a memória temporal usa timestamps reais;
- os fluxos existentes de navegação continuam funcionando;
- o layout mobile permanece utilizável em telas pequenas;
- dados corrompidos locais não derrubam a aplicação;
- não são adicionadas dependências pesadas;
- testes relevantes existem para a lógica nova;
- busca e navegação não criam fluxos paralelos redundantes;
- a Home não é transformada em um painel de cards;
- o diff permanece focado no objetivo.

## 20. Fora do escopo desta fase

- navegação própria em tempo real;
- rastreamento contínuo de GPS;
- criação de uma base de dados de trânsito própria;
- promessa de preços de pedágio sem provedor real;
- monetização/pricing;
- conta obrigatória para uso básico;
- troca de stack;
- reescrita total do frontend;
- diagnóstico mecânico do veículo;
- inferência automática de hábitos com amostra insuficiente.

## 21. Ordem de implementação

1. Motor de contexto e contratos de dados.
2. Memória local robusta e recorrência.
3. Centro “Agora” e Centro de Viagem unificado.
4. Destinos inteligentes e modos de uso.
5. Cofre offline.
6. Consolidação de custos, combustível e diário.
7. Garagem/veículo e manutenção já suportados localmente.
8. Comparação de rotas e procedência.
9. Busca universal e navegação estrutural.
10. Fluxo pós-viagem.
11. refinamento visual mobile.
12. testes de regressão, segurança e acessibilidade.
13. verificação final do diff e CI/build disponível.
