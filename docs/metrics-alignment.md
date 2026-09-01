# Alinhamento Estratégico e Métricas do Trajeto

## 1. Objetivo Estratégico

**Ajudar usuários do Entorno do DF a planejar rotas com postos confiáveis, referência oficial de preço e menor desvio.**

O Trajeto é uma plataforma web de consulta de postos e planejamento de rotas para Águas Lindas de Goiás, Distrito Federal e Entorno. O produto combina dados do Google Maps, referências de preço da ANP e informações de trânsito da TomTom para permitir decisões informadas sobre abastecimento.

## 2. North Star Metric

**Rotas pesquisadas que geram solicitação de resgate ou uso efetivo da recomendação.**

Esta métrica captura o valor central do produto: não basta pesquisar rotas, o usuário precisa encontrar utilidade prática na recomendação (seja solicitando resgate no posto recomendado, seja usando a referência de preço para tomar decisão).

## 3. OKRs Trimestrais Sugeridos

### Objetivo: Aumentar a utilidade do planejador de rotas

**KR1:** Aumentar a conversão de rota pesquisada → resgate solicitado de X% para Y%
- Linha de base: medir conversão atual no painel Operations
- Meta sugerida: +20% em relação à linha de base

**KR2:** Aumentar a cobertura de referências ANP vinculadas às paradas exibidas de X% para Y%
- Linha de base: `cobertura ANP = paradas com preço ANP / paradas exibidas`
- Meta sugerida: 60% de cobertura nas rotas pesquisadas

**KR3:** Manter provedores críticos saudáveis em latência e taxa de sucesso
- Google Maps: p95 < 1500ms, sucesso > 99%
- TomTom Traffic: p95 < 2000ms, sucesso > 95%
- ANP Sync: atualização semanal bem-sucedida

## 4. KPIs Operacionais vs OKRs Estratégicos

### Diferença Fundamental

- **KPIs (Key Performance Indicators):** Monitoram saúde e operação do produto. São métricas contínuas que indicam se o sistema está funcionando corretamente.
- **OKRs (Objectives and Key Results):** Orientam mudança e resultado estratégico. São metas trimestrais que medem progresso em direção a objetivos de produto.

### Exemplos

| Tipo | Métrica | Finalidade |
|------|---------|------------|
| KPI | Taxa de sucesso do Google Maps | Monitorar saúde do provedor |
| KPI | p95 das requisições | Detectar degradação de performance |
| OKR | Conversão rota → resgate | Medir valor entregue ao usuário |
| OKR | Cobertura ANP | Medir qualidade da referência de preço |

## 5. KPIs Recomendados

### Métricas de Produto

1. **Total de rotas pesquisadas**
   - Fonte: tabela `route_searches`
   - Período: últimos 7, 14, 30 dias
   - Agregação: contagem por período

2. **Total de resgates solicitados**
   - Fonte: tabela `redemptions`
   - Período: últimos 7, 14, 30 dias
   - Agregação: contagem por período

3. **Conversão rota → resgate**
   - Fórmula: `resgates solicitados / rotas pesquisadas × 100`
   - Interpretação: percentual de rotas que geram ação concreta

4. **Cobertura ANP nas paradas exibidas**
   - Fórmula: `paradas com preço ANP vinculado / paradas exibidas × 100`
   - Fonte: campo `priceReference` em `stops` + diagnóstico da recomendação
   - Interpretação: qualidade da referência de preço oferecida

5. **Adoção da recomendação**
   - Fórmula: `eventos recommendation_requested / eventos recommendation_shown × 100`
   - Fonte: tabela `product_events`
   - Interpretação: utilidade percebida da recomendação

6. **Taxa de sucesso por provedor**
   - Fonte: tabela `provider_metric_samples`
   - Fórmula: `requisições bem-sucedidas / total de requisições × 100`
   - Período: últimas 24 horas

7. **p95 por provedor**
   - Fonte: tabela `provider_metric_samples`
   - Cálculo: percentil 95 de `durationMs`
   - Período: últimas 24 horas

8. **Eventos de cliques sociais agregados**
   - Fonte: tabela `product_events` (social_instagram_click, social_whatsapp_click)
   - Agregação: contagem por tipo de evento

### Métricas de Operação

9. **Última sincronização ANP**
   - Fonte: tabela `anp_sync_runs`
   - Campos: `attemptedAt`, `status`, `imported`
   - Interpretação: frescor dos dados de preço

10. **Incidentes de trânsito notificados**
    - Fonte: tabela `traffic_notifications`
    - Agregação: contagem por corredor, severidade

## 6. Fórmulas das Métricas

