# Auditoria de links da Central de Serviços

O catálogo de serviços públicos utiliza URLs e datas declaradas em `client/src/lib/publicServices.ts`. Essa auditoria **não corrige os cadastros automaticamente** e não deve transformar falhas de conexão temporárias em remoções de serviços.

## Verificação estática (CI, sem rede)

```sh
npm run audit:service-links
```

Verifica IDs duplicados, esquemas inseguros, URLs inválidas e endereços locais. Contabiliza links compartilhados entre várias fichas sem tratá-los como duplicações de serviços. Mostra quantas fichas não possuem `sourceCheckedAt`, sem inventar datas. É executada no CI sem consultar URLs externas.

## Conferência HTTP explicitamente solicitada

```sh
npm run audit:service-links -- --live --limit=30 --json > service-links-review.json
```

Consulta **somente** os primeiros 30 links públicos únicos com HEAD e fallback GET quando necessário, sequencialmente, timeout de 8 segundos por URL. Para conferir mais, aumente `--limit`; nenhuma consulta HTTP acontece sem `--live`.

O relatório JSON inclui horário da checagem, links, órgãos declarados, IDs de fichas, status HTTP, hostname final e classificação. `not-found` significa HTTP 404/410 e requer confirmação; `restricted` cobre bloqueios de acesso ou limitação (401, 403, 429); `unverified` cobre falhas e indisponibilidade de rede. Um redirecionamento não comprova que o conteúdo final continua correto.

Não altere telefones, nomes, endereços ou links por um único resultado HTTP. Confira a página oficial e registre origem e data no catálogo antes de propor correção. Não envie localização de usuários, dados pessoais ou consultas privadas a esse processo.
