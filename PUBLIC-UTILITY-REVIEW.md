# Trajeto: revisão de utilidade pública — 01/10/2026

## Correções e comportamento

- Removido elemento vazio do catálogo de locais que interrompia buscas e a checagem de tipos.
- Busca de locais e serviços aceita termos sem acentos e fora de ordem.
- A central preserva busca e categoria na URL ao confirmar, mudar categoria, recarregar e voltar. Há recuperação de filtro sem resultados.
- A ligação utiliza apenas um número; contatos com alternativas nunca viram um telefone concatenado.
- O menu Mais cabe em telas pequenas, permite rolagem e devolve o foco ao botão. Saúde e Emergência usam o catálogo local. Removidos atalhos redundantes do menu; as telas existentes continuam acessíveis.
- Rota de serviço abre o planejador com destino preenchido, preservando as opções de navegação do Trajeto.
- O mapa reconhece a cidade selecionada pelo atalho padrão, restaura a busca da URL e exibe um único mapa; abrir e ocultar usam a mesma seção.
- Cadastro da Ouvidoria adicionado. SIC e Vapt Vupt receberam endereço, horários e orientação para o canal oficial. Agendamentos e solicitações são feitos no portal do órgão.

## Fontes conferidas

Consultadas em 01/10/2026. A data individual de conferência aparece somente nos registros revisados nesta entrega.

- SIC: https://aguaslindasdegoias.go.gov.br/servico-de-informacao-ao-cidadao/
- Ouvidoria: https://aguaslindasdegoias.go.gov.br/estrutura/gabinete-do-prefeito/ouvidoria-municipal/
- Vapt Vupt: https://www.vaptvupt.goias.gov.br/unidade/aguas-lindas-de-goias

O telefone do SIC usa a seção específica do órgão, em vez do contato genérico do rodapé. O Vapt Vupt usa o endereço e horário da unidade estadual; o telefone antigo da lista municipal não é apresentado como confirmado pela unidade.

## Offline e automações

- Preparação automática de todas as telas compiladas e das duas bases ANP após uma primeira visita com internet. A tela Ajuda consulta o conteúdo realmente salvo e informa a disponibilidade offline.
- Manifesto público `offline-assets.json` incluído no artefato Pages. A versão do service worker acompanha automaticamente os hashes do build.
- Uma atualização incompleta não substitui a versão ativa. A versão nova espera a ação Atualizar quando já existe uma sessão controlada.
- Verificação de atualização ao voltar ao app ou recuperar a conexão. Cache de dados é usado em falha de rede ou indisponibilidade do servidor; a espera de rede termina em quatro segundos.
- Caches isolados por caminho do app; limpeza preserva outras aplicações. Respostas privadas de API não são armazenadas. Falhas de espaço no cache não interrompem respostas online. Cache de mapas limitado às últimas 24 imagens consultadas.
- Publicação Pages exige checagem de tipos antes do build. A sincronização ANP a cada 12 horas passa a acionar a publicação após sucesso, pois commits feitos pelo GITHUB_TOKEN não geram um novo evento de build por push. Referência: https://docs.github.com/en/actions/concepts/security/github_token

## Limites verificáveis

O primeiro acesso exige internet; armazenamento pode ser removido pelo navegador ou pelo usuário. O pacote não oferece navegação curva a curva, tráfego, agendamentos ou novos cálculos sem conexão. Contatos podem mudar: cada card mantém sua fonte. Ligações precisam de rede telefônica. Dois testes de integração dependem de credenciais externas e continuam condicionados à configuração dessas credenciais.

## Validação

Checagem TypeScript, build, testes de servidor, bibliotecas, componentes e páginas. Testes de navegador em mobile e desktop, incluindo base `/trajeto-web/`, filtros persistentes, menu em 320 × 568 e recarga offline de telas não visitadas. Consulte a execução CI do PR para o resultado final.

## Segunda revisão: atalhos e suporte ao cidadão

