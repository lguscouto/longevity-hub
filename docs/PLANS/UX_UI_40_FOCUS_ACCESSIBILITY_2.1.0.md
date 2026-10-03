# UX/UI 40 — Foco, Acessibilidade, Modal Stacking e Reduced Motion

## Metadata

- **Priority:** P1
- **Phase:** 2 — Interação
- **Status:** Concluído
- **Dependencies:** UX_UI_36, UX_UI_39
- **Master:** UX21-P1-11, UX21-P1-12, UX21-P2-02, UX21-P2-04, §64–§68, §121
- **Affected files:** `src/hooks/useFocusTrap.ts`, `src/hooks/useFocusTrap.test.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/Drawer.tsx`, `src/components/ui/Toast.tsx`, `src/components/contextInsights/InsightDrawer.tsx`, `src/components/contextInsights/PersonalAssociationsCard.tsx`, `src/components/physicalAssessments/usePhysicalAssessments.ts`, `src/test/reducedMotion.test.ts`, `e2e/focus-stacking.spec.ts`

## Problem

1. `focus:outline-none`: 18 sem anel de foco visível residuais da v2.0.0.
2. `Drawer → Modal → ConfirmDialog` empilhados sem teste de foco/z-index e sem garantia de que apenas o topo escuta Escape/Tab.
3. Reduced-motion em `index.css` sem teste de contrato e sem validação e2e.
4. Risco de `aria-label` genérico ("button").
5. `alert(` nativo em 4 locais de catch/exclusão.

## Evidence

- `git grep -n "\balert(" src/` revelou 4 ocorrências:
  - `InsightDrawer.tsx:88`
  - `PersonalAssociationsCard.tsx:61`
  - `usePhysicalAssessments.ts:407`
  - `usePhysicalAssessments.ts:422`
- Auditoria do design system indicava necessidade de anéis `focus-visible:ring-2` padronizados.

## User impact

Usuários navegando por teclado (Tab/Shift+Tab/Escape) e leitores de tela nunca perdem o foco visual; diálogos empilhados fecham ordenadamente camada por camada; usuários com sensibilidade vestibular têm todas as transições e animações zeradas sob `prefers-reduced-motion: reduce`.

## Scope & Implementation

1. **Pilha Global de Overlays (`useFocusTrap.ts`):**
   - Criação de pilha LIFO (`activeOverlayStack`).
   - Apenas o overlay do topo (`topOverlay`) captura Tab e responde a `Escape`.
   - Scroll do `document.body` bloqueado enquanto houver qualquer overlay aberto, restaurando apenas quando a pilha estiver vazia.
   - Suporte a fechamento gracioso em navegação SPA (`popstate`, `hashchange`).
   - Foco seguro de fallback no próprio container quando o modal não contém elementos focáveis.
2. **Escala Determinística de Z-Index:**
   - `Drawer`: `z-40`
   - `Modal`: `z-50` (com prop `zIndex` configurável)
   - `ConfirmDialog`: `role="alertdialog"` com `z-[60]`
   - `ToastContainer`: `z-[70]`
3. **Eliminação de 100% dos `alert(` nativos:**
   - Substituídos por `useToast()` com notificações acessíveis (`role="status"`, `aria-live="polite"`).
4. **Verificação de `aria-label`:**
   - Todos os labels auditados e verificados como semanticamente descritivos.
5. **Reduced Motion (WCAG 2.3.3):**
   - Criação de `src/test/reducedMotion.test.ts` comprovando as regras de `@media (prefers-reduced-motion: reduce)`.
   - Criação de suíte E2E Playwright `e2e/focus-stacking.spec.ts` validando o comportamento real em Chromium e Pixel 7 Mobile.

## Acceptance criteria

- [x] `focus.outline-none` isolados = 0 (Audit PASS).
- [x] Teste de pilha de 3 overlays PASS (`useFocusTrap.test.tsx` com Drawer -> Modal -> ConfirmDialog).
- [x] Teste reduced-motion PASS (`reducedMotion.test.ts` e Playwright `focus-stacking.spec.ts`).
- [x] Zero `aria-label` genérico.
- [x] Zero `alert(` (100% substituídos por `showToast`).

## Evidence of execution

- **Vitest Unit & Component Suite:**
  - 49 test files passed (49/49)
  - 232 tests passed (232/232)
- **Playwright E2E Suite (`e2e/focus-stacking.spec.ts`):**
  - 6 passed (Desktop Chromium & Mobile Pixel 7)
- **Vite Production Build:**
  - Concluído com código 0 (sucesso absoluto).
- **Quick Evidence Verification (`python scripts/verify_evidence.py --quick`):**
  - Exit code 0 (PASS).

## Definition of Done

- [x] código + testes + e2e PASS
- [x] evidência registrada
