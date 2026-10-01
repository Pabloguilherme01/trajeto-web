# Trajeto — política de núcleo sem custo obrigatório

O Trajeto deve permanecer útil ao cidadão sem exigir conta, assinatura, servidor pago ou API comercial.

## Regras do núcleo

1. O build público do GitHub Pages deve funcionar sem segredos.
2. Rotas essenciais devem preferir processamento local, snapshots públicos versionados e serviços abertos.
3. Toda integração comercial deve ser opcional e possuir fallback gratuito/local.
4. Nenhuma chave de API paga pode ser necessária para abrir o app, consultar dados locais, usar favoritos, calculadoras ou obter uma rota/estimativa básica.
5. Recursos offline devem continuar disponíveis quando backend, mapas ou rede falharem.
6. Localização precisa não deve ser persistida ou enviada para telemetria.
7. Uma mudança que introduza custo obrigatório no núcleo deve falhar no CI até ser redesenhada.

## Arquitetura atual do modo gratuito

- GitHub Pages: hospedagem do cliente estático.
- PWA/service worker: app shell e recursos offline.
- Snapshots versionados: dados públicos essenciais.
- OpenStreetMap/Nominatim + OSRM: melhoria online sem chave comercial.
- Estimativa local: fallback quando roteamento público não responde.
- localStorage/sessionStorage: preferências, favoritos e cache no aparelho.
- Navegadores externos: navegação atualizada sem o Trajeto pagar pela sessão.

Integrações de backend, banco, OAuth, Google Maps/Places ou equivalentes podem existir como enriquecimento opcional, mas não podem ser requisito do modo público gratuito.
