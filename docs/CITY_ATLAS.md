# Atlas de Águas Lindas

O Atlas é a camada territorial versionada do Trajeto. Ele amplia o mapa da cidade sem transformar
`localRoutePresets.ts` em uma lista monolítica e sem criar dependência de backend.

## Fonte de dados

O snapshot público fica em:

- `client/public/data/aguas-lindas-city-atlas.json`

Cada registro deve trazer, sempre que aplicável:

- `id` estável;
- nome e descrição;
- categoria;
- endereço/destino;
- `sourceId`;
- data de verificação;
- palavras-chave;
- coordenadas **somente quando verificadas por fonte confiável**.

A lista `sources` do próprio snapshot mantém a proveniência. Dados oficiais de Prefeitura, Governo
de Goiás, IBGE, ANTT e outros órgãos públicos devem ser preferidos a catálogos comerciais.

## Camadas

O mapa aceita as camadas:

- saúde;
- educação;
- segurança;
- serviços;
- transporte;
- postos;
- compras;
- alimentação;
- meio ambiente;
- referências.

A página `/mapa` combina o snapshot com os catálogos já existentes do Trajeto. Registros equivalentes
são consolidados para evitar duplicação.

## Coordenadas e privacidade

Não invente latitude/longitude para preencher o mapa. Um local sem coordenada validada continua
pesquisável e pode abrir o planejador pelo endereço. Isso é preferível a exibir um marcador incorreto.

O Atlas contém somente pontos públicos. A localização do usuário não faz parte do snapshot e não deve
ser enviada para esse dataset.

## Offline

O snapshot faz parte de `LOCAL_SNAPSHOTS` no service worker. Ao preparar o acesso offline, o aparelho
recebe:

- catálogo do Atlas;
- mapa vetorial local;
- snapshots ANP;
- shell e chunks da aplicação.

O mapa vetorial local continua sendo o fallback sem internet. Tiles externos são apenas a camada de ruas
online e não são requisito do núcleo offline.

## Como atualizar

1. confirmar a informação em fonte confiável;
2. atualizar ou adicionar o registro no snapshot;
3. manter `id` existente quando o local for o mesmo;
4. atualizar `verifiedAt` e `updatedAt`;
5. adicionar a fonte à lista `sources` quando for nova;
6. adicionar coordenadas apenas quando verificadas;
7. executar typecheck, testes de biblioteca, testes de página, responsividade e smoke do GitHub Pages.

Atualizações grandes devem entrar em PR independente. O mapa deve continuar útil mesmo se uma fonte
externa estiver indisponível.

## Desempenho mobile

O catálogo mostra uma quantidade limitada de cartões inicialmente. Busca e filtros continuam consultando
o conjunto completo. Isso permite aumentar o Atlas para centenas de registros sem degradar a tela inicial
do mapa em aparelhos mais simples.
