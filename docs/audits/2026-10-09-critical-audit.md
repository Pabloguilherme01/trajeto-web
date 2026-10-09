# Auditoria crítica do Trajeto — 9 de outubro de 2026

Base revisada: `49126bc46a44d108d3168abf6db01c5c92d55456`; a correção de cache foi integrada ao main pela PR #364 (`b093f4d46b374ef9e9ad22cec40d7b6d8f693b8a`). Esta revisão amplia a análise sem substituir o catálogo, os mapas ou o planejador.

## Avaliação

O núcleo de utilidade pública está funcional nos percursos observados e tem boa cobertura automatizada. Os riscos mais concretos estão na resiliência do armazenamento do navegador, no custo do pacote offline, na manutenção de telas grandes e na diferença entre o backend opcional e a publicação estática. Não há evidência suficiente para declarar funcionamento perfeito em qualquer celular.

Foi revisado o shell, navegação, armazenamento, autenticação, políticas do servidor, limites de API, integração de mapas, cálculo e persistência de rotas, carregamento do catálogo, snapshots ANP, workflows, build e dependências. A inspeção foi por subsistema e por testes; não constitui leitura individual de cada linha nem validação presencial de cada estabelecimento.

## Falhas corrigidas

| Prioridade | Falha e evidência | Correção |
|---|---|---|
| Alta | A PWA consultava novamente a rede para assets instalados; uma busca direta de HTML podia substituir a versão salva. Duas regressões reproduziram o comportamento. | Cache-first para os assets da revisão instalada; PR #364 integrada após todos os workflows obrigatórios passarem. |
| Alta | Aberturas de IndexedDB não tinham tratamento de `blocked`, prazo ou fechamento por `versionchange`. Uma aba antiga ou navegador sem resposta podia manter carregamentos pendentes. | Abertura compartilhada com limite de 5 s, tratamento de bloqueio e fechamento de conexões tardias ou obsoletas, preservando nomes e versões dos bancos. |
| Alta | Cache opcional de dados/mapa não tratava abortos de transação, falhas síncronas de clonagem ou transações paradas. | Fallback explícito, limite de 5 s da transação e confirmação de escrita somente depois do commit. |
| Média | Dashboard, retorno pós-login e preferências de alertas acessavam storage sem proteção. `SecurityError` podia derrubar a tela. | Funcionamento sem persistência quando o navegador restringe storage; retorno inválido descartado. |
| Média | O retorno pós-login aceitava qualquer caminho iniciado por `/postos`, incluindo outros nomes de rota. | Aceita apenas `/postos` e parâmetros/fragmentos dessa rota. |
| Média | Pedido de persistência recusado rejeitava a Promise da ação. | Retorna `false` e mantém o fluxo existente de feedback. |
| Média | O construtor de Notification pode ser recusado pelo navegador. A exceção no efeito interrompia a tela de alertas. | Proteção da construção; os alertas na tela continuam disponíveis. Não promete push com o app fechado. |
| Alta no backend | Políticas específicas de API não estavam alinhadas ao transporte agrupado utilizado pelo cliente. | Aplicação por procedimento, contabilizando repetições; lotes limitados a 10 tanto no servidor quanto no cliente. Regressões de limitação e concorrência. |
| Média no backend | CSP de produção não permitia `tile.openstreetmap.org`, embora TileStationMap use essa origem em imagens. Também faltava o endpoint da integração opcional Mapbox. | Liberação específica das imagens OSM e da conexão opcional Mapbox, sem ampliar origens de scripts. Não altera permissões do GitHub Pages. |

## Problemas que continuam exigindo trabalho isolado

