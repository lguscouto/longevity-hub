# UX_UI_49 — Design System Audit Engine Hardening

## Metadata

- **Priority:** P1 (Fase 1 — Fundação)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_47
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§4 U22-P0-03, §5 U22-P0-08, §29 U22-P2-25..27, §38 UX_UI_49)
- **Affected files:**
  - `frontend/scripts/audit-design-system.mjs`
  - `frontend/src/index.css`
  - `docs/DESIGN_SYSTEM_EXCEPTIONS.md`
  - `frontend/src/test/designSystemAudit.test.ts`
  - `docs/PLANS/UX_UI_49_DESIGN_SYSTEM_AUDIT_ENGINE_HARDENING_2.2.0.md`

---

## 1. Problem

1. **Vulnerabilidade na detecção de Glassmorphism (U22-P0-03):** O auditor estático verificava apenas a classe utilitária Tailwind `backdrop-blur-*`. Propriedades CSS nativas globais como `backdrop-filter: blur(12px)` e `-webkit-backdrop-filter` definidas em `frontend/src/index.css` (.glass-panel) passavam despercebidas sem contabilização formal ou exceção justificada.
2. **Desalinhamento e obsolescência no registro de exceções (U22-P0-08):** `docs/DESIGN_SYSTEM_EXCEPTIONS.md` listava exceções como "Ativa" para componentes que já haviam sido refatorados e não continham mais violações (ex: `DSX-009` no Copilot e `DSX-010` no SyncProgressModal). O motor não possuía reconciliação bidirecional (apenas verificava `missing`, não `stale`).
3. **Ausência de telemetria explícita de Delta (U22-P2-25 / U22-P2-26):** O script não exibia a coluna `Delta` (`open - baseline`) de forma clara no console e JSON para rastreamento de melhorias (`delta < 0`) versus regressões (`delta > 0`).

---

## 2. Evidence

- Inspecção em `frontend/src/index.css` linha 106 revelou `backdrop-filter: blur(12px)` na classe `.glass-panel` sem marcador de exceção.
- O auditor contava apenas 2 exceções de `effects.backdrop-blur` (em `Modal.tsx` e `Drawer.tsx`), ignorando o blur global.
- `DSX-009` e `DSX-010` permaneciam marcados como `Ativa` na documentação sem nenhuma ocorrência correspondente em `AICopilotView.tsx` ou `SyncProgressModal.tsx`.

---

## 3. User impact

- Garante que nenhuma superfície translúcida ou efeito visual de desfoque de fundo passe desapercebido no projeto.
- Fornece um gate de CI transparente com relatórios precisos sobre redução ou aumento de dívida técnica.

---

## 4. Scope

- Atualização da regra `effects.backdrop-blur` em `frontend/scripts/audit-design-system.mjs` para inspecionar `backdrop-filter\s*:` e `-webkit-backdrop-filter\s*:`.
- Anotação de exceção auditada `DSX-011` em `frontend/src/index.css` para a classe legada `.glass-panel`.
- Atualização de `docs/DESIGN_SYSTEM_EXCEPTIONS.md`:
  - `DSX-009`: alterado para `Encerrada`.
  - `DSX-010`: alterado para `Encerrada`.
  - `DSX-011`: cadastrado como `Ativa`.
- Implementação de reconciliação de exceções `staleExceptions` no auditor estático.
- Adição da coluna e métrica `delta` no relatório textual e na saída JSON.
- Testes unitários dedicados em `frontend/src/test/designSystemAudit.test.ts`.

---

## 5. Non-goals

- Não remover a classe `.glass-panel` de dezenas de arquivos neste plano (escopo do plano `UX_UI_60 — Glass Surface Migration`).
- Não alterar as regras de radius ou native controls (já integradas com seus respectivos baselines).

---

## 6. Current behavior

- Glassmorphism em `.css` não era capturado pelo scanner.
- Exceções mortas permaneciam marcadas como ativas.
- Relatório não exibia a métrica de delta por regra.

---

## 7. Proposed behavior

- Cobertura integral de `backdrop-filter` em arquivos CSS e TSX.
- Registro reconciliado automaticamente, apontando exceções orfãs e exceções inativas.
- Auditoria com rastreamento granular de delta (`open - baseline`).

---

## 8. UX flow

Não se aplica (plano focado em infraestrutura de testes e auditoria de conformidade).

---

## 9. UI changes

Adição do comentário de exceção `/* ds-exception: DSX-011 */` em `frontend/src/index.css`.

---

## 10. Design System changes

- `docs/DESIGN_SYSTEM_EXCEPTIONS.md` atualizado e reconciliado.

---

## 11. Accessibility

A moderação e rastreamento rigoroso de `backdrop-filter` garante legibilidade e preservação de contraste em modais e overlays.

---

## 12. Responsive behavior

Não se aplica diretamente.

---

## 13. Data semantics

Não se aplica diretamente.

---

## 14. Loading/empty/error/success

Não se aplica diretamente.

---

## 15. Tests

- `npx vitest run src/test/designSystemAudit.test.ts` (8 testes aprovados).
- `node scripts/audit-design-system.mjs` (todas as regras avaliadas com delta 0 e zero FAIL).
- `npm run test:run` (283 testes aprovados).

---

## 16. Visual QA

Não se aplica diretamente.

---

## 17. Acceptance criteria

- [x] Regra `effects.backdrop-blur` detecta `backdrop-filter` e `-webkit-backdrop-filter`.
- [x] `DSX-011` cadastrado e marcado em `index.css`.
- [x] `DSX-009` e `DSX-010` encerrados no registro de exceções.
- [x] Auditor calcula `delta` e detecta `staleExceptions`.
- [x] Suíte de testes automatizada do auditor aprovada.

---

## 18. Evidence of execution

```text
Design System Conformance Audit
──────────────────────────────────────────────────────────────────────────────
Rule                        Open   Exc.  Base   Delta  Status
typography.micro-9          0      0     0      0      PASS
typography.micro-10         0      0     0      0      PASS
typography.micro-11         0      0     0      0      PASS
radius.arbitrary            0      0     0      0      PASS
radius.3xl                  0      0     0      0      PASS
radius.non-token            447    5     447    0      WARN
gradients.bg                0      6     0      0      EXCEPTION
effects.glow                0      0     0      0      PASS
effects.backdrop-blur       0      3     0      0      EXCEPTION
effects.arbitrary-shadow    0      0     0      0      PASS
focus.outline-none          0      0     0      0      PASS
motion.decorative           0      0     0      0      PASS
native.button               94     0     94     0      WARN
native.input                7      0     7      0      WARN
native.select               0      0     0      0      PASS
native.textarea             0      0     0      0      PASS
──────────────────────────────────────────────────────────────────────────────
```

---

## 19. Rollback

Reverter alterações em `frontend/scripts/audit-design-system.mjs`, `index.css` e `DESIGN_SYSTEM_EXCEPTIONS.md`.

---

## 20. Definition of Done

- [x] Motor de auditoria endurecido e testado.
- [x] Reconciliação de exceções concluída.
- [x] Rastreamento de delta operacional.
