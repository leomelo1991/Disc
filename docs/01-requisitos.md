# 01 · Requisitos

## Funcionais

### Sessão 1 · Administração (empresa)

| ID    | Requisito                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-A1 | Registrar/editar o nome da empresa que aplica o teste (tenant).                                                                                            |
| RF-A2 | Escolher o tipo de teste (MVP: DISC; modelo extensível).                                                                                                   |
| RF-A3 | Área do administrador com login e papéis (admin, recrutador).                                                                                              |
| RF-A4 | Gerar convite (link único) para um teste, com expiração e cargo/setor opcionais pré-definidos.                                                             |
| RF-A5 | Botão "Enviar por WhatsApp" que abre `https://wa.me/?text=<mensagem+link>` (sem API paga no MVP).                                                          |
| RF-A6 | Relatórios: listar resultados com filtros por pessoa, cargo, setor, período, perfil dominante, status.                                                     |
| RF-A7 | Detalhe do resultado: dados do candidato, pontuações D/I/S/C, perfil primário/secundário, pontos fortes, atenção, ambiente ideal, sugestões de entrevista. |
| RF-A8 | Exportar lista filtrada em CSV.                                                                                                                            |

### Sessão 2 · Candidato

| ID    | Requisito                                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------- |
| RF-C1 | Identificação: nome, telefone, e-mail, cargo, data de nascimento, setor (e campos extensíveis).                                    |
| RF-C2 | Consentimento LGPD explícito antes de enviar dados.                                                                                |
| RF-C3 | Perguntas DISC: cada grupo tem 4 adjetivos; atribuir 1–4 a cada, **sem repetir valor** no grupo.                                   |
| RF-C4 | Validação imediata na UI e revalidação no servidor.                                                                                |
| RF-C5 | Botão enviar: persiste dados e respostas no banco.                                                                                 |
| RF-C6 | Resumo do perfil ao final, apenas com informação relevante ao candidato (sem dados comparativos nem recomendações de contratação). |
| RF-C7 | Progresso salvo localmente (retomar se fechar o navegador).                                                                        |
| RF-C8 | Link de uso único: após envio, não aceita novo envio.                                                                              |

## Não funcionais

| ID    | Requisito                                                          |
| ----- | ------------------------------------------------------------------ |
| RNF-1 | **Mobile-first**: layout começa em 360 px, alvos de toque ≥ 44 px. |
| RNF-2 | Acessibilidade WCAG 2.1 AA (teclado, contraste, labels).           |
| RNF-3 | Isolamento total entre tenants.                                    |
| RNF-4 | LCP < 2,5 s em 4G; bundle da página do candidato enxuto.           |
| RNF-5 | Envio idempotente (reenvio por falha de rede não duplica).         |
| RNF-6 | Cálculo determinístico e coberto por testes unitários.             |
| RNF-7 | LGPD: minimização, retenção configurável, direito de exclusão.     |
| RNF-8 | Observabilidade: logs estruturados, health checks, métricas.       |
| RNF-9 | Contratos de API versionados e tipados de ponta a ponta.           |
