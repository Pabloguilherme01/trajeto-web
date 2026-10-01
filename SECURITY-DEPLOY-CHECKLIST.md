# Trajeto Web · Security Deploy Checklist

## Aplicado no código

- [x] Cookies de sessão HTTP-only, SameSite=Lax e Secure quando HTTPS
- [x] Cookies de sessão e OAuth com prefixo __Host-
- [x] OAuth state + nonce obrigatório no callback
- [x] Limites de tamanho para OAuth code/state
- [x] JWT HS256 com algoritmo explicitamente permitido
- [x] Sessão vinculada ao VITE_APP_ID da aplicação
- [x] Bearer session token limitado a 4096 caracteres
- [x] Rate limiting para OAuth, API, rotas, postos, analytics e storage proxy
- [x] Limites globais de JSON/form payload
- [x] Headers de segurança e CSP em produção
- [x] HSTS em produção
- [x] Cache-Control: no-store para health e API tRPC
- [x] Timeout de servidor e integrações externas
- [x] Validação de URLs externas
- [x] Proteção de SSRF nos importadores oficiais da ANP
- [x] Limite de 15 MB para XLSX da ANP
- [x] Limite de 20 MB para CSV cadastral da ANP
- [x] Logs de erros externos limitados e sem retorno bruto ao cliente
- [x] CodeQL, Dependency Review, npm audit e verificações de material de chave privada no CI
- [x] Dependabot configurado

## Obrigatório no núcleo público (GitHub Pages)

- [ ] HTTPS ativo no domínio final
- [ ] Build estático aprovado pelo CI e pelo smoke do GitHub Pages
- [ ] Verificação de núcleo zero-custo aprovada
- [ ] Nenhuma chave comercial necessária para busca, serviços, postos preparados, calculadora, offline ou planejamento público essencial
- [ ] Localização exata ausente de URL, histórico, telemetria e navegação compartilhada
- [ ] Provedores públicos usados com cache, limites, fallback e possibilidade de substituição
- [ ] Branch protection na main
- [ ] CI, Security e CodeQL exigidos antes de merge
- [ ] Secret scanning e push protection habilitados no GitHub

## Somente se o backend opcional for implantado

- [ ] NODE_ENV=production
- [ ] JWT_SECRET aleatório, com pelo menos 32 caracteres e fora do Git
- [ ] DATABASE_URL em secret manager
- [ ] OAUTH_SERVER_URL e VITE_APP_ID configurados apenas quando autenticação estiver habilitada
- [ ] Chaves de Forge/Google/TomTom ou outro provedor configuradas somente para recursos opcionais que realmente as utilizem
- [ ] Banco de dados não exposto publicamente sem necessidade
- [ ] Proxy reverso configurado de acordo com trust proxy = 1
- [ ] Backups e procedimento de restauração testados
- [ ] Logs de produção sem cookies, Authorization headers, localização precisa ou secrets

## Critério de release

Não liberar se houver vulnerabilidade crítica/alta aberta, build quebrado, TypeScript quebrado ou falha de segurança introduzida pelo último commit.

No modo estático, a segurança depende principalmente do artefato publicado, das políticas do navegador, do service worker e dos provedores públicos opcionais. Quando o backend estiver habilitado, também depende de OAuth, banco, proxy e secrets. O checklist não substitui revisão de segurança externa.