# UX_UI_47 — Validation & Documentation Integrity 2.2.0

## Metadata

- **Priority:** P0 (Fase 0 — Verdade)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** Nenhuma
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§4, U22-P0-01, U22-P0-02, U22-P0-04, §38)
- **Affected files:**
  - `docs/DESIGN_SYSTEM.md`
  - `docs/architecture.md`
  - `docs/UX_UI_CONFORMANCE_REPORT_2.2.0.md`
  - `frontend/package.json`
  - `docs/PLANS/UX_UI_47_VALIDATION_AND_DOCUMENTATION_INTEGRITY_2.2.0.md`

---

## 1. Problem

Após a evolução do Longevidade Hub da versão 2.1.0 para a 2.2.0, gerou-se um desalinhamento crítico entre o código real, o motor de auditoria e os documentos contratuais de governança:
1. `docs/DESIGN_SYSTEM.md` continuava formalmente identificado como v2.1.0.
2. `docs/UX_UI_CONFORMANCE_REPORT_2.1.x.md` declarava "100% conforme / estabilizado", criando uma falsa percepção de perfeição, enquanto a execução real de `node scripts/audit-design-system.mjs --json` reportava `worst = WARN` (447 ocorrências de radius não-token, 94 `<button>` nativos e 7 `<input>` nativos em baseline de dívida).
3. `docs/architecture.md` descrevia a arquitetura do sistema ainda na versão 0.6.0 com navegação antiga, afirmando incorretamente que não havia hash routing nem deep links por URL.
4. O script canônico `typecheck` não constava em `frontend/package.json`, embora `tsc --noEmit` existisse no pipeline de `build`.
5. Faltava comprovação da executabilidade de todo o pipeline de testes (build, vitest, pytest e audit) em ambiente reproduzível.

---

## 2. Evidence

- Leitura completa de `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` em `E:\hermes\planos`.
- Auditoria do Design System executada: `node scripts/audit-design-system.mjs --json` reportou `worst = WARN` (452 radius totais / 447 abertos, 94 native buttons, 7 native inputs).
- `docs/architecture.md` continha "A versão do sistema é unificada em 0.6.0" e declarava apenas 6 abas locais sem hash routing.
- Tentativa inicial de `npm run typecheck` falhou por ausência do script em `package.json`.

---

## 3. User impact

- Elimina divergências operacionais para desenvolvedores e agentes autônomos.
- Restaura a confiança na documentação técnica e de conformidade visual.
- Garante que nenhuma tela ou componente seja considerado "100% conforme" sem evidência auditável contemporânea.

---

## 4. Scope

- Adição do script `"typecheck": "tsc --noEmit"` em `frontend/package.json`.
- Atualização do cabeçalho, governança de border radius e escopo do `docs/DESIGN_SYSTEM.md` para v2.2.0.
- Atualização de `docs/architecture.md` para v2.2.0, documentando o modelo de hash navigation (`#today`, `#health`, etc.), 6 áreas primárias canônicas e persistência.
- Publicação do relatório `docs/UX_UI_CONFORMANCE_REPORT_2.2.0.md` com percentuais e contagens reais do scanner.
- Validação runtime completa de build, typecheck, vitest e pytest.

---

## 5. Non-goals

- Não alterar a implementação visual ou tokens CSS neste plano (escopo de `UX_UI_48` e `UX_UI_60`).
- Não alterar componentes clínicos ou formulários neste plano (escopo de `UX_UI_52` e `UX_UI_54`).
- Não alterar a lógica de testes de visual regression (escopo de `UX_UI_61`).

---

## 6. Current behavior

- Documentação desatualizada, citando v2.1.0 e v0.6.0.
- Scanner reportando WARN enquanto os relatórios anteriores declaravam 100%.

---

## 7. Proposed behavior

- Documentação sincronizada em v2.2.0.
- Relatório de conformidade oficial v2.2.0 reportando contagens reais de dívida técnica e status CONDICIONAL / EM CONSOLIDAÇÃO (zero FAIL).
- Comandos canônicos de validação operacionais e documentados.

---

## 8. UX flow

Não se aplica (plano focado em integridade de documentação, validação e governança de engenharia).

---

## 9. UI changes

Nenhuma alteração de interface em tempo de execução neste plano.

---

## 10. Design System changes

- Atualizado `docs/DESIGN_SYSTEM.md` para v2.2.0.
- Clarificada a distinção entre classes padrão Tailwind (`rounded-lg`, etc.) e tokens semânticos `radius-*` em monitoramento decrescente.

---

## 11. Accessibility

Não se aplica diretamente ao código, mas valida a preservação dos critérios WCAG 2.1 AA documentados.

---

## 12. Responsive behavior

Matriz de 8 viewports documentada e preservada para a suíte E2E.

---

## 13. Data semantics

Não se aplica a este plano de documentação (abordado em `UX_UI_51`).

---

## 14. Loading/empty/error/success

Não se aplica diretamente a componentes neste plano.

---

## 15. Tests

Execução de todas as suítes locais com verificação de zero falhas:
1. `npm run typecheck` (`tsc --noEmit`) → PASS
2. `npm run build` (`tsc && vite build`) → PASS
3. `npm run test:run` (vitest) → 53 suítes, 280 testes PASS
4. `python -m pytest -q` → 357 testes PASS
5. `node scripts/audit-design-system.mjs --json` → worst: WARN (zero FAIL)

---

## 16. Visual QA

Não se aplica a este plano estrutural (preparatório para os planos visuais).

---

## 17. Acceptance criteria

- [x] `docs/DESIGN_SYSTEM.md` atualizado para v2.2.0 sem declarações obsoletas de versão antiga.
- [x] `docs/architecture.md` atualizado para v2.2.0 com a arquitetura real de navegação hash e áreas primárias.
- [x] Relatório canônico `docs/UX_UI_CONFORMANCE_REPORT_2.2.0.md` criado refletindo a realidade medida do scanner.
- [x] Script `typecheck` adicionado e verificado em `frontend/package.json`.
- [x] Pipeline completo executado com telemetria e exit code 0 comprovados.

---

## 18. Evidence of execution

```text
====================================================================================================
Critério / Teste                  | Comando                                          | Status | Detalhe
====================================================================================================
TypeScript Compilation Check      | npm run typecheck (tsc --noEmit)                 | PASS   | 0 erros
Vite Production Build             | npm run build (tsc && vite build)                | PASS   | 2378 módulos
Vitest Unit & Component Suite     | npm run test:run                                 | PASS   | 53 suítes, 280 testes
Backend Pytest Suite              | python -m pytest -q                              | PASS   | 357 testes
Design System Conformance Audit   | node scripts/audit-design-system.mjs --json      | WARN   | 0 FAIL, 3 WARN baseline
====================================================================================================
```

---

## 19. Rollback

Caso haja necessidade de reverter, restaurar versões anteriores via git commit ou descartar as alterações nos arquivos de documentação citados.

---

## 20. Definition of Done

- [x] Problema documentado e justificado com evidências.
- [x] Todas as dependências da Fase 0 resolvidas.
- [x] Relatório v2.2.0 emitido com dados verdadeiros.
- [x] Comandos de compilação e testes validados com sucesso no ambiente.
- [x] Pronto para autorizar a Fase 1 (`UX_UI_48` e `UX_UI_49`).
