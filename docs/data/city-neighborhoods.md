# Bairros e setores no mapa

A camada leve contém todos os 68 nomes `bairro-*` do atlas municipal do projeto e nomes adicionais repetidos no arquivo de endereços fornecido. Ela não representa um censo completo nem limites oficiais de bairros.

As referências vêm dos arquivos já importados de empresas, cuja atribuição ao CNEFE não foi verificada independentemente (ver `business-catalog.md`). A geração ocorre no desenvolvimento, sem carregar essas empresas em cada mapa. O pequeno JSON entra no pacote estático e funciona offline.

O gerador aceita referências explícitas de bairro. Na ausência delas, exige pelo menos três coordenadas distintas de lote, quadra ou número na rua, calcula uma mediana para escolher um ponto existente do arquivo e o apresenta como referência aproximada. Não cria coordenadas de centroides. Referências de CEP são excluídas porque podem representar uma área maior ou toda a cidade.

Nomes sem posição permanecem na lista pesquisável, com a informação de que sua localização ainda não está confirmada. Nenhum desses nomes recebe um ponto fictício. Grafias com acentos, zeros à esquerda, etapas romanas e os setores do Parque da Barragem são normalizados sem juntar etapas diferentes. O nome municipal é preservado quando há correspondência.

Para regenerar: `node scripts/city-neighborhoods.mjs`. Revise a origem e a precisão antes de ampliar as referências. A camada não é usada para geocodificar casas, inferir entradas ou calcular rotas até um bairro. GPS e roteamento permanecem separados desses rótulos cartográficos.
