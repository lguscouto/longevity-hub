# UX_UI_54 — Laboratory UX & Derived Metrics 2.2.x

## Metadata

- **Priority:** P1 (Fase 3 — Features Críticas)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_51
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§12 U22-P1-20..26, §38 UX_UI_54)
- **Affected files:**
  - `frontend/src/components/labs/labMarkers.ts`
  - `frontend/src/components/labs/labMarkers.test.ts`
  - `frontend/src/components/labs/LabPanelDetailModal.tsx`
  - `frontend/src/components/labs/LabPanelDetailModal.test.tsx`
  - `frontend/src/components/labs/CardiovascularRatios.tsx`
  - `frontend/src/components/labs/CardiovascularRatios.test.tsx`
  - `frontend/src/components/labs/LabBatchEntryModal.tsx`
  - `frontend/src/components/labs/LabBatchEntryModal.test.tsx`
  - `frontend/src/components/LabResultsTable.tsx`
  - `docs/PLANS/UX_UI_54_LABORATORY_UX_AND_DERIVED_METRICS_2.2.0.md`

---

## 1. Problem

1. **Reintrodução de Inputs Nativos em Modal de Lote (U22-P1-20):**
   - O `LabBatchEntryModal.tsx` usava tags `<input type="date">` e `<input type="number">` nativas não estilizadas, violando a regra de primitive controls do Design System e inflando a dívida técnica de `native.input`.
2. **Validação Silenciosa sem Feedback Individual de Erro (U22-P1-21):**
   - No modal em lote, valores inválidos ou negativos eram ignorados silenciosamente ou convertidos para `NaN` sem mensagem de erro acessível no campo.
3. **"Fora da Meta Ótima" Classificado Falsamente como "Atenção Clínica" (U22-P1-22):**
   - Em `LabPanelDetailModal.tsx` e `LabResultsTable.tsx`, qualquer resultado fora do alvo funcional de longevidade era automaticamente rotulado como "Atenção". Se um paciente apresentasse Glicose de 92 mg/dL (perfeitamente normal pelo laboratório de 70 a 99 mg/dL, mas com meta funcional de 85 mg/dL), a interface sinalizava perigo/atenção clínica, gerando ansiedade no paciente e ruído diagnóstico.
4. **Registros "Não Clínicos" sem Motivo ou Proveniência (U22-P1-23):**
   - Exames sem validação clínica de laudo exibiam o texto "Não clínico" sem esclarecer que estavam fora do conjunto auditado.
5. **Referência Ótima sem Proveniência Científica (U22-P1-24):**
   - Metas de longevidade não citavam fontes, diretrizes ou modelos de consenso preventivo.
6. **Heurística Frágil de String Matching em `isMarkerOptimal` (U22-P1-25):**
   - A avaliação de metas ótimas comparava apenas strings parciais do nome da métrica, tratando marcadores de faixa (`range`, ex: glicose, TSH) como unidirecionais.
7. **Falta de Marcação Explícita de "CALCULADO" nas Razões Cardiovasculares (U22-P1-26):**
   - As razões ApoB/ApoA1, Triglicérides/HDL e Colesterol Remanescente não indicavam com clareza visual que eram métricas derivadas e não traziam as fórmulas sob demanda.

---

## 2. Evidence

- `LabBatchEntryModal.tsx` continha múltiplos `<input>` nativos e sem anotações de erro nos campos.
- `LabPanelDetailModal.tsx`:
  - `const isOpt = isEligible && isMarkerOptimal(item);`
  - `isOpt ? 'Ótimo' : !isEligible ? 'Não clínico' : 'Atenção'` (induzindo falso diagnóstico).
- `LabResultsTable.tsx`:
  - `attentionCount = clinicalCount - optimalCount;` (todo exame não ótimo contava como atenção).
- `CardiovascularRatios.tsx` exibia razões numéricas sem badges de derivação ou fórmulas matemáticas visíveis.

---

## 3. User impact

- Clareza clínica e segurança médica: pacientes e médicos agora diferenciam facilmente exames **Ótimos** (longevidade preventiva), **Na referência** (normais no laboratório clínico convencional) e **Atenção clínica** (fora dos limites laboratoriais de segurança).
- Transparência total sobre a proveniência dos alvos preventivos (Peter Attia, AHA, ESC, consenso endocrinológico).
- Identificação inequívoca de métricas calculadas (`CALCULADO`) com fórmulas explícitas sob demanda.
- Interface de cadastro em lote consistente com o Design System, com validação instantânea e acessível.

---

## 4. Scope

- Enriquecer `labMarkers.ts`:
  - Tipagem `OptimalRule = 'max' | 'min' | 'range' | 'unavailable'`.
  - Atributos `optimal_rule`, `optimal_max` e `provenance` em `MarkerMeta`.
  - Função `getLabMarkerStatus(lab)` retornando `'optimal' | 'in_clinical_range' | 'out_of_range' | 'not_eligible'`.
  - Função `isMarkerWithinClinicalRange(lab)` e formatação explicativa `formatOptimalTargetText`.
- Refatorar `LabPanelDetailModal.tsx` exibindo badges canônicos discriminados e proveniência científica.
- Refatorar `CardiovascularRatios.tsx` adicionando tag `CALCULADO` e fórmulas (`ApoB ÷ ApoA1`, `Triglicérides ÷ HDL`, `Total - HDL - LDL`).
- Migrar `LabBatchEntryModal.tsx` para os primitivos `Input` e `FormField` com validação de limites numéricos e estados de erro.
- Atualizar a contagem agregada em `LabResultsTable.tsx` para exibir "Ótimos", "Na referência" e "Atenção clínica".
- Criar suítes de testes unitários para todos os componentes afetados.

