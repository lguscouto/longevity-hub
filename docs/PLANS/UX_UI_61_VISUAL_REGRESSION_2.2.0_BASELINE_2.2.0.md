# UX_UI_61 — Visual Regression 2.2.0 Baseline

## Metadata

- **Priority:** P1 (Fase 4 — Polimento Visual & Governança)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_55, UX_UI_60
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§3, §28 U22-P2-22, §28 U22-P2-23, §38 UX_UI_61, §41, §47)
- **Affected files:**
  - `frontend/e2e/visual-regression.spec.ts`
  - `docs/screenshots/baselines/metadata.json`
  - `docs/screenshots/baselines/v2.2.0_*.png` (24 canonical baselines)
  - `docs/screenshots/legacy/v2.1.0/` (24 historical baselines)
  - `docs/screenshots/legacy/pre-v2.1.0/` (5 historical screenshots)
  - `docs/screenshots/README.md`
  - `docs/PLANS/UX_UI_61_VISUAL_REGRESSION_2.2.0_BASELINE_2.2.0.md`

---

## 1. Problem

1. **Defasagem da Suíte de Regressão Visual e Nomenclatura (U22-P2-22 / §3):**
   - Os testes de regressão visual em `frontend/e2e/visual-regression.spec.ts` estavam configurados para a versão anterior (`v2.1.0`), salvando baselines com prefixos obsoletos (`v2.1.0_*.png`), impedindo a detecção precisa de desvios visuais nas melhorias introduzidas pela versão 2.2.0.
2. **Ausência de Metadados Estruturados de Baseline (U22-P2-22):**
   - Os baselines eram armazenados apenas como imagens PNG sem manifesto JSON complementar contendo versão, resolução de viewport, tema, estado dos dados, flag de acessibilidade (`reduced_motion`) e data/hora de captura legível por máquina.
3. **Falta de Segregação Visual de Capturas Legadas (U22-P2-23):**
   - Imagens de documentação antigas (pré-v2.1.0) encontravam-se na raiz do diretório `docs/screenshots/`, misturadas com a governança formal de baselines e sem segregação explícita entre histórico e produção ativa.

---

## 2. Evidence

- `frontend/e2e/visual-regression.spec.ts` continha `test.describe('UX/UI 45 — Visual Regression & Baseline Capture (24 Canonical Baselines)')` e gerava arquivos nomeados `v2.1.0_${view.id}_${vp.key}_${theme}_normal.png`.
- Não existia `docs/screenshots/baselines/metadata.json`.
- A raiz de `docs/screenshots/` continha imagens soltas (`ai_copilot_medical.jpg`, `dashboard_overview.png`, etc.).

---

## 3. User impact

- **Garantia de Qualidade Visual Estável:** Detecção imediata de regressões de renderização em 6 telas críticas do ecossistema de longevidade, tanto em visualização móvel (375x667) quanto desktop (1280x800).
- **Consistência em Temas Claro e Escuro:** Validação contínua do contraste WCAG AA, paleta de cores médicas e integridade das novas classes semânticas (`surface-panel`, `surface-card`, `surface-elevated`).
- **Auditabilidade e Governança Clínica:** Registro rastreável de cada alteração de layout entre versões da plataforma, permitindo auditorias forenses de conformidade de UX.

---

## 4. Scope

- Atualizar `frontend/e2e/visual-regression.spec.ts`:
  - Reconfigurar o describe para `UX/UI 61 — Visual Regression 2.2.0 Baseline Capture (24 Canonical Baselines)`.
  - Atualizar nomes dos testes para o prefixo `[v2.2.0]`.
  - Salvar os 24 baselines canônicos com a nomenclatura `v2.2.0_${view.id}_${vp.key}_${theme}_normal.png`.
  - Expandir o mock de API (`mockApi`) para incluir `/api/profile`, `/api/pipeline-runs` e `/api/quality/daily` com dados clínicos determinísticos de alta fidelidade.
  - Implementar geração automática de `docs/screenshots/baselines/metadata.json` via hook `test.afterAll`.
- Reorganizar o diretório `docs/screenshots/`:
  - Criar `docs/screenshots/legacy/pre-v2.1.0/` e mover capturas históricas anteriores.
  - Criar `docs/screenshots/legacy/v2.1.0/` e arquivar os 24 baselines da versão 2.1.0.
  - Armazenar em `docs/screenshots/baselines/` apenas os novos baselines canônicos v2.2.0 e `metadata.json`.
- Atualizar `docs/screenshots/README.md` com a nova estrutura e inventário canônico.
- Executar e validar a captura completa de todos os 24 baselines via Playwright.

---

## 5. Non-goals

- Alterar a lógica do visual QA de componentes em isolamento (vitest).
- Implementar testes de regressão com tolerância difusa de pixels além do Playwright nativo nesta fase.

---

## 6. Architecture & System Design

