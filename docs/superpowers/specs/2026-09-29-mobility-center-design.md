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


## 31. Evolução 50.0 — Orquestração e interoperabilidade

Esta fase amplia o Trajeto de centro contextual para uma camada de orquestração pessoal, sem criar navegação própria, rastreamento contínuo ou módulos isolados.

### 31.1 Mobility Orchestrator
Coordenar **Contexto → Objetivo → Missão → Dependências → Capacidades → Próxima ação → Execução → Eventos → Resultado**. O orquestrador resolve dependências; não substitui provedores nem controla apresentação.

### 31.2 Mission Goal, Board e Dependencies
Missões passam a possuir objetivo explícito, etapas, dependências, bloqueios, progresso e próxima ação. Dependências seguem **Destino → Rota → Veículo → Combustível → Checklist → Offline → Navegação → Registro**, com estados pronta, pendente, opcional, indisponível ou desatualizada.

### 31.3 Mission Constraints
Permitir restrições explícitas de horário, janela de parada, veículo, pedágio, orçamento e paradas obrigatórias. O Conflict Center deve identificar combinações incompatíveis e nunca escolher silenciosamente qual restrição sacrificar.

### 31.4 Multi-stop e Stop Windows
Missões podem ter múltiplas paradas, ordenação manual, conclusão por etapa, objetivo, duração e janela. Otimização automática só quando houver dados de rota reais suficientes; sem criar trânsito próprio.

### 31.5 Agenda e Departure Window
Adicionar agenda local de mobilidade para missões, manutenção, abastecimentos planejados e documentos. Calcular janela de saída somente quando houver duração e buffer suficientes, separando tempo externo, estimado e definido pelo usuário.

### 31.6 Resource Scheduler
Recursos como veículos e outros meios cadastrados podem estar disponíveis, reservados, em uso, em manutenção ou indisponíveis. Detectar conflitos antes da missão.

### 31.7 Temporary Preferences
Preferências temporárias podem valer somente para uma missão. Preferências permanentes só podem ser criadas após confirmação explícita quando derivadas de repetição observável.

## 32. Histórico e reconstrução

### 32.1 Mobility Timeline
Unificar missões, rotas, navegação aberta, combustível, despesas, manutenção, incidentes, alterações e encerramento em eventos temporais.

### 32.2 Trip Reconstruction
Reconstruir apenas fatos conhecidos, separados em confirmado, registrado, calculado e desconhecido.

### 32.3 Trip Outcome e Feedback
Missões podem terminar como concluída, parcial, interrompida ou cancelada. Feedback é opcional e explícito; não inferir resultado subjetivo.

### 32.4 Route Outcome
Relacionar rota escolhida ao resultado registrado sem transformar histórico em ranking universal.

## 33. Rota, destino e evidência

### 33.1 Route Portfolio
Organizar rotas por uso, último uso, configuração, provedor e snapshots.

### 33.2 Route Fingerprint
Identificar configuração por origem, destino, paradas, preferências, restrições, provedor e parâmetros.

### 33.3 Route Snapshot Chain
Comparar snapshots por timestamp, distância, duração, parâmetros e dados disponíveis.

### 33.4 Destination Identity e Merge
Normalizar nome, endereço e aliases. Detectar possíveis duplicidades e exigir confirmação antes de mesclar.

### 33.5 Mobility Areas e Route Corridor
Permitir áreas e corredores derivados de destinos e rotas explicitamente registrados. Histórico espacial contínuo permanece opt-in e fora do fluxo padrão.

## 34. Dados, evidência e reconciliação

### 34.1 Evidence Bundle
Valores importantes podem carregar origem, timestamp, período, método, versão e limitações.

### 34.2 Calculation Receipt
Mostrar **resultado → fórmula → entradas → procedência → timestamp → limitações**.

### 34.3 Calculation Sandbox
Isolar cálculos e cenários dos dados reais.

### 34.4 Comparability Engine
Antes de comparar métricas, validar unidade, definição, período, metodologia, cobertura e dados faltantes.

### 34.5 Mobility Baseline
Quando houver amostra suficiente, criar referências históricas com período, número de registros e metodologia.

### 34.6 Coverage e Data Quality Timeline
Medir cobertura e consistência dos registros ao longo do tempo, sem transformar isso em nota pessoal.

### 34.7 Anomaly Detector
Detectar duplicações prováveis, datas inválidas, odômetro regressivo, valores incompatíveis, entidades ausentes e inconsistências temporais. Preservar o dado original.

### 34.8 Reconciliation Queue
Centralizar divergências de importação, fontes e registros. Oferecer resolver, corrigir, ignorar ou deixar desconhecido.

## 35. Inbox e automação

### 35.1 Mobility Inbox 2.0
Consolidar bloqueios, registros incompletos, dados antigos, documentos, conflitos e missões interrompidas.

### 35.2 Action Queue e Expiration
Ordenar ações por dependência e expirar ações que perderam relevância.

### 35.3 Local Automation Engine
Permitir regras locais simples baseadas em eventos e entidades existentes.

### 35.4 Rule Preview/Replay
Antes de ativar uma regra, mostrar condições, ações e exemplos. Permitir simular sobre eventos históricos sem alterar dados.

### 35.5 Automation Safety
Automações não podem excluir dados, compartilhar informações, alterar configurações críticas ou executar ações irreversíveis sem confirmação.

## 36. Custos, recibos e documentos

### 36.1 Mobility Ledger
Unificar combustível, estacionamento, pedágio registrado, manutenção e outras despesas.

### 36.2 Cost Attribution/Reconciliation
Relacionar despesas a missão, viagem, veículo e categoria; separar planejado, calculado e registrado.

### 36.3 Cost Correction Journal
Registrar alterações importantes com valor anterior, novo valor e timestamp.

### 36.4 Receipt Inbox/Matching
Permitir guardar recibos para processamento posterior e sugerir correspondência apenas quando houver evidência suficiente.

### 36.5 Document Vault
Associar documentos a veículo, missão, manutenção ou viagem. Controlar data, validade e observação.

### 36.6 Document Checklist
Missões podem exigir documentos selecionados pelo usuário. O Trajeto apenas verifica presença e datas registradas, sem afirmar validade jurídica além dos dados disponíveis.

## 37. Veículos e recursos

### 37.1 Vehicle Timeline 2.0
Unificar cadastro, viagens, abastecimentos, manutenção, despesas e documentos.

### 37.2 Vehicle Versioning
Alterações relevantes de configuração podem preservar histórico.

### 37.3 Resource Registry
Preparar contratos para múltiplos meios de transporte e recursos compartilhados sem codificar o produto exclusivamente para carros.

## 38. Portabilidade

### 38.1 Mobility Package v3
Pacote versionado para missões, rotas, destinos, veículos, combustível, despesas, manutenção, documentos e preferências selecionadas.

### 38.2 Partial Import e Mapping
Permitir importar categorias específicas e mapear campos externos para contratos internos.

### 38.3 Import Validation/Dry Run
Antes de gravar, apresentar válidos, incompletos, duplicados prováveis e incompatíveis. Dry run nunca altera dados reais.

### 38.4 Schema Compatibility Lab
Simular conversão entre versões de schema antes da migração.

### 38.5 Export Profiles
Completo, viagem, veículo, financeiro e compartilhamento.

## 39. Privacidade e segurança

### 39.1 Sensitive Data Zones
Separar dados públicos, privados e sensíveis.

### 39.2 Sensitive Field Policy
Para campos sensíveis, definir armazenamento, exportação, compartilhamento e logging.

### 39.3 Log Redaction
Diagnósticos não podem expor endereço, token, segredo ou dado sensível.

### 39.4 Privacy Preview/Share Manifest
Antes do compartilhamento, mostrar exatamente os campos enviados e manter manifesto com tipo, versão, conteúdo e timestamp.

### 39.5 Secure Delete e Recovery Before Delete
Excluir seletivamente e, quando possível, preservar ponto de recuperação antes de exclusão destrutiva.

### 39.6 Local Encryption Architecture
Considerar Web Crypto API somente para áreas realmente sensíveis, com política explícita de recuperação e sem prometer recuperação de chave inexistente.

## 40. Provedores e rede

### 40.1 Provider Adapter
Isolar cada provedor por capacidades: rota, alternativas, trânsito, pedágio e navegação.

### 40.2 Capability Discovery/Fallback
A UI só mostra capacidades realmente disponíveis. Fallback deve ser explicitamente classificado como cache, fonte alternativa ou indisponível.

### 40.3 Provider Health Timeline
Registrar somente fatos observáveis: sucesso, erro, timeout, latência e timestamp.

### 40.4 Provider Conflict Resolution
Divergências entre fontes devem ser preservadas e tratadas por política documentada.

### 40.5 Request Dedup/API Budget/Cache
Deduplicar chamadas idênticas, limitar chamadas por fluxo e aplicar políticas de cache por categoria.

### 40.6 Low Connectivity
Distinguir online, instável, limitado, offline e desconhecido somente quando mensurável. O modo economia reduz refresh e chamadas.

## 41. PWA e recuperação

### 41.1 Recovery Points
Criar snapshots antes de migrations/importações relevantes.

### 41.2 Storage Quarantine
Dados inválidos ficam isolados em vez de apagados automaticamente.

### 41.3 Storage Compaction
Compactar eventos antigos preservando estado e metadados necessários.

### 41.4 PWA Update Safety
Fluxo **nova versão → compatibilidade → migration → validação → ativação**; falha deve preservar dados.

### 41.5 Offline Update Queue
Operações locais pendentes devem usar idempotência e resolução explícita de conflitos quando houver reconciliação futura.

## 42. Event architecture

### 42.1 Domain Event Bus
Eventos centrais incluem `mission.created`, `mission.prepared`, `route.selected`, `navigation.opened`, `trip.completed`, `fuel.recorded`, `expense.recorded`, `maintenance.recorded` e `incident.recorded`.

### 42.2 Causality/Replay/Compaction
Eventos podem registrar causa, timestamp, entidade e schema. Replay serve para testes/diagnóstico; compactação preserva o estado necessário.

## 43. Incidentes e encerramento

### 43.1 Incident Center
Registrar atraso, interrupção, problema de veículo, combustível, estacionamento, pedágio, alteração de destino e outros eventos explícitos.

### 43.2 Trip Closure
Ao encerrar, oferecer registro opcional de despesas, combustível, incidentes, observação e rota efetivamente utilizada.

## 44. Experiência adaptativa

### 44.1 Adaptive Density
Rápido, Normal, Detalhado e Técnico devem reutilizar os mesmos componentes.

### 44.2 One-Hand/Focus/Distraction Guard
Priorizar ações na área de alcance do polegar, reduzir distrações durante missão e mostrar apenas contexto essencial no Focus Mode.

### 44.3 Accessibility Journey
Testar jornadas completas com teclado, leitor de tela, foco, toque, reduced motion, contraste e telas pequenas.

