# Continuidade da auditoria crítica — 09/10/2026

## Correções implementadas
- A PR #363 impede anunciar offline completo quando um snapshot é HTML.
- A PR #366 limita transações de rotas, mantém migração/gravação/poda atômicas e corrige a importação da fonte ANP.
- A PR #367 migra ferramentas e amplia a auditoria de segurança à cadeia de desenvolvimento.
- Este pacote retira os 38 chunks comerciais do install. Mantém as telas e seus demais imports, ANP e preços. Preparar acesso offline continua salvando o manifesto completo.
- Uma atualização que encontra todas as partes comerciais na versão antiga prepara as novas partes antes de aposentar a versão anterior. Uma falha deixa o worker anterior ativo.
- Ajuda informa se o catálogo comercial está disponível offline. Busca comercial sem preparação não é prometida.
- A Central mantém a interface e seus contratos, com definições e fichas extraídas em módulos próprios. Datas de conferência ausentes são informadas explicitamente.
- A suíte valida IDs únicos, URLs HTTPS sem credenciais e datas registradas válidas em todo o catálogo. Isso não atesta a atualidade de um telefone nem a entrada física.

## Medição reproduzível do build
No build Pages desta árvore: 68 assets / 8.523.787 bytes no manifesto completo; 30 assets / 3.075.296 bytes na instalação; economia de 5.448.491 bytes brutos (~64%). Valores não incluem os snapshots, ícones ou storage de rotas, nem medem transferência real/compressão do Pages.

## Regressões
- Separação de partes comerciais sem remover dependências de telas.
- Disponibilidade comercial falsa antes da preparação e verdadeira após commit em cache.
- Atualização de catálogo preparado, incluindo falha de rede sem descarte dos caches antigos.
- E2E de instalação sem partes comerciais, preparação completa e abertura offline.
- E2E de atualização de worker seguido de consulta offline por CNPJ.
- Percurso existente com empresa como destino e os quatro modos de viagem, após preparação explícita.

## Limites restantes
A refatoração deste pacote se restringe à Central de Serviços; Planner, Stations e os canvases ainda exigem trabalho gradual de manutenção. Nenhuma coordenada aproximada foi promovida a entrada verificada. A verificação presencial de contatos/entradas e medições de FPS/memória/instalação em Android físico continuam pendentes; não é possível realizá-las no ambiente remoto.

O download local do Chromium retornou arquivo inválido. Os testes de navegador precisam passar nos workflows do novo commit; resultados de outras PRs não aprovam este pacote.
