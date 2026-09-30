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


## 22. Evolução de nível máximo — inteligência operacional

Esta extensão consolida as novas funções em uma arquitetura única. O objetivo é aumentar a capacidade do produto sem multiplicar cards, estados paralelos ou fontes de verdade.

### 22.1 Contratos centrais

A evolução deverá convergir para contratos pequenos, versionáveis e independentes de React:

- `Mission`: objetivo de deslocamento, destino(s), estado, rota, veículo, combustível, custos, offline e conclusão.
- `Routine`: viagem recorrente ou padrão explicitamente derivado de eventos suficientes.
- `MobilityEvent`: evento temporal normalizado de viagem, combustível, rota, veículo, posto ou preferência.
- `Destination`: destino normalizado, aliases, frequência, último uso e associações.
- `MobilityGraph`: relações entre missão, rotina, destino, rota, veículo, custos e eventos.
- `NextAction`: próxima ação determinística, motivo, dependências e ação alternativa.
- `Provenance`: origem, data, atualização, tipo e limitações do dado.
- `Scenario`: simulação isolada do histórico real.
- `OfflineSnapshot`: cópia local, idade, estado e conteúdo permitido offline.
- `RecoveryState`: resultado de validação/migração/recuperação do armazenamento.

Esses contratos devem substituir gradualmente estruturas paralelas, sem exigir uma migração total em uma única alteração.

### 22.2 Mission Engine

Uma missão representa o objetivo do deslocamento, e não somente uma rota.

Exemplos:

- trabalho;
- faculdade;
- compras;
- resolver múltiplas tarefas;
- viagem longa;
- abastecer e voltar;
- voltar para casa.

A missão poderá possuir múltiplas paradas e dependências. O Trajeto organiza a missão e prepara a navegação, mas não substitui Google Maps, Waze ou Apple Maps como navegador.

### 22.3 Grafo de dependências da viagem

O fluxo lógico será:

**Objetivo → Destino → Rota → Veículo → Combustível → Offline → Navegação → Registro**

Cada dependência deve possuir estado:

- pronta;
- faltando;
- opcional;
- indisponível;
- desatualizada.

A interface deve mostrar somente a próxima dependência relevante.

### 22.4 Smart Destinations 2.0

Destinos locais poderão exibir:

- uso em 7/30/90 dias;
- último uso;
- rota mais associada;
- ir agora;
- repetir;
- inverter;
- favoritar;
- aliases normalizados.

Padrões temporais exigem amostra suficiente. O produto não deve transformar poucos registros em afirmações sobre hábitos.

### 22.5 Trip Templates

Permitir modelos reutilizáveis:

- Trabalho;
- Faculdade;
- Casa;
- Compras;
- Viagem longa;
- modelos personalizados.

Um modelo pode guardar preferências de planejamento, mas dados dinâmicos como trânsito, pedágio e preços devem ser recalculados ou buscados quando realmente disponíveis.

### 22.6 Multi-stop Mission

Uma missão pode conter múltiplos destinos registrados pelo usuário.

A representação deve permitir:

- adicionar/remover parada;
- reordenar manualmente;
- marcar parada concluída;
- voltar ao destino principal;
- abrir navegação externa por etapa.

Não criar um algoritmo próprio de otimização de trânsito sem fonte/provedor real.

### 22.7 Parada no caminho

Durante a preparação, o usuário poderá adicionar uma necessidade intermediária, como posto, mercado, farmácia, estacionamento ou endereço salvo.

A disponibilidade, distância, preço ou horário só deve aparecer quando houver dado real. Ausência de dado deve ser explícita.

### 22.8 Plan B

Missões e rotas importantes poderão ter alternativa local:

- rota principal;
- rota alternativa;
- cópia offline;
- última configuração conhecida.

Planos alternativos devem informar sua idade e nunca sugerir trânsito atual quando o dado é offline.

### 22.9 Offline Vault 2.0

O cofre offline deverá tratar separadamente:

- rotas;
- destinos;
- missões;
- preferências;
- registros;
- configurações mínimas necessárias para recuperação.

Cada item terá idade, versão, origem e estado. O sistema deverá diferenciar disponibilidade offline de validade dos dados externos.

### 22.10 Recovery Mode

Falhas de armazenamento não podem produzir tela branca.

O fluxo deverá suportar:

1. leitura segura;
2. validação;
3. migração quando aplicável;
4. descarte seletivo do item inválido;
5. fallback para estado vazio;
6. registro local mínimo da recuperação.

Quando possível, uma cópia anterior válida deverá ser preservada antes de uma migração destrutiva.

