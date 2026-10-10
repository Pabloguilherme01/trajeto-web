# Trajeto 2.0: plataforma equilibrada

Base: main 8a5a948a, 10/10/2026. Mobilidade, serviços e comércio integrados;
núcleo sem custo obrigatório, GPS privado local e preparação offline explícita.

## Entrega inicial

- T-02: seções opcionais do Início só montam após a primeira abertura; ao fechar,
  o conteúdo permanece montado para preservar preferências e evitar trabalho repetido.
- T-03: filtros horizontais de tipos na busca universal, contagens completas,
  seleção compartilhável por `tipo`, histórico voltar/avançar e paginação reiniciada.
  Nova consulta e limpeza voltam a Tudo. Tipos desconhecidos usam Tudo.
- T-03/T-11: consumidor desativado do catálogo não apresenta carregamento/erro
  antigo; respostas canceladas continuam ignoradas.

## Sequência e aceite

| Etapa | Escopo | Dependência | Evidência exigida |
| --- | --- | --- | --- |
| T-00 | Linha de base e proteção da main | nenhuma | CI existente, checks obrigatórios e medição reproduzível |
| T-01 | Navegação, tokens e ações | T-00 | 320/360/390px, teclado, texto 200%, contraste AA |
| T-02 | Início e ações principais | T-01 | busca/rota diretas, painéis opcionais sem trabalho antecipado |
| T-03 | Busca, filtros e indexação | T-00 | CNPJ com/sem máscara, filtros rápidos, histórico e contagens |
| T-04 | Central por necessidade | T-01, T-03 | UPA → ficha → contato/rota; ausência de dados explícita |
| T-05 | Mapa e Explorar | T-03 | seleção preservada, grupos coerentes, retorno e filtros |
| T-06 | Motor de mapas | T-00 | comparar tarefas longas, memória e gestos em Android físico |
| T-07 | Planejador | T-05 | online, fallback identificado, offline e falha de rede |
| T-08 | Postos e comparação | T-03 | filtros combinados, ANP histórica, sem preços fictícios |
| T-09 | Salvos e fichas | T-04, T-07 | salvar, reabrir, excluir, migrar e atualizar sem perda |
| T-10 | Qualidade de dados | nenhuma | fonte/data ou ausência explícita; relatório sem exclusões automáticas |
| T-11 | PWA | T-00 | instalação limpa, atualização, download parcial e modo avião |
| T-12 | Ajuda/acessibilidade | T-01, T-11 | teclado/leitor, contraste e estado offline compreensível |
| T-13 | Homologação/release | etapas anteriores | Pages, regressões, Android físico e rollback |

Não marcar uma etapa inteira concluída pela entrega de apenas parte dela.
Não duplicar as PRs #378–#382. Manter as URLs atuais e o dock de quatro áreas.
Não alterar caches, esquema de favoritos ou localização em uma PR visual.
Não apresentar cadastros comerciais como comprovação de atendimento presencial.

## Verificação

`npm run check`, `npm test`, `npm run build:client`, `npm run check:zero-cost`
e os workflows de CI/Security/CodeQL/Mobile QA/Responsive/Pages aplicáveis.
O teste `e2e-pages/search-types.spec.ts` cobre filtros, recarga, retorno, 320px,
texto ampliado e montagem dos painéis. A suite existente cobre os outros fluxos.

Metas propostas: LCP p75 ≤2,5s, INP p75 ≤200ms e CLS p75 ≤0,1.
Testes com CPU limitada são regressões de laboratório; não provam Web Vitals
em campo nem fluidez em todos os aparelhos. Registrar separadamente resultados
de instalação nova, PWA instalada, rede limitada e Android modesto.
