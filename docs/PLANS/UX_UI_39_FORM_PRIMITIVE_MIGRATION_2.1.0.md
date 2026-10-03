# UX/UI 39 — Migração para Primitives de Formulário

## Metadata

- **Priority:** P1
- **Phase:** 2 — Interação
- **Status:** Concluído
- **Dependencies:** UX_UI_35
- **Master:** UX21-P1-10, §51–§54 (Button/IconButton/FormField/erros)
- **Affected files:** `AssessmentWizard.tsx`, `EditAssessmentModal.tsx`, `AddHealthEventModal.tsx`, `ProfileView.tsx`, `NOf1Tracker.tsx`, `AISettingsModal.tsx`, `ExerciseDetailModal.tsx`, `Timeline*`, `Supplements*`, `ui/Select.tsx`, `ui/Textarea.tsx`, `ui/FormField.tsx`, `WorkoutsView.tsx`, `AICopilotView.tsx`, `InsightDrawer.tsx`, `PersonalAssociationsCard.tsx`, `ProtocolCatalogView.tsx`, `ExerciseCatalogView.tsx`

## Problem

Existiam `Input`, `Select`, `Textarea`, `FormField`, mas a adoção era mínima: `<Input>` 9, `<FormField>` 9, `<Select>` 0, `<Textarea>` 0, `<Button>` 0 fora de `ui/`. Persistiam 59 `<input>`, 28 `<select>`, 3 `<textarea>` e 207 `<button>` nativos.

## Evidence

Auditoria `node scripts/audit-design-system.mjs`:
- Antes: `native.select` = 28, `native.textarea` = 3, `native.input` = 59, `native.button` = 207.
- Depois: `native.select` = 0, `native.textarea` = 0, `native.input` = 7 (exceções técnicas justificadas), `native.button` = 99 (meta ≤ 120 alcançada com folga!).

## User impact

Alturas, foco, anel focus-visible, estados de loading com spinners padronizados e acessibilidade de labels regularizados em todos os fluxos críticos.

## Scope & Execution Waves

1. **Wave 1 (Timeline & Eventos Clínicos):** Migração de inputs, selects e botões em `TimelineView.tsx` e `AddHealthEventModal.tsx`.
2. **Wave 2 (Avaliação Física):** Migração completa dos assistentes e modais clínicos `AssessmentComparison.tsx`, `AddPhotosModal.tsx`, `EditAssessmentModal.tsx`, `AssessmentWizard.tsx`, `AssessmentDetails.tsx`.
3. **Wave 3 (Suplementos, N-of-1 e Widgets):** Migração de `SupplementModals.tsx`, `SupplementStackWidget.tsx`, `NOf1Tracker.tsx`, `SleepFilters.tsx`, `SleepMonthlyTable.tsx`, `ProtocolCatalogView.tsx`, `AuditHistoryView.tsx`.
4. **Wave 4 (Configurações, Perfil e Modais):** Migração de `ProfileView.tsx`, `AISettingsModal.tsx`, `GoogleHealthAuthModal.tsx`, `ExerciseDetailModal.tsx`.
5. **Wave 5 (Busca, Ações Principais e Secundárias):** Migração dos inputs de busca e botões em `ExerciseCatalogView.tsx`, `WorkoutsView.tsx`, `WorkoutsTable.tsx`, `DataQualityPanel.tsx`, `CGMDashboard.tsx`, `AICopilotView.tsx`, `LabResultsTable.tsx`, `DoctorBriefingModal.tsx`, `SupplementsView.tsx`, `TimelineDayView.tsx`, `InsightDrawer.tsx`, `PersonalAssociationsCard.tsx`.

## Taxonomia dos 99 `<button>` Remanescentes

