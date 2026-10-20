# Teste físico de conectividade — PR #389 (Trajeto)

**Estado:** roteiro de validação, **não** comprovação de testes físicos executados.  
**Alteração de origem:** [PR #389](https://github.com/Pabloguilherme01/trajeto-web/pull/389), integrada em 10/10/2026.  
**Risco remanescente:** o hook compartilhado `useOnlineStatus` elimina listeners repetidos, mas emulação e Vitest não medem comportamento real sob alternâncias de rede, retomada de PWA ou pressão de memória.

## Evidência já disponível versus pendência

| Escopo | Evidência existente | Ainda precisa de aparelho |
| --- | --- | --- |
| Estado inicial offline e atualização entre consumidores | Testes de regressão da PR #389 | Transições Wi-Fi/4G/modo avião com telas abertas |
| Inscrição e remoção de listeners após desmontagem | Testes de hook/CI | Retomada após segundo plano e navegação repetida sem congelamentos |
| Fluxos Search, CityMap, ReadyRouteShortcuts, PublicServices, Planner e Stations | CI, Mobile QA e Responsive da PR #389 | Interação e continuidade real no Android modesto |
| Processamento de ~21.486 marcadores na PR #388 | Cobertura de invariantes da PR #388 | Latência, FPS, memória e bateria não comprovados fisicamente |

## Preparação

Usar **Android físico modesto** como prioridade P0; repetir as etapas críticas em iPhone/Safari quando disponível. Registrar modelo, RAM aproximada, versão do SO/navegador, SHA de commit e de publicação, modo instalado/aba, dados preparados no cache e condições da rede. Comparar sempre o **mesmo snapshot** e a **mesma versão** nas repetições. Não publicar localização exata, dados privados, tokens, vídeos com informações pessoais ou IP do aparelho.

Depois de uma primeira visita com conexão, aguardar o service worker controlar o documento antes de testar recarga totalmente offline; `navigator.serviceWorker.ready` isoladamente não garante que a aba já está controlada. Testar também carregamento inicial sem cache, mas não exigir dados offline que nunca foram preparados.

## Ordem de execução — P0 primeiro

| ID | Cenário / passos | Sinais de falha | Critério de aprovação |
| --- | --- | --- | --- |
| C01 · P0 | Iniciar offline (modo avião) **com cache preparado**; abrir **Busca** e **Mapa**; consultar dados locais. | Tela em branco, carregamento infinito, contagem incorreta ou opção online ativa como se houvesse rede. | Ambos mostram estado offline coerente e permitem consultar o conteúdo local preparado. |
| C02 · P0 | Manter Busca e Mapa montados; alternar Wi-Fi → avião → Wi-Fi **3 vezes**; repetir com 4G se disponível. | Um componente informa online e outro offline, banners duplicados, estado preso ou erro de console. | Ambos refletem as mesmas transições; nenhuma interação quebra. |
| C03 · P0 | Abrir **Atalhos de rotas prontas** e **Planejador**; desconectar durante a seleção e voltar online. | Atalho perdido, rota offline identificada como online, preferência redefinida, localização exposta. | Seleção e favoritos persistem; opções indisponíveis mostram aviso; fluxo recupera após conexão. |
| C04 · P0 | Abrir **Serviços públicos** e **Estações**; pesquisar/filtrar; alternar conectividade enquanto navega entre telas. | Lista some, filtro perde estado sem comando, inconsistência entre componentes ou spinner permanente. | Resultado e filtros permanecem consistentes; recuperação online não duplica itens. |
| C05 · P0 | Repetir abrir/fechar as seis telas **20 vezes**; deixar o app em segundo plano, ativar avião e retomar. | Congelamento, crescimento contínuo aparente de memória, eventos duplicados, atraso anormal após retorno. | Nenhum crash, estado de conexão correto após retomar e nenhuma duplicação visível de eventos. |
| C06 · P0 | Instalar PWA, preparar dados offline, fechar e reabrir pelo ícone; recarregar offline e depois restabelecer rede. | Service worker sem controle, shell indisponível, loop de instalação, cache perdido ou app não abre. | PWA abre offline com recursos preparados e volta ao estado online sem reinstalação. |
| C07 · P0 | Negar geolocalização; navegar por Busca, Mapa e Planejador, depois conceder apenas em ação explícita. | Navegação bloqueada, GPS solicitado sem ação ou origem precisa exposta em URL/log. | Recusa não bloqueia fluxos essenciais; localização exige consentimento e mantém privacidade. |
| C08 · P1 | Fazer zoom/pan com catálogo de ~21.486 empresas e até 200 marcadores; alternar filtros 10 vezes. | Panning travado, seleção divergente, marcadores duplicados ou queda sustentada de FPS. | Sem crash e com seleção correta; registrar latência/FPS/memória, sem afirmar ganho sem baseline comparável. |
| C09 · P1 | Executar C02–C04 com rede móvel lenta e armazenamento reduzido, anotando recuperação e erros. | Corrupção de favoritos/IndexedDB, carregamento infinito ou falha silenciosa. | Dados persistidos permanecem íntegros; falhas de rede recebem estado recuperável. |

## Registro de evidência

Para cada caso registrar **aprovado / reprovado / bloqueado / não executado**, identificador do teste, data, SHA, aparelho, tipo de conexão, cache preparado (sim/não), passos observados, captura ou trace local redigido e issue associada. Nas medições da PR #388, anotar p50/p95 de seleção, FPS durante pan/zoom e memória antes/depois em mesmo aparelho, sem confundir desempenho do algoritmo com tempo total de tela.

**Gate:** qualquer falha P0 reproduzível impede declarar a PR #389 validada em dispositivo físico. Se houver falha, registrar issue com passos mínimos e priorizar correção pequena com teste de regressão antes de novo deploy. A aprovação da CI e da emulação não substitui esta rodada de campo. Não alterar ou liberar PRs de produto em rascunho só porque este roteiro foi escrito.
