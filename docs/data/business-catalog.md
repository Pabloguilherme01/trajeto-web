# Catálogo de empresas de Águas Lindas

Importado em 2026-10-03 do arquivo `empresas_cnpj_ativas.csv`, fornecido pelo usuário.
SHA-256: `0847eb84cdbcbfd0300db329222f94571ab001e557c84fbf7083560c9dccd5d8`.

21.486 CNPJs únicos, todos com situação Ativa no arquivo. A situação atual não foi confirmada independentemente. 21.319 registros contêm coordenadas; 167 não têm localização e permanecem disponíveis pelo endereço. A indicação de CNEFE e a precisão são metadados do arquivo, sem verificação independente da entrada do estabelecimento.

Precisão informada: 11.628 lote, 3.846 quadra, 5.323 CEP, 499 bairro, 23 número na rua e 167 não localizado. Todos os pontos importados são apresentados como referências aproximadas. Um CNPJ registrado pode corresponder a uma residência, escritório ou endereço fiscal, e não implica atendimento presencial ou horário de funcionamento.

Campos usados: CNPJ, nomes, setor, CNAE, atividade, endereço completo, coordenadas, precisão, abertura, data da situação, porte, MEI, Simples e natureza jurídica. Telefone, e-mail e capital não são publicados neste catálogo de navegação. Não há atribuição de coordenadas ausentes, conversão em rotas pelas ruas ou junção de filiais pelo nome.

Os 38 arquivos em `client/src/data/businesses` usam dicionários de strings e linhas de 17 colunas, na ordem acima implementada em `businessCatalog.ts`. São carregados por importação dinâmica. O manifesto de Vite inclui os fragmentos, e o service worker existente só prepara o pacote depois de salvá-los. O catálogo funciona após a preparação online inicial, sem API comercial. Falhas no carregamento permitem tentar novamente sem impedir os destinos existentes.

O mapa mostra até 200 pontos da busca e pagina 24 fichas por vez; todos os CNPJs permanecem pesquisáveis. A escolha explícita no planejador utiliza as coordenadas da ficha. A resolução por nome é exata e exige um único CNPJ com coordenadas; endereço ou bairro compartilhado nunca resolve uma empresa automaticamente.

O acompanhamento GPS permanece local. A velocidade exige três amostras precisas consecutivas e utiliza a média das últimas cinco; posição antiga, fora da rota ou velocidade inválida desativa essa estimativa. O tempo é uma estimativa pela velocidade atual, sem previsão de trânsito, sem horários de ônibus e sem garantia de caminho transitável para as linhas locais entre coordenadas.
