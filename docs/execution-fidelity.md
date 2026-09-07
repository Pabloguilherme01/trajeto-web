# Fidelidade de Execução do Trajeto

## Visão Geral

Este documento lista os elementos essenciais do Trajeto que **não podem ser quebrados** durante o desenvolvimento. São princípios e regras que garantem a integridade do produto, privacidade dos usuários e confiabilidade das informações.

---

## 1. Correspondência Conservadora Google Maps × ANP

### Princípio

Preço só deve ser vinculado a um posto quando houver **correspondência provável** entre o lugar do Google Maps e o cadastro da ANP.

### Regras

- ✅ Vincular preço quando:
  - `placeId` do Google corresponder ao `authorization` da ANP via mapeamento explícito
  - Nome do posto e endereço forem altamente similares (similaridade > 85%)
  - Município e estado coincidirem exatamente

- ❌ Não vincular preço quando:
  - Houver ambiguidade no nome (ex: "Posto Silva" vs "Posto Silva Jr")
  - Endereços forem significativamente diferentes
  - Município ou estado não coincidirem
  - Apenas o bairro for similar, mas outros campos divergirem

### Casos Incertos

Casos incertos devem permanecer como **unresolved** e **não** receber preço vinculado.

```typescript
// Exemplo: verificação conservadora
if (!isConservativeMatch(googlePlace, anpStation)) {
  // Manter como unresolved, não inventar vínculo
  return { matched: false, reason: "ambiguous" };
}
```

---

## 2. Limite de Candidatos para Cálculo de Desvio Real

### Princípio

Para evitar custo excessivo na Directions API, calcular desvio real apenas para **no máximo 3 candidatos** com preço referenciado.

### Regras

- Máximo de **3 candidatos** elegíveis para cálculo de desvio real
- Candidatos devem ter **preço referenciado** (gasolina ou etanol)
- Ordenação por score combinado (preço + proximidade + rating)
- Sem preço referenciado = sem cálculo de desvio real

### Justificativa

Cada cálculo de desvio real consome 1 chamada à Directions API. Limitar a 3 candidatos:
- Controla custos operacionais
- Mantém tempo de resposta aceitável (< 10s)
- Foca nos postos mais relevantes para o usuário

---

## 3. Transparência do Desvio

### Princípio

A interface deve **diferenciar claramente** desvio real de desvio aproximado.

### Definições

| Tipo | Método | Precisão | Custo |
|------|--------|----------|-------|
| **Desvio Real** | Directions API com waypoint | Alta (rota calculada) | 1 chamada API |
| **Desvio Estimado** | Aproximação geométrica | Média (baseada em distância euclidiana) | Gratuito |

### Requisitos de UI

- ✅ Explicitar método usado: "Desvio calculado via rota" vs "Desvio estimado"
- ✅ Mostrar margem de erro quando aplicável
- ✅ Não apresentar estimativa como se fosse cálculo exato
- ✅ Tooltip ou texto curto explicando o método

### Exemplo de Texto

> **Desvio:** 2,3 km (calculado via rota)  
> *O desvio foi calculado usando a rota real com o posto como parada.*

> **Desvio:** ~3 km (estimado)  
> *O desvio é uma aproximação baseada na distância até a rota principal.*

---

## 4. Política de Consentimento

### Princípio

Consentimento de localização deve ser **opcional** e decisões devem ser registradas quando aceitas.

### Regras

- ✅ Localização é **opt-in**, nunca obrigatória
- ✅ Usuário pode usar o planner sem compartilhar localização
- ✅ Decisões de consentimento são registradas em `consent_events`
- ✅ Finalidade do consentimento deve ser explícita (ex: "route_alerts", "location")

### Campos Registrados

```typescript
type ConsentEvent = {
  purpose: "sms_auth" | "route_alerts" | "location";
  accepted: boolean;
  phoneDigest?: string;     // Hash do telefone, nunca o número cru
  phoneLast4?: string;      // Apenas últimos 4 dígitos
  policyVersion: string;
  capturedAt: Date;
};
```

### Proibições

- ❌ Nunca coletar localização sem consentimento explícito
- ❌ Nunca condicionar funcionalidades básicas ao consentimento
- ❌ Nunca armazenar coordenadas exatas associadas a identidade

---

## 5. Saúde de Provedores

### Princípio

Métricas de provedores devem ser **agregadas**, sem dados pessoais, com thresholds visíveis no painel.

### Thresholds Atuais

```typescript
const PROVIDER_HEALTH_THRESHOLDS = {
  minimumSamples: 3,        // Mínimo para classificar
  attentionP95Ms: 1500,     // p95 para atenção
  alertP95Ms: 3000,         // p95 para alerta
  attentionSuccessRate: 99, // Taxa de sucesso para atenção
  alertSuccessRate: 95,     // Taxa de sucesso para alerta
} as const;
```

### Classificações

| Estado | Condição | Ação |
|--------|----------|------|
| `healthy` | p95 < 1500ms E sucesso ≥ 99% | Operação normal |
| `attention` | p95 ≥ 1500ms OU sucesso < 99% | Monitorar tendência |
| `alert` | p95 ≥ 3000ms OU sucesso < 95% | Investigar imediatamente |
| `observing` | amostras < 3 | Aguardar mais dados |

### Dados Registrados

