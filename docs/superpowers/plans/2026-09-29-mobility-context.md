# Trajeto Mobility Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o Trajeto em uma central de mobilidade contextual sem adicionar dependências pesadas nem quebrar os fluxos atuais.

**Architecture:** Adicionar um motor local puro que sintetiza conexão, destino recorrente, última viagem, rota offline e veículo em um estado operacional. Integrar esse estado ao Centro de Hoje, corrigir a métrica de recorrência para não fingir janelas temporais e manter dados externos explicitamente separados de estimativas locais.

**Tech Stack:** React + TypeScript + Vite + Vitest + localStorage.

**Spec:** Design aprovado na conversa: Centro de Viagem, memória local, dados com procedência, modo condução, planejamento, economia, offline e consolidação visual.

## Global Constraints

- Mobile-first e visual premium.
- Zero dependências pesadas novas.
- Nenhum dado externo inventado.
- Dados locais permanecem no dispositivo.
- Alterações incrementais e compatíveis com o fluxo atual.
- Toda nova lógica pura deve ter teste.
- GitHub Pages/base path existente deve permanecer intacto.

## Review Focus

- localStorage corrompido ou ausente deve produzir estado seguro.
- navegador offline sem rota salva não pode prometer navegação.
- rota offline antiga deve ser distinguida de rota disponível.
- ausência de veículo/destino não pode quebrar o Centro de Hoje.
- recorrência deve refletir eventos realmente registrados, não dividir contagem histórica por uma janela inventada.

### Task 1: Motor de contexto local

**Files:**
- Create: `client/src/lib/mobilityContext.ts`
- Test: `client/src/lib/mobilityContext.test.ts`

**Interfaces:**
- Consumes: dados já expostos por `mobilePreferences`, destino/veículo e estado offline.
- Produces: `getMobilityContext(input)` retornando estado operacional, ação principal e checks.

- [ ] Escrever testes para estados online/offline, rota disponível e configuração incompleta.
- [ ] Implementar função pura e tipos.
- [ ] Validar testes.

### Task 2: Corrigir recorrência local

**Files:**
- Modify: `client/src/lib/mobilePreferences.ts`
- Test: `client/src/lib/mobilePreferences.test.ts` se existente; criar caso específico se necessário.

- [ ] Testar uso registrado e ausência de eventos.
- [ ] Remover a falsa interpretação de `getRouteUsageTrend` como janela temporal quando os dados não carregam timestamps.
- [ ] Manter compatibilidade da API pública existente.

### Task 3: Integrar o contexto ao Centro de Hoje

**Files:**
- Modify: `client/src/components/DailyCommandCenter.tsx`

- [ ] Consumir o motor de contexto sem substituir os fluxos atuais.
- [ ] Mostrar estado e ação principal derivados do contexto.
- [ ] Preservar acessibilidade, atalhos e modo offline.
- [ ] Revalidar referências e tipos.

### Task 4: Qualidade e verificação

**Files:**
- Modify somente se necessário após verificação.

- [ ] Rodar os testes disponíveis para as novas unidades.
- [ ] Verificar os workflows do commit resultante.
- [ ] Inspecionar o diff final e corrigir qualquer regressão detectada.
- [ ] Não declarar build/CI aprovado sem evidência do GitHub Actions.
