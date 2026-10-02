# Trajeto — política de núcleo sem custo obrigatório

O Trajeto deve permanecer útil ao cidadão sem exigir conta, assinatura, servidor pago ou API comercial.

## Regras do núcleo

1. O build público do GitHub Pages deve funcionar sem segredos.
2. Rotas essenciais devem preferir processamento local, snapshots públicos versionados e serviços abertos.
3. Toda integração comercial deve ser opcional e possuir fallback gratuito/local.
4. Nenhuma chave de API paga pode ser necessária para abrir o app, consultar dados locais, usar favoritos, calculadoras ou obter uma rota/estimativa básica.
5. Recursos offline devem continuar disponíveis quando backend, mapas ou rede falharem.
6. Localização precisa não deve ser persistida ou enviada para telemetria.
7. Uma mudança que introduza custo obrigatório no núcleo deve falhar no CI até ser redesenhada.

## Arquitetura atual do modo gratuito

- GitHub Pages: hospedagem do cliente estático.
- PWA/service worker: app shell e recursos offline.
- Snapshots versionados: dados públicos essenciais.
- OpenStreetMap/Nominatim + OSRM: melhoria online sem chave comercial.
- Estimativa local: fallback quando roteamento público não responde.
- localStorage/sessionStorage: preferências, favoritos e cache no aparelho.
- Navegadores externos: navegação atualizada sem o Trajeto pagar pela sessão.

Integrações de backend, banco, OAuth, Google Maps/Places ou equivalentes podem existir como enriquecimento opcional, mas não podem ser requisito do modo público gratuito.


## Mapas e tiles públicos

O mapa de ruas usa tiles públicos apenas para a área que o usuário está visualizando. O Trajeto não deve baixar, pré-carregar ou empacotar tiles do OpenStreetMap para uso offline. A ação de salvar no aparelho guarda somente pontos/coordenadas e dados locais dos postos, nunca o mapa-base. O provedor de tiles deve permanecer configurável por `VITE_PUBLIC_TILE_URL`, com atribuição visível e Referer limitado ao origin do site. O cache dos tiles externos fica a cargo do cache HTTP normal do navegador; o service worker do Trajeto não deve interceptar nem armazenar esses tiles.

### Base vetorial offline local

O pacote PWA inclui `aguas-lindas-offline-map.json`, uma base de 4.938 trechos de vias da área urbana de Águas Lindas, derivada de dados abertos do OpenStreetMap e distribuída com atribuição e ODbL (arquivo de licença adjacente). Esses vetores são preparados uma vez, publicados junto com o app e servidos pela mesma origem, sem consultas com coordenadas pessoais. Não são tiles baixados do servidor público. A verificação e a recuperação do pacote offline incluem esse arquivo.

Cidade, postos e prévias de rotas compartilham o mapa local. Gestos, zoom, enquadramento, temas e pontos continuam disponíveis sem conexão; falha ou corrupção da base não remove os marcadores nem a geometria da viagem. Rotas reais já salvas mantêm sua geometria; estimativas ficam tracejadas e identificadas. A base urbana não oferece recálculo viário offline, trânsito ao vivo ou cobertura nacional.


## Mapbox opcional

O Mapbox pode enriquecer rotas online quando `VITE_MAPBOX_PUBLIC_TOKEN` estiver configurado com um token público `pk` dedicado ao projeto. Ele não faz parte do núcleo obrigatório:

- carro usa `driving-traffic`; caminhada e bicicleta usam seus perfis próprios;
- alternativas válidas são comparadas e a de menor duração é escolhida;
- falha, timeout ou ausência do token cai automaticamente para OSRM e estimativa local;
- falhas ativam um cooldown curto para evitar repetição de requisições;
- requisições idênticas simultâneas são deduplicadas;
- modo Offline nunca depende do Mapbox;
- origem GPS privada continua fora dos provedores de rota do Trajeto;
- nunca usar token secreto `sk` no cliente.

Para produção, use um token público específico do Trajeto, com o menor conjunto de permissões e restrições de URL compatíveis com o GitHub Pages. A integração comercial continua opcional porque o Directions API é medido por requisições.