### 22.11 Storage Safety

A camada de armazenamento deverá fornecer:

- parse seguro;
- versionamento;
- limites;
- migração;
- fallback;
- expiração;
- limpeza seletiva;
- validação estrutural;
- prevenção de loops de migração.

A implementação deve permanecer leve e sem biblioteca pesada de schema.

### 22.12 Planned × Recorded

Quando houver registros suficientes, comparar planejamento e resultado:

- distância;
- duração;
- combustível;
- custo;
- rota escolhida.

A comparação deve mostrar explicitamente quais valores são planejados, registrados ou estimados. Ausência de registro não pode ser preenchida por suposição.

### 22.13 Trip Delta

Ao repetir uma viagem, mostrar somente mudanças relevantes desde a última utilização:

- configuração do veículo;
- disponibilidade offline;
- atualização de dados externos;
- combustível registrado;
- custos;
- alterações da missão.

Se nada relevante mudou, não criar uma tela adicional.

### 22.14 Data Sufficiency Engine

Criar uma regra comum para determinar se uma métrica pode ser derivada.

Exemplos:

- 0 registros: indisponível;
- amostra insuficiente: mostrar limitação;
- amostra suficiente: calcular;
- histórico amplo: permitir projeção.

Os limiares devem ser específicos à métrica e documentados, não transformados em uma nota universal de confiança.

### 22.15 Contradiction Detector

Detectar inconsistências nos registros locais, incluindo:

- odômetro regressivo;
- datas impossíveis;
- valores negativos inválidos;
- duplicações prováveis;
- litros incompatíveis com o tanque configurado;
- sequência temporal inconsistente.

O sistema deve alertar e preservar o dado original, sem corrigi-lo silenciosamente.

### 22.16 Data Aging Center

Criar uma leitura única da idade dos dados locais e externos:

- atualizado;
- recente;
- antigo;
- desatualizado;
- indisponível.

A idade deve ser calculada a partir do timestamp real da fonte ou do registro local.

### 22.17 Data Lineage

Para valores calculados relevantes, permitir explicar:

**resultado → fórmula → entradas → procedência → timestamp**

Exemplo de custo estimado:

distância × consumo configurado × preço registrado.

Se uma entrada for estimada, a cadeia deve preservar essa classificação.

### 22.18 “Por que estou vendo isso?”

Ações contextuais deverão possuir uma explicação curta derivada dos dados reais disponíveis.

Exemplo:

- destino recorrente registrado;
- rota utilizada anteriormente;
- cópia offline disponível.

A explicação não deve revelar dados privados além do necessário para a decisão.

### 22.19 Mobility Inbox

Consolidar pendências relevantes em uma única entrada contextual:

- rota offline antiga;
- registro incompleto;
- manutenção cadastrada próxima;
- missão pendente;
- inconsistência de dados;
- atualização necessária.

Itens resolvidos devem desaparecer da superfície principal.

### 22.20 Long Trip Mode

Para viagens longas, condensar preparação em:

- destino;
- rota;
- veículo;
- autonomia;
- reserva configurada;
- combustível;
- custos conhecidos;
- offline;
- navegação;
- paradas.

Não criar uma experiência separada com lógica duplicada.

### 22.21 Data/Battery Saver

Permitir reduzir consultas e atualizações:

- evitar refresh redundante;
- priorizar cache;
- permitir atualização manual;
- respeitar offline;
- reduzir chamadas externas quando o dado ainda estiver dentro da validade definida.

### 22.22 Accessibility Mode

Adicionar uma camada opcional para:

- tipografia maior;
- contraste reforçado;
- alvos de toque maiores;
- menos animação;
- foco visual forte;
- linguagem reduzida;
- menor densidade de informação.

O modo deve reutilizar os mesmos componentes e contratos.

### 22.23 Cognitive Load Mode

Um modo de baixa complexidade visual:

- destino atual;
- ação principal;
- próxima etapa;
- estado essencial.

Detalhes ficam sob demanda. Não duplicar lógica de negócio.

### 22.24 Scenario Lab

Simulações ficam separadas dos registros reais.

Permitir cenários como:

- preço de combustível alternativo;
- frequência semanal;
- frequência mensal;
- consumo hipotético;
- custo por viagem;
- comparação entre configurações.

Todo resultado simulado deve ser identificado como cenário/projeção.

### 22.25 Mobility Inbox e ações recentes

Registrar localmente ações relevantes recentes para facilitar recuperação:

- última missão aberta;
- último destino;
- última rota;
- último registro;
- última configuração alterada.