| Métrica | Fórmula | Tratamento de Borda |
|---------|---------|---------------------|
| Conversão rota → resgate | `redemptions / route_searches × 100` | Retorna 0 se route_searches = 0 |
| Cobertura ANP | `priced_stops / total_stops × 100` | Retorna 0 se total_stops = 0 |
| Adoção da recomendação | `recommendation_requested / recommendation_shown × 100` | Retorna 0 se recommendation_shown = 0 |
| Taxa de sucesso | `success_samples / total_samples × 100` | Retorna 0 se total_samples = 0 |
| p95 | `percentil_95(durationMs)` | Retorna null se samples < 3 |

## 7. Fonte de Dados de Cada Métrica

| Métrica | Tabela/Origem | Campos Utilizados |
|---------|---------------|-------------------|
| Rotas pesquisadas | `route_searches` | `id`, `createdAt` |
| Resgates solicitados | `redemptions` | `id`, `requestedAt`, `routeSearchId` |
| Eventos de produto | `product_events` | `event`, `createdAt`, `region` |
| Saúde de provedores | `provider_metric_samples` | `provider`, `operation`, `durationMs`, `success`, `statusCode`, `createdAt` |
| Preços ANP | `fuel_price_snapshots` | `placeId`, `product`, `price`, `collectedAt` |
| Sincronização ANP | `anp_sync_runs` | `dataset`, `status`, `imported`, `attemptedAt` |

## 8. Periodicidade de Revisão

- **Revisão operacional (KPIs):** Semanal
  - Saúde de provedores
  - Taxa de erro e latência
  - Sincronização ANP

- **Revisão estratégica (OKRs):** Quinzenal
  - Conversão rota → resgate
  - Cobertura ANP
  - Adoção da recomendação

- **Revisão trimestral:** Completa
  - Avaliação de OKRs
  - Definição de novos objetivos
  - Ajuste de metas

## 9. Responsáveis Sugeridos

| Área | Responsabilidade | Métricas Primárias |
|------|------------------|-------------------|
| **Produto** | Definição de OKRs, análise de conversão | Conversão, adoção, cobertura ANP |
| **Operação** | Acompanhamento de resgates, sincronização ANP | Resgates, última sync ANP |
| **Engenharia** | Saúde de provedores, qualidade técnica | p95, taxa de sucesso, erros |
| **Design/UX** | Usabilidade do planner, clareza da recomendação | Eventos de interação, feedback |

## 10. Critérios de Alerta

### Provedores

| Condição | Severidade | Ação Recomendada |
|----------|------------|------------------|
| p95 ≥ 3000 ms | Alerta | Investigar lentidão, considerar fallback |
| p95 ≥ 1500 ms | Atenção | Monitorar tendência |
| Sucesso < 95% | Alerta | Verificar credenciais, quota, erros |
| Sucesso < 99% | Atenção | Analisar padrões de erro |
| Amostras < 3 | Observando | Aguardar mais dados |

### Produto

| Condição | Severidade | Ação Recomendada |
|----------|------------|------------------|
| Queda abrupta de conversão (>30%) | Alerta | Investigar mudanças recentes, bugs |
| Cobertura ANP < 30% | Atenção | Priorizar importação de preços |
| Ausência de sync ANP > 14 dias | Alerta | Executar sync manual, verificar fonte |
| Zero resgates em 7 dias | Atenção | Validar fluxo de resgate, UX |

### Operação

| Condição | Severidade | Ação Recomendada |
|----------|------------|------------------|
| Resgates pendentes > 48h | Atenção | Acionar operação para follow-up |
| Erro na importação ANP | Alerta | Verificar URL, formato da planilha |

## 11. Limitações e Transparência

### Preços ANP

- **Não são preços em tempo real.** São referências semanais coletadas pela ANP.
- **Não garantem oferta.** O posto pode ter alterado o preço após a coleta.
- **Vínculo conservador.** Preço só é vinculado quando há correspondência provável entre Google Maps e cadastro ANP.

### Desvios

- **Desvio real:** Calculado via Google Directions API com posto como parada intermediária.
- **Desvio estimado:** Aproximação geométrica quando não foi possível calcular rota real.
- **Transparência:** Interface deve explicitar qual método foi usado.

### Recomendação

- **Máximo de 3 candidatos** com preço referenciado para cálculo de desvio real.
- **Sem preço inventado.** Recomendação só inclui postos com referência confiável.
- **Racional explícito.** Pontuação e pesos devem ser auditáveis.

## 12. Próximos Passos

1. Implementar camada de métricas no backend (`server/lib/productMetrics.ts`)
2. Estender painel Operations com seção "Alinhamento estratégico"
3. Instrumentar eventos de recomendação no Planner
4. Adicionar `recommendationDiagnostics` ao retorno do planner
5. Criar documentação de fidelidade de execução (`docs/execution-fidelity.md`)

---

*Documento criado em 2026-01-XX. Revisão sugerida: quinzenal.*