Conforme master §51, os botões nativos remanescentes são restritos aos seguintes casos de uso legítimos de interação e semântica acessível:
1. **Abas Segmentadas & Seletores de Modo (Tabs / Segmented Controls):**
   - `AICopilotView.tsx` (3 abas de tarefas: Analisar Tendências, Conversar Copiloto, Histórico de Relatórios)
   - `ProfileView.tsx` (3 sub-áreas: Meu Perfil, Integrações, Diagnóstico)
   - `PhysicalAssessmentsView.tsx` (3 abas: Nova Avaliação, Histórico, Comparação)
   - `WorkoutsView.tsx` (2 abas: Histórico de Treinos, Biblioteca de Exercícios)
   - `AISettingsModal.tsx` (2 abas: IA, Hevy)
   - `ProtocolCatalogView.tsx` (3 abas de filtro: Todos, Suplemento, Hormônio)
   - `SleepFilters.tsx` / `SleepMonthlyTable.tsx` (pills de filtro temporal)
2. **Controles de Seleção Exclusiva / Radiogroup:**
   - `AISettingsModal.tsx` (2 botões com `role="radio"` para Tema Claro / Escuro; seletor de card de provedor)
   - `DailyCheckinCard.tsx` (5 botões da escala Likert 1 a 5 de avaliação clínica do dia com `aria-pressed`)
3. **Gatilhos de Detalhe Clínico e Explicação Contextual (Inline Triggers):**
   - `TimelineDayView.tsx` (4 gatilhos de explicação para sono, HRV, FC de Repouso e Peso)
   - `BodyCompositionChart.tsx`, `DateNavigator.tsx`, `PhenoAgeWidget.tsx`, `WorkoutsTable.tsx` (gatilhos compactos de visualização/ordenação)
4. **Primitives de Acessibilidade & Shell:**
   - Primitives base (`Button.tsx`, `IconButton.tsx`, `PhotoLightbox.tsx`, `ErrorState.tsx`, `TermHelp.tsx`, `Header.tsx`).

## Justificativa Técnica dos 7 `<input>` Remanescentes

1. `src/components/CGMDashboard.tsx:85`: `<input type="file" ref={fileInputRef} className="hidden" />` (upload Dexcom/Libre CSV).
2. `src/components/DateNavigator.tsx:76`: `<input type="date" ref={dateInputRef} className="sr-only" />` (trigger oculto do seletor de data nativo do navegador).
3. `src/components/LabResultsTable.tsx:650`: `<input type="date" />` (seletor de data em modal batch lab).
4. `src/components/LabResultsTable.tsx:684`: `<input type="number" />` (matriz dinâmica de valores de biomarcadores laboratoriais).
5. `src/components/physicalAssessments/AddPhotosModal.tsx:66`: `<input type="file" ref={fileInputRef} className="hidden" />` (upload de fotos de avaliação física).
6. `src/components/physicalAssessments/AssessmentWizard.tsx:311`: `<input type="file" ref={fileInputRef} className="hidden" />` (upload de fotos no wizard de avaliação física).
7. `src/components/timeline/TimelineView.tsx:248`: `<input type="checkbox" />` (toggle semântico "Apenas significativas").

## Acceptance criteria

- [x] `native.select` = 0 (Atingido: **0**).
- [x] `native.textarea` = 0 (Atingido: **0**).
- [x] `native.input` ≤ 10 (Atingido: **7**, 100% justificados).
- [x] `native.button` ≤ 120 (Atingido: **99**, com taxonomia documentada).
- [x] 100% dos inputs com label acessível.

## Evidence of execution

- **Design System Audit:**
  ```text
  Rule                        Open   Exc.  Base   Status
  native.button               99     0     99     WARN
  native.input                7      0     7      WARN
  native.select               0      0     0      PASS
  native.textarea             0      0     0      PASS
  ```
- **Vitest Suite:** 48/48 arquivos de teste passaram, 225/225 testes unitários passaram (100% PASS).
- **Vite Production Build:** Concluído com código 0 (sucesso absoluto).
- **Evidence Verification:** `python scripts/verify_evidence.py --quick` com saída PASS (exit code 0).
- **Baseline Ratchet:** Atualizado em `frontend/audit-baseline.json`.

## Definition of Done

- [x] código + testes + audit sem FAIL
- [x] baseline reduzido (ratchet down aplicado)
- [x] evidência registrada