- Serviços públicos podem ser salvos neste aparelho, filtrados por favoritos e compartilhados por link individual com contatos e fonte. O filtro de favoritos permanece na URL. Gravações bloqueadas informam falha e não anunciam sucesso.
- Telefones alternativos e contatos setoriais têm ações individuais. Links nacionais e estaduais exclusivamente remotos não oferecem uma rota sem endereço. Canais de emergência cabem em 320 px.
- Ligue 180 e Disque 100 adicionados; energia e Saneago usam as centrais oficiais. Fontes consultadas em 01/10/2026: https://www.gov.br/mulheres/pt-br/ligue180 ; https://www.gov.br/pt-br/servicos/denunciar-violacao-de-direitos-humanos ; https://go.equatorialenergia.com.br/canais-de-atendimento/ ; https://www.saneago.com.br/site . Agência virtual Saneago vinculada no portal oficial.
- Ajuda inclui instalação, preparação offline, atalhos salvos, recuperação de falhas de armazenamento e links de suporte. O app não envia mensagens nem abre chamados automaticamente.
- Instruções de instalação conferidas nas páginas oficiais: https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios e https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=pt-BR .
- Cache de postos ignora registros malformados e valida coordenadas, horários e idade. Falha de gravação preserva os favoritos existentes. Instalação tolera armazenamento bloqueado, informa erro e encerra o aviso após instalação ou cancelamento.
- Regressões incluem persistência e recuperação offline dos serviços salvos, abertura de links individuais, telefones alternativos, armazenamento bloqueado, cache corrompido e instalação falha.
- A atualização offline também revalida os arquivos e snapshots no cache HTTP e grava a mesma página nova usada para identificar os arquivos do build. A regressão de página antiga com arquivos novos foi reproduzida e corrigida. A versão base do worker passa a v20 para isolar a instalação dos caches ativos.


## Terceira revisão: necessidades do cidadão e continuidade offline

- A central oferece seis atalhos por necessidade: água e segunda via, falta de luz, CadÚnico, CRAS, Vapt Vupt e Ouvidoria. A busca aceita expressões como “segunda via da conta de água” e “atualizar cad único”, com categorias preservadas.
- Acrescentados Cadastro Único / Bolsa Família, CRAS II Santa Lúcia, CRAS III Praça da Cultura e CREAS. Telefones, endereços e horários foram conferidos em 01/10/2026 no diretório oficial: https://aguaslindasdegoias.go.gov.br/estrutura/secretaria-de-assistencia-social-cidadania-e-juventude/ . A orientação é confirmar documentos e atendimento antes de sair; não se promete aprovação de benefícios.
- ITBI e Nota Fiscal/ISS abrem WhatsApp, conforme a indicação “Somente WhatsApp” na fonte municipal. O app abre o canal; o cidadão decide o que enviar. Secretaria de Educação e Detran passaram às categorias Educação e Trânsito.
- Serviços com destino alimentam automaticamente o seletor de rotas, respeitando os atalhos existentes. Novos contatos remotos não recebem endereço fictício. O canal genérico de emergência não oferece uma rota para o centro da cidade.
- Busca universal mostra a quantidade total de serviços e permite abrir todos os resultados preservando o termo. O atalho fica antes da lista, e a rolagem automática mobile reserva espaço para a navegação fixa; o teste de toque real revelou e orientou a correção da interceptação do botão. Textos e contraste da busca mobile foram ampliados. O aplicativo instalado identifica Águas Lindas e prioriza Serviços e Emergência nos atalhos.
- A navegação controlada pelo worker usa imediatamente a página do pacote instalado. Uma publicação nova não sobrescreve o documento offline da versão ativa; a atualização completa continua dependendo da ação Atualizar. Regressão coberta para publicação nova seguida de perda da conexão.
- Endereços que incluem “Águas Lindas GO” não são confundidos com o centro da cidade. Caches de coordenadas e rotas são validados; armazenamento bloqueado não interrompe o cálculo. Uma estimativa salva em falha de rede é recalculada com o roteador quando a conexão retorna.
- Backup e limpeza incluem as chaves antigas com hífen e as novas com dois-pontos, incluindo favoritos de serviços e caches de rota. A central sincroniza os favoritos após limpeza no mesmo aparelho.