## 45. Command Center

### 45.1 Mobility Command Palette 2.0
A busca universal pode executar ações como ir para destino, preparar missão, registrar combustível, abrir custos, consultar veículo e mostrar offline.

### 45.2 Command Permissions/Preview
Classificar comandos por leitura, alteração, exclusão, compartilhamento e ação externa. Ações relevantes mostram o efeito antes da execução.

### 45.3 Action History/Undo
Registrar ações relevantes e oferecer desfazer quando tecnicamente seguro.

## 46. Control Plane e autoauditoria

### 46.1 Mobility Control Plane
Área técnica separada para feature flags locais, schema, migrations, providers, capabilities, cache, recovery, diagnósticos, performance e segurança.

### 46.2 Safe Startup
Se um módulo falhar, inicializar o restante e isolar a capacidade defeituosa quando possível.

### 46.3 Invariant Monitor
Verificar missão com estado válido, evento com timestamp, valor financeiro finito, rota ligada a destino e migration com schema conhecido.

### 46.4 Architecture Health
Detectar componentes duplicados, contratos divergentes, migrations pendentes, estados sem tratamento, dependências desnecessárias e recursos sem fallback.

### 46.5 UX State Gallery/Self-Audit
Modo técnico para validar loading, empty, error, offline, stale, unavailable, degraded, recovery e success, além de storage, PWA, Service Worker, rotas, links, acessibilidade, performance e capabilities.

### 46.6 Golden Journeys
Criar regressões para: destino→rota→preparação→navegação; offline→recuperação; missão→combustível→encerramento; storage corrompido→recuperação; mobile→busca→navegação externa; importação→validação→rollback.

### 46.7 Deterministic Demo/Scenario Fixtures
Dados de demonstração isolados dos dados reais e fixtures determinísticas para missão, rota, veículo, combustível, custos, offline, erros e provedores indisponíveis.

## 47. Recursos futuros preparados

Interfaces podem ser preparadas para transporte público multimodal, bicicleta, caminhada, GTFS/GTFS-RT quando houver fonte adequada, localização opt-in, colaboração, sincronização futura, backend futuro e múltiplos provedores. Nenhum desses recursos deve ser implementado apenas para preencher roadmap.

## 48. Critério de integração máxima

Uma nova capacidade deve preferencialmente conectar pelo menos duas entidades ou etapas existentes: viagem→custo, missão→veículo, veículo→manutenção, rota→evidência, destino→histórico, documento→missão, combustível→viagem, evento→timeline ou fonte→cálculo. Funções isoladas que não aumentem integração ficam fora da superfície principal.

## 49. Ordem final de implementação

1. Contratos e schema.
2. storageSafety, recovery e migrations.
3. Mobility Orchestrator.
4. Mission Goal/Dependency/Constraint Engine.
5. Destinos, templates e multi-stop.
6. Agenda, saída e conflitos de recursos.
7. Route Portfolio, fingerprints, snapshots e evidências.
8. Offline Vault, capsules e recovery.
9. Event Bus, timeline e reconstrução.
10. Data Sufficiency, lineage, reconciliation e anomalias.
11. Ledger, recibos, documentos e veículos.
12. Import/export/portabilidade.
13. Privacidade, compartilhamento e secure delete.
14. Provider adapters, capabilities e fallback.
15. Performance, dedup, budget e cache.
16. Command Center, busca e undo.
17. Accessibility, cognitive load e mobile.
18. Control Plane, self-audit e golden journeys.
19. Testes completos.
20. Build/CI/deploy verification.
21. Code review.
22. Só então merge/deploy.

## 50. Critério de aceitação final

A arquitetura será considerada pronta quando uma missão puder ser criada, preparada, retomada e encerrada; múltiplas paradas puderem ser organizadas sem navegação própria; conflitos de horário/recursos forem detectados; rotas tiverem snapshots e procedência; custos diferenciarem planejado/calculado/registrado; cálculos forem auditáveis; dados incompletos/contraditórios forem identificados sem destruição silenciosa; missões puderem ser recuperadas offline; importações forem validadas antes de alterar dados; compartilhamentos mostrarem exatamente o que será enviado; provedores declararem capacidades; falhas externas degradarem com segurança; storage puder ser validado/recuperado; eventos puderem ser reproduzidos; busca puder encontrar entidades e executar ações; UI se adapte ao contexto sem duplicação; jornadas críticas tenham regressão; diagnósticos não exponham dados sensíveis; não haja promessa de dados inexistentes; o produto permaneça leve e compatível com GitHub Pages; e nenhuma feature exista apenas para aumentar quantidade.


## 51. Evolução máxima — dados externos e mobilidade multimodal

Esta extensão adiciona capacidades concretas de dados públicos e multimodalidade sem presumir cobertura local. A ANTT mantém atualmente política/plano de dados abertos 2025–2027 e seu portal disponibiliza conjuntos em CSV/JSON, incluindo empresas, veículos, autorizações e dados MONITRIIP de viagens e paradas. Essas fontes devem ser tratadas como catálogos externos versionados, com período, atualização, licença e limitações explícitas. citeturn0search0turn0search1turn0search6

### 51.1 Mobility Data Registry

Criar um registro interno de fontes contendo:

- nome da fonte;
- organização;
- URL;
- formato;
- licença;
- cobertura geográfica;
- período;
- frequência de atualização;
- última atualização conhecida;
- esquema;
- campos disponíveis;
- status de integração;
- limitações.

A fonte não deve ser considerada atual apenas porque o registro existe.

### 51.2 Source Health

Para cada fonte integrada, registrar fatos observáveis:

- última consulta;
- sucesso/erro;
- latência quando mensurável;
- quantidade de registros recebidos;
- alteração de schema;
- data do dado;
- data do metadata.

Não transformar isso em uma nota subjetiva da fonte.

### 51.3 Data Freshness Matrix

Uma matriz central:

| Fonte | Último dado | Último metadata | Cobertura | Estado |
|---|---|---|---|---|
| fonte A | timestamp | timestamp | região | disponível |
| fonte B | timestamp | timestamp | nacional | antiga |
| fonte C | desconhecido | timestamp | parcial | limitada |

### 51.4 ANTT Open Mobility Adapter

Preparar adapter para fontes públicas da ANTT quando houver relação direta com a missão do usuário.

Possíveis conjuntos:

- empresas habilitadas;
- veículos habilitados;
- autorizações;
- viagens;
- paradas;
- bilhetes;
- indicadores MONITRIIP.

O portal atual possui dezenas de conjuntos de passageiros e formatos CSV/JSON; a integração deve selecionar apenas os datasets com utilidade real para a experiência do Trajeto. citeturn0search1turn0search5

### 51.5 MONITRIIP Data Adapter

Quando tecnicamente adequado, permitir ingestão de dados públicos MONITRIIP para análises de transporte coletivo.

O MONITRIIP oficial descreve dados de viagens, bilhetes e indicadores, e o portal atual disponibiliza bases públicas de serviço regular, fretado e semiurbano. citeturn0search4turn0search6

### 51.6 Semiurbano Data Explorer

Quando houver cobertura compatível, permitir explorar:

- linha;
- sentido;
- viagem programada;
- início;
- tarifa máxima;
- paradas;
- distância;
- tempo de viagem;
- velocidade média;
- pontos de localização.

Esses campos existem na base pública MONITRIIP semiurbana atualmente publicada, mas a UI deve informar a data da base e não tratá-la como trânsito em tempo real. citeturn0search3

### 51.7 Public Transport Snapshot

Criar snapshots de transporte público com:

- fonte;
- período;
- linha;
- viagem;
- parada;
- horário;
- tarifa quando disponível;
- timestamp do dataset.

O snapshot não deve ser apresentado como horário atual se a fonte não for tempo real.

### 51.8 Multimodal Domain

Evoluir o domínio de transporte para suportar:

- carro;
- motocicleta;
- bicicleta;
- caminhada;
- transporte público;
- combinação de modos.

A implementação inicial pode manter apenas os modos já suportados, mas os contratos não devem codificar toda mobilidade como carro.

### 51.9 Multimodal Mission

Uma missão futura poderá representar:

**caminhada → ônibus → caminhada**

ou

**carro → estacionamento → caminhada**

Cada etapa possuirá seu próprio provedor, evidência e disponibilidade.

### 51.10 Mode Availability

A interface deve mostrar somente modos realmente suportados para a consulta atual.

Exemplo:

- carro: disponível;
- ônibus: dados de horário disponíveis;
- bicicleta: indisponível;
- trânsito: indisponível.

### 51.11 Multimodal Comparison

Quando houver dados comparáveis, permitir comparar:

- duração;
- custo conhecido;
- distância;
- número de etapas;
- horários;
- dados disponíveis.

Não criar uma classificação universal de “melhor transporte”.

## 52. Dados locais e públicos juntos

### 52.1 Personal + Public Data Boundary

Separar claramente:

**Meu dado**

de

**Dado público**

e

**Dado calculado a partir dos dois**.

### 52.2 Provenance Composition

Um cálculo combinado deve mostrar suas duas origens.

Exemplo:

**custo estimado**

→ distância de provedor externo  
→ consumo registrado pelo usuário  
→ preço registrado pelo usuário.

### 52.3 Public Data Snapshot

Fontes públicas importantes podem ser armazenadas localmente com:

- dataset;
- versão;
- período;
- timestamp;
- hash/identificador quando disponível;
- schema.

### 52.4 Dataset Change Detector

Detectar:

- novo campo;
- campo removido;
- alteração de tipo;
- alteração de metadata;
- mudança de periodicidade.

Não aplicar alteração de schema automaticamente aos dados do usuário.

### 52.5 Source Migration Assistant

Quando uma fonte alterar seu schema:

1. detectar;
2. comparar;
3. mostrar impacto;
4. preparar adapter;
5. testar;
6. ativar somente após validação.

## 53. Mobility Intelligence baseada em evidências

### 53.1 Evidence Graph

Relacionar:

**fonte → dataset → registro → cálculo → missão → decisão**

Isso permite rastrear qualquer informação importante.

### 53.2 Decision Trace

Para cada decisão contextual:

**por que apareceu → quais dados sustentaram → quais dados faltaram → qual alternativa existia.**

### 53.3 Trust Summary

Uma síntese compacta:

- fonte;
- frescor;
- cobertura;
- cálculo;
- limitações.

### 53.4 Data Contradiction Center

Quando duas fontes reais divergirem:

> Fonte A informa X  
> Fonte B informa Y

O sistema não escolhe silenciosamente uma delas. Mostra a divergência e a política aplicada.

### 53.5 Data Confidence Breakdown

Não usar nota única. Exibir dimensões independentes:

- presença;
- frescor;
- cobertura;
- consistência;
- procedência.

## 54. Inteligência temporal

