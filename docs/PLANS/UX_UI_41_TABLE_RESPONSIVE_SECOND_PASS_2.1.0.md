# UX/UI 41 — Tabelas Responsivas (segunda passada) e Modularização Residual

## Metadata

- **Priority:** P1
- **Phase:** 3 — Data UX
- **Status:** Concluído (03/10)
- **Dependencies:** UX_UI_38, UX_UI_40
- **Master:** UX21-P1-13, §28–§31, §80, §108
- **Affected files:** `WorkoutsTable.tsx`, `LabResultsTable.tsx`, `SleepMonthlyTable.tsx`, `SleepStagesChart.tsx`, `ProtocolCatalogView.tsx`, `SupplementAnalysisView.tsx`, `PersonalAssociationsCard.tsx`, `ConfounderBalanceModal.tsx`, `WorkoutsView.tsx` (reduzido de 830 para 446 linhas), `LabResultsTable.tsx` (reduzido de 718 para 297 linhas)

## Problem

22 `overflow-x-auto` em 17 arquivos; plano 31 prometia "zero overflow horizontal em qualquer listagem" (falso). `WorkoutsTable` usa `block md:table-cell` (layout difícil de prever). Planos 22/31 PARTIAL: `WorkoutsView` 816 e `LabResultsTable` 708 linhas excedem o critério de 600.

## Evidence

Contagem por arquivo (índice); linhas medidas.

## User impact

Em mobile, colunas clinicamente relevantes podem sumir ou exigir scroll lateral sem indício.

## Scope

1. Inventariar as 8 `<table>` e as 22 ocorrências de `overflow-x-auto`; classificar: **legítima** (gráfico, header de tabs), **tabela clínica** (→ Row Card), **auditoria densa** (scroll com coluna primária fixa + indicação).
2. Desktop = tabela (comparabilidade); mobile = Row Card com campos prioritários (Labs: biomarcador, valor, status, data; Sleep: data, duração, eficiência, profundo, REM) e detalhes expansíveis.
3. Substituir a técnica `block md:table-cell` por componente desktop + componente mobile (ou Row Card semântico) em `WorkoutsTable`.
4. Acessibilidade de tabela: `caption`, `th scope`; Row Cards com `aria-label` e semântica equivalente.
5. Dividir `WorkoutsView` e `LabResultsTable` abaixo de 600 linhas.

## Non-goals

Mudar fonte dos dados; remover colunas (apenas progressive disclosure — §136).

## Proposed solution

Primitive `ResponsiveDataTable` (ou padrão documentado) com `columns` + `priority` + `renderCard`; migração tabela por tabela.

## Component changes

Novo padrão/primitive; subcomponentes extraídos.

## Token changes

Nenhum.

## Accessibility

Navegação por leitor de tela equivalente entre tabela e card.

## Responsive behavior

Validar na matriz do 38 (320–414).

## Data semantics

Nenhuma coluna clínica desaparece sem mecanismo de acesso (§30).

## Tests

Vitest: renderiza tabela ≥md e cards <md com os mesmos dados; e2e mobile-audit sem overflow.

## Visual QA

Labs, Sleep, Workouts em 375 e 1280, dark/light.

## Acceptance criteria

- [x] `overflow-x-auto` restantes: todos justificados (coluna primária + indicação visual).
- [x] Nenhuma tela > 600 linhas (exceto AICopilot → 42).
- [x] `caption`/`th scope` nas tabelas.

## Evidence of execution

1. **Primitive `ResponsiveDataTable` e Hook `useMediaQuery`:**
   - Criado `frontend/src/hooks/useMediaQuery.ts` com suporte robusto a SSR/jsdom (fallback `true` para desktop).
   - Criado `frontend/src/components/ui/ResponsiveDataTable.tsx`: renderização desktop via `<table>` com `caption`, `th scope="col"`, `th scope="row"`, `stickyFirstColumn` e indicador de rolagem `MoveHorizontal`; renderização mobile via `<ul>` semântico de cards `<article>` com slots `primary`, `secondary`, `detail` e progressive disclosure em `<details>`.
   - Criado `frontend/src/components/ui/ResponsiveDataTable.test.tsx` com 4 testes unitários cobrindo semântica desktop, row cards mobile, disclosure expansível e isolamento de cliques (100% PASS).
2. **Substituição de `block md:table-cell` e refatoração de tabelas:**
   - `WorkoutsTable.tsx`: migrado para `ResponsiveDataTable` com colunas canônicas e semântica nativa.
   - `SleepMonthlyTable.tsx`: migrado para `ResponsiveDataTable` com subcomponentes puros de célula.
   - `LabResultsTable.tsx`: migrado para `ResponsiveDataTable` com status clínico padronizado.
3. **Modularização e redução de arquivos > 600 linhas:**
   - `LabResultsTable.tsx`: reduzido de 718 para **297 linhas**. Extraídos: `labMarkers.ts`, `CardiovascularRatios.tsx`, `LabPanelDetailModal.tsx`, `LabBatchEntryModal.tsx`.
   - `WorkoutsView.tsx`: reduzido de 830 para **446 linhas**. Extraídos: `WorkoutSummaryCards.tsx`, `WorkoutSessionCard.tsx`.
4. **Semântica e acessibilidade em tabelas Markdown e modais:**
   - Inseridos `<caption className="sr-only">` e `th scope="col"` em `SupplementAnalysisView.tsx`, `SupplementStackWidget.tsx`, `ConfounderBalanceModal.tsx` e `AICopilotView.tsx`.
5. **Correção de layout no viewport iPad Portrait (768px):**
   - Em `DateNavigator.tsx`, alterado container para `lg:flex-row` para acomodar controles de data sem gerar overflow horizontal em 768px.
6. **Métricas de validação:**
   - `npm run test:run`: 52 arquivos de teste, 263 testes PASS (100%).
   - `npm run audit:design-system`: PASS (ratchet down: `radius.non-token: 478`, `native.button: 98`).
   - `npm run build`: PASS (Vite exit code 0).
   - `npx playwright test --config=e2e/playwright.config.ts e2e/viewport-matrix.spec.ts --project=chromium`: 8/8 viewports PASS (320px até 1280px).

## Rollback

Tabela por commit.

## Definition of Done

- [x] código + testes + e2e PASS
- [x] evidência registrada
