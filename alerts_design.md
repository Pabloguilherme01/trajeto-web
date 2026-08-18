# Modelo de alertas e situação de rota

## Objetivo

Transformar a Trajeto em uma camada de consulta que distingue com clareza **condição atual de deslocamento**, **ocorrências institucionais**, **referências de preço** e **qualidade oficial de posto**. Nenhum alerta deve prometer cobertura em tempo real quando a fonte não estiver ativa.

## Domínios

| Domínio | Fonte | Persistência | Uso na interface |
|---|---|---|---|
| Corredor | Catálogo do produto | Código estático e preferência do usuário | Atalhos de busca, rotas sugeridas e configuração de alerta. |
| Situação de rota | Google Maps atual; tráfego ao vivo quando autorizado | Resultado calculado e horário da consulta | Duração, origem, horário e estado de cobertura. |
| Ocorrência institucional | Detran-DF, PRF ou DNIT, somente quando houver item e horário verificáveis | Link de origem e metadados mínimos | Cartão de alerta com a fonte, sem reescrever a ocorrência como fato próprio. |
| Alerta pessoal | Preferência explícita de conta autenticada | Usuário, corredor, faixa horária, estado e consentimento | Área pessoal e painel operacional. |
| Qualidade do posto | ANP com VC | Encaminhamento oficial e contexto exibido | Ação por posto e ficha de transparência. |

## Regras de transparência

1. O tráfego vivo só aparece como ativo quando a consulta do provedor for autorizada.
2. Sem chave válida, a interface mantém um estado de indisponibilidade e o último horário de atualização; não cria alertas fictícios.
3. PRF e Detran-DF são referências institucionais; seus dados históricos não são chamados de trânsito em tempo real.
4. ANP com VC é exibido como canal oficial de fiscalização, amostras, origem e denúncia, separado dos preços semanais da ANP.
5. Preferências de alerta são opcionais, exigem consentimento explícito e começam com alertas dentro da área logada. Entrega externa depende de um canal autorizado.

## Escopo da primeira implementação

- Catálogo de corredores para Águas Lindas, Ceilândia, Taguatinga, Brasília, Luziânia, Valparaíso, Cidade Ocidental, Formosa, Planaltina de Goiás e Santo Antônio do Descoberto.
- Painel de situação de rota no planejador com cobertura, horário, fontes e encaminhamentos institucionais.
- Preferências autenticadas de corredor e faixa de horário para alertas dentro do app.
- Métricas agregadas de configuração de alertas e uso do ANP com VC.
- Conector de tráfego vivo preparado, mas mantido em estado pendente até validação de credencial.