### 54.1 Mobility Calendar 2.0

Relacionar:

- missão;
- compromisso;
- veículo;
- manutenção;
- documento;
- janela;
- viagem recorrente.

### 54.2 Departure Planner

Calcular janela de saída a partir de:

**horário alvo + duração conhecida/estimada + paradas + buffer.**

### 54.3 Schedule Conflict Graph

Visualizar conflitos:

**missão A ↔ veículo ↔ missão B**

**missão ↔ manutenção**

**missão ↔ janela de documento**

### 54.4 Temporal Exceptions

Uma rotina pode possuir exceção explicitamente registrada:

> Hoje usar veículo B.

A exceção não altera a preferência permanente.

### 54.5 Mission Deadline

Missões podem possuir prazo:

- hoje;
- data;
- horário;
- janela.

Quando expirar:

**expirada → encerrar ou reabrir como nova.**

## 55. Missões avançadas

### 55.1 Mission Pack

Pacote operacional completo para uma viagem.

### 55.2 Mission Passport

Identidade persistente da missão com:

- versão;
- estado;
- origem;
- destino;
- etapas;
- recursos;
- eventos;
- resultado.

### 55.3 Mission Branch

Permitir duplicar uma missão para experimentar uma configuração alternativa sem alterar a original.

### 55.4 Scenario Isolation

Toda simulação fica separada da missão real.

### 55.5 Mission Replay

Reproduzir eventos e decisões conhecidos em ordem temporal.

### 55.6 Mission Closure

Encerramento explícito com:

- concluída;
- parcial;
- interrompida;
- cancelada.

## 56. Mobility Resource Intelligence

### 56.1 Resource Availability

Veículos e recursos possuem disponibilidade temporal.

### 56.2 Resource Utilization

Resumo factual:

- quantas missões;
- período;
- último uso;
- indisponibilidades registradas.

### 56.3 Resource Conflict Resolver

Mostrar conflito e opções:

- trocar recurso;
- mudar horário;
- dividir missão;
- manter conflito conscientemente.

### 56.4 Resource History

Relacionar recursos às missões e eventos sem criar rastreamento contínuo.

## 57. Recibos, documentos e comprovação

### 57.1 Trip Receipt

Ao concluir missão, gerar resumo estruturado.

### 57.2 Evidence Receipt

Para cálculos importantes, gerar uma pequena ficha com:

- resultado;
- entradas;
- fórmula;
- procedência;
- timestamp.

### 57.3 Document Bundle

Permitir incluir documentos selecionados no Mission Pack.

### 57.4 Receipt Matching

Relacionar recibo a:

- abastecimento;
- despesa;
- manutenção;
- missão.

Sempre com confirmação quando houver ambiguidade.

## 58. Compartilhamento seguro

### 58.1 Share Preview

Antes de compartilhar:

- campos incluídos;
- campos omitidos;
- origem;
- destino;
- validade do pacote.

### 58.2 Expiring Share Package

Quando existir infraestrutura adequada, permitir pacotes de compartilhamento com expiração explícita.

### 58.3 Share Audit

Registrar localmente:

- quando;
- qual pacote;
- quais campos;
- qual destino lógico.

Não armazenar conteúdo sensível em logs.

### 58.4 Public/Private Boundary

Dados públicos externos nunca devem ser confundidos visualmente com dados privados do usuário.

## 59. Dados públicos locais e preparação offline

### 59.1 Public Data Cache

Armazenar apenas datasets/snapshots necessários para recursos realmente utilizados.

### 59.2 Dataset TTL

Cada dataset terá política de validade específica.

### 59.3 Offline Public Data

Quando disponível, mostrar:

**Fonte pública — snapshot de DD/MM/AAAA**

e nunca:

**dados atuais**

quando não houver atualização atual.

### 59.4 Offline Capability Matrix

Mostrar por função:

| Capacidade | Online | Offline |
|---|---|---|
| missão | ✓ | ✓ |
| rota salva | ✓ | ✓ |
| trânsito atual | depende | não |
| snapshot público | ✓ | ✓ se salvo |
| navegação externa | depende | depende |

## 60. Segurança de integração

### 60.1 External Input Boundary

Todo dado externo deve ser tratado como não confiável antes de entrar no domínio.

### 60.2 Schema Validation

Validar:

- tipo;
- formato;
- intervalo;
- obrigatoriedade;
- versão.

### 60.3 Provider Payload Quarantine

Resposta externa inesperada não deve quebrar o aplicativo.

### 60.4 URL Safety

Links externos devem:

- usar destinos conhecidos;
- evitar open redirect;
- não incorporar parâmetros sensíveis desnecessários;
- abrir somente ações explicitamente escolhidas.

### 60.5 Secret Boundary

Tokens, chaves e segredos nunca devem ser persistidos em localStorage público ou incluídos em logs.

## 61. Qualidade e regressão máxima

### 61.1 Data Contract Tests

Cada adapter deve possuir fixtures de:

- resposta válida;
- resposta vazia;
- schema antigo;
- schema novo;
- campo ausente;
- tipo inválido;
- timeout.

### 61.2 Provider Contract Tests

Testar a tradução:

**provedor → domínio Trajeto**

sem renderizar React.

### 61.3 Golden Data Fixtures

Conjuntos pequenos e determinísticos para:

- rota;
- missão;
- combustível;
- transporte público;
- custos;
- fontes públicas;
- offline.

### 61.4 Full Journey Simulator

Simular:

**criar missão → adicionar parada → selecionar recurso → calcular → salvar offline → abrir navegação → registrar resultado → encerrar → comparar com histórico.**

### 61.5 Corruption Tests

Testar:

- localStorage inválido;
- schema incompatível;
- dados truncados;
- importação parcial;
- resposta externa inválida.

### 61.6 Provider Failure Tests

Simular:

- timeout;
- 500;
- payload incompleto;
- ausência de trânsito;
- ausência de pedágio;
- provedor indisponível.

### 61.7 Accessibility Journey Tests

Testar jornada completa, não apenas componentes isolados.

## 62. Control Plane de dados

Adicionar ao modo técnico:

- registry de fontes;
- datasets;
- schema;
- freshness;
- capabilities;
- migrations;
- adapters;
- cache;
- requests;
- erros;
- recovery.

Nenhuma dessas informações deve poluir o modo público.

## 63. Critério final de expansão

O Trajeto só deve adicionar um novo dataset externo quando:

1. existir fonte identificável;
2. houver utilidade concreta;
3. houver cobertura compatível;
4. houver período conhecido;
5. houver metodologia/documentação suficiente;
6. houver política de atualização;
7. houver fallback/degraded state;
8. houver testes;
9. a integração não exigir dependência pesada;
10. o dado melhorar uma decisão real do usuário.

## 64. Ordem final atualizada

1. Contratos e schema.
2. storageSafety, recovery e migrations.
3. Mobility Orchestrator.
4. Mission Goal/Dependency/Constraint Engine.
5. Destinos, templates e multi-stop.
6. Agenda, saída e conflitos.
7. Route Portfolio, fingerprints, snapshots e evidências.
8. Offline Vault e Mission Pack.
9. Event Bus, timeline e replay.
10. Data Sufficiency, Lineage, Reconciliation e Anomaly Detector.
11. Ledger, recibos, documentos e veículos.
12. Mobility Data Registry.
13. Provider/Source adapters.
14. ANTT/public-data adapter quando houver caso de uso validado.
15. Multimodal domain/contracts.
16. Import/export/portabilidade.
17. Privacy/share/security.
18. Request budget/cache/dedup.
19. Command Center.
20. Accessibility/cognitive load/mobile.
21. Control Plane/self-audit.
22. Contract/golden/corruption/provider-failure tests.
23. Build/CI verification.
24. Code review.
25. Só então merge/deploy.

## 65. Novo critério de “nível máximo”

O Trajeto não será considerado avançado porque possui muitas funções.

Será considerado avançado quando conseguir:

**entender o estado → identificar dependências → verificar dados → explicar limitações → preparar a missão → operar com conectividade limitada → registrar resultado → reconstruir o que aconteceu → aprender somente com evidência → proteger os dados → exportar o conhecimento → continuar funcionando sem depender de uma única fonte.**

Essa é a arquitetura-alvo desta especificação.


## 66. Observatório territorial e inteligência de contexto

### 66.1 Public Mobility Observatory
Catálogo de indicadores públicos por município, região metropolitana, corredor, sistema e período, sempre com fonte, cobertura e natureza do dado.

### 66.2 PEMOB Adapter
Preparar integração versionada para PEMOB Municipal 2025 e PEMOB Metropolitana 2025. Esses dados são estruturais/históricos e nunca devem ser apresentados como trânsito atual.

### 66.3 Mobility Brasil Adapter
Preparar adapter para o conjunto Mobilidade Brasil do BNDES, incluindo indicadores, projetos e visão de futuro das regiões cobertas. Registrar atualização e frequência da fonte.

### 66.4 Infrastructure Layer
Preparar entidades para terminais, estações, corredores, ciclovias, BRT, trilhos e projetos de transporte quando houver dataset verificável.

### 66.5 Historical/Structural/Operational/Projected
Todo dado territorial deve ser classificado como operacional, histórico, estrutural ou projetado. Projeto futuro nunca pode aparecer como infraestrutura existente.

## 67. Mobility Scenario Studio
Laboratório isolado para comparar rota, veículo, custo, modo, horário, paradas, orçamento e combustível sem alterar dados reais.

Cada cenário terá ID, parâmetros, resultados, fontes e versão do cálculo. Cenários podem ser comparados, exportados e reabertos.

## 68. Mobility Decision Surface
Unificar decisões em **objetivo → opções → evidências → restrições → próxima ação**.
Antes de ações relevantes, mostrar dados usados, dados ausentes, efeitos esperados e possibilidade de desfazer. Depois, registrar ação, timestamp, contexto e resultado.

## 69. Mobility Knowledge Layer
Índice local de métricas, campos, fontes, fórmulas, frescor, estados offline, limitações de provedores e políticas de privacidade.

Estados vazios e erros devem explicar o que falta, por que falta e qual próxima ação é possível.

## 70. Personal Mobility Profile
Perfil local explícito para veículo padrão, modos, preferências, orçamento, buffer e unidades. Preferências recorrentes podem ser sugeridas, mas só se tornam permanentes após confirmação. Preferências temporárias expiram.

## 71. Mobility Rules 2.0
Motor local de regras com condições, eventos, dependências, ações, prioridade e expiração. Incluir detector de conflitos, sandbox e auditoria. Regras não podem excluir, compartilhar ou executar ações irreversíveis sem confirmação.

## 72. Mission Risk Flags
Mostrar condições objetivas como snapshot offline antigo, trânsito indisponível, combustível sem dados, veículo em manutenção, documento sem validade cadastrada, conflito de agenda ou provedor indisponível. Cada flag deve apontar para evidência e ação possível, sem nota geral.

