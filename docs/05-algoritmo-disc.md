# 05 · Algoritmo DISC

## Fatores

- **D** Dominância · **I** Influência · **S** Estabilidade · **C** Conformidade

## Formato do teste

- 24 grupos (sugestão inicial, ajustável por versão do questionário).
- Cada grupo tem 4 adjetivos, um por fator. O candidato atribui **4 = mais parecido comigo … 1 = menos parecido**, usando cada valor uma única vez.

## Validação (cliente e servidor)

1. Existem respostas para todos os grupos do questionário.
2. Cada grupo tem exatamente 4 respostas, uma por opção do grupo.
3. Os valores do grupo formam o conjunto {1,2,3,4}.
   Falha → erro `422` com lista de grupos inválidos.

## Pontuação

```
score[f] = soma dos ranks das opções de fator f
```

Com 24 grupos: cada fator varia de 24 a 96; soma total constante = 24 × 10 = 240 (propriedade usada como checagem de integridade).

**Normalização:** `pct[f] = (score[f] - min) / (max - min) * 100`, com `min = nGrupos`, `max = 4 × nGrupos`.

## Perfil

- **Primário:** fator de maior pontuação; **secundário:** segundo maior. Pontuação idêntica desempata pela precedência D > I > S > C.
- **Perfil combinado (`code`):** sempre `primário + secundário`, em **12 variantes ordenadas**: DI, DS, DC, ID, IS, IC, SD, SI, SC, CD, CI, CS. A ordem importa: DI e ID têm leituras diferentes (o principal guia o jeito de agir; o secundário o modula).
- **Empate técnico (`tied`):** a diferença entre o 1º e o 2º fator é **< 5 pontos percentuais** (`TIE_THRESHOLD_PCT`). Com 24 grupos (amplitude de 72 pontos) isso é até **3 pontos brutos**; 4 pontos brutos (5,6 pp) já não é empate. No empate, a ordem entre os dois é só convenção e os dois perfis têm o mesmo peso.
- **`code`, `gap` e `tied` são derivados na leitura** (`buildProfile`, a partir das pontuações gravadas), nunca gravados: ajustar o limite vale também para resultados antigos.
- **Intensidade:** alto (≥ 65%), médio (35–65%), baixo (< 35%) por fator.

## Saídas

| Visão                | Conteúdo                                                                                                                                                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Candidato**        | Três leituras: o **perfil combinado** (ex.: `DI`), o **perfil principal** e o **perfil secundário**, cada uma com descrição e pontos fortes (e dicas na combinada). No empate, um aviso explica que os dois pesam igual. Sem ranking, sem comparação, sem recomendação de contratação.                                   |
| **Recrutador/Admin** | Pontuações e percentuais com os rótulos Principal/Secundário, diferença em pp e aviso de empate; leitura combinada completa (pontos fortes, atenção, comunicação, ambiente ideal, motivadores, perguntas de entrevista) **e** o mesmo detalhe de cada fator isolado. No empate as seções dos dois perfis já vêm abertas. |

Textos ficam separados do cálculo: `FACTOR_CONTENT` (4 fatores) e `COMBINED_CONTENT` (12 combinações), em `packages/disc-core/src/content.ts` e `combined-content.ts`. **Os 12 textos combinados são redação original e ainda não foram revisados por profissional de RH/psicologia.**

## Banco de perguntas

Banco **original** do projeto (o instrumento DISC comercial tem copyright). Exemplo de grupo:

| Adjetivo     | Fator |
| ------------ | ----- |
| Decidido     | D     |
| Entusiasmado | I     |
| Paciente     | S     |
| Detalhista   | C     |

Cada grupo deve ter adjetivos equilibrados em desejabilidade social. Conteúdo final a revisar por profissional de RH/psicologia antes de uso comercial.

## Testes de domínio (exemplos)

- Todos os grupos com D=4,I=3,S=2,C=1 → D=96, I=72, S=48, C=24; primário D, secundário I.
- Grupo com rank repetido → erro.
- Soma total ≠ 240 → erro de integridade.
- Empate D/I abaixo de 5 pp (até 3 pontos brutos) → perfil `DI`, `tied=true`; 4 pontos brutos (5,6 pp) → `tied=false`.
- As 12 combinações geram os 12 códigos, e `DI` ≠ `ID`.

> Aviso: o DISC descreve preferências de comportamento, não é diagnóstico psicológico nem deve ser critério único de contratação.