- **Matriz Canônica de Baselines (6 × 2 × 2 = 24 capturas):**
  - **Telas (6):** `overview` (Hoje), `labs` (Saúde), `workouts` (Treinos), `supplements` (Intervenções), `ai` (IA), `profile` (Perfil).
  - **Viewports (2):** `375x667` (Mobile Pixel/iPhone SE canonical) e `1280x800` (Desktop HD canonical).
  - **Temas (2):** `dark` (padrão) e `light`.
- **Contrato de Metadados (U22-P2-22):**
  - O arquivo `metadata.json` contém versão, carimbo de geração, viewports, temas, telas e lista de cada baseline com id, versão, viewport, tema, estado, filename e timestamp.

---

## 7. Migration & Compatibility

- 100% retrocompatível; os baselines da v2.1.0 foram integralmente preservados em `docs/screenshots/legacy/v2.1.0/`.
- Os links e caminhos na documentação foram atualizados de forma consistente.

---

## 8. Rollback plan

- Restaurar `frontend/e2e/visual-regression.spec.ts` e arquivos de `docs/screenshots/` a partir do histórico do Git.

---

## 9. Assumptions & Constraints

- Execução determinística dos testes requer servidores locais ou mocks completos de rede (`page.route`).
- Modos de animação desativados (`animations: 'disabled'`, `reducedMotion: 'reduce'`) para prevenir flakiness.

---

## 10. Security considerations

- Os mocks de testes utilizam dados sintéticos pseudonimizados ("Carlos Oliveira"), sem qualquer vazamento de PHI (Protected Health Information) ou dados reais do usuário.

---

## 11. Performance & Scalability

- Execução dos 24 baselines em ~31.5 segundos utilizando um único worker Playwright com reutilização do servidor Vite.

---

## 12. Testing strategy

- Execução da suíte E2E:
  ```bash
  npx playwright test e2e/visual-regression.spec.ts --config=e2e/playwright.config.ts --project=chromium
  ```
- Verificação de saída: 24/24 testes aprovados sem falhas ou timeouts.

---

## 13. Documentation impact

- `docs/screenshots/README.md` reestruturado e catalogado.
- `docs/screenshots/baselines/metadata.json` gerado e disponibilizado para consumo programático.

---

## 14. Implementation checklist

- [x] Atualizar `frontend/e2e/visual-regression.spec.ts` para capturar a suíte v2.2.0.
- [x] Implementar mocks de `/api/profile`, `/api/pipeline-runs` e `/api/quality/daily`.
- [x] Implementar geração do manifesto `metadata.json` com schema U22-P2-22.
- [x] Criar estrutura de pastas `docs/screenshots/legacy/pre-v2.1.0/` e `docs/screenshots/legacy/v2.1.0/`.
- [x] Migrar capturas pré-v2.1.0 e baselines v2.1.0 para diretórios legados.
- [x] Executar a suíte de regressão visual gerando os 24 baselines canônicos v2.2.0.
- [x] Atualizar `docs/screenshots/README.md`.
- [x] Criar plano mestre `docs/PLANS/UX_UI_61_VISUAL_REGRESSION_2.2.0_BASELINE_2.2.0.md`.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| 24 Baselines v2.2.0 capturados | Aprovado | 24 arquivos `.png` em `docs/screenshots/baselines/` |
| Formato de nomenclatura canônica | Aprovado | `v2.2.0_{view}_{viewport}_{theme}_normal.png` |
| Metadados estruturados (U22-P2-22) | Aprovado | `docs/screenshots/baselines/metadata.json` (460 linhas, 24 registros) |
| Segregação de screenshots legados (U22-P2-23) | Aprovado | Diretórios `legacy/v2.1.0/` e `legacy/pre-v2.1.0/` isolados |
| Execução E2E limpa | Aprovado | Playwright report: 24 passed (31.5s) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas integralmente as diretrizes `U22-P2-22` e `U22-P2-23`.
- Nomes dos testes atualizados e sincronizados com a versão 2.2.0 do produto.

---

## 17. Operational runbook

- Para recapturar os baselines a qualquer momento:
  ```bash
  npm run test:e2e -- e2e/visual-regression.spec.ts --project=chromium
  ```

---

## 18. Audit log & Decision history

- **Decisão:** Manter os baselines v2.1.0 em `legacy/v2.1.0/` em vez de excluí-los, assegurando comparação histórica precisa de deltas visuais quando necessário.

---

## 19. Open questions & Future work

- Com a conclusão dos planos `UX_UI_59`, `UX_UI_60` e `UX_UI_61`, a **Fase 4 — Visual** está concluída. A próxima e última etapa é a **Fase 5 — Gate (`UX_UI_62 — Final 2.2.x Conformance Gate`)**.

---

## 20. Approvals & Sign-off

- **QA & Automation Lead:** Aprovado (24/24 baselines capturados com sucesso)
- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §3, §28, §38 UX_UI_61)
- **Status:** CONCLUÍDO