---

## 5. Non-goals

- Alterar os modelos do banco de dados no SQLite ou a rota backend de persistência de laudos.
- Modificar o algoritmo de PhenoAge (coberto em seu módulo dedicado).

---

## 6. Architecture & System Design

- **Hierarquia de Status Laboratorial:**
  1. `not_eligible`: Origem do registro não validada clinicamente (ex.: entrada manual livre, fixture, demonstração).
  2. `optimal`: Atende estritamente à meta funcional de longevidade (`isMarkerOptimal`).
  3. `in_clinical_range`: Não atinge o alvo ótimo preventivo, porém está dentro do intervalo populacional padrão do laboratório (`ref_min` a `ref_max`).
  4. `out_of_range`: Fora do intervalo populacional de referência clínica convencional (requer avaliação médica).
- **Métricas Derivadas:**
  - Marcadas visualmente com o badge `Calculado` e fórmula expressa em tipografia monoespacial semântica.
- **Formulários Padronizados:**
  - Migração de `<input>` nativo para `<Input>` com `aria-invalid` e `<FormField>` com `aria-describedby` para erros acessíveis via leitor de tela.

---

## 7. Migration & Compatibility

- Total retrocompatibilidade com laudos anteriores salvos no banco.
- Nenhum campo obrigatório removido de `LabResult`.
- Redução de dívida de controles nativos (`native.input` reduzido de 7 para 5).

---

## 8. Rollback plan

- Reverter commits direcionados a `frontend/src/components/labs/` e `frontend/src/components/LabResultsTable.tsx`.

---

## 9. Assumptions & Constraints

- Laudos médicos importados ou digitados preservam suas unidades padronizadas (mg/dL, %, uIU/mL, etc.).
- A regra de normalidade clínica respeita `ref_min` e `ref_max` do exame quando informados no laudo, recorrendo ao catálogo padrão como fallback.

---

## 10. Security considerations

- Validação estrita de valores numéricos impede injeção de strings ou números anômalos.

---

## 11. Performance & Scalability

- Funções puras em `labMarkers.ts` com lookup em `Map` O(1) por chave normalizada (`normalizeLabMetricKey`).

---

## 12. Testing strategy

- Testes no Vitest:
  1. `labMarkers.test.ts`: 10 testes cobrindo regras max, min, range, segregação de status clínico e formatação.
  2. `CardiovascularRatios.test.tsx`: validação de cálculos matemáticos, badges `Calculado` e fórmulas.
  3. `LabPanelDetailModal.test.tsx`: renderização dos 4 status segregados sem falso alarme de atenção.
  4. `LabBatchEntryModal.test.tsx`: validação de inputs migrados, erro de número negativo e bloqueio de submit.
  5. `LabResultsTable.test.tsx`: teste de integração e normalização de chaves.

---

## 13. Documentation impact

- Registro deste plano em `docs/PLANS/UX_UI_54_LABORATORY_UX_AND_DERIVED_METRICS_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Implementar regras explícitas (`max`, `min`, `range`) e proveniência em `labMarkers.ts`.
- [x] Criar `getLabMarkerStatus` discriminando `optimal`, `in_clinical_range`, `out_of_range` e `not_eligible`.
- [x] Atualizar `LabPanelDetailModal.tsx` com badges segregados e fonte da meta preventiva.
- [x] Adicionar tag `CALCULADO` e fórmulas em `CardiovascularRatios.tsx`.
- [x] Migrar `LabBatchEntryModal.tsx` para `Input` e `FormField` com validação de dados.
- [x] Atualizar contagens em `LabResultsTable.tsx`.
- [x] Eliminar microtexto `[10px]` e `[11px]`.
- [x] Criar testes unitários (14 testes em `src/components/labs/` + 6 testes em `LabResultsTable.test.tsx`).
- [x] Validar conformidade de build, typecheck e auditoria de design system.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Exame na referência laboratorial não vira "Atenção" | Aprovado | `LabPanelDetailModal.test.tsx` e `labMarkers.test.ts` |
| Exame não clínico indica motivo de proveniência | Aprovado | `LabPanelDetailModal.tsx` e `labMarkers.test.ts` |
| Regras explícitas de otimalidade (range, max, min) | Aprovado | `labMarkers.test.ts` (10 testes passando) |
| Tag CALCULADO e fórmula em CardiovascularRatios | Aprovado | `CardiovascularRatios.test.tsx` |
| Migração de inputs para Input e FormField com validação | Aprovado | `LabBatchEntryModal.test.tsx` |
| Zero regressões de microtexto no design system | Aprovado | `npm run audit:design-system` (PASS) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P1-20`, `U22-P1-21`, `U22-P1-22`, `U22-P1-23`, `U22-P1-24`, `U22-P1-25` e `U22-P1-26`.
- Reduzida a dívida de `native.input` e raios não canônicos (`-17` raios fora de token).

---

## 17. Operational runbook

- Sem impactos de deploy ou migração de banco de dados.

---

## 18. Audit log & Decision history

- **Decisão:** Separou-se categoricamente a referência populacional padrão do laboratório clínico convencional (exames normais) da meta preventiva otimizada para longevidade funcional (alvo ótimo), eliminando ansiedade diagnóstica indevida.

---

## 19. Open questions & Future work

- Na Fase 4, explorar gráficos de tendência temporal por biomarcador dentro do modal do laudo.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §12, §38)
- **Clinical Informatics:** Aprovado (Segregação semântica estrita de normalidade clínica vs metas preventivas)
- **Status:** CONCLUÍDO
