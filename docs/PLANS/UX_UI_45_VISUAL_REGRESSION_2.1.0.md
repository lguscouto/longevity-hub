# UX/UI 45 — Regressão Visual e Auditoria de UX no CI

## Metadata

- **Priority:** P2
- **Phase:** 5 — Acessibilidade/QA
- **Status:** Concluído
- **Dependencies:** UX_UI_41, UX_UI_42, UX_UI_44
- **Master:** UX21-P2-06, UX21-P2-07, §99–§104
- **Affected files:** `frontend/e2e/visual-regression.spec.ts` (novo), `.github/workflows/ci.yml` (novo), `docs/screenshots/README.md`, `docs/screenshots/baselines/*` (24 novos baselines), `scripts/verify_evidence.py`

## Problem

Havia `visual-qa.spec.ts` (8 testes, 4 viewports) mas **nenhuma regressão visual com baseline**; não existia pipeline de CI; capturas em `docs/screenshots` não informavam versão, viewport, tema, estado dos dados nem data (README sem metadados), podendo ser lidos como runtime atual.

## Evidence

- `.github/workflows/ci.yml` criado cobrindo pipeline duplo:
  - Job `frontend`: `npm ci` → `npm run build` → `npm run test:run` (vitest 53 suítes) → `npm run audit:design-system` → `playwright viewport-matrix` → `playwright visual-regression`.
  - Job `backend`: setup Python 3.11 → `pip install -e .[dev]` → `pytest -v` (357 testes).
- `frontend/e2e/visual-regression.spec.ts` implementado:
  - 24 baselines canônicos gerados deterministicamente (6 views: `overview`, `labs`, `workouts`, `supplements`, `ai`, `profile` × 2 viewports: `375×667`, `1280×800` × 2 temas: `dark`, `light`).
  - Mocks clínicos consistentes para eliminação de flakiness.
- Governança de screenshots estabelecida em `docs/screenshots/README.md`:
  - Nomenclatura canônica: `v<versão>_<view>_<viewport>_<tema>_<estado>.png`.
  - Tabela com metadados completos por imagem: Versão, View, Viewport, Tema, Estado dos Dados, Data da Captura e Link do Arquivo.
  - 24 arquivos de imagem PNG armazenados em `docs/screenshots/baselines/`.
- `scripts/verify_evidence.py` atualizado para integrar a matriz de viewports e a regressão visual no pipeline canônico local.

## Acceptance criteria

- [x] Pipeline de CI configurado no GitHub Actions (`.github/workflows/ci.yml`).
- [x] ≥ 24 baselines (6 views × 2 temas × 2 viewports mínimos gerados e validados).
- [x] README de screenshots com metadados por imagem (`docs/screenshots/README.md`).
- [x] `audit:design-system` executa no CI e falha em regressão.

## Evidence of execution

1. **Geração e Validação dos 24 Baselines Visuais (Playwright):**
   ```text
   npx playwright test e2e/visual-regression.spec.ts --project=chromium --config=e2e/playwright.config.ts
   Running 24 tests using 1 worker
   24 passed (31.5s)
   ```
2. **Pipeline de Telemetria e Validação Integrada (`scripts/verify_evidence.py`):**
   ```text
   | Critério / Teste | Comando | Data/Hora | Status | Detalhes |
   |---|---|---|---|---|
   | Design System Conformance Audit | `npm run audit:design-system` | 03/10/2026 16:06:15 | PASS | Resultado global: WARN (0 FAIL) |
   | Vite Production Build | `npm run build` | 03/10/2026 16:06:15 | PASS | ✓ built in 4.90s |
   | Vitest Unit & Component Suite | `npm run test:run` | 03/10/2026 16:06:25 | PASS | 53 files, 280 tests passed |
   | Playwright Viewport Matrix | `npx playwright test e2e/viewport-matrix.spec.ts` | 03/10/2026 16:06:40 | PASS | 16 passed (41.7s) |
   | Playwright Visual Regression | `npx playwright test e2e/visual-regression.spec.ts` | 03/10/2026 16:07:23 | PASS | 48 passed (1.1m) |
   ```

## Definition of Done

- [x] código + CI configurado e validado
- [x] evidência registrada