Validação desta revisão: checagem de tipos, build completo e testes unitários/componentes; regressões de navegador no CI para os atalhos novos, contatos WhatsApp, recarga offline, destino CRAS e resultados completos, incluindo tela de 320 × 568. Dois testes de integração continuam condicionados às credenciais externas. Os resultados definitivos de CI acompanham o PR.

## Quarta revisão: busca mobile e recuperação offline

- Busca ocupa a largura disponível, com quatro ações principais e expansão das categorias secundárias. Uma pesquisa mostra primeiro os serviços encontrados, sem renderizar seções vazias. Rotas de serviços e locais já apresentados não aparecem novamente como outro resultado. Os textos dos cards podem quebrar linha; removidas as longas listas de postos e comércio antes de uma pesquisa.
- Contagem completa, expansão dos resultados, recuperação de busca vazia, atalhos de serviços salvos e preparação offline. Pesquisas recentes sincronizam após limpeza dos dados locais. Consultas externas ficam identificadas como online e indisponíveis sem conexão.
- Ajuda confere o pacote real e oferece Preparar acesso offline para recuperar arquivos ausentes. A recuperação usa o manifesto e a página da versão instalada; não mistura HTML novo com arquivos antigos. Respostas HTML para arquivos JavaScript são rejeitadas. Falta de conexão, espaço ou necessidade de atualização têm orientação e tentativa novamente. Quando o manifesto ou todas as cópias da página instalada estão ausentes, a recuperação exige uma atualização completa.
- Salvamento de rotas só confirma após a conclusão da transação IndexedDB. Transações abortadas informam falha. A limpeza dos excedentes preserva as 50 rotas mais recentes; o callback de limpeza não é mais sobrescrito pelo leitor do resultado.
- Carteira de Trabalho Digital (158) e Meu INSS (135) adicionados com links oficiais, palavras de busca, orientação, horário da Central 135 e data de conferência. São canais remotos; não recebem endereço municipal ou rota fictícia. Fontes conferidas em 01/10/2026: https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho ; https://www.gov.br/inss/pt-br/canais_atendimento/meu-inss/meu-inss ; https://www.gov.br/inss/pt-br/canais_atendimento/central-135 . O canal genérico de emergência também deixa de oferecer rota para o centro da cidade.
- Metadados do site passam a identificar a utilidade pública em Águas Lindas. Mantidos os módulos existentes, as fontes do catálogo e a atualização ANP já agendada.

Validação inclui larguras de 320 a 1024 px, fonte ampliada, acessibilidade, contatos remotos offline, recuperação de um arquivo de tela removido, recarga offline e gravação de rota interrompida. A revisão não promete atendimento de terceiros ou disponibilidade de mapas externos sem conexão.

## Quinta revisão: navegação móvel, hierarquia e procedência

- Serviços públicos passam a ocupar uma posição fixa no dock mobile. O mapa continua acessível em Mais, com rótulo explícito, evitando esconder o diretório cidadão atrás de uma segunda camada.
- O botão Rotas do dock sempre abre o planejador. Retomar uma viagem continua disponível onde a interface informa isso explicitamente, sem alterar silenciosamente a ação principal.
- O estado ativo do dock cobre aliases de rota e telas secundárias, preservando orientação em Salvos, Mapa, Busca, Postos, fichas locais e Ajuda.
- A Home apresenta Serviços públicos entre as três ações principais e descreve o Trajeto como utilidade local, sem remover rotas, postos ou o fluxo de mobilidade.
- Resultados de lugares e comércio passam a exibir o campo de procedência real do catálogo. A descrição do estabelecimento deixa de ser apresentada visualmente como se fosse a fonte.
- Rótulos críticos do dock, busca inicial e aviso de atualização receberam texto maior e contraste mais legível no celular.

