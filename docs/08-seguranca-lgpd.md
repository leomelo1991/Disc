# 08 · Segurança e LGPD

## Dados pessoais tratados

Nome, telefone, e-mail, data de nascimento, cargo, setor e perfil comportamental. Tratados como dados pessoais; o perfil pode ser sensível no contexto de decisão de contratação, então exige cuidado extra.

## LGPD

- **Base legal:** consentimento explícito no início (versão e data registradas em `submission`) e/ou legítimo interesse do contratante, a validar com jurídico.
- **Papéis:** a empresa cliente é controladora; a plataforma é operadora (contrato/DPA).
- **Minimização:** só campos necessários; data de nascimento opcional por configuração do tenant.
- **Retenção:** prazo configurável por tenant (`retention_days`); job diário remove submissões vencidas (`RetentionService`).
- **Direitos do titular:** **acesso** (`GET /reports/results/:id/data-export`: todos os dados, respostas e perfil em JSON) e **exclusão** (`DELETE /reports/results/:id`), ambos só para ADMIN, restritos à própria empresa e auditados (`DATA_EXPORTED`, `RESULT_ERASED`). Ambos estão disponíveis na tela de resultado.
- **Transparência:** o candidato vê apenas o próprio resumo.

## Segurança de aplicação

| Área         | Controle                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Senhas       | Argon2id; política mínima; bloqueio progressivo                                                                                     |
| Sessão       | Access JWT curto (15 min), refresh rotativo httpOnly + SameSite, revogação                                                          |
| Links        | Token ≥ 128 bits aleatórios; só hash (SHA-256) no banco; expiração; uso único; resposta 404 uniforme                                |
| Isolamento   | **RLS no Postgres** (papel `disc_app` sem bypass, falha fechada) + `tenant_id` do JWT em toda query + testes de vazamento (ADR-003) |
| Autorização  | RBAC (admin/recrutador) por guard; recrutador não gere usuários                                                                     |
| Entrada      | Validação Zod; limites de tamanho; sanitização de saída                                                                             |
| Abuso        | Rate limit por IP/token nas rotas públicas; CAPTCHA opcional                                                                        |
| Transporte   | HTTPS, HSTS, CORS restrito, `helmet`, CSP                                                                                           |
| Segredos     | Variáveis de ambiente / secret manager; nunca no repo                                                                               |
| Auditoria    | Log de ações admin (criar/revogar convite, ver resultado, exportar)                                                                 |
| Backup       | Diário, criptografado, restore testado                                                                                              |
| Dependências | Dependabot/Renovate, `pnpm audit` no CI                                                                                             |

## Uso responsável do DISC

O resultado é apoio à conversa, não critério único de seleção. Exibir esse aviso ao admin e ao candidato.

## Telemetria sem dados pessoais

- **Sentry** (opcional, só com `SENTRY_DSN` / `VITE_SENTRY_DSN`): todo evento passa por redação profunda antes de sair. Remove corpo da requisição, cookies, headers, IP e e-mail do usuário, e mascara o token do convite (`/public/invitations/:token`, `/t/:token`) e e-mails em **qualquer** texto, inclusive breadcrumbs. Session Replay não é habilitado. Os testes usam o SDK real contra um servidor local e conferem o envelope enviado.
- **Métricas**: rótulos de cardinalidade fixa; a rota entra como template, nunca a URL com o token.
- **Logs**: `authorization`, `cookie` e `set-cookie` redigidos; o token do convite é mascarado na URL.

## Página pública de apresentação

`POST /public/presentation` cria dados sem login, então tem camadas de proteção:

- **Desligada por padrão em produção** (`ENABLE_PRESENTATION=true` para ligar) e responde 404, sem revelar que existe.
- **Limite por IP** (5/min) e **limite diário global** (`PRESENTATION_DAILY_LIMIT`, contado por função `SECURITY DEFINER`).
- A empresa nasce marcada `isPresentation`, com retenção de 30 dias, e o único usuário dela é **inativo e com hash inválido**: ninguém consegue logar nela.
- **Limpeza automática** das empresas de apresentação com mais de 7 dias (convites, respostas e usuários junto), sem nunca tocar empresas reais.
- Testes cobrem cada camada, inclusive que uma empresa real antiga não é apagada.
