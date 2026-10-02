# ADR-004 · Arquitetura hexagonal com DDD tático

**Status:** Aceita

**Contexto:** Pedido de desacoplamento, robustez e código demonstrável como vitrine.

**Decisão:** Cada bounded context em NestJS com camadas `domain`, `application`, `infra`, `presentation`. Domínio sem dependência de framework; portas na aplicação; adaptadores na infra. Regra verificada por lint de fronteiras.

**Consequências:** (+) domínio testável sem banco, troca de ORM/fila sem tocar regras. (−) mais arquivos e mapeamento ORM↔domínio; aceito como custo para o objetivo do projeto.

## Atualização: como foi aplicado e verificado

- Os módulos **delivery** e **identity** têm as quatro camadas. Erros de caso de uso são `ApplicationError` (neutros a HTTP) traduzidos pelo `ProblemFilter`; o JWT fica atrás da porta `AccessTokenService`.
- **Desvio assumido:** `reporting`, `invitations` e `tenancy` são módulos enxutos (leitura/CRUD) cujos controllers usam o `PrismaService` diretamente, sem camada de aplicação. É a "CQRS leve" do `docs/03-arquitetura.md`. Se ganharem regra de negócio, devem ganhar camadas.
- As fronteiras são verificadas por `pnpm deps:check` (dependency-cruiser) no CI. A regra foi validada injetando violações propositais (application→infra, domain→Nest, shared→features, módulo→módulo), todas detectadas.