## 73. Long Trip Readiness
Consolidar missão, rota, alternativas, combustível, autonomia, paradas, documentos, contatos, offline e dados públicos relevantes em uma preparação compacta para viagens longas.

## 74. Mobility Package 4
Ampliar portabilidade para missão, cenário, snapshots, evidências, eventos, referências a dados públicos, preferências, schema e manifest. Grandes datasets públicos devem ser referenciados por fonte/dataset/versão, não incorporados automaticamente.

## 75. Data Governance Center
Registrar fontes, datasets, schemas, licenças, períodos, cobertura, freshness, migrations, adapters, retenção e privacidade. Criar grafo **feature → adapter → dataset → fonte**.

## 76. Regional Mobility Packs
Pacotes territoriais selecionáveis pelo usuário com indicadores, infraestrutura, transporte coletivo, fontes, período, licença e limites geográficos. Não exigem rastreamento contínuo.

## 77. Mobility Context Diff
Ao retornar a uma missão ou região, mostrar apenas mudanças observáveis desde a última consulta: dataset atualizado, rota alterada, snapshot envelhecido, fonte indisponível ou mudança efetivamente registrada.

## 78. External Data Budget
Cada integração pública deve possuir orçamento de tamanho, requests, atualização, cache, memória e processamento. Datasets grandes nunca devem bloquear a Home.

## 79. External Data Pipeline
Fluxo obrigatório: **Source Registry → Adapter → Validation → Normalization → Provenance → Cache/Snapshot → Domain Query → UI**. React nunca consome diretamente formato bruto externo.

## 80. Ordem adicional
Após a infraestrutura de contratos, storage, missão, rotas, offline, eventos, dados e privacidade, implementar os adapters públicos ANTT/PEMOB/BNDES somente quando houver caso de uso validado; depois infraestrutura territorial, Scenario Studio, Decision Surface, Knowledge Layer, Profile/Rules, Governance e testes de integração.

## 81. Critério máximo adicional
O Trajeto deve conectar dados públicos, dados pessoais, fontes externas, contexto territorial, missão, rota, recursos, custos, eventos, histórico e evidências sem confundir atual com histórico, estimado com registrado, projetado com existente, público com privado ou offline com tempo real.


## 84. Reformulação completa — Mobile First 2.0

A prioridade desta fase muda de “adicionar recursos” para **tornar o produto realmente utilizável**. A implementação deve reduzir a complexidade visual e estrutural antes de reintroduzir recursos avançados.

A arquitetura atual concentra muitos módulos na Home e no Planner. A nova versão deve tratar a experiência mobile como produto principal, não como versão reduzida do desktop.

### 84.1 Nova promessa do produto

O Trajeto passa a responder a uma pergunta:

**“O que preciso fazer agora para chegar onde quero?”**

A experiência principal será:

**Destino → Preparar → Escolher rota → Navegar → Concluir**

Todo recurso secundário deve existir fora desse caminho ou aparecer somente quando contextual.

### 84.2 Nova estrutura mobile

Substituir a navegação pulverizada por quatro áreas principais:

1. **Agora**
2. **Viajar**
3. **Mobilidade**
4. **Dados**

No modo condução, a interface passa temporariamente para uma superfície reduzida.

Não haverá sete ou mais destinos competindo no bottom navigation.

### 84.3 Agora

A Home será reconstruída para conter somente:

- saudação/contexto mínimo;
- campo principal “Para onde?”;
- ação principal;
- destino mais relevante;
- última viagem;
- estado offline;
- pequena indicação de preparação.

Depois disso:

**próxima viagem → informação útil → recursos secundários.**

A Home não exibirá simultaneamente todos os cards de rotina, veículo, custos, fontes, manutenção, histórico e calculadoras.

### 84.4 Viajar

Fluxo único:

**Destino → Origem → Rota → Comparar → Preparar → Navegar**

A tela de rota será organizada em:

1. resumo;
2. alternativas;
3. custos;
4. combustível;
5. offline;
6. navegação.

Essas informações devem aparecer como seções progressivas, não como dezenas de cards simultâneos.

### 84.5 Mobilidade

Concentrar:

- minhas viagens;
- destinos;
- veículo;
- combustível;
- manutenção;
- custos;
- documentos.

Usar listas e detalhes sob demanda.

Não carregar todos os dados na primeira renderização.

### 84.6 Dados

Concentrar:

- fontes;
- indicadores;
- procedência;
- atualizações;
- integridade;
- privacidade;
- diagnóstico técnico.

Dados públicos avançados ficam aqui, não na Home.

## 85. Novo Mobile Shell

Criar um shell mobile único com:

- header compacto;
- conteúdo de largura controlada;
- bottom navigation;
- safe-area;
- barra de ação contextual;
- bottom sheets;
- modais somente quando necessários;
- scroll restoration;
- foco previsível.

O shell deve evitar múltiplas barras fixas simultâneas.

### 85.1 Bottom Navigation

Máximo de quatro destinos principais.

O item ativo deve possuir:

- nome;
- ícone;
- estado;
- foco visível.

O usuário nunca deve depender apenas do gesto de swipe para navegar.

### 85.2 Contextual Action Bar

A ação principal muda conforme o contexto:

- Planejar;
- Continuar;
- Preparar;
- Navegar;
- Registrar.

Nunca exibir várias ações primárias equivalentes.

### 85.3 Bottom Sheet Contract

Toda bottom sheet deve:

- possuir título;
- botão/gesto de fechamento;
- foco recuperável;
- altura controlada;
- conteúdo rolável;
- suporte a teclado;
- funcionar sem gesto;
- não esconder o elemento focado.

### 85.4 Touch Contract

Todos os controles principais devem possuir área de toque confortável. A referência de acessibilidade WCAG 2.2 define mínimo de 24×24 CSS px para alvos AA e a recomendação AAA de 44×44 para alvos aprimorados; para o Trajeto, controles principais devem mirar 44×44 px sempre que possível. citeturn0search2turn0search6

### 85.5 Gesture Independence

Nenhuma função essencial poderá depender exclusivamente de swipe, drag, pinch ou gesto complexo. Deve existir equivalente por toque simples. Isso segue a orientação WCAG para pointer gestures. citeturn0search10

## 86. Nova Home

A Home atual deve ser reduzida drasticamente.

### Ordem:

1. estado online/offline;
2. busca/destino;
3. ação principal;
4. destino recorrente;
5. última viagem;
6. preparação;
7. recursos secundários.

### Remover da Home principal

- grandes blocos repetidos;
- quatro painéis extensos;
- radar completo;
- calculadora completa;
- manutenção detalhada;
- histórico completo;
- múltiplas métricas repetidas;
- explicações longas;
- cards de fontes.

Esses recursos continuam existindo em Mobilidade/Dados.

## 87. Novo fluxo “Ir agora”

Para destino conhecido:

**Home → Ir agora → rota → Navegar**

Meta de interação:

- 1 toque para iniciar destino recorrente;
- 1 toque para selecionar rota;
- 1 toque para abrir navegador externo.

Não transformar a meta em promessa de desempenho; validar por testes de interação.

## 88. Novo fluxo “Preparar”

Quando a missão precisar de preparação:

**Preparar viagem**

Checklist compacto:

- destino;
- rota;
- veículo;
- combustível;
- offline;
- navegação.

Itens opcionais não bloqueiam a viagem.

### 88.1 Preflight

O Preflight mostra somente bloqueios reais:

- destino ausente;
- rota indisponível;
- snapshot antigo;
- veículo indisponível;
- dados insuficientes;
- conflito de agenda.

Sem pontuação geral.

## 89. Novo fluxo “Condução”

Ao entrar em condução:

**Tela limpa**

- destino;
- próxima ação;
- navegador;
- retorno ao Trajeto;
- status mínimo.

Esconder:

- gráficos;
- custos detalhados;
- fontes;
- histórico;
- cards promocionais;
- configurações secundárias.

O Trajeto continua responsável por abrir Google Maps/Waze/Apple, sem tentar substituir a navegação.

## 90. Novo fluxo “Concluí”

Depois da navegação externa:

**Concluir viagem**

Ações opcionais:

- registrar combustível;
- registrar custo;
- registrar incidente;
- salvar observação;
- finalizar.

Se nenhum dado for informado, a missão pode ser encerrada sem exigir preenchimento.

## 91. Novo sistema de estados visuais

Cada tela importante precisa ter explicitamente:

- loading;
- ready;
- empty;
- error;
- offline;
- stale;
- degraded;
- recovery.

Nenhuma tela pode ficar em branco ou em loading indefinido.

### 91.1 Error Boundary por domínio

Falha em:

- fontes;
- rota;
- custos;
- veículo;
- offline

não deve derrubar todo o aplicativo.

### 91.2 Timeout UI

Consultas externas devem ter estado de timeout e ação de recuperação.

### 91.3 Retry Policy

Retry deve ser limitado e explícito, evitando loops automáticos.

## 92. Performance mobile

### 92.1 Home Critical Path

A Home deve carregar primeiro somente:

- shell;
- destino;
- contexto;
- ação principal.

### 92.2 Deferred Modules

Carregar sob demanda:

- histórico;
- custos;
- manutenção;
- fontes;
- observatório;
- documentos;
- diagnóstico.

### 92.3 Request Dedup

Não executar múltiplas consultas equivalentes por componentes diferentes.

### 92.4 Local Event Consolidation

Evitar que dezenas de componentes registrem listeners independentes para os mesmos eventos de preferência.

### 92.5 Render Budget

Evitar renderizações provocadas por dados secundários enquanto o usuário ainda está no caminho crítico.

## 93. Novo sistema visual

A direção visual será:

**premium utilitário**, não dashboard corporativo.

### Características

- tipografia grande;
- poucos elementos;
- alto contraste;
- hierarquia forte;
- superfícies discretas;
- bordas suaves;
- espaçamento generoso;
- ícones consistentes;
- animação mínima;
- estados claros.

### Evitar

- excesso de cards;
- sombras pesadas;
- gradientes decorativos em excesso;
- textos pequenos;
- badges demais;
- repetição de métricas;
- grids densos.

## 94. Sistema de design mobile

Criar tokens centralizados:

- cores;
- radius;
- spacing;
- typography;
- elevation;
- motion;
- focus;
- touch target;
- safe-area.

Nenhum novo componente deve inventar valores arbitrários repetidamente.

## 95. Acessibilidade mobile completa

A reformulação seguirá WCAG 2.2 e a orientação específica de aplicação a mobile; o W3C trata acessibilidade mobile dentro das próprias WCAG e mantém orientação específica para mobile web/apps. citeturn0search0turn0search3

Testar:

- leitor de tela;
- teclado;
- foco;
- touch;
- contraste;
- zoom;
- orientação;
- reduced motion;
- targets;
- bottom sheets;
- dialogs;
- navegação por headings;
- labels;
- live regions.

