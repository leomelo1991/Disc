# 00 · Visão do Produto

## Problema

Recrutadoras e RHs aplicam testes comportamentais em planilhas, PDFs ou ferramentas caras e rígidas. Faltam: envio simples por WhatsApp, resultado já calculado, e relatório filtrável por cargo/pessoa.

## Proposta de valor

- **Aplicação sem atrito:** candidato recebe um link no WhatsApp, responde no celular em ~10 min, sem criar conta.
- **Resultado pronto:** pontuação, perfil primário/secundário e leitura útil ao recrutador, sem cálculo manual.
- **Painel por empresa (multi-tenant):** cada cliente enxerga só os seus dados, com filtros e exportação.
- **Vitrine técnica:** código limpo, DDD, testado, mobile-first, pronto para demonstração comercial.

## Personas

| Persona              | Objetivo                                                                     | Acesso                            |
| -------------------- | ---------------------------------------------------------------------------- | --------------------------------- |
| **Admin da empresa** | Configurar empresa, gerar links, ver todos os relatórios, gerir recrutadores | Login email/senha                 |
| **Recrutador**       | Gerar links e consultar resultados                                           | Login, papel com menos permissões |
| **Candidato**        | Responder o teste e ver um resumo do próprio perfil                          | Link com token único, sem login   |

## Escopo

**MVP:** cadastro de empresa e admin, escolha do tipo de teste (DISC), geração de link (com atalho WhatsApp), página do candidato (identificação + perguntas + envio + resumo), relatórios com filtros.

**Futuro:** outros tipos de teste, PDF do relatório, marca própria (white-label), comparação perfil × cargo, webhooks/ATS, envio automático via WhatsApp Business API, i18n.

## Métricas de sucesso

Taxa de conclusão do teste (> 85%), tempo médio de resposta, links gerados por empresa, tempo até o primeiro relatório.