Esta revisão não remove módulos funcionais nem amplia promessas de dados offline. Informações de comércio com rótulo "Consulta local" continuam sendo referência local e devem ser confirmadas antes do deslocamento; diretórios oficiais mantêm sua fonte própria.

## Sexta revisão: cobertura de serviços oficiais

- Incluído o ponto de atendimento conveniado da Receita Federal em Águas Lindas, usando exclusivamente a página oficial federal como fonte.
- O cadastro não inventa endereço, telefone ou horário: esses campos ficam ausentes enquanto a fonte oficial consultada não os publica de forma verificável.
- A busca por Defesa Civil, alagamento, enchente, desabamento e risco estrutural passa a recuperar o bloco de proteção e emergência já existente, mantendo 193/190 com a descrição correta e sem criar um número municipal não confirmado.
- Adicionado atalho para CPF e Receita Federal entre as necessidades cidadãs frequentes.


## Auditoria de consolidação mobile e utilidade pública — 01/10/2026

### O que ficou forte

- A navegação móvel concentra **Início, Serviços, Rotas e Mais** e mantém busca, mapa, emergência, saúde, postos, alimentação, compras, salvos e ajuda acessíveis sem transformar a barra inferior em um menu lotado.
- A Home passa a evitar texto funcional abaixo de 12 px e os controles críticos adotam alvo de toque de pelo menos 44 px; campos de rota continuam com 16 px para reduzir zoom involuntário em celulares.
- O mapa de postos combina mapa por tiles, lista de seleção acessível, foco por teclado, ficha separada do viewport e fallback esquemático quando o fundo externo falha. Favoritos e diretório continuam disponíveis no fluxo estático.
- O catálogo público mantém fonte por serviço e ganhou o **CAPS de Águas Lindas**, pesquisável por “saúde mental”, além da atualização do contato oficial da Secretaria Municipal de Saúde.
- O modo offline mantém shell, telas públicas, dados locais, serviços, favoritos e rotas salvas. A tela de Ajuda explica preparação, diagnóstico e recuperação do cache sem prometer recursos que dependem de rede.
- A ANP continua sincronizada automaticamente a cada 12 horas. A suíte completa de regressão passa a ter execução semanal, além dos checks em push e pull request.

### Limites que não devem ser escondidos do cidadão

- Google Maps, Waze, Apple Maps, tiles de mapa, novos cálculos de rota, tráfego, chamadas telefônicas, WhatsApp, agendamentos e portais externos dependem de conectividade e da disponibilidade dos respectivos provedores.
- GitHub Pages é adequado para o portal público estático e offline, mas não substitui um backend para notificações push personalizadas, autenticação persistente ou colaboração em tempo real.
- Contatos e horários públicos podem mudar na fonte oficial. Por isso, novos registros não devem ser adicionados apenas por quantidade: endereço, telefone e horário precisam de fonte oficial verificável e data de revisão quando houver risco de desatualização.
- “Offline” significa acesso ao que foi empacotado ou salvo no aparelho; não significa navegar em serviços externos sem rede.

### Automação de prevenção

- `Sync ANP Águas Lindas`: atualização cadastral e de preços duas vezes ao dia, com commit apenas quando há mudança semântica.
- `CI`: TypeScript, testes de servidor/contratos/bibliotecas/componentes/páginas, build, navegador, acessibilidade e smoke de GitHub Pages em cada mudança e semanalmente.
- `Deploy Trajeto to GitHub Pages`: valida o artefato, PWA, ícones, manifest, service worker e assets offline antes da publicação.

A prioridade das próximas rodadas deve permanecer **confiabilidade, atualização de dados e redução de atrito**, não crescimento de funcionalidades sem necessidade comprovada.
