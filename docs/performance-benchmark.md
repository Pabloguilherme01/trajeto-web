# Benchmark de validação — Trajeto

**Data:** 18 de agosto de 2026.  
**Escopo:** rodada de velocidade, experiência mobile, recomendação explicável e funil agregado.

| Medida | Resultado | Evidência |
|---|---:|---|
| Checagem de tipos | Aprovada | `pnpm check` |
| Suíte automatizada | 72 testes aprovados; 2 integrações ao vivo ignoradas por exigirem credencial | `pnpm test` |
| Duração da suíte | 1,98 s | execução final local |
| Build de produção | Aprovado em 2,64 s | `pnpm build` |
| Chunk do planejador | 101,42 kB; 15,14 kB gzip | saída do build |
| Chunk do mapa adiado | 2,18 kB; 1,20 kB gzip | saída do build |

O SDK de mapas é solicitado apenas quando o contêiner do mapa se aproxima do viewport, e os detalhes de um posto são deduplicados enquanto estiverem em trânsito. A paginação do Google Places usa backoff curto e limitado para o token de próxima página, em vez de espera fixa. O cache persistente contém exclusivamente `placeId` e expiração máxima de 30 dias; preços, horários, avaliações e resultados do Google não são persistidos.

Foram feitas inspeções visuais em desktop (1280×720) e mobile (375×812) para o planejador e o painel operacional. A tentativa de auditoria Lighthouse não gerou pintura confiável no navegador do ambiente; portanto, não há pontuação Lighthouse declarada neste documento.

## Limites de interpretação

As métricas de build são de artefatos locais, não uma medição de usuário real. A taxa e a velocidade de conversão devem ser acompanhadas no painel pelo funil de eventos agregados, sem dados identificáveis. O cálculo de economia líquida aparece somente quando existe referência oficial de gasolina, desvio calculado em rota real e consumo declarado.
