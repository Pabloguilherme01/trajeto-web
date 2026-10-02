# Fronteiras de arquitetura do Trajeto

Este documento evita que o produto volte a misturar sem critério o núcleo público estático e os recursos full-stack opcionais.

## 1. Núcleo público obrigatório

Deve funcionar no GitHub Pages sem banco, login ou API comercial obrigatória:

- Home e busca local;
- serviços públicos e contatos verificados;
- postos e snapshots preparados;
- calculadora;
- PWA e continuidade offline;
- rotas salvas e preferências locais;
- planejamento com dados locais, caches e fallbacks públicos moderados;
- privacidade de localização por padrão.

Uma mudança que torne qualquer item acima dependente de Express, MySQL, OAuth, AWS ou provedor comercial precisa ser rejeitada ou oferecer fallback real.

## 2. Backend opcional

Express, tRPC, MySQL/Drizzle, autenticação e integrações de servidor pertencem ao modo avançado. Eles podem adicionar sincronização, conta ou recursos operacionais, mas não devem ser pré-requisito para o primeiro valor entregue ao cidadão.

## 3. Integrações externas

Classifique cada integração como:

- **essencial local**: dados versionados e processados no aparelho;
- **pública de contingência**: pode falhar, exige timeout, cache, deduplicação e circuit breaker;
- **comercial opcional**: nunca pode bloquear o núcleo gratuito;
- **navegação externa**: executada por escolha explícita do usuário.

## 4. Regra de privacidade

GPS exato deve permanecer no aparelho sempre que possível. Não colocar coordenadas precisas em URL, analytics, histórico, compartilhamento ou logs. Quando um provedor externo precisar de contexto, reduzir precisão ou deixar o app externo pedir sua própria localização.

## 5. Regra de complexidade

Preferir mudanças pequenas e independentes. Uma PR deve ter um objetivo principal e explicitar:

- quais fluxos foram alterados;
- quais dependências novas foram adicionadas;
- impacto no núcleo offline;
- impacto em privacidade;
- testes executados;
- fallback quando serviços externos falharem.

PRs que acumulam múltiplas reformulações devem ser divididas antes do merge.

## 6. Fonte de verdade

Em conflito entre documentação e comportamento, prevalecem os testes e o código atual. O README descreve a promessa do produto; este documento descreve as fronteiras arquiteturais; `docs/ZERO_COST_CORE.md` descreve o contrato de custo do núcleo público.
