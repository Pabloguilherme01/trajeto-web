# Mapbox no Trajeto — integração opcional

O Mapbox é uma camada **opcional de melhoria online**. Ele não substitui o núcleo local/offline e não é requisito para o GitHub Pages.

## O que o Mapbox melhora

Quando `VITE_MAPBOX_PUBLIC_TOKEN` está configurado:

- rotas de carro usam o perfil `driving-traffic`;
- caminhada e bicicleta podem usar a rede de rotas do Mapbox;
- a geometria retornada continua sendo exibida pelos mapas já existentes do Trajeto;
- se Mapbox falhar ou não estiver configurado, o app continua automaticamente com OSRM e, por último, estimativa local.

O modo `transit` não é enviado ao Directions API do Mapbox nesta integração.

## O que não muda

- serviços públicos e locais preparados continuam prioritários;
- ANP continua sendo a fonte cadastral dos postos;
- a base vetorial offline continua funcionando sem rede;
- GitHub Pages continua publicável sem token e sem custo comercial obrigatório;
- rotas com origem GPS privada continuam calculadas localmente e não enviam a posição exata ao Mapbox;
- coordenadas digitadas manualmente continuam reduzidas para precisão de bairro/quarteirão antes do roteamento público.

## Token

Use somente um token público de cliente em `VITE_MAPBOX_PUBLIC_TOKEN`.

Recomendações:

- crie um token exclusivo para o Trajeto;
- aplique escopo mínimo necessário;
- restrinja URLs aos domínios realmente usados;
- use tokens separados para produção e desenvolvimento;
- nunca coloque token secreto no cliente;
- não grave tokens em localStorage, arquivos versionados ou logs.

O workflow padrão do GitHub Pages não injeta esse token. Isso é proposital: o núcleo público permanece independente de provedor comercial.

## Ordem de provedores

Para rota pública online:

1. cache/local;
2. Mapbox, se explicitamente configurado;
3. OSRM público;
4. estimativa local.

Para localização precisa do aparelho:

1. cálculo local com coordenada reduzida para o estado da rota;
2. nenhum provedor de rota externo recebe a origem GPS precisa;
3. navegação externa continua sendo uma escolha explícita do usuário.