O foco nunca deve ficar totalmente escondido por conteúdo fixo, em linha com WCAG 2.2. citeturn0search5

## 96. Busca mobile

Substituir buscas pulverizadas por um único componente.

### Busca rápida

Pesquisar:

- destino;
- rota;
- veículo;
- viagem;
- posto;
- ação.

### Comandos

Permitir ações simples:

- “ir para trabalho”;
- “abrir última viagem”;
- “registrar combustível”;
- “meu veículo”.

A execução deve respeitar confirmação quando houver alteração ou ação externa.

## 97. Offline mobile

O offline deve aparecer como estado do produto, não como card.

### Online

**Tudo atualizado**

### Offline

**Você está offline**

Ações disponíveis:

- abrir rota salva;
- continuar missão;
- consultar dados locais.

Ações indisponíveis:

- trânsito atual;
- consulta externa;
- atualização de fonte.

### Stale

**Disponível, mas salvo há X dias**

## 98. Segurança mobile

Auditar:

- URL params;
- localStorage;
- sessionStorage;
- Service Worker;
- cache;
- links externos;
- open redirects;
- dados importados;
- payloads externos;
- logs;
- erros;
- dados sensíveis.

Adicionar:

- sanitização de entradas;
- validação de schema;
- limites de storage;
- quarantine de dados inválidos;
- redaction de logs;
- política de links externos;
- CSP quando o hosting permitir;
- nenhuma chave secreta no frontend.

## 99. Arquitetura React

Reduzir acoplamento entre componentes.

Separar:

**UI → Application → Domain → Storage → Providers**

### Domain

Sem React.

### Application

Coordena casos de uso.

### UI

Renderiza estados.

### Storage

Persistência local segura.

### Providers

Google/ANP/ANTT/outros.

Nenhum componente de apresentação deve conhecer diretamente detalhes de provider.

## 100. Estado global

Evitar um grande estado global.

Preferir:

- contexto derivado;
- estado local;
- eventos de domínio;
- storage;
- queries específicas.

Um único estado de missão deve alimentar as superfícies relacionadas.

## 101. Simplificação de componentes

Fazer auditoria dos componentes atuais para identificar:

- duplicados;
- órfãos;
- componentes que só exibem dados de outro componente;
- cards com mesma métrica;
- listeners repetidos;
- hooks redundantes;
- fluxos paralelos.

A regra será:

**uma fonte de verdade por conceito.**

## 102. Nova arquitetura de informação

### Agora

Ação atual.

### Viajar

Planejamento e navegação.

### Mobilidade

Histórico, veículo, custos e rotina.

### Dados

Fontes, indicadores, privacidade e diagnóstico.

### Condução

Superfície temporária mínima.

Isso substitui a lógica de “muitos módulos na Home”.

## 103. Dados úteis na interface pública

Mostrar apenas dados que ajudam uma decisão imediata:

- destino;
- distância;
- duração;
- rota;
- combustível;
- custo;
- offline;
- atualização;
- fonte.

Dados avançados ficam sob demanda.

## 104. Mobile Decision Cards

Substituir cards informativos por cartões de decisão:

**Título**

**Situação**

**Dado principal**

**Ação**

Exemplo:

> Rota salva  
> disponível offline  
> salva há 2 dias  
> **Continuar**

## 105. Recovery UX

Se algo falhar:

### Rota

> Não foi possível atualizar a rota.  
> Sua última rota salva está disponível.

**Abrir rota salva**

### Fonte

> A fonte não respondeu.

**Usar último snapshot**

### Storage

> Alguns dados locais estão inválidos.

**Recuperar dados**

Nunca mostrar apenas “Erro”.

## 106. Mobile Test Matrix

Testar no mínimo:

- 320 px;
- 360 px;
- 375 px;
- 390 px;
- 412 px;
- 430 px;
- tablet;
- desktop.

Estados:

- online;
- offline;
- loading;
- erro;
- dados vazios;
- dados antigos;
- storage corrompido;
- provider indisponível;
- teclado aberto;
- orientação vertical/horizontal.

## 107. Jornada de regressão obrigatória

### Jornada A
Abrir → destino → rota → navegação.

### Jornada B
Abrir → destino recorrente → ir agora.

### Jornada C
Offline → rota salva → continuar.

### Jornada D
Rota → combustível → custo.

### Jornada E
Missão → navegação → concluir.

### Jornada F
Storage corrompido → recuperação.

### Jornada G
Provider indisponível → fallback.

### Jornada H
Mobile → busca → resultado → ação.

### Jornada I
Importação → preview → validação → confirmação.

### Jornada J
Compartilhamento → preview → confirmação.

## 108. Reformulação visual completa

A implementação deve permitir remover progressivamente a aparência atual de “dashboard com muitos cards” e substituí-la por:

**uma experiência de aplicativo móvel de mobilidade.**

A prioridade visual será:

1. contexto;
2. destino;
3. ação;
4. estado;
5. detalhe.

Não:

1. card;
2. card;
3. card;
4. card;
5. card.

## 109. Estratégia de migração

Não reescrever tudo em uma única mudança.

### Fase A — Fundação

- design tokens;
- Mobile Shell;
- navigation;
- state contracts;
- error/loading states.

### Fase B — Home

- remover duplicações;
- novo Agora;
- busca;
- destino recorrente;
- última viagem.

### Fase C — Planner

- novo fluxo linear;
- rota;
- alternativas;
- preparação;
- navegação.

### Fase D — Mobilidade

- histórico;
- veículo;
- custos;
- manutenção;
- documentos.

### Fase E — Dados

- fontes;
- observatório;
- evidências;
- integridade.

### Fase F — Offline/Security

- recovery;
- storage;
- PWA;
- security audit.

### Fase G — Advanced

Somente depois:

- multimodal;
- cenários;
- automações;
- datasets públicos;
- packs;
- governança.

## 110. Critério de sucesso da reformulação

A nova versão não será considerada pronta porque “tem mais funcionalidades”.

Ela deverá demonstrar:

- primeira ação claramente identificável;
- navegação mobile simples;
- nenhuma tela essencial sobrecarregada;
- nenhum loading infinito;
- nenhum erro sem recuperação;
- nenhuma função essencial dependente de gesto;
- nenhuma informação duplicada em várias áreas;
- rota recorrente acessível rapidamente;
- offline compreensível;
- dados com procedência;
- armazenamento resiliente;
- provider failure tolerado;
- acessibilidade testada;
- performance mobile verificada;
- fluxos críticos funcionando ponta a ponta.

## 111. Regra de produto

A partir desta reformulação:

> **Se uma função não melhorar uma decisão, uma ação, uma recuperação ou a transparência do sistema, ela não entra na Home.**

Recursos avançados continuam disponíveis, mas sob demanda.

## 112. Nova ordem de implementação após a reformulação

1. Auditoria de componentes e fluxos atuais.
2. Design tokens e Mobile Shell.
3. Navigation 4 áreas.
4. Error/Loading/Empty/Offline State System.
5. Nova Home/Agora.
6. Novo fluxo de busca/destino.
7. Novo Planner linear.
8. Condução mínima.
9. Concluir viagem.
10. Mobilidade secundária.
11. Dados/Observatório.
12. Offline/Recovery.
13. Security hardening.
14. Accessibility hardening.
15. Performance optimization.
16. Integrações externas.
17. Recursos avançados.
18. Golden journeys.
19. Testes mobile completos.
20. Build/CI.
21. Code review.
22. Deploy somente após verificação.

## 113. Critério máximo da nova versão

O Trajeto deve parecer, no celular, um **aplicativo de mobilidade simples**, enquanto internamente pode possuir uma arquitetura extremamente sofisticada.

A complexidade deve ficar no motor.

**O usuário deve enxergar simplicidade.**


## 114. Reformulação mobile definitiva — “app primeiro, plataforma depois”

A prioridade de produto fica oficialmente invertida: o Trajeto deve primeiro ser um aplicativo mobile simples, rápido e funcional. Toda a complexidade de dados, observatório, multimodalidade, cenários e governança ficará atrás de uma experiência pública mínima.

### 114.1 Mobile Core

O núcleo público terá somente quatro conceitos visíveis:

- destino;
- viagem;
- próxima ação;
- estado.

Qualquer informação que não ajude uma dessas quatro decisões fica fora do primeiro nível.

### 114.2 Zero Dashboard Principle

A Home não poderá funcionar como dashboard.

É proibido, no primeiro nível:

- múltiplos grids de cards;
- quatro ou mais blocos de métricas;
- vários CTAs concorrentes;
- longos textos explicativos;
- tabelas densas;
- gráficos antes da decisão principal;
- fontes detalhadas antes da ação.

### 114.3 One Primary Action

Cada tela terá exatamente uma ação primária visualmente dominante.

Exemplos:

- Home → Ir;
- Planner → Calcular rota;
- Rota → Escolher;
- Preparação → Preparar;
- Condução → Navegar;
- Pós-viagem → Concluir.

### 114.4 Progressive Disclosure

Informação em três níveis:

1. essencial;
2. detalhes;
3. técnico.

O usuário não precisa atravessar informações técnicas para executar uma tarefa simples.

### 114.5 Navigation Contract

A navegação mobile deve permanecer estável:

**Agora | Viajar | Mobilidade | Dados**

Nenhuma feature nova pode criar uma quinta área principal sem revisão da arquitetura.

### 114.6 Mobile Route Contract

Toda rota da aplicação precisa definir:

- loading;
- ready;
- empty;
- error;
- offline;
- stale;
- degraded;
- recovery.

Não existe estado implícito.

### 114.7 Interaction Contract

Toda ação crítica deve funcionar com:

- toque simples;
- teclado quando aplicável;
- leitor de tela;
- foco visível.

Swipe/drag/long press podem ser atalhos, nunca requisito.

### 114.8 Thumb Reach

Ações primárias devem ficar preferencialmente em regiões acessíveis com uma mão. A navegação inferior deve respeitar safe-area.

### 114.9 Mobile Keyboard Contract

Campos devem:

- evitar autoFocus desnecessário;
- não ficar escondidos pelo teclado;
- preservar foco;
- permitir fechar teclado sem perder contexto;
- usar tipos de input adequados;
- evitar zoom involuntário quando possível.

### 114.10 No Infinite Loading

Todo carregamento externo deve possuir:

- timeout;
- fallback;
- retry limitado;
- mensagem de estado;
- ação alternativa.

### 114.11 Offline Honesty

O app deve diferenciar:

- online;
- offline;
- cache;
- snapshot;
- stale;
- indisponível.

Nunca apresentar cache como dado atual.

## 115. “Fast Path” — caminho rápido

Criar um caminho otimizado para o comportamento mais frequente:

**abrir → destino recente → rota → navegador**

O Fast Path não carrega histórico, custos, fontes, manutenção ou observatório antes de executar a ação.

