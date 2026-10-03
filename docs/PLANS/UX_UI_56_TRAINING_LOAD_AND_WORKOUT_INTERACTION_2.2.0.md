# UX_UI_56 — Training Load & Workout Interaction 2.2.x

## Metadata

- **Priority:** P1 (Fase 3 — Features Críticas)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_50
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§19 U22-P1-60..63, §38 UX_UI_56)
- **Affected files:**
  - `frontend/src/components/TrainingLoadWidget.tsx`
  - `frontend/src/components/TrainingLoadWidget.test.tsx`
  - `frontend/src/components/workouts/WorkoutSummaryCards.tsx`
  - `frontend/src/components/workouts/WorkoutSessionCard.tsx`
  - `frontend/src/components/ExerciseDetailModal.tsx`
  - `frontend/src/components/ExerciseDetailModal.test.tsx`
  - `docs/PLANS/UX_UI_56_TRAINING_LOAD_AND_WORKOUT_INTERACTION_2.2.0.md`

---

## 1. Problem

1. **Ausência Silenciosa de Dados Produzindo Vácuo no Dashboard (U22-P1-62):**
   - Anteriormente, quando não havia dados de carga para o dia selecionado, `TrainingLoadWidget.tsx` retornava `null`. Como o componente compartilha o grid de 2 colunas (`lg:grid-cols-2`) em `App.tsx` com `DailyComplianceWidget`, o retorno `null` gerava um buraco branco na interface, quebrando a harmonia visual e deixando o usuário sem explicação sobre o porquê de o widget não estar visível.
2. **Carga de Treino sem Semântica de Referência ou Modelo Explicado (U22-P1-61):**
   - O badge "Faixa Ótima" era exibido sem contextualizar o que a carga representa (estresse cardiovascular agudo), a janela temporal avaliada (7 dias móveis), o modelo matemático (Banister TRIMP / Firstbeat EPOC), a fonte de dados (Zepp OS) e se o limiar era fixo ou dinâmico/individualizado.
3. **Ambiguidade Terminológica entre Carga Cardiovascular e Volume de Musculação:**
   - Em `WorkoutSummaryCards.tsx`, o somatório de peso levantado (kg ou toneladas) era denominado "Carga Acumulada", colidindo com a "Carga Cardiovascular Acumulada" monitorada pelo Zepp.
4. **Controles de Mídia Inacessíveis em Demonstração de Exercícios (U22-P1-63):**
   - No modal de detalhes do exercício (`ExerciseDetailModal.tsx`), GIFs animados rodavam em loop perpétuo sem botão de pausar/reproduzir, recarregar ou anúncio de status acessível para tecnologias assistivas.
5. **Dívida Técnica de Tokens de Raio e Ícones sem `aria-hidden`:**
   - Múltiplos componentes continham classes de raio legadas (`rounded-2xl`, `rounded-xl`, `rounded-lg`) e ícones sem supressão decorativa para leitores de tela.

---

## 2. Evidence

- `TrainingLoadWidget.tsx`:
  - `const hasData = rollingLoad != null || dailyLoad != null || ...; if (!hasData) return null;`
- Vácuo comprovado em testes visuais na área `overview-context` quando métricas de carga estavam ausentes.
- `WorkoutSummaryCards.tsx`: `Carga Acumulada` exibindo `formatVolume(summary.total_volume_kg)`.
- `ExerciseDetailModal.tsx` não continha botões de reprodução ou pausa para controle do usuário.

---

## 3. User impact

- Confiabilidade visual contínua: mesmo sem dados no dia, o usuário visualiza um card informativo compacto que orienta sobre como sincronizar seu relógio Zepp OS para ativar o cálculo de carga aguda.
- Transparência atlética: compreensão exata da carga aguda (7 dias), do modelo Banister TRIMP/Firstbeat e do status dinâmico (Faixa Ótima, Abaixo da Faixa ou Sobrecarga Aguda).
- Clareza conceitual imediata separando "Volume Total de Força (kg)" de "Carga Cardiovascular".
- Acessibilidade e conforto visual: capacidade de congelar/pausar animações repetitivas de exercícios sob demanda, em total conformidade com diretrizes de sensibilidade a movimento (WCAG 2.2.2).

---

## 4. Scope

- Refatorar `TrainingLoadWidget.tsx`:
  - Substituir o retorno `null` por um placeholder compacto e informativo.
  - Implementar semântica completa de status: `Faixa Ótima` (verde), `Abaixo da Faixa` (âmbar) e `Sobrecarga Aguda` (vermelho).
  - Incluir seção colapsável com explicação detalhada do modelo (representação, janela de 7 dias, modelo Banister/Firstbeat, fonte Zepp, alvo individualizado).
  - Migrar botão para o componente `Button` do design system.
- Atualizar `WorkoutSummaryCards.tsx`:
  - Renomear rótulo para "Volume Total de Força".
  - Padronizar tokens de raio (`rounded-radius-xl`, `rounded-radius-lg`).
- Atualizar `WorkoutSessionCard.tsx`:
  - Adicionar rótulos acessíveis nos botões de mídia (`aria-label`).
  - Alinhar tokens de raio (`rounded-radius-*`) e ícones `aria-hidden`.
- Atualizar `ExerciseDetailModal.tsx`:
  - Implementar barra de controle de mídia com botões Reproduzir/Pausar e Reiniciar.
  - Adicionar suporte a canvas para congelar o quadro atual sob pausa.
  - Adicionar `role="status"` live region para leitores de tela.
  - Padronizar todos os raios com a escala do Design System.
- Criar suítes de testes unitários:
  - `TrainingLoadWidget.test.tsx` (5 testes).
  - `ExerciseDetailModal.test.tsx` (5 testes).

---

## 5. Non-goals

- Alterar a modelagem de treinos no backend SQLite ou modificar os endpoints da API do Hevy/Zepp.
- Modificar o algoritmo de cálculo de volume no backend.

---

## 6. Architecture & System Design

- **Tratamento de Ausência de Dados (U22-P1-62):**
  - Todo widget de primeiro nível no dashboard possui estado representável mesmo sem dados, mantendo o grid de layout intacto e fornecendo call-to-action educativo.
- **Semântica de Referência Dinâmica (U22-P1-61):**
  - Diferenciação clara entre referências populacionais fixas e referências dinâmicas/pessoais (calculadas por algoritmos fisiológicos com base no histórico do indivíduo).
- **Controle de Mídia e Sensibilidade a Movimento (U22-P1-63 / WCAG 2.2.2):**
  - O modal de mídia oferece congelamento de quadro via captura em `<canvas>` sob comando do usuário, respeitando usuários com sensibilidade vestibular.

---

## 7. Migration & Compatibility

- Total retrocompatibilidade com as props existentes de `TrainingLoadWidget` e `WorkoutSessionCard`.
- Redução comprovada de dívida técnica de raios no Design System (-67 em `radius.non-token`).

---

## 8. Rollback plan

- Reverter commits direcionados a `TrainingLoadWidget.tsx`, `WorkoutSummaryCards.tsx`, `WorkoutSessionCard.tsx` e `ExerciseDetailModal.tsx`.

---

## 9. Assumptions & Constraints

- A captura de quadro no `<canvas>` para congelar animações trata graciosamente eventuais restrições de CORS sem travar a interface.

---

## 10. Security considerations

- Acesso a mídias locais ou CDNs confiáveis com sanitização estrita de URLs.

---

## 11. Performance & Scalability

- Renderização estática com overhead nulo de processamento; canvas só é inicializado quando o usuário clica expressamente em Pausar.

---

## 12. Testing strategy

- Testes no Vitest:
  1. `TrainingLoadWidget.test.tsx`:
     - Renderização de EmptyState compacto quando `hasData = false` (sem `null`).
     - Renderização correta dos 4 status (Faixa Ótima, Abaixo da Faixa, Sobrecarga Aguda).
     - Expansão e colapso da explicação metodológica com validação de texto e ARIA.
  2. `ExerciseDetailModal.test.tsx`:
     - Renderização dos detalhes e foco muscular.
     - Controles de reprodução: alternância de estado Play/Pause e anúncio em live region.
     - Botão de reinício e alternância de idioma de instrução.
  3. `AccessibilityControls.test.tsx` e `WorkoutsTable.test.tsx`: validação de acessibilidade e regressão global.

---

## 13. Documentation impact

- Registro deste plano mestre em `docs/PLANS/UX_UI_56_TRAINING_LOAD_AND_WORKOUT_INTERACTION_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Eliminar retorno `null` em `TrainingLoadWidget.tsx` e implementar EmptyState compacto (U22-P1-62).
- [x] Implementar semântica de referência de carga (Faixa Ótima, Abaixo, Sobrecarga) com accordion explicativo do modelo (U22-P1-61).
- [x] Corrigir nomenclatura em `WorkoutSummaryCards.tsx` para "Volume Total de Força".
- [x] Adicionar controles de mídia (Play/Pause, Reiniciar) e status acessível em `ExerciseDetailModal.tsx` (U22-P1-63).
- [x] Padronizar tokens de raio (`rounded-radius-*`) e ícones `aria-hidden` em todos os componentes de treino.
- [x] Criar suítes de testes unitários para `TrainingLoadWidget` e `ExerciseDetailModal`.
- [x] Validar suite Vitest completa (337 testes passando), TypeScript typecheck e Design System audit.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Ausência de dados de carga renderiza estado compacto, não `null` | Aprovado | `TrainingLoadWidget.test.tsx` ("renders compact informative empty state...") |
| Explicação do modelo e status de carga acessível ao usuário | Aprovado | `TrainingLoadWidget.test.tsx` ("toggles model reference explanation...") |
| Desambiguação de Volume Total de Força vs Carga Cardiovascular | Aprovado | `WorkoutSummaryCards.tsx` inspecionado e testado |
| Controles de mídia com Play/Pause e estado acessível | Aprovado | `ExerciseDetailModal.test.tsx` ("provides media playback controls...") |
| Zero regressões de Design System (`Delta <= 0`) | Aprovado | `npm run audit:design-system` (PASS / WARN baseline mantido, -67 radius) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P1-60`, `U22-P1-61`, `U22-P1-62` e `U22-P1-63`.
- Redução de -67 ocorrências de radius não tokenizado.

---

## 17. Operational runbook

- Sem alterações em esquema de banco de dados ou rotas backend.

---

## 18. Audit log & Decision history

- **Decisão:** Optou-se por desenhar o frame do GIF em um elemento `<canvas>` quando o usuário clica em "Pausar", garantindo controle vestibular completo para usuários que necessitam interromper animações em looping contínuo sem depender de APIs proprietárias.

---

## 19. Open questions & Future work

- Na Fase 4, considerar integração de telemetria de RPE e histórico de sobrecarga progressiva com gráficos de radar.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §19 U22-P1-60..63, §38 UX_UI_56)
- **Accessibility Lead:** Aprovado (Conformidade com WCAG 2.2.2 Pause/Stop/Hide e rótulos semânticos)
- **Status:** CONCLUÍDO
