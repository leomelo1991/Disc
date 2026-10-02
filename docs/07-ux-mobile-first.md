# 07 · UX Mobile-first

## Princípios

Começar em 360 px; uma tarefa por tela; alvos ≥ 44 px; contraste AA; sem hover como único meio; funcionar com teclado e leitor de tela; estados de carregando/erro/vazio sempre desenhados.

## Fluxo do candidato

```
Link → Boas-vindas (empresa, tempo ~10 min, LGPD) → Identificação → Perguntas (1 grupo por tela) → Revisão → Enviar → Resumo do perfil
```

1. **Boas-vindas:** nome da empresa, instruções, checkbox de consentimento.
2. **Identificação:** nome, telefone (máscara BR), e-mail, cargo, data de nascimento, setor. Teclados adequados (`inputmode`, `autocomplete`).
3. **Pergunta (grupo):** 4 adjetivos. Para cada um, botões **1 2 3 4**. Ao escolher um valor já usado em outro adjetivo do grupo, ele é desabilitado nos demais (ou troca com confirmação visual). Botão "Próxima" só ativa com o grupo completo. Barra de progresso `n/24`.
4. **Revisão:** lista de grupos com status; voltar e editar.
5. **Enviar:** loading, retry seguro (idempotência), mensagem de erro clara.
6. **Resumo:** perfil, pontos fortes, dicas, aviso de que não é diagnóstico.

Retomada: rascunho em `localStorage` com chave por convite; limpo após envio.

## Fluxo do administrador

```
Login → Dashboard (contagens, últimos resultados) → Convites (criar, copiar, WhatsApp) → Resultados (filtros, tabela/cards) → Detalhe do candidato
```

- **Criar convite:** tipo de teste, cargo/setor alvo, validade → mostra link com **Copiar** e **Enviar no WhatsApp** (`wa.me`).
- **Resultados:** no mobile, cards; no desktop, tabela. Filtros em bottom sheet no mobile. Busca por nome, cargo, setor, perfil, período.
- **Detalhe:** gráfico de barras D/I/S/C, perfil primário/secundário, pontos fortes/atenção, perguntas de entrevista.

## Design

Tailwind + shadcn/ui, tema claro/escuro, cores D/I/S/C com ícone/rótulo (não depender só de cor), tipografia legível (≥ 16 px em inputs para evitar zoom no iOS).