### 115.1 Warm Start

Quando dados locais estiverem disponíveis, o shell pode iniciar com:

- último destino;
- última missão;
- última rota;
- estado offline.

Sem bloquear o carregamento por APIs externas.

### 115.2 Resume Action

Se uma missão estiver incompleta:

**Continuar viagem**

deve aparecer como ação contextual principal.

### 115.3 Recent Destination

Destino recente não deve ser confundido com destino favorito. Os dois conceitos devem permanecer separados.

## 116. “Trip Workspace”

O Planner deixa de ser uma página cheia de módulos e passa a ser um workspace de uma missão.

Estrutura:

**Cabeçalho da missão**
→ destino/origem

**Rota**
→ resultado

**Preparação**
→ dependências

**Execução**
→ navegador

**Resultado**
→ encerramento

Tudo referente à mesma missão usa uma única fonte de estado.

### 116.1 Mission Header

Exibir somente:

- destino;
- estado;
- ação principal.

### 116.2 Route Bottom Sheet

Alternativas e detalhes de rota podem aparecer em bottom sheet.

### 116.3 Preparation Sheet

Combustível, offline, veículo e checklist aparecem somente quando relevantes.

### 116.4 Navigation Sheet

Links Google/Waze/Apple ficam em uma ação clara, sem três CTAs grandes concorrendo.

## 117. “Mobility Home”

A área Mobilidade deixa de ser uma coleção de cards.

Organização:

- Viagens;
- Destinos;
- Veículo;
- Custos;
- Registros.

Cada item abre uma lista ou detalhe, carregando dados sob demanda.

## 118. “Data Center”

A área Dados será técnica por natureza.

Organização:

- Fontes;
- Indicadores;
- Evidências;
- Atualizações;
- Privacidade;
- Diagnóstico.

Dados públicos territoriais, ANTT, PEMOB, BNDES e demais datasets nunca aparecem automaticamente na Home.

A PEMOB 2025 possui bases municipal e metropolitana oficiais; esses dados serão tratados como dados estruturais/territoriais, não como condições de trânsito atuais. citeturn0search7

A ANTT mantém atualmente seu Portal de Dados Abertos e Plano de Dados Abertos 2025–2027, permitindo adapters versionados para fontes compatíveis. citeturn0search8

## 119. “Trust Strip”

Dados importantes podem receber uma linha compacta:

**Fonte · Atualização · Tipo**

Exemplo:

**ANP · 25/09/2026 · oficial**

ou

**Registrado por você · hoje · registro local**

Detalhes completos ficam sob demanda.

## 120. Mobile Empty-State System

Nenhuma tela vazia terá apenas “Nenhum dado”.

Formato:

**O que está vazio**
→ **por que**
→ **o que fazer**

Exemplo:

> Você ainda não tem destinos salvos.  
> Pesquise um destino para começar.  
> **Pesquisar destino**

## 121. Mobile Error-State System

Formato:

**problema → impacto → recuperação**

Exemplo:

> Não foi possível atualizar a rota.  
> A última rota salva continua disponível.  
> **Abrir rota salva**

## 122. Mobile Data Loading System

Usar skeleton somente quando houver carregamento real.

Não usar animação como substituto de resposta.

Se o tempo exceder o orçamento:

**Carregamento lento**

→ tentar novamente  
→ usar cache  
→ continuar offline

## 123. Mobile Performance Budget

Definir budgets verificáveis para:

- JavaScript inicial;
- CSS;
- imagens;
- requests;
- tempo de boot;
- tempo até interação;
- renderizações;
- armazenamento;
- consultas externas.

Os valores exatos serão definidos no plano técnico após medir a aplicação atual, em vez de inventar metas não calibradas.

## 124. Feature Loading Budget

Cada feature deve declarar:

- custo de carregamento;
- requests;
- storage;
- dependências;
- fallback.

Features pesadas não podem entrar no caminho crítico da Home.

## 125. State Ownership Audit

Para cada dado, definir uma única fonte:

- missão → Mission Store;
- destino → Destination Store;
- veículo → Vehicle Store;
- rota → Route State;
- eventos → Event Store;
- fontes → Source Registry.

Componentes não podem manter cópias concorrentes do mesmo conceito sem sincronização explícita.

## 126. Event Subscription Consolidation

Reduzir listeners independentes de:

- `focus`;
- `online`;
- `offline`;
- eventos de preferências;
- eventos de combustível;
- eventos de veículo.

Criar mecanismos compartilhados quando houver ganho real.

## 127. React Safety Contract

Todo componente novo deve ser revisado contra:

- hooks condicionais;
- efeitos com dependências incorretas;
- subscriptions sem cleanup;
- setState após unmount;
- suspense sem fallback útil;
- erros não capturados;
- renderizações infinitas;
- dados externos não validados.

Isso é obrigatório porque o objetivo desta fase é **funcionar**, não somente parecer melhor.

## 128. Mobile Regression Contract

Antes de qualquer deploy, validar:

### Home
- abre;
- busca;
- destino;
- ação principal.

### Planner
- origem;
- destino;
- loading;
- rota;
- erro;
- alternativa.

### Offline
- salvar;
- abrir;
- stale;
- recuperação.

### Navegação
- Google;
- Waze;
- Apple.

### Histórico
- registrar;
- listar;
- repetir.

### Dados
- fonte;
- timestamp;
- procedência.

### Segurança
- storage corrompido;
- URL inválida;
- provider inválido;
- payload inválido.

## 129. Visual Regression Contract

Comparar capturas nos principais tamanhos mobile depois das mudanças críticas.

Verificar:

- overflow horizontal;
- texto cortado;
- botão fora da tela;
- modal atrás do teclado;
- bottom navigation cobrindo conteúdo;
- safe-area;
- foco;
- scroll;
- sticky elements;
- orientação.

## 130. No Feature Creep During Rewrite

Durante a primeira fase da reformulação não adicionar novos módulos de baixo impacto.

A implementação deve priorizar:

**funcionar → simplificar → testar → otimizar → então expandir.**

## 131. Ordem definitiva da reconstrução

### Fase 0 — Diagnóstico
- inventário;
- dependências;
- componentes;
- fluxos;
- erros;
- performance;
- mobile screenshots/testes.

### Fase 1 — Fundação
- design tokens;
- Mobile Shell;
- navigation;
- state system;
- error system;
- loading system.

### Fase 2 — Home
- Agora;
- busca;
- destino;
- Fast Path;
- Resume.

### Fase 3 — Trip Workspace
- Planner;
- rota;
- alternativas;
- preparação;
- navegação;
- conclusão.

### Fase 4 — Mobilidade
- viagens;
- destinos;
- veículo;
- custos;
- registros.

### Fase 5 — Dados
- fontes;
- evidências;
- observatório;
- datasets;
- privacidade.

### Fase 6 — Robustez
- offline;
- recovery;
- storage;
- segurança;
- provider failures.

### Fase 7 — Qualidade
- acessibilidade;
- performance;
- visual regression;
- golden journeys.

### Fase 8 — Expansão
- multimodal;
- ANTT;
- PEMOB;
- BNDES;
- cenários;
- automações.

### Fase 9 — Produção
- build;
- CI;
- deploy preview;
- smoke tests;
- code review;
- deploy final.

## 132. Critério absoluto de aceitação

O Trajeto não poderá ser considerado pronto se:

- a Home estiver visualmente congestionada;
- uma ação principal não for evidente;
- uma tela puder ficar em loading indefinido;
- um erro não tiver recuperação;
- dados públicos aparecerem sem fonte/período;
- uma função essencial depender de gesto;
- o teclado quebrar o fluxo;
- houver overflow horizontal;
- bottom navigation cobrir conteúdo;
- dados corrompidos derrubarem o app;
- provider indisponível derrubar o fluxo;
- componentes mantiverem estados conflitantes;
- o usuário precisar atravessar detalhes técnicos para chegar à ação principal.

## 133. Resultado esperado

No celular, o Trajeto deverá parecer:

**um aplicativo simples de mobilidade.**

Internamente, poderá possuir:

- motor de missões;
- grafo de mobilidade;
- dados públicos;
- evidências;
- custos;
- veículos;
- histórico;
- offline;
- multimodalidade;
- governança;
- recuperação.

A complexidade fica na arquitetura.

A interface fica simples.

## 134. Regra final

**Não adicionar mais complexidade à superfície para resolver problemas de arquitetura.**

Se algo está difícil de usar, a primeira resposta será simplificar o fluxo e consolidar estado, não criar outro card.


## 135. Mobile Reliability Layer — funcionamento antes de expansão

A reformulação passa a possuir uma camada explícita de confiabilidade do produto.

### 135.1 App Self-Test
Adicionar diagnóstico técnico local capaz de verificar:
- inicialização React;
- roteamento;
- base path/GitHub Pages;
- localStorage;
- Service Worker;
- cache;
- conectividade;
- providers configurados;
- links externos;
- estado de missão;
- integridade de migrations.

Resultado: **OK / Atenção / Indisponível**, sem score geral.

### 135.2 Safe Startup
Uma falha secundária não pode impedir a abertura do núcleo: **Home → destino → missão**.

### 135.3 Feature Health
Cada domínio declara disponível, degradado, offline, indisponível ou configuração ausente.

### 135.4 Failure Containment
Erros de provider, parser ou componente ficam confinados ao domínio correspondente.

### 135.5 Recovery Actions
Cada falha recuperável oferece tentar novamente, usar cache, abrir snapshot, continuar offline, limpar estado inválido, voltar ou recomeçar missão.

## 136. Mobile Mission Engine

### 136.1 Mission State Machine
Estados oficiais: **idle → planning → route_ready → preparing → navigating → completed**.
Interrupções: **blocked / interrupted / cancelled / expired**. Transições inválidas devem ser rejeitadas.

### 136.2 Mission Checkpoint
Antes de sair para navegação externa, registrar missão, destino, rota, timestamp, estado e ação externa.

### 136.3 Resume After External Navigation
Ao retornar: **“Você estava em uma viagem para X.”** Ações: continuar, concluir, revisar ou descartar checkpoint.

### 136.4 Mission Timeout
Checkpoints antigos deixam de ser tratados como viagem atual e podem ser retomados como nova missão.

## 137. Fast Path 2.0

Caminho otimizado: **Agora → destino recente → rota conhecida → Navegar**.

Não repetir configurações desnecessárias.

### 137.1 Smart Resume
Missão ativa → **Continuar**. Sem missão → **Ir agora**.

### 137.2 Destination Memory
Separar recente, frequente, favorito e último usado. Não inferir estados com amostra insuficiente.

### 137.3 Route Memory
Registrar configurações explicitamente usadas: provedor, evitar pedágio, evitar rodovia, modo e paradas. Não converter memória em preferência automática sem confirmação.

## 138. Trip Workspace 2.0

