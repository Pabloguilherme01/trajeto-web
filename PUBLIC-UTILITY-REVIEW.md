# Trajeto: revisão de utilidade pública — 01/10/2026

## Correções e comportamento

- Removido elemento vazio do catálogo de locais que interrompia buscas e a checagem de tipos.
- Busca de locais e serviços aceita termos sem acentos e fora de ordem.
- A central preserva busca e categoria na URL ao confirmar, mudar categoria, recarregar e voltar. Há recuperação de filtro sem resultados.
- A ligação utiliza apenas um número; contatos com alternativas nunca viram um telefone concatenado.
- O menu Mais cabe em telas pequenas, permite rolagem e devolve o foco ao botão. Saúde e Emergência usam o catálogo local. Removidos atalhos redundantes do menu; as telas existentes continuam acessíveis.
- Rota de serviço abre o planejador com destino preenchido, preservando as opções de navegação do Trajeto.
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
- Caches isolados por caminho do app; limpeza preserva outras aplicações. Respostas privadas de API não são armazenadas. Cache de mapas limitado às últimas 80 imagens consultadas.
- Publicação Pages exige checagem de tipos antes do build. A sincronização ANP existente foi preservada.

## Limites verificáveis

O primeiro acesso exige internet; armazenamento pode ser removido pelo navegador ou pelo usuário. O pacote não oferece navegação curva a curva, tráfego, agendamentos ou novos cálculos sem conexão. Contatos podem mudar: cada card mantém sua fonte. Ligações precisam de rede telefônica. Dois testes de integração dependem de credenciais externas e continuam condicionados à configuração dessas credenciais.

## Validação

Checagem TypeScript, build, testes de servidor, bibliotecas, componentes e páginas. Testes de navegador em mobile e desktop, incluindo base `/trajeto-web/`, filtros persistentes, menu em 320 × 568 e recarga offline de telas não visitadas. Consulte a execução CI do PR para o resultado final.
