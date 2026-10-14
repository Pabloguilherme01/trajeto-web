# Bairros e setores no mapa

A camada leve contém todos os 68 nomes `bairro-*` do atlas municipal do projeto e nomes adicionais repetidos no arquivo de endereços fornecido. Ela não representa um censo completo nem limites oficiais de bairros.

As referências vêm dos arquivos já importados de empresas, cuja atribuição ao CNEFE não foi verificada independentemente (ver `business-catalog.md`). A geração ocorre no desenvolvimento, sem carregar essas empresas em cada mapa. O pequeno JSON entra no pacote estático e funciona offline.

O gerador aceita referências explícitas de bairro. Na ausência delas, exige pelo menos três coordenadas distintas de lote, quadra ou número na rua, calcula uma mediana para escolher um ponto existente do arquivo e o apresenta como referência aproximada. Não cria coordenadas de centroides. Referências de CEP são excluídas porque podem representar uma área maior ou toda a cidade.

Nomes sem posição permanecem na lista pesquisável, com a informação de que sua localização ainda não está confirmada. Nenhum desses nomes recebe um ponto fictício. Grafias com acentos, zeros à esquerda, etapas romanas e os setores do Parque da Barragem são normalizados sem juntar etapas diferentes. O nome municipal é preservado quando há correspondência.

Para regenerar: `node scripts/city-neighborhoods.mjs`. Revise a origem e a precisão antes de ampliar as referências. A camada não é usada para geocodificar casas, inferir entradas ou calcular rotas até um bairro. GPS e roteamento permanecem separados desses rótulos cartográficos.

## Nomes na área atual do mapa

Os mapas online e offline mantêm a camada de rótulos legível: quando duas referências se sobrepõem, apenas uma legenda pode ser desenhada naquele nível de zoom. A seção **Bairros nesta área** mostra todas as referências com coordenadas dentro da câmera atual, mesmo que o texto não apareça sobre o mapa. Cada item centraliza a referência informada sem modificar as rotas.

A busca geral continua incluindo os 100 nomes do catálogo (81 com ponto aproximado e 19 sem localização confirmada na versão de 03/10/2026). Um bairro sem ponto aparece somente na busca, identificado como pendente; não é colocado no mapa nem recebe endereço inventado. A lista da área é calculada localmente a partir das referências do pacote estático e não utiliza localização de outros usuários.
