# UX_UI_50 — Accessibility Controls & Overlay QA 2.2.x

## Metadata

- **Priority:** P1 (Fase 2 — Acessibilidade e Dados)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§14 U22-P1-33..38, §15 U22-P1-39..43, §38 UX_UI_50)
- **Affected files:**
  - `frontend/tailwind.config.js`
  - `frontend/src/components/Header.tsx`
  - `frontend/src/components/ExerciseCatalogView.tsx`
  - `frontend/src/components/supplements/RoutineTodayView.tsx`
  - `frontend/src/components/SupplementStackWidget.tsx`
  - `frontend/src/components/sleep/SleepStagesChart.tsx`
  - `frontend/src/components/workouts/WorkoutSessionCard.tsx`
  - `frontend/src/components/ui/TermHelp.tsx`
  - `frontend/src/components/ui/AccessibilityControls.test.tsx`
  - `frontend/src/components/SupplementsView.test.tsx`
  - `docs/DESIGN_SYSTEM_EXCEPTIONS.md`
  - `docs/PLANS/UX_UI_50_ACCESSIBILITY_CONTROLS_AND_OVERLAY_QA_2.2.0.md`

---

## 1. Problem

1. **Interações em elementos não semânticos (U22-P1-34..38):**
   - Diversos componentes utilizavam `<div onClick>` sem semântica nativa, sem teclado (`Enter`/`Space`), sem anel de foco e invisíveis para leitores de tela (`ExerciseCatalogView`, `SleepStagesChart`, `WorkoutSessionCard`).
   - `RoutineTodayView` utilizava `<div role="button">` contendo um `<button>` aninhado desnecessário (violação da especificação HTML e de acessibilidade para elementos interativos aninhados).
   - `SupplementStackWidget` continha um container clicável colidindo com o `IconButton` de deleção, causando problemas de foco e cliques acidentais.
   - `TermHelp` com filhos de texto não possuía suporte a ativação por teclado (`onKeyDown` Enter/Space).
2. **Escala descontrolada de z-index (U22-P1-41):**
   - Valores arbitrários de `z-index` nos componentes (`z-40` no Header colidindo com `z-40` no Drawer; `z-50`, `z-[60]`, `z-[70]`), sem contrato formal no Tailwind.
3. **Modal stacking e escape não intencional (U22-P1-40, U22-P1-43):**
   - Necessidade de garantia de ciclo de foco, contenção e restauração de foco em múltiplos overlays abertos simultaneamente.

---

## 2. Evidence

- Inspecção em `ExerciseCatalogView.tsx` revelou card clicável em `div` abrindo modal de detalhe.
- `WorkoutSessionCard.tsx` utilizava `div` para expandir/recolher a sessão e para abrir o modal de animação do exercício.
- `SleepStagesChart.tsx` possuía labels do eixo X interativos em `div` sem teclado.
- `RoutineTodayView.tsx` tinha `<button>` aninhado em `<div role="button">`.
- `tailwind.config.js` não definia a escala formal de `zIndex`.

---

## 3. User impact

- Usuários dependentes de navegação por teclado e tecnologias assistivas (leitores de tela como NVDA/JAWS/TalkBack) conseguem navegar, expandir treinos, inspecionar dados de sono e marcar doses com foco visível e retorno auditivo adequado (`aria-pressed`, `aria-expanded`).
- Eliminação de colisões de empilhamento entre Header, Drawer, Modais e Toasts.

---

## 4. Scope

- Definir a escala canônica de `zIndex` em `frontend/tailwind.config.js`:
  - `base: '0'`
  - `sticky: '20'`
  - `dropdown: '30'`
  - `drawer: '40'`
  - `modal: '50'`
  - `confirm: '60'`
  - `toast: '70'`
- Atualizar `Header.tsx` para usar `z-sticky` em vez de `z-40`, assegurando que o Drawer (`z-40`) sobreponha o Header com backdrop.
- Migrar interações em `div` para botões acessíveis com `focus-visible` em:
  - `ExerciseCatalogView.tsx`
  - `RoutineTodayView.tsx` (desfazendo o aninhamento inválido e unificando em um único botão com `aria-pressed`)
  - `SupplementStackWidget.tsx` (separando o botão de dose do botão de deleção)
  - `SleepStagesChart.tsx` (eixo X e barras com foco/teclado)
  - `WorkoutSessionCard.tsx` (header com `aria-expanded` e gatilho de mídia com `aria-label`)
  - `TermHelp.tsx` (suporte a `Enter` e `Space` no gatilho inline)
- Registrar exceções legítimas `DSX-012` a `DSX-016` em `docs/DESIGN_SYSTEM_EXCEPTIONS.md` para cards/gatilhos nativos compostos.
- Criar suíte de testes unitários dedicada em `AccessibilityControls.test.tsx`.

---

## 5. Non-goals

- Refatoração dos controles de compliance diário (escopo específico de `UX_UI_52`).
- Ações interativas em linhas da tabela de exames (escopo específico de `UX_UI_53`).
- Redesenho visual das telas (escopo da Fase 4).

---

## 6. Architecture

- **Taxonomia de Controles Interativos:** Controles primários e simples usam os primitives `Button` ou `IconButton`. Controles estruturais compostos (cards inteiros clicáveis, acordeões de treinos, ticks de gráficos) usam `<button type="button">` semântico, com atributos ARIA adequados (`aria-expanded`, `aria-pressed`, `aria-label`), estilos de foco canônicos (`focus-visible:ring-2 focus-visible:outline-none`) e registro formal no repositório de exceções de design system quando fora de `components/ui/`.
- **Hierarquia de Camadas Z-Index:** O contrato no Tailwind centraliza a profundidade em múltiplos de 10 (base 0, sticky 20, dropdown 30, drawer 40, modal 50, confirm 60, toast 70), eliminando conflitos de renderização e sobreposições acidentais.