O histórico deve possuir limites e limpeza automática segura.

### 22.26 Busca universal

A busca única deve indexar localmente:

- destinos;
- rotas;
- missões;
- modelos;
- veículos;
- registros;
- ações.

Não criar outra command palette ou mecanismo paralelo.

## 23. Modelo de estado operacional

O estado global derivado deverá continuar determinístico:

`idle → planning → route_ready → preparing → navigating → completed`

Com `offline` como estado de disponibilidade quando uma cópia local puder sustentar a próxima ação.

O estado não deve depender de chamadas externas para existir. APIs externas enriquecem o contexto, mas não podem ser a única fonte para a interface básica.

## 24. Regras de não-invenção

Toda função nova deverá respeitar:

1. Sem trânsito real sem fonte real.
2. Sem pedágio sem provedor que forneça pedágio.
3. Sem preço atual sem fonte atual.
4. Sem frequência temporal sem timestamps suficientes.
5. Sem consumo histórico sem registros suficientes.
6. Sem previsão apresentada como fato.
7. Sem dado externo apresentado como dado do usuário.
8. Sem cenário apresentado como histórico.
9. Sem localização contínua.
10. Sem promessa de funcionamento offline além do que foi realmente salvo.

## 25. Segurança de dados locais

Adicionar ao desenho:

- namespace/versionamento de storage;
- migrações idempotentes;
- limites por coleção;
- validação antes de renderização;
- fallback por coleção;
- exportação/importação opcional;
- detecção de conflito durante importação;
- limpeza seletiva;
- proteção contra dados de demonstração contaminarem dados reais.

Dados importados devem ser marcados como importados quando a procedência for relevante.

## 26. Diagnóstico de produção

Criar uma superfície técnica que permita verificar, sem expor dados pessoais:

- versão do app;
- versão do schema local;
- estado do PWA;
- disponibilidade offline;
- rota base/BASE_URL;
- conectividade;
- integridade das estruturas locais;
- APIs configuradas;
- estado de carregamento;
- erros recuperáveis.

O diagnóstico deve ser separado da experiência pública e não deve depender de segredos no cliente.

## 27. Performance

A evolução deve respeitar um orçamento de performance:

- evitar novas dependências pesadas;
- lazy loading por rota quando já suportado;
- não carregar módulos de administração no fluxo público;
- não executar cálculos caros em cada render;
- memoizar somente onde houver benefício medido;
- evitar listeners globais redundantes;
- limitar histórico pesquisado;
- limitar atualizações externas;
- preservar carregamento inicial rápido em mobile.

## 28. Observabilidade e verificabilidade

Para cada etapa de implementação:

- teste unitário da lógica pura;
- teste de integração dos fluxos críticos;
- teste de estados vazios/loading/error;
- teste de recuperação de storage;
- teste de navegação mobile;
- verificação de acessibilidade;
- verificação de regressão dos links externos;
- build real quando disponível;
- CI real quando disponível.

Status ausente nunca será interpretado como sucesso.

## 29. Ordem consolidada de implementação

1. Contratos `Mission`, `Routine`, `MobilityEvent`, `Destination`, `NextAction` e `Provenance`.
2. `storageSafety`, versionamento e migrações.
3. Motor de contexto e dependências.
4. Destinos inteligentes e modelos de viagem.
5. Centro “Agora”.
6. Missões multi-stop e Plan B.
7. Cofre offline e Recovery Mode.
8. Diário, Planned × Recorded e Trip Delta.
9. Data Sufficiency, Contradiction e Aging.
10. Data Lineage e explicabilidade.
11. Custos, combustível e Scenario Lab.
12. Veículo, manutenção e viagens longas.
13. Busca universal e Mobility Inbox.
14. Modos Rápido/Economia/Preparação/Condução/Offline/Acessibilidade.
15. Diagnóstico, performance, segurança e privacidade.
16. Refinamento visual mobile.
17. Testes completos, auditoria e verificação de build/CI.
18. Revisão final do diff antes de qualquer merge/deploy.

## 30. Critério adicional de qualidade

Uma nova função só entra no produto se satisfizer pelo menos uma destas condições:

- reduz o número de toques;
- reduz uma decisão repetitiva;
- evita perda de contexto;
- melhora transparência do dado;
- melhora recuperação offline;
- melhora segurança/privacidade;
- melhora acessibilidade;
- melhora preparação ou conclusão da viagem.

Se apenas adicionar informação visual sem resolver uma tarefa, deve permanecer fora da superfície principal.