```typescript
type ProviderMetricSample = {
  provider: "google_maps" | "tomtom" | "anp";
  operation: string;        // Ex: "directions_base", "geocode_origin"
  durationMs: number;
  success: boolean;
  statusCode?: number;
  createdAt: Date;
  // ❌ SEM dados pessoais, IPs, parâmetros de busca
};
```

---

## 6. Sincronização ANP

### Princípio

Origem e data de coleta devem ser preservadas. Fallback deve ser transparente. **Não transformar referência semanal em preço em tempo real.**

### Regras

- ✅ Preservar `collectedAt` de cada snapshot de preço
- ✅ Manter `sourceReference` apontando para URL/planilha original
- ✅ Registrar status de sincronização: `updated`, `fallback`, `failed`
- ✅ Explicitar na UI que preços são referência semanal, não tempo real

### Fallback Transparente

Quando a sincronização falhar:
1. Usar última versão válida conhecida
2. Marcar status como `fallback`
3. Exibir aviso na UI: "Dados atualizados em DD/MM/AAAA"
4. Não apresentar como "preço atual"

### Proibições

- ❌ Nunca afirmar que preços são em tempo real
- ❌ Nunca omitir data de coleta
- ❌ Nunca usar dados fallback sem indicar limitação
- ❌ Nunca misturar fontes (ANP + crowdsourcing) sem rotulagem clara

---

## 7. Recomendação de Posto

### Princípio

**Não inventar preço.** Não recomendar posto sem referência confiável. Mostrar racional da recomendação.

### Regras

- ✅ Somente postos com preço referenciado entram na recomendação final
- ✅ Pontuação deve ser auditável (pesos explícitos)
- ✅ `recommendationDiagnostics` deve incluir:
  - `requestedCandidates`: quantos candidatos foram considerados
  - `pricedCandidates`: quantos tinham preço referenciado
  - `realDetoursCalculated`: quantos desvios reais foram calculados
  - `estimatedDetoursUsed`: quantos usaram estimativa
  - `anpMatchedStops`: quantos postos tiveram match com ANP
  - `unresolvedStops`: quantos permaneceram sem preço
  - `recommendationSource`: "real" | "estimated" | "none"

### Pesos Padrão

```typescript
type RecommendationWeights = {
  priceWeight: number;      // 0-100, padrão: 70
  distanceWeight: number;   // derivado: 100 - priceWeight
};
```

### Proibições

- ❌ Nunca recomendar posto sem preço de referência
- ❌ Nunca ocultar critério de ordenação
- ❌ Nunca apresentar estimativa como cálculo exato
- ❌ Nunca usar dados pessoais para personalizar recomendação

---

## 8. Privacidade e Dados Pessoais

### Princípio

Eventos e métricas devem ser **agregados**. Nunca registrar dados pessoais sensíveis.

### Dados Proibidos em Eventos/Métricas

- ❌ Telefone completo
- ❌ Placa de veículo
- ❌ E-mail
- ❌ Endereço residencial completo
- ❌ Coordenadas exatas de origem/destino do usuário
- ❌ Identidade individual (userId em logs públicos)

### Dados Permitidos (Agregados)

- ✅ `region`: município ou estado
- ✅ `entityId`: placeId do posto (não pessoal)
- ✅ `event`: tipo de evento
- ✅ `createdAt`: timestamp
- ✅ Contagens e percentuais agregados

---

## Checklist de Revisão (Pre-Merge)

Antes de fazer merge de qualquer alteração significativa, verificar:

### Métricas e Dados

- [ ] As métricas exibidas têm fórmula documentada?
- [ ] Os eventos são agregados (sem dados pessoais)?
- [ ] A recomendação usa apenas dados verificáveis?
- [ ] O fallback de provedores está explícito?

### Segurança e Privacidade

- [ ] Não há credenciais expostas no código?
- [ ] Não há coleta de dados pessoais desnecessária?
- [ ] Rate limiting está implementado para endpoints críticos?
- [ ] Endpoints administrativos estão protegidos?

### Qualidade Técnica

- [ ] `pnpm check` passa sem erros?
- [ ] `pnpm test` passa todos os testes?
- [ ] `pnpm build` funciona?
- [ ] Migração de banco foi documentada (se aplicável)?

### UX e Interface

- [ ] A UI mantém padrão visual existente?
- [ ] Estados de loading, erro e vazio estão tratados?
- [ ] Textos estão em português?
- [ ] Responsividade mobile foi testada?

### Fidelidade ao Produto

- [ ] Preços ANP continuam sendo referência, não oferta garantida?
- [ ] Desvio real vs estimado está diferenciado?
- [ ] Consentimento permanece opcional?
- [ ] Correspondência Google × ANP é conservadora?

---

## Violações Críticas

As seguintes violações **bloqueiam** o merge:

1. **Exposição de credenciais** no código ou logs
2. **Coleta de dados pessoais** sem consentimento ou necessidade
3. **Preço inventado** ou apresentado como tempo real
4. **Recomendação sem referência** de preço confiável
5. **Quebra de autenticação** ou proteção administrativa
6. **Falha em testes críticos** (routePlanner, productMetrics, rateLimit)

---

## Histórico de Revisões

| Data | Versão | Alteração | Responsável |
|------|--------|-----------|-------------|
| 2026-01-XX | 1.0 | Criação do documento | Engenharia |

---

*Documento complementar a `docs/metrics-alignment.md`. Leitura conjunta recomendada.*
