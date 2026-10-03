# Governança de merges e publicação

## Gates executáveis

O deploy do Pages chama CI, Security, CodeQL e Responsive browsers como workflows reutilizáveis. O build depende da aprovação dos quatro no mesmo ref/SHA, e o deploy depende do build. Execuções manuais fora de main não publicam. Alterações do workflow também precisam de revisão humana: gates no código não substituem proteção nativa.

A sincronização ANP abre um PR da branch automation/anp-snapshot, modifica somente os dois snapshots e não faz push na main nem merge automático. Um PR pendente impede novas atualizações até sua revisão. A branch de automação pode ser atualizada com force-with-lease após uma rodada anterior; main nunca recebe force push. Checkout usa main explicitamente.

## Configuração manual do GitHub — issue #149

Em Settings > Rules > Rulesets, criar regra ativa para refs/heads/main (ou proteção clássica equivalente):

- Exigir Pull Request e resolução das conversas.
- Exigir checks quality, audit, Analyze TypeScript (javascript-typescript) e responsive, com origem GitHub Actions.
- Exigir branch atualizada com main antes do merge.
- Bloquear push direto, force push e exclusão de main.
- Aplicar aos administradores e não conceder bypass permanente à automação ANP.
- Preferir squash; desabilitar merge commit/rebase se squash for obrigatório.
- Exigir uma aprovação independente quando houver revisor disponível.

Os jobs reutilizados no deploy também produzem checks com prefixos próprios; selecionar os checks originais do PR acima, não build/deploy. Não renomear jobs sem atualizar a proteção.

Em Settings > Actions > General, habilitar Allow GitHub Actions to create and approve pull requests. A automação só cria PRs: não aprova nem integra. PRs criados com GITHUB_TOKEN podem exigir aprovação das execuções; confirmar os quatro checks no head antes do merge. Se a opção estiver desabilitada, a execução falha explicitamente e main permanece intacta.

Confirmar Secret scanning, Push protection e Dependency Graph. Dependency Review é condicional e não deve ser tratado como análise executada quando o job estiver skipped. Para bloquear alertas CodeQL por severidade, configurar também a regra administrativa de resultados de code scanning; sucesso do job de análise não equivale a ausência de alertas.

## Evidência de conclusão administrativa

Não encerrar #149 só porque uma PR passou. Registrar regra ativa, alvo main, checks exigidos e ausência de bypass; confirmar protected=true pela API e que um PR sem checks aprovados não oferece merge. Não realizar push destrutivo para testar a regra.