Uma única superfície representa uma viagem:
- Cabeçalho: destino + estado.
- Corpo: próxima ação.
- Detalhes: rota, combustível, custos, offline e checklist.
- Rodapé: uma ação principal.

Nenhum módulo externo poderá criar uma segunda versão da mesma missão.

## 139. Navigation Handoff

A navegação externa é um handoff. O Trajeto prepara contexto e entrega ao provedor.

URLs universais do Google Maps permitem abrir pesquisa, rotas e navegação sem exigir chave de API; podem definir origem, destino, waypoints e modo. citeturn0search4turn0search5

### 139.1 Handoff Validation
Validar destino, parâmetros, origem quando fornecida, waypoints e provedor.

### 139.2 Handoff Fallback
Se o app externo não estiver disponível, abrir URL web compatível e informar que navegação guiada depende do provedor/dispositivo.

### 139.3 Handoff Privacy
Enviar somente a informação necessária para a ação.

## 140. Mobile Action Rail

Cada fluxo possui uma área contextual para a ação principal: **Calcular rota / Preparar / Navegar / Concluir**.

Deve respeitar safe-area, não esconder foco, não cobrir campos e não coexistir com barras fixas redundantes.

WCAG 2.2 exige que o foco não fique totalmente oculto por conteúdo criado pelo autor; isso será testado com barra fixa e teclado. citeturn0search2

## 141. Mobile Touch Standard

Controles principais terão alvo preferencial de 44×44 CSS px. WCAG 2.2 AA define 24×24 como mínimo em condições específicas, enquanto 44×44 é o critério aprimorado AAA; 44×44 será o padrão interno para ações importantes. citeturn0search0turn0search3

Swipe, drag e long press serão opcionais. Toda ação essencial terá alternativa de toque simples. citeturn0search1

## 142. Mobile Form Engine

Formulários críticos terão labels persistentes, validação inline, mensagens próximas ao campo, preservação de valores válidos, teclado adequado, inputmode apropriado e prevenção de perda acidental.

### 142.1 No Autofocus Abuse
Não abrir teclado automaticamente sem intenção explícita.

## 143. Mobile Search 2.0

Busca única para destinos, viagens, veículos, postos, ações e dados.

Estados: vazio, digitando, resultados, sem resultados, erro e offline.

Resultados podem oferecer ações contextuais como **Destino → Ir**, **Viagem → Continuar**, **Veículo → Abrir**, **Combustível → Registrar**.

## 144. Contextual Command System

A busca pode executar **Ir para destino, Continuar viagem, Preparar, Registrar abastecimento, Abrir custos, Abrir veículo, Abrir rota salva**. Alterações de dados e ações externas exigem confirmação quando necessário.

## 145. Data Trust Contract

Dados importantes devem responder: **o que é + quando foi atualizado + de onde veio**.

Categorias: REAL/EXTERNO, REGISTRADO, CALCULADO, ESTIMADO, PROJETADO, OFFLINE, DESATUALIZADO.

Nunca misturar categorias visualmente.

## 146. “Why this?”

Toda recomendação contextual poderá explicar contexto detectado, dados utilizados, dados ausentes, regra aplicada e alternativa disponível.

## 147. Data Sufficiency Gate

**dados suficientes → executar; dados insuficientes → explicar; dados contraditórios → revisar.** Nunca preencher lacunas automaticamente.

## 148. Local Data Safety

Adicionar schema version, migration journal, validation, limits, quarantine, backup point e rollback quando possível. Dados inválidos não podem provocar JSON.parse fatal ou tela branca.

## 149. PWA Update Safety

Fluxo: **detectar → validar → migrar → testar → ativar**. Se migration falhar, preservar versão anterior.

### 149.1 Update Center
Mostrar versão atual, nova versão, mudanças relevantes e estado da atualização.

## 150. Mobile Visual System 2.0

Design baseado em **uma superfície → uma decisão → uma ação**.

Prioridades: leitura, contraste, toque, hierarquia, espaçamento e feedback.

Remover decoração sem função, cards repetidos, métricas duplicadas, badges excessivos, gráficos sem decisão e textos técnicos do fluxo principal.

## 151. Mobile Navigation Recovery

URLs profundas devem validar rota, recuperar contexto quando possível, redirecionar para superfície segura e preservar intenção apenas através de returnTo validado. Nunca confiar cegamente em URL externa para redirecionamento.

## 152. GitHub Pages Compatibility

Testar BASE_URL, refresh de rotas, links internos, assets, Service Worker scope, manifest, URLs com query/hash e navegação direta para rotas profundas.

## 153. Production Smoke Test

Antes de cada deploy:
1. Home;
2. destino;
3. rota;
4. alternativa;
5. preparação;
6. navegação;
7. retorno;
8. conclusão;
9. histórico;
10. offline;
11. recuperação;
12. mobile;
13. console;
14. links;
15. Service Worker.

Nenhum deploy será declarado concluído sem evidência desses testes.

## 154. Reformulação de prioridade

**1. funcionamento → 2. simplicidade → 3. velocidade → 4. recuperação → 5. acessibilidade → 6. transparência → 7. segurança → 8. recursos avançados.**

## 155. Critério final de produto

O usuário deve conseguir usar o celular sem conhecer arquitetura, providers, datasets, schemas, eventos, caches, Service Worker, provenance ou migrations. Tudo isso pertence ao motor.

## 156. Regra de encerramento da expansão

Qualquer novo recurso deve demonstrar pelo menos uma melhoria em: reduzir toques, reduzir tempo, reduzir erro, melhorar recuperação, transparência, segurança, acessibilidade, integração de dados ou preparação/conclusão. Caso contrário, fica fora da superfície principal.


## 157. Mobile UX Hardening — nível de produto

Esta etapa não adiciona outra camada de módulos à Home. Ela define requisitos para que a reconstrução pareça e funcione como um aplicativo mobile.

### 157.1 First Useful Paint
A primeira superfície útil deve aparecer sem depender de fontes externas. O usuário deve conseguir começar uma ação local antes de qualquer dado secundário terminar de carregar.

### 157.2 First Useful Interaction
O primeiro controle acionável deve ser o destino ou a continuação da missão. Nenhum modal, banner ou carregamento secundário pode bloquear esse controle sem motivo funcional.

### 157.3 No Accidental Complexity
Toda informação secundária deve ser recolhida por disclosure. A abertura de detalhes nunca pode substituir a ação principal.

### 157.4 Mobile Reading Width
Textos operacionais devem usar largura confortável, evitar linhas excessivamente longas e impedir overflow horizontal.

### 157.5 Dynamic Viewport
A interface deve considerar as variações reais de viewport mobile e teclado virtual, evitando depender exclusivamente de 100vh.

### 157.6 Safe Area
Elementos fixos devem considerar safe-area superior e inferior, incluindo dispositivos com recorte e navegação por gestos.

### 157.7 Scroll Ownership
Cada tela deve possuir um único scroll principal sempre que possível. Bottom sheets e modais devem ter scroll interno somente quando necessário.

### 157.8 Scroll Restoration
Ao voltar de detalhe, busca, modal ou navegador externo, restaurar posição/contexto quando isso reduzir perda de contexto.

## 158. Mobile Interaction States

Cada controle interativo relevante deve possuir:

- default;
- pressed;
- focus-visible;
- disabled;
- loading;
- success;
- error.

Focus indicators devem ser claramente perceptíveis; o WCAG 2.2 inclui orientação específica para aparência do foco e contraste do indicador. citeturn0search3

### 158.1 Reduced Motion
Animações não essenciais devem respeitar prefers-reduced-motion.

### 158.2 Motion Budget
Nenhuma animação pode atrasar uma ação, esconder estado ou impedir navegação.

## 159. Mobile Network Resilience

Criar estados de rede:

- online;
- offline;
- unstable;
- slow;
- unknown.

Somente classificar como slow/unstable quando houver evidência mensurável.

### 159.1 Network-Aware UX
Em conexão limitada:

- reduzir refresh;
- priorizar missão;
- usar cache;
- adiar módulos secundários;
- evitar retries agressivos.

### 159.2 Request Cancellation
Ao abandonar uma tela, cancelar requisições que não tenham mais utilidade.

### 159.3 Request Deduplication
Uma mesma consulta não deve ser executada simultaneamente por componentes diferentes.

## 160. Mobile Data Budget

Cada tela deve declarar aproximadamente:

- requests críticos;
- requests secundários;
- dados locais;
- dados externos;
- cache permitido.

A Home deve ter o menor orçamento do produto.

## 161. Mission Preflight 2.0

Antes de abrir navegação, mostrar somente problemas acionáveis:

- destino ausente;
- rota ausente;
- rota salva antiga;
- veículo indisponível;
- conflito;
- dados essenciais ausentes.

Informações não bloqueantes ficam recolhidas.

### 161.1 One-Tap Fix
Quando possível, cada bloqueio possui uma correção direta:

**Sem rota → Calcular**

**Sem veículo → Selecionar**

**Sem offline → Salvar**

**Conflito → Revisar**

## 162. Mission Handoff Return

Após abrir Google Maps/Waze/Apple, o Trajeto mantém um checkpoint local e, no retorno:

- identifica a missão;
- mostra a etapa;
- evita reiniciar a preparação;
- permite concluir.

Não inferir que a viagem foi concluída apenas porque o usuário abriu o navegador.

## 163. Trip Completion Evidence

A conclusão pode registrar:

- concluída manualmente;
- concluída com observação;
- combustível registrado;
- custo registrado;
- incidente registrado.

“Concluída” nunca significa que o Trajeto comprovou fisicamente a chegada.

## 164. Mobile History

Histórico deve priorizar:

**última viagem → viagens frequentes → demais**

Cada item mostra apenas:

- destino;
- data;
- estado;
- ação principal.

Detalhes abrem sob demanda.

## 165. Mobile Destination Memory

Destinos devem possuir identidade estável baseada em dados registrados, evitando duplicatas por pequenas diferenças de nome.

Possíveis correspondências exigem confirmação quando houver ambiguidade.

## 166. Mobile Cost Surface

Custos não devem aparecer como dashboard na Home.

Na área Mobilidade:

- gasto registrado;
- estimativa;
- projeção;
- período;
- missão;
- veículo.

Cada categoria deve ser claramente distinguida.

## 167. Mobile Data Center

O Data Center terá duas camadas:

### Público
- fontes;
- atualização;
- indicadores principais;
- explicações.

### Técnico
- datasets;
- schemas;
- adapters;
- cache;
- migrations;
- logs sanitizados;
- capabilities.

A camada técnica nunca deve aparecer automaticamente durante uma tarefa de navegação.

## 168. Accessibility Journey Gate

Acessibilidade será testada como jornada:

**abrir → pesquisar → selecionar → calcular → preparar → navegar → retornar → concluir**

e não apenas como auditoria de componentes.

