# UX_UI_48 — Canonical Design Tokens 2.2.x

## Metadata

- **Priority:** P1 (Fase 1 — Fundação)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_47
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§5 U22-P0-06, §24 U22-P2-04..08, §38 UX_UI_48)
- **Affected files:**
  - `frontend/tailwind.config.js`
  - `frontend/src/index.css`
  - `frontend/src/components/ui/DesignTokens.test.tsx`
  - `docs/DESIGN_SYSTEM.md`
  - `docs/PLANS/UX_UI_48_CANONICAL_DESIGN_TOKENS_2.2.0.md`

---

## 1. Problem

1. **Mismatch entre semantic radius e Tailwind radius (U22-P0-06):** O Design System documentava `surface-md` = 16px e `surface-lg` = 16px, enquanto `tailwind.config.js` definia `radius-lg` = 20px (`1.25rem`) e `radius-xl` = 24px (`1.5rem`). Essa inconsistência gerava ambiguidade geométrica entre controles, cards e modais.
2. **Ausência de tokens canônicos de superfície, borda e texto (U22-P2-04..06):** A aplicação dependia de classes Tailwind combinadas (`bg-white dark:bg-slate-900 border-slate-200`) em vez de tokens semânticos de superfície (`surface-card`, `surface-panel`, `surface-canvas`).
3. **Ausência de token semântico para dados derivados (U22-P2-07 / U22-P1-13):** Não havia cor de token semântico dedicada para métricas derivadas (`data-derived`), misturando cálculos com observações diretas.

---

## 2. Evidence

- Inspecção em `frontend/tailwind.config.js` revelou que `radius-lg` era 1.25rem e `radius-xl` era 1.5rem, divergindo da tabela do Design System (16px).
- Teste `DesignTokens.test.tsx` validava valores legados de 1.25rem e 1.5rem.
- Vários componentes em `components/ai/` e `components/ui/` já consumiam classes `rounded-radius-*`, exigindo harmonização imediata para evitar distorções visuais.

---

## 3. User impact

- Geometria uniforme e previsível em toda a interface: botões, cards, modais e badges compartilham a mesma proporção áurea de arredondamento.
- Base semântica sólida para suporte aos temas claro/escuro e transição gradual de superfícies legadas.

---

## 4. Scope

- Harmonização de `borderRadius` em `frontend/tailwind.config.js`:
  - `surface-xs` / `radius-sm`: `0.5rem` (8px)
  - `surface-sm` / `radius-md`: `0.75rem` (12px)
  - `surface-md` / `radius-lg`: `1rem` (16px)
  - `surface-lg` / `radius-xl`: `1rem` (16px)
  - `dialog`: `1rem` (16px)
  - `pill`: `9999px`
- Criação dos grupos de tokens semânticos em `tailwind.config.js`:
  - `surface` (`canvas`, `panel`, `card`, `elevated`, `overlay`)
  - `border` (`subtle`, `default`, `strong`, `focus`, `danger`)
  - `content` (`primary`, `secondary`, `tertiary`, `disabled`, `inverse`)
  - `data` (`observed`, `derived`, `model`, `inference`, `reference`)
- Definição das variáveis CSS correspondentes em `frontend/src/index.css` em `:root` e `.dark`.
- Atualização e expansão de `DesignTokens.test.tsx`.
- Documentação formal em `docs/DESIGN_SYSTEM.md` §2.5.

---

## 5. Non-goals

- Não refatorar todos os componentes para usar as novas classes de superfície neste plano (escopo gradual dos planos funcionais e `UX_UI_60`).
- Não alterar o motor do auditor estático (escopo de `UX_UI_49`).

---

## 6. Current behavior

- Mismatch de 16px vs 20px/24px entre a tabela e as classes `radius-lg`/`radius-xl`.
- Ausência de mapeamento Tailwind para variáveis semânticas de superfícies e dados.

---

## 7. Proposed behavior

- Escala de radius com fonte única de verdade compartilhada por `surface-*` e `radius-*`.
- Tokens semânticos acessíveis via Tailwind (`bg-surface-card`, `border-border-default`, `text-content-primary`, `text-data-derived`, etc.).

---

## 8. UX flow

Não afeta fluxos navegacionais diretamente.

---

## 9. UI changes

Alinhamento da curvatura de borda em elementos que utilizam `radius-lg` e `radius-xl` para 16px (1rem), eliminando cantos desproporcionalmente inflados em diálogos e seções.

---

## 10. Design System changes

- Tabela 2.1 e Seção 2.5 de `docs/DESIGN_SYSTEM.md` atualizadas com o catálogo completo de tokens semânticos v2.2.0.

---

## 11. Accessibility

- Todos os pares de cores de superfície e texto definidos respeitam os ratios de contraste WCAG 2.1 AA (mínimo 4.5:1 para texto normal, 3:1 para texto grande e componentes de interface).

---

## 12. Responsive behavior

Tokens escaláveis baseados em unidades relativas (`rem`), responsivos a zoom e redimensionamento do viewport.

---

## 13. Data semantics

- Inclusão do token `data-derived` (ciano/azul) para separar visualmente valores calculados (TG/HDL, ApoB/ApoA1) de dados observados (verde).

---

## 14. Loading/empty/error/success

Tokens de borda (`border-danger`, `border-focus`) e texto (`content-disabled`) disponíveis para estados operacionais.

---

## 15. Tests

- `npx vitest run src/components/ui/DesignTokens.test.tsx` (7 testes aprovados).
- `npm run typecheck` (tsc sem erros).
- `npm run test:run` (280 testes aprovados).

---

## 16. Visual QA

Verificado que cards, botões e painéis mantêm geometria coesa sem saltos de layout.

---

## 17. Acceptance criteria

- [x] `tailwind.config.js` possui escala semântica única de radius (8px, 12px, 16px, 16px, 9999px).
- [x] Tokens `surface`, `border`, `content` e `data` configurados no Tailwind e CSS custom properties.
- [x] `DesignTokens.test.tsx` testa e aprova todos os novos tokens.
- [x] `docs/DESIGN_SYSTEM.md` reflete o catálogo atualizado.
- [x] Zero regressões na suíte geral de testes.

---

## 18. Evidence of execution

```text
 RUN  v4.1.10 E:/hermes/longevidade/frontend
 ✓ src/components/ui/DesignTokens.test.tsx (7 tests) 24ms
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

---

## 19. Rollback

Reversão das alterações em `tailwind.config.js`, `index.css` e `DesignTokens.test.tsx`.

---

## 20. Definition of Done

- [x] Implementação concluída e verificada.
- [x] Testes unitários de tokens aprovados.
- [x] Documentação sincronizada.
