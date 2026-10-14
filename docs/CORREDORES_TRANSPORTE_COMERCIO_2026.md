# Levantamento inicial: corredores, ônibus, comércio e serviços de Águas Lindas

**Data da pesquisa:** 14/10/2026. **Status:** cobertura inicial, nunca "mapa completo/tempo real".
Este documento registra a proveniência dos dados expostos em `/mapa` nas camadas
**Ruas e avenidas** e **Transporte**.

## 1. O que está comprovado

| Conjunto | Evidência | Uso seguro |
| --- | --- | --- |
| Hierarquia viária | Lei municipal 341/2002, arts. 78–82 | Corredores e nome de vias como referência **histórica**, não prova de fluxo atual |
| Transporte semiurbano GO–DF | ANTT: informações operacionais, quadros de horários e relação de linhas/tarifas | Ligações regionais com Brasília, Brazlândia, Ceilândia e Taguatinga; consultar linha e quadro atualizado |
| Tarifas Taguatur | Comunicado ANTT, efeitos a partir de 28/06/2026 | Referência histórica publicada: Taguatinga R$ 7,65; Ceilândia R$ 5,85; pode mudar |
| Proximidade de ônibus na Av. JK | Moovit (consulta 14/10/2026, página com atualização de setembro/2026) | Linhas relatadas **perto** da avenida: 100, 2304, 2402, 2424, 2862. **Não** afirmar que percorrem a via |
| Comércio | Catálogo local já importado, ~21.486 registros CNPJ | Cruzar nome da via **dentro do endereço**; distinguir nome legível de cadastro só com CNPJ |
| Serviços públicos | Diretório `PUBLIC_SERVICES`, fontes municipais e oficiais por ficha | Cruzar apenas endereço textual, mostrar nome/endereço/fonte, sem criar coordenadas |
| Ruas e bairros | Snapshot municipal e mapa offline OSM, referências aproximadas | Pesquisa por nome; geometrias de ruas não provam trajeto de ônibus |

### Fontes

- Lei 341/2002: https://legislacao.aguaslindasdegoias.go.gov.br/leis/394
- ANTT dados operacionais: https://www.gov.br/antt/pt-br/assuntos/passageiros/transportesemiurbano/informacoes-operacionais-do-semiurbano
- ANTT relação de linhas e tarifas: https://www.gov.br/antt/pt-br/assuntos/passageiros/transportesemiurbano/informacoes-operacionais-do-semiurbano/relacao-de-empresas-linhas-e-tarifas
- ANTT quadro de horários: https://www.gov.br/antt/pt-br/assuntos/passageiros/transportesemiurbano/informacoes-operacionais-do-semiurbano/quadro-de-horarios
- ANTT comunicado Taguatur: https://www.gov.br/antt/pt-br/assuntos/noticias-defeso-eleitoral/entorno-do-df-novas-tarifas-da-taguatur-entram-em-vigor-a-partir-de-28-de-junho
- Moovit Av. JK: https://moovitapp.com/index/pt-br/transporte_p%C3%BAblico-Avenida_Jk-Brasilia-street_12895751-1702
- Prefeitura, unidades de saúde: https://aguaslindasdegoias.go.gov.br/unidades-de-saude/
- Prefeitura, escolas municipais: https://aguaslindasdegoias.go.gov.br/escolas-municipais-de-aguas-lindas-de-goias/
- CNES do município: https://cnes2.datasus.gov.br/Lista_Es_Municipio.asp?NomeEstado=&VCodMunicipio=520025&VEstado=52

## 2. Como é feito o cruzamento de comércio/serviços por corredor

- O texto da rua é normalizado para variações `Av.` → `Avenida`, acentos e zeros numéricos.
- Correspondência por **nome completo de rua no endereço**, com limites de palavra; `Avenida 1` não casa com `Avenida 10` nem `Av. 1B`.
- O resultado é prova de **menção textual no endereço**, não de entrada física na avenida, de acesso comercial, de endereço cadastral atualizado nem de proximidade em metros.
- Registros exclusivamente CNPJ contam **separadamente**; nunca são promovidos a pinos sem nome nem coordenada de entrada.
- Não duplicar empresas ou serviços simplesmente porque têm CNPJ/CEP no mesmo setor.
- A lista comercial é opcional e só é analisada depois de carregada pelo mapa. Sem carga, mostrar "não carregado", nunca zero.

## 3. Lacunas que impedem declarar um mapeamento completo

1. **Traçado e paradas de ônibus por avenida:** obter GTFS com `routes.txt`, `trips.txt`, `shapes.txt`, `stops.txt`, `stop_times.txt` ou outra geometria oficial aprovada e datada. Cruzar trecho geométrico com via OSM; não projetar linha apenas pelos pares origem/destino.
2. **Operação atual:** validar prefixo, empresa, frequência, tarifa, sentido, dias úteis/fim de semana, data de atualização e alterações operacionais junto à ANTT e operadoras; distinguir semiurbano interestadual de eventual ônibus local municipal.
3. **Comércio completo:** tratar endereços faltantes, estabelecimentos encerrados, filiais e atividades CNAE; checar nome fantasia, porta e endereço com fonte pública ou inspeção de campo; não equiparar 21.486 cadastros a 21.486 lojas abertas.
4. **Serviços públicos completos:** confrontar unidades no CNES, escolas da prefeitura/Inep, CRAS/CREAS, assistência e atendimento; anotar atendimento físico versus serviços apenas digitais, fonte, data, bairro e ausência de coordenada.
5. **Fluxo efetivo:** requer contagem de veículos/passageiros ou dado OD oficial. Uma via principal na lei ou muitos CNPJs nela não medem tráfego.
6. **Teste em campo:** confirmar em Android/iOS físicos, telefone simples, modo avião, zoom, leitura a 320 px, localização pessoal não persistida nem compartilhada e reabertura da PWA.

## 4. Próximo ciclo de dados

Construir um importador auditável de linhas/paradas oficiais (sem depender de API paga),
com relatório de cobertura por corredor e data de atualização; somente depois adicionar
pontos de ônibus e linhas **pelas ruas**. Revisar individualmente os dados importados
antes de publicar geometria, sem fazer requisições de GPS do usuário.

### Critérios de aceite

- Nenhuma linha é posicionada em avenida sem itinerário georreferenciado;
- Nenhum CNPJ sozinho ganha marcador;
- Cadastro sem endereço confiável continua pesquisável, sem marcador falso;
- Contagem de estabelecimentos nunca é anunciada como levantamento censitário;
- CI, testes móveis, responsividade e smoke GitHub Pages precisam estar verdes antes do merge.