O W3C mantém orientação específica para aplicar WCAG 2.2 a aplicações mobile, incluindo mobile web apps. citeturn0search0turn0search4

## 169. Touch Target Policy

O requisito normativo WCAG 2.2 AA de 24×24 CSS px continua sendo o mínimo; o Trajeto adotará uma política interna mais confortável para ações principais, com 44×44 como alvo de design quando não houver conflito de espaço. citeturn0search1turn0search2

## 170. Mobile QA Matrix 2.0

Cada release deve validar:

- viewport 320;
- 360;
- 375;
- 390;
- 412;
- 430;
- teclado aberto;
- teclado fechado;
- orientação vertical;
- orientação horizontal;
- reduced motion;
- zoom;
- leitor de tela;
- conexão rápida;
- conexão lenta;
- offline.

## 171. Visual Failure Catalog

Criar testes específicos para:

- overflow horizontal;
- texto cortado;
- botão coberto;
- bottom navigation sobre conteúdo;
- action rail sobre teclado;
- modal sem fechamento;
- sheet sem scroll;
- foco perdido;
- foco escondido;
- skeleton infinito;
- layout quebrado sem dados;
- erro sem ação.

## 172. Product Simplification Audit

Antes de cada release, contar:

- ações primárias por tela;
- elementos fixos;
- CTAs;
- cards;
- requests críticos;
- listeners;
- fontes de estado;
- modais simultâneos.

A tendência desejada é redução, não crescimento.

## 173. Feature Removal Rule

Uma função existente pode ser removida da superfície principal se:

- for pouco utilizada;
- duplicar outra;
- aumentar complexidade;
- não tiver fallback;
- não funcionar offline quando deveria;
- não possuir estado de erro;
- não tiver utilidade clara.

Ela pode permanecer disponível em área secundária ou ser removida do produto.

## 174. Core Product Freeze

Durante a reconstrução mobile, congelar novas features de baixo impacto até que:

- Home funcione;
- Planner funcione;
- navegação externa funcione;
- offline funcione;
- recuperação funcione;
- testes mobile passem.

## 175. Definition of Done Mobile

Uma função só estará pronta quando:

1. funcionar;
2. tiver loading;
3. tiver erro;
4. tiver empty state quando aplicável;
5. funcionar em mobile;
6. não quebrar offline quando houver suporte esperado;
7. possuir acessibilidade;
8. não gerar listener/requisição redundante;
9. possuir fallback;
10. estiver coberta por teste relevante.

## 176. Último nível de produto

O objetivo final não é fazer o Trajeto “ter tudo”.

É fazer o Trajeto **resolver a próxima necessidade com o mínimo de esforço**, enquanto toda a complexidade técnica permanece invisível até ser necessária.

A partir daqui, novas ideias devem ser avaliadas contra esse princípio.


## 177. Mobile Quality Gate — última camada antes da implementação

A reconstrução deverá possuir um gate específico para garantir que o aplicativo realmente funciona em condições móveis reais.

### 177.1 Mobile Cockpit
Criar uma superfície mínima para o estado atual:

- missão atual;
- destino;
- próxima ação;
- conectividade;
- offline;
- bloqueios.

Nenhum gráfico, indicador secundário ou dado territorial entra no cockpit.

### 177.2 One-Hand Mode
Quando ativado, ações principais, busca, voltar e confirmação ficam posicionados para uso com uma mão. A função deve ser apenas uma adaptação de layout, sem duplicar lógica.

### 177.3 Data Saver
Modo opcional que reduz:

- refresh externo;
- imagens;
- consultas secundárias;
- atualização de fontes;
- pré-carregamento.

A missão continua prioritária.

### 177.4 Battery-Aware Behavior
Sem rastreamento contínuo, o app pode reduzir tarefas não essenciais quando o navegador indicar condições de economia de energia ou quando o usuário ativar Economia.

Não criar dependência de APIs de bateria que não estejam disponíveis no navegador.

### 177.5 Install Experience
A instalação PWA deve ser contextual e não invasiva.

Nunca bloquear o uso para pedir instalação.

### 177.6 Update Communication
Quando houver atualização disponível, explicar de forma curta:

- o que mudou;
- se há migration;
- se é necessário reiniciar;
- se os dados estão protegidos.

### 177.7 Accessibility Preferences
Respeitar preferências do sistema e, quando útil, permitir:

- reduzir movimento;
- maior densidade de toque;
- contraste;
- texto maior;
- foco reforçado.

Não criar um “modo acessibilidade” que esconda recursos essenciais.

### 177.8 Screen Reader Journey
Validar verbalmente a sequência:

**título → contexto → ação principal → estado → resultado → próxima ação.**

### 177.9 Voice Input Compatibility
Campos de destino e busca devem permanecer compatíveis com entrada por voz do sistema. Não depender de eventos exclusivos de teclado físico.

### 177.10 Orientation Resilience
A missão não pode ser perdida ao alternar orientação. Estado e foco devem ser preservados quando tecnicamente possível.

## 178. Mobile Performance Gate

Performance será tratada por métricas observáveis, não por sensação.

Medir:

- carregamento inicial;
- interação inicial;
- INP;
- LCP;
- CLS;
- tamanho de JavaScript;
- requests;
- memória quando mensurável.

INP é uma Core Web Vital voltada à responsividade das interações; código executado em listeners pode bloquear a atualização da interface e aumentar a latência percebida. citeturn0search13turn0search14

### 178.1 Interaction Budget
As ações principais não podem executar trabalho pesado síncrono desnecessário no thread principal.

### 178.2 Render Budget
Listas longas, histórico e datasets não devem provocar renderização integral quando apenas uma parte está visível.

### 178.3 Input Budget
Digitação na busca deve permanecer responsiva mesmo enquanto resultados externos são atualizados.

### 178.4 Navigation Budget
A abertura de uma ação externa não deve esperar módulos secundários.

## 179. Mobile Privacy UX

Privacidade será compreensível no fluxo:

- o que fica local;
- o que vai para provedor externo;
- o que é público;
- o que é compartilhado;
- o que pode ser apagado.

### 179.1 External Handoff Preview
Antes de uma ação externa relevante:

**Destino enviado: X**

**Origem enviada: Y**

**Waypoints: Z**

Somente quando isso for relevante para a decisão.

### 179.2 Privacy-Minimal URLs
Evitar parâmetros desnecessários em URLs externas.

### 179.3 Sensitive Log Redaction
Logs técnicos não devem registrar endereço completo, tokens, identificadores sensíveis ou conteúdo de campos privados.

## 180. Mobile Recovery Center

Criar uma área secundária para recuperação:

- última missão;
- última rota;
- snapshots offline;
- dados isolados;
- migrations;
- backups locais;
- erros recuperáveis.

O usuário comum só vê essa área quando precisa dela.

## 181. Data Repair Wizard

Quando houver corrupção ou inconsistência:

1. detectar;
2. preservar original;
3. explicar;
4. oferecer correção;
5. validar resultado;
6. registrar migration/recovery;
7. permitir rollback quando suportado.

Nunca apagar silenciosamente dados inválidos.

## 182. Mission Journal

Cada missão pode possuir uma timeline compacta:

**criada → rota calculada → preparada → navegador aberto → retornou → concluída**

Somente eventos realmente registrados entram como fatos.

### 182.1 Unknown Events
Se não houver evidência do que ocorreu fora do Trajeto:

**não registrado**

em vez de inventar.

## 183. Mobile Decision Log

Para decisões importantes, armazenar localmente:

- ação;
- contexto;
- timestamp;
- dados utilizados;
- resultado.

O usuário pode apagar esse histórico.

## 184. Mobile Share Card

Compartilhamento deverá usar informação mínima:

- destino;
- rota;
- data;
- dados selecionados.

Antes do compartilhamento:

**Pré-visualizar → Confirmar → Compartilhar**

Nunca incluir automaticamente:

- histórico completo;
- localização precisa desnecessária;
- documentos;
- dados privados.

## 185. Mobile Observability

Modo técnico deve permitir diagnosticar:

- versão;
- build;
- base path;
- Service Worker;
- cache;
- storage;
- provider;
- requests;
- tempo;
- erro;
- recovery.

Logs devem ser sanitizados.

## 186. Contract Test Matrix

Criar testes para:

### Domain
- estados;
- transições;
- cálculos;
- suficiência.

### Storage
- migration;
- corrupção;
- limite;
- recuperação.

### Provider
- sucesso;
- vazio;
- timeout;
- schema inválido;
- erro.

### UI
- loading;
- empty;
- error;
- offline;
- stale;
- degraded.

### Mobile
- keyboard;
- orientation;
- focus;
- touch;
- safe-area.

## 187. Golden Mobile Journeys

As seguintes jornadas tornam-se contratos:

**J1:** primeiro acesso → destino → rota → navegação.

**J2:** destino recente → Fast Path → navegação.

**J3:** missão ativa → retorno → continuar.

**J4:** offline → rota salva → continuar.

**J5:** provider indisponível → fallback.

**J6:** storage corrompido → recovery.

**J7:** missão → combustível → custo → conclusão.

**J8:** busca → comando → confirmação.

**J9:** compartilhamento → preview → confirmação.

**J10:** atualização PWA → migration → retorno.

## 188. Release Gate

Uma versão só poderá avançar para deploy quando:

- TypeScript passar;
- testes unitários passarem;
- testes de domínio passarem;
- testes de storage passarem;
- golden journeys passarem;
- smoke test passar;
- visual regression não apresentar regressão crítica;
- acessibilidade não apresentar bloqueio crítico;
- não houver loading infinito conhecido;
- não houver tela branca conhecida;
- build de produção concluir;
- GitHub Pages funcionar;
- Service Worker funcionar;
- navegação externa funcionar;
- nenhuma chave/segredo estiver exposta.

## 189. Post-Deploy Verification

Depois do deploy:

1. abrir URL pública;
2. testar mobile;
3. testar refresh;
4. testar rota profunda;
5. testar Home;
6. testar busca;
7. testar Planner;
8. testar navegação;
9. testar PWA;
10. testar offline;
11. verificar console;
12. verificar assets;
13. verificar Service Worker.

Somente após essa verificação o deploy será considerado operacional.

## 190. Regra máxima da reconstrução

**O Trajeto não será otimizado para quantidade de funções.**

Será otimizado para:

**clareza + ação + velocidade + recuperação + confiança.**

A arquitetura avançada continua existindo, mas fica subordinada à experiência mobile.

## 191. Encerramento da especificação

Esta especificação deixa de crescer por adição de módulos. A partir deste ponto, novas necessidades devem ser resolvidas durante o plano técnico ou implementação, preferencialmente consolidando componentes existentes em vez de criar novas superfícies.

A próxima etapa é obrigatoriamente:

**especificação → aprovação → plano técnico → implementação TDD → verificação → code review → deploy.**
