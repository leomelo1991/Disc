# 06 · API REST (`/api/v1`)

Convenções: JSON, datas ISO 8601, ids UUID, erros no formato RFC 7807 (`application/problem+json`), paginação por cursor (`?cursor=&limit=`). Documentação interativa em **`/api/docs`** (Swagger UI) e especificação em `/api/docs-json`, geradas a partir dos schemas Zod de `packages/contracts`. Ligada por padrão, exceto em produção (`ENABLE_DOCS=true` para ligar). Um teste compara as rotas documentadas com as rotas reais do Nest, então a documentação não pode ficar defasada.

## Autenticação (admin/recrutador)

| Método | Rota                    | Descrição                                                             |
| ------ | ----------------------- | --------------------------------------------------------------------- |
| POST   | `/auth/register-tenant` | Cria empresa + primeiro admin                                         |
| POST   | `/auth/login`           | Retorna access token; refresh em cookie httpOnly                      |
| POST   | `/auth/refresh`         | Rotaciona o refresh (uso único) e devolve novo access token + usuário |
| POST   | `/auth/logout`          | Revoga refresh                                                        |

## Empresa e usuários (ADMIN)

| Método    | Rota                                                              |
| --------- | ----------------------------------------------------------------- |
| GET/PATCH | `/tenant` (PATCH: nome e `retentionDays`)                         |
| GET/POST  | `/users`                                                          |
| PATCH     | `/users/:id` (nome, papel, ativo; desativação em vez de exclusão) |

## Catálogo

`GET /assessment-types` (ADMIN/RECRUITER) lista os testes com versão atual e número de grupos. `GET /assessment-types/:code/questionnaires/current` (**só ADMIN**) devolve o questionário **com os fatores** de cada opção, para revisão do conteúdo por profissional de RH. O candidato nunca recebe os fatores. O convite resolve o questionário publicado mais recente internamente.

| Método | Rota                                             |
| ------ | ------------------------------------------------ |
| GET    | `/assessment-types`                              |
| GET    | `/assessment-types/:code/questionnaires/current` |

## Convites

| Método | Rota                      | Descrição                                                                                        |
| ------ | ------------------------- | ------------------------------------------------------------------------------------------------ |
| POST   | `/invitations`            | `{ assessmentType, targetRole?, targetDepartment?, expiresInDays }` → `{ id, url, whatsappUrl }` |
| GET    | `/invitations`            | Filtros: status, período                                                                         |
| POST   | `/invitations/:id/revoke` | Revoga                                                                                           |

`url` contém o token em texto puro **apenas na resposta de criação**; só o hash é armazenado.

## Relatórios (ADMIN/RECRUITER)

| Método | Rota                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| GET    | `/reports/results`                                                                |
| GET    | `/reports/results/:submissionId`                                                  |
| GET    | `/reports/results/export.csv`                                                     |
| GET    | `/reports/summary` (contagens por perfil)                                         |
| DELETE | `/reports/results/:id` (ADMIN; exclusão LGPD, 204)                                |
| GET    | `/reports/results/:id/data-export` (ADMIN; exportação dos dados do titular, LGPD) |

Filtros de `/reports/results`: `q` (nome), `jobTitle`, `department`, `primaryFactor`, `from`, `to`, `invitationId`, `cursor`, `limit`.

Cada item da lista traz `primaryFactor`, `secondaryFactor`, **`code`** (combinação ordenada, ex. `DI`) e **`tied`** (empate técnico). O detalhe traz também `gap` (diferença em pp entre o 1º e o 2º fator) e `summary` com a leitura combinada, `primaryProfile`/`secondaryProfile`, os detalhes de recrutador de cada fator (`primaryDetails`, `secondaryDetails`) e `tieNote` quando há empate. O CSV ganhou as colunas "Perfil combinado" e "Empate". Todos esses campos são derivados das pontuações na leitura.

## Público (candidato, sem login, rate-limited)

| Método | Rota                                | Descrição                                                                                                            |
| ------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/public/presentation`              | Página de apresentação: cria uma empresa de demonstração e devolve o link do teste (404 se desligada; 429 no limite) |
| GET    | `/public/invitations/:token`        | Valida link; retorna empresa, questionário e campos exigidos                                                         |
| POST   | `/public/invitations/:token/submit` | Envia identificação + respostas; header `Idempotency-Key`                                                            |

Resposta do submit: `{ candidateSummary }` com a visão do candidato: `code`, `tied`, `combined` (o resultado dos dois fatores juntos), `primaryProfile`, `secondaryProfile` e `tieNote` (só no empate). Nunca inclui conteúdo de recrutador (ver `05-algoritmo-disc.md`).

Corpo de submit:

```json
{
  "candidate": { "name": "", "phone": "", "email": "", "jobTitle": "", "birthDate": "", "department": "" },
  "consent": { "accepted": true, "version": "2026-10" },
  "answers": [{ "optionId": "uuid", "rank": 4 }]
}
```

## Saúde e métricas

`GET /health` (liveness) e `GET /ready` (readiness, consulta o banco).

`GET /metrics` (formato Prometheus). Com `METRICS_TOKEN` exige `Authorization: Bearer <token>`; em produção sem token o endpoint fica desligado (404). Métricas: `http_request_duration_seconds` (rótulos `method`, `route` como **template** da rota, `status`), `disc_submissions_total` (não conta reenvios idempotentes), `disc_invitations_created_total`, `disc_logins_total{result}` e as métricas padrão do Node.

## Erros comuns

`401` não autenticado · `403` papel insuficiente · `404` token inválido, expirado ou revogado no GET (resposta uniforme) · `409` convite já usado (submit) · `410` expirado/revogado (submit) · `422` validação · `429` rate limit.