| Prioridade | Achado | Melhoria e critério de aceitação |
|---|---|---|
| Alta | Manifesto do build de referência: 68 assets, 8.502.205 bytes brutos; aproximadamente 2.097.672 bytes se cada arquivo for gzip. Chunks comerciais: 5.447.292 bytes brutos. A instalação ainda prepara todos os chunks do manifesto. Esses valores não incluem todo o armazenamento do app nem medem a transferência real do Pages. | Separar o catálogo comercial em preparação explícita com indicador de disponibilidade. Antes de mudar, testar busca comercial offline, CNPJ, origem/destino comerciais e atualização de aparelho já preparado. Evitar economia que elimine silenciosamente resultados offline. |
| Alta no desenvolvimento | `npm audit` completo: 11 alertas (8 moderados, 1 alto, 2 críticos), incluindo a cadeia Vitest/Tinypool/Vite. `npm audit --omit=dev`: zero alertas. O workflow Security só audita produção. Não foi demonstrada exploração do site estático. | Migrar ferramentas de teste/build em PR própria e acrescentar verificação da cadeia de desenvolvimento. Não usar `npm audit fix --force`: há sugestões de mudanças incompatíveis/downgrades. Aceitação: typecheck, suíte completa, Pages, Chromium/Firefox/WebKit e auditoria nova sem críticos. |
| Média | PublicServices tem 2.363 linhas, Planner 1.361, Stations 1.309, TileStationMap 1.040 e OfflineMapCanvas 812. | Extrair filtros, resultados, ações e persistência em partes pequenas, uma tela por PR, mantendo os contratos e os testes atuais. O número de linhas é dívida de manutenção, não prova de travamento. |
| Média | O snapshot de preços ANP contém zero registros municipais e aviso de indisponibilidade. Metadados de URL e período também não coincidem. | Corrigir o sincronizador a partir de dados realmente reconhecidos. Manter preços indisponíveis até haver linhas individuais verificadas; não preencher preços ou períodos por suposição. |
| Média | Fontes e contatos do catálogo têm URLs, mas não há validação automática suficiente de atualidade de cada ficha. Catálogo comercial usa coordenadas aproximadas de área, não entradas verificadas. | Registrar data de verificação por ficha, verificar links/duplicações e conservar o aviso de precisão aproximada. Revisão de contatos e entradas físicas exige fonte oficial ou conferência local. |
| Média | Existe cobertura emulando telas pequenas, mas ela não comprova FPS, memória, comportamento de instalação ou gestos em Android físico. | Medir em aparelhos modestos, 320/360/390 px, texto ampliado, rede lenta, modo avião e pouco espaço. Comparar long tasks, tempo de transição e consumo de memória antes/depois. |
| Média | Operações de rotas salvas têm tratamento de abortos, mas suas transações, ao contrário do cache opcional, ainda não têm prazo geral. | Introduzir prazo cuidadosamente com teste de banco grande (até 50 rotas), preservando confirmação de commit e migrações. Evitar cancelar escritas legítimas em aparelho lento. |

## Segurança e privacidade observadas

- APIs privadas não entram no cache do service worker.
- Perto de mim e transferência de GPS entre telas usam memória e cálculos locais; há testes para retirada de coordenadas de links/histórico e redução de precisão na roteirização online.
- Acompanhamento da viagem cancela o GPS quando a tela deixa de estar visível e ignora respostas antigas.
- Procedimentos pessoais usam autenticação e identificador do usuário; administrativos usam checagem de papel.
- Diagnósticos têm opt-in e estão desativados no runtime estático.
- Backend exige variáveis de ambiente de produção. A publicação Pages não utiliza esse servidor; não se deve exigir banco ou Forge para o núcleo estático.
- Estes controles não substituem teste de invasão, inspeção de infraestrutura ou revisão de todos os dados externos.

## Verificação e limites

- Suíte ampliada, typecheck, build e zero-cost executados localmente; resultados finais ficam na descrição da PR.
- Regressões de storage bloqueado, abertura sem resposta, conexão tardia, versionchange, clonagem inválida, abortos, transação sem resposta, retorno pós-login, CSP e chamadas agrupadas.
- A PR #364 recebeu CI, Security, CodeQL, Mobile QA e Responsive aprovados antes do merge. Esses resultados pertencem ao commit daquela PR e não são reaproveitados como aprovação das alterações posteriores.
- No Pages público: início abriu; busca UPA retornou a ficha; Planejar rota recebeu o destino corretamente. O cálculo Prefeitura → UPA concluiu com 3,6 km, 7 min e 9 instruções, com mapa e confirmação de cópia offline automática. Isso não valida recarga em modo avião ou preparação completa.
- Os testes Playwright locais ficaram bloqueados pelo download inválido do Chromium. O navegador remoto permite inspeção pública, mas não substitui a emulação mobile/offline do CI nem Android físico.
- O HTTP 200 do início publicado foi observado; não prova equivalência entre cada asset de produção e o main.
- Sem mudanças de dependências maiores, catálogo, coordenadas ou esquema de banco nesta correção.

## Ordem de continuidade

1. Integrar apenas a PR de resiliência após os checks do novo commit; conferir deploy e percursos no Pages.
2. Migrar a cadeia de desenvolvimento e estender auditoria de dependências em PR própria.
3. Reduzir o pacote comercial de instalação com testes explícitos de cobertura offline.
4. Dividir telas grandes, registrar verificação das fontes e medir desempenho em Android físico.

Referências da cadeia de desenvolvimento: [Vitest](https://github.com/advisories/GHSA-5xrq-8626-4rwp) e [Tinypool](https://github.com/advisories/GHSA-5gmw-xhrv-c9v3). A criticidade do advisory depende da superfície exposta e não deve ser interpretada como falha crítica demonstrada do Pages.
