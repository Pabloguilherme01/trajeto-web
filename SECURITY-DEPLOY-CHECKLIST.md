# Trajeto Web · Security Deploy Checklist

## Auditoria atual · 29/09/2026

- [x] Rate limit de processo sem divergência no contador por requisição
- [x] Gateways de rotas externos com timeout e resposta de erro sanitizada
- [x] Gateways de rotas rejeitam payloads maiores que 20 KB
- [x] CORS dos gateways sem fallback permissivo `*`
- [x] Metadata mobile/SEO revisado para a nova página pública
- [x] Primitivas mobile para safe-area, toque e foco adicionadas

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

## Obrigatório no ambiente de produção

- [ ] HTTPS ativo no domínio final
- [ ] NODE_ENV=production
- [ ] JWT_SECRET aleatório, com pelo menos 32 caracteres e fora do Git
- [ ] DATABASE_URL em secret manager
- [ ] OAUTH_SERVER_URL, VITE_APP_ID, BUILT_IN_FORGE_API_URL e BUILT_IN_FORGE_API_KEY configurados como secrets/variables apropriados
- [ ] Banco de dados não exposto publicamente sem necessidade
- [ ] Proxy reverso configurado de acordo com trust proxy = 1
- [ ] Branch protection na main
- [ ] CI, CodeQL e Dependency Review exigidos antes de merge
- [ ] Secret scanning e push protection habilitados no GitHub
- [ ] Backups e procedimento de restauração testados
- [ ] Logs de produção sem cookies, Authorization headers ou secrets
- [ ] Rate limiting distribuído quando houver mais de uma instância do backend
- [ ] Teste de penetração externo antes de expor integrações autenticadas ao público

## Critério de release

Não liberar se houver vulnerabilidade crítica/alta aberta, build quebrado, TypeScript quebrado ou falha de segurança introduzida pelo último commit.

A segurança do deploy também depende da infraestrutura, do provedor OAuth, do banco, do proxy reverso e da configuração de secrets. O checklist não substitui um teste de penetração externo.