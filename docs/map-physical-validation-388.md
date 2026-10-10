# Validação física do mapa — PR #388

Status: **pendente de execução em aparelho físico**. Este roteiro não declara ganho de latência, FPS ou memória medido.

Referências: [PR #388](https://github.com/Pabloguilherme01/trajeto-web/pull/388), [benchmarks anteriores](performance-benchmark.md) e [governança de merges](MERGE_GOVERNANCE.md).

## Evidência já disponível

A PR remove arrays intermediários grandes da amostragem, reutiliza índices de categorias por identidade do catálogo e memoriza o agrupamento ANP por identidade dos dados. Testes adicionados verificam ordem, categorias, reutilização das listas, contagem e equivalência dos IDs selecionados com 21.486 empresas, marcos e IDs repetidos, mantendo até 200 marcadores.

No head `4cfd67ac585e086d5b0546d947e1f46f28ac774c`, CI, Mobile QA, Responsive browsers, Security e CodeQL concluíram com sucesso. Dependency Review ficou skipped. Esses resultados não equivalem a um benchmark físico nem, no caso de CodeQL, comprovam ausência de alertas.

O processamento ainda percorre candidatos e constrói um Map de deduplicação; a busca textual continua processando o catálogo. O teto de 200 marcadores limita a seleção renderizada, não todo o trabalho a 200 registros. O cache pressupõe catálogo imutável; ao substituir os dados, usar nova identidade de array.

## Matriz de validação

P0: executar antes de afirmar ganho perceptível. P1: verificar estabilidade em uso prolongado.

| Cenário e roteiro | Cobertura da PR | Métricas em aparelho físico | Prioridade |
|---|---|---|---|
| Abrir mapa com catálogo completo, cache frio; repetir também com cache quente | Elimina dois arrays grandes do seletor; preserva total e amostra | Tempo até mapa interativo; tarefas >50 ms; pico de memória; pausas de GC; custo inicial dos índices | P0 |
| Alternar todos → compras → serviços → todos por 20 ciclos sem busca | Reutiliza listas de categorias; testes verificam ordem e identidade | Latência toque → atualização p50/p95; alocações; GC; memória retida | P0 |
| Digitar e apagar a mesma consulta de 10 caracteres por 10 ciclos, com intervalo de aproximadamente 100 ms por tecla | ANP não é reagrupada se os dados mantêm identidade; busca/filtros continuam ativos | Latência tecla → resultado p50/p95; tarefas longas; frames perdidos | P0 |
| Arrastar e aplicar zoom por 60 s, depois tocar 10 marcadores, com 200 visíveis | Preserva teto e IDs da seleção | FPS sustentado; tempo de frame p95; frames perdidos; latência de toque | P0 |
| Repetir navegação, filtros e busca por 15 min; comparar início e fim | WeakMap permite coleta quando a chave perde referências; não garante memória estável | Tendência de memória; GC; travamentos/recargas; degradação térmica | P1 |

## Comparação reproduzível

1. Comparar builds de produção da base `5194f5edd7389df2422ec6bef9968a52c8699bbe` e do head `4cfd67ac585e086d5b0546d947e1f46f28ac774c`. Registrar SHA de cada build; não comparar desenvolvimento com produção.
2. Usar o mesmo celular modesto e registrar modelo, RAM, sistema, navegador/versão, taxa de atualização, modo navegador/PWA, bateria, economia de energia e condição térmica. Desativar limitação artificial de CPU: emulação não substitui o aparelho.
3. Manter catálogo, snapshot ANP, consultas, categorias, gestos e rede iguais. Registrar a contagem real de candidatos e marcadores. Alternar a ordem das versões e deixar o aparelho esfriar entre rodadas.
4. Isolar as versões em perfis/origens separados ou remover o service worker e dados de teste entre versões; confirmar o build carregado. Usar apenas perfil de teste, preservando dados pessoais e rotas salvas do usuário.
5. Separar cache frio (primeira visita no perfil limpo) de cache quente (dados carregados e índice já construído). Fazer pelo menos cinco rodadas por versão/condição e registrar amostras individuais; p95 de abertura com cinco amostras é apenas exploratório.
6. Coletar trace no profiler do navegador conectado ao aparelho para CPU, frames e GC. Medir interações desde o evento até a atualização visual correspondente; FPS isolado não substitui latência. Informar quando uma métrica de memória/GC não estiver disponível.
7. Fazer também uma rodada sem profiler para conferir o efeito da instrumentação. Testar offline após preparação de ambas as versões separadamente; não exigir download inicial sem rede.
8. Verificar em cada cenário resultados, ordem, contagem, limite de 200 e ações dos marcadores. Qualquer regressão funcional impede aprovação, mesmo com melhora de desempenho.

## Registro e decisão

| Aparelho / versão / SHA | Cenário / cache / rede | Rodadas e amostras | Base | PR | Variação | Trace / observações | Status |
|---|---|---|---|---|---|---|---|
| A preencher | A preencher | A preencher | Não medido | Não medido | Não calculada | A preencher | Pendente |

Para latência e memória, calcular variação percentual como `(PR - base) / base × 100`; valores negativos indicam redução. Para FPS, valores positivos indicam aumento. Registrar unidades e a variabilidade entre rodadas; não declarar ganho quando a diferença estiver dentro dessa variabilidade. Não interpretar heap JS como memória total do processo.

Aprovação requer ausência de regressão funcional e nenhuma piora consistente nas métricas P0. Se houver regressão repetível, anexar trace e investigar antes de recomendar novas otimizações. Concluir P1 antes de afirmar estabilidade prolongada. Qualquer meta numérica de ganho deve ser definida previamente e acompanhada dos resultados; esta matriz não inventa um percentual esperado.

## Verificação de alterações futuras

Manter os gates existentes: `npm run check`, `npm test`, `npm run build`, E2E/responsividade e os workflows obrigatórios. Não substituir os testes de regressão por medições físicas nem tratar CI aprovado como comprovação de FPS.

Este roteiro é documentação; não adiciona telemetria, dependências, mudanças de runtime ou novos bloqueios automáticos de CI.