---

## 7. Dependencies

- `UX_UI_48` (Tokens canônicos de raio e superfícies).

---

## 8. File changes

- `frontend/tailwind.config.js`: adição da escala `zIndex`.
- `frontend/src/components/Header.tsx`: aplicação de `z-sticky`.
- `frontend/src/components/ExerciseCatalogView.tsx`: card de exercício migrado de `div` para `<button type="button">` com `DSX-012`.
- `frontend/src/components/supplements/RoutineTodayView.tsx`: consolidação em botão único acessível.
- `frontend/src/components/SupplementStackWidget.tsx`: extração do toggle de dose em botão independente com `DSX-013`.
- `frontend/src/components/sleep/SleepStagesChart.tsx`: barra e labels com foco, teclado e `DSX-014`.
- `frontend/src/components/workouts/WorkoutSessionCard.tsx`: acordeão (`DSX-015`) e mídia (`DSX-016`) migrados para botões nativos.
- `frontend/src/components/ui/TermHelp.tsx`: adição de ativação por teclado Enter/Space.
- `frontend/src/components/ui/AccessibilityControls.test.tsx`: novo arquivo com 5 testes unitários.
- `frontend/src/components/SupplementsView.test.tsx`: ajuste do seletor de teste para o botão nativo.
- `docs/DESIGN_SYSTEM_EXCEPTIONS.md`: inclusão das exceções `DSX-012` a `DSX-016`.

---

## 9. Step-by-step

1. Inserir a escala `zIndex` em `tailwind.config.js`.
2. Atualizar `Header.tsx` para `z-sticky`.
3. Refatorar interações em `ExerciseCatalogView.tsx`.
4. Refatorar `RoutineTodayView.tsx` removendo botões aninhados.
5. Refatorar `SupplementStackWidget.tsx` separando botões de toggle e exclusão.
6. Acessibilizar `SleepStagesChart.tsx` (barras e labels X).
7. Refatorar cabeçalho e miniatura em `WorkoutSessionCard.tsx`.
8. Suportar teclado no gatilho de `TermHelp.tsx`.
9. Documentar exceções `DSX-012` a `DSX-016` em `docs/DESIGN_SYSTEM_EXCEPTIONS.md`.
10. Criar e rodar testes de acessibilidade e checagem de conformidade de design system.

---

## 10. Test strategy

- **Testes Unitários:** `AccessibilityControls.test.tsx` cobre `WorkoutSessionCard` (expandir e mídia), `RoutineTodayView` (sem botões aninhados e com `aria-pressed`), `TermHelp` (teclado Enter/Space) e tokens de `zIndex`.
- **Regressão de Design System:** `node scripts/audit-design-system.mjs` executado para verificar Delta zero em todas as regras.
- **Suíte Completa:** `npm run test:run` (288 testes passando).

---

## 11. Accessibility

- Conformidade com WCAG 2.1 AA (Critérios 2.1.1 Teclado, 2.4.7 Foco Visível, 4.1.2 Nome, Função e Valor).
- Eliminação de elementos interativos aninhados inválidos.
- Suporte explícito a estados com `aria-pressed` e `aria-expanded`.

---

## 12. Responsive behavior

- Cards e acordeões mantêm flexibilidade fluida em telas pequenas (`320px` a `1280px`).
- Z-index estruturado garante que drawers em mobile cubram o header sem vazamentos visuais.

---

## 13. Security / Privacy

- Nenhuma alteração em chamadas de rede ou persistência de dados sensíveis.

---

## 14. Performance

- Uso de elementos nativos do navegador (`<button>`) oferece melhor performance de evento do que listeners manuais em `div` com emulação de foco.

---

## 15. Rollback plan

- Reverter commits associados ao `UX_UI_50` via `git revert`.

---

## 16. Validation evidence

- `npm run typecheck`: PASS (0 erros).
- `npm run build`: PASS (bundle gerado com sucesso em 5.84s).
- `npm run test:run`: PASS (288 testes unitários passando em 54 arquivos).
- `node scripts/audit-design-system.mjs`: PASS/WARN com 0 erros (zero FAIL, deltas em zero).

---

## 17. Acceptance checklist

- [x] Contrato de zIndex formalizado em `tailwind.config.js`
- [x] Header atualizado para `z-sticky`
- [x] `ExerciseCatalogView` migrado para botão acessível
- [x] `RoutineTodayView` livre de botões aninhados
- [x] `SupplementStackWidget` com toggle separado de deleção
- [x] `SleepStagesChart` com labels e barras acessíveis
- [x] `WorkoutSessionCard` com header e mídia acessíveis
- [x] `TermHelp` com suporte a teclado
- [x] Exceções registradas em `DESIGN_SYSTEM_EXCEPTIONS.md`
- [x] Testes unitários dedicados em `AccessibilityControls.test.tsx`
- [x] Suíte completa vitest verde

---

## 18. Open questions

- Nenhuma. O modelo de acessibilidade está alinhado ao padrão do Design System v2.2.0.

---

## 19. Reviewers

- Longevidade Hub Core Team
- Accessibility & Design System Guild

---

## 20. Changelog

- **2026-10-03:** Implementação completa das correções de acessibilidade de controles, formalização da escala de zIndex, registro das exceções `DSX-012..016` e criação dos testes dedicados.
