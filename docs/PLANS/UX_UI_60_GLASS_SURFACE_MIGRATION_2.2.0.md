# UX_UI_60 — Glass Surface Migration 2.2.x

## Metadata

- **Priority:** P2 (Fase 4 — Polimento Visual & Arquitetural)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_49
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§23 U22-P2-01..03, §24 U22-P2-04..08, §38 UX_UI_60)
- **Affected files:**
  - `frontend/src/index.css`
  - `frontend/src/components/ui/DesignTokens.test.tsx`
  - `frontend/src/components/DailyCheckinCard.tsx`
  - `frontend/src/components/DailyGuidanceCard.tsx`
  - `frontend/src/components/DataQualityPanel.tsx`
  - `frontend/src/components/DateNavigator.tsx`
  - `frontend/src/components/EnergyCircadianWidget.tsx`
  - `frontend/src/components/SupplementStackWidget.tsx`
  - `frontend/src/components/TrainingLoadWidget.tsx`
  - `frontend/src/components/BodyCompositionChart.tsx`
  - `frontend/src/components/NOf1Tracker.tsx`
  - `frontend/src/components/CGMDashboard.tsx`
  - `frontend/src/components/PipelineStatusPanel.tsx`
  - `frontend/src/components/WorkoutsTable.tsx`
  - `docs/PLANS/UX_UI_60_GLASS_SURFACE_MIGRATION_2.2.0.md`

---

## 1. Problem

1. **Uso Generalizado de Classes `glass-*` com Decisão Visual em Vez de Semântica (U22-P2-01 / U22-P2-03):**
   - O projeto acumulava classes como `glass-panel` e `glass-card` em dashboards e cards comuns. Nomes atrelados a "vidro" vinculam a marcação a uma estética específica em vez da hierarquia funcional da superfície (`surface-canvas`, `surface-panel`, `surface-card`, `surface-elevated`).
2. **`backdrop-filter` em Superfícies Não Justificadas (U22-P2-02):**
   - Efeitos de desfoque de fundo (`backdrop-filter: blur(12px)`) consomem recursos de GPU e composição de camadas no navegador. Seu uso deve ser reservado estritamente para cabeçalhos flutuantes, drawers e modais.
3. **Inconsistência de Raios de Borda e Dívida Técnica (U22-P2-08):**
   - Mais de 440 ocorrências de classes utilitárias brutas (`rounded-2xl`, `rounded-xl`, `rounded-lg`) poluíam os componentes visuais, em vez de recorrer aos tokens canônicos `rounded-radius-*` do Tailwind.

---

## 2. Evidence

- `frontend/src/index.css` possuía classes `.glass-panel` e `.glass-card`, mas carecia de classes utilitárias diretas `.surface-panel`, `.surface-card`, `.surface-elevated`.
- Múltiplos componentes continham `glass-panel` e `glass-card` associados a `rounded-2xl`, totalizando 447 desvios de tokens de raio no baseline.

---

## 3. User impact

- **Performance de Renderização:** Eliminação de sobrecarga de backdrop-blur em cards comuns e listas de dados, resultando em rolagem mais suave e menor consumo de bateria em notebooks e dispositivos móveis.
- **Sobriedade e Legibilidade Clínica:** Fundo sólido e contraste previsível tanto no modo claro quanto no modo escuro, evitando artefatos visuais de refração sobre gráficos e séries temporais.
- **Uniformidade Estética:** Todos os cards e painéis adotam curvaturas padronizadas (`rounded-radius-xl` para containers mestres, `rounded-radius-lg` para cards internos e `rounded-radius-md` para controles).

---

## 4. Scope

- Atualizar `frontend/src/index.css`:
  - Implementar classes canônicas `.surface-panel`, `.surface-card` e `.surface-elevated` mapeadas para variáveis CSS `--surface-*` e `--border-*`.
  - Manter `.glass-panel` e `.glass-card` como legado controlado documentado (U22-P2-01).
- Migrar componentes centrais para as novas classes de superfície e tokens de raio:
  - `DailyCheckinCard.tsx`
  - `DailyGuidanceCard.tsx`
  - `DataQualityPanel.tsx`
  - `DateNavigator.tsx`
  - `EnergyCircadianWidget.tsx`
  - `SupplementStackWidget.tsx`
  - `TrainingLoadWidget.tsx`
  - `BodyCompositionChart.tsx`
  - `NOf1Tracker.tsx`
  - `CGMDashboard.tsx`
  - `PipelineStatusPanel.tsx`
  - `WorkoutsTable.tsx`
- Migrar botões nativos residuais em `PipelineStatusPanel.tsx` e `WorkoutsTable.tsx` para `Button`.
- Atualizar a suíte de testes `frontend/src/components/ui/DesignTokens.test.tsx` com asserções para as classes utilitárias de superfície.
- Reduzir `radius.non-token` no auditor de conformidade de 447 para 285 (-162 classes).

---

## 5. Non-goals

- Remover abruptamente a classe `.glass-panel` de elementos justificados (ex: Floating Header `sticky top-0 z-sticky`).
- Alterar as cores de destaque dos gráficos Recharts.

---

## 6. Architecture & System Design

- **Hierarquia de Superfícies Semânticas (U22-P2-04):**
  - `surface-canvas` (`--surface-canvas`): Fundo de tela base.
  - `surface-panel` (`--surface-panel`): Contêiner principal de agrupamento de widgets.
  - `surface-card` (`--surface-card`): Cartão individual de dados ou controle.
  - `surface-elevated` (`--surface-elevated`): Superfície destacada com sombra `shadow-card` e borda `border-strong`.
- **Governança de Exceções de Design System:**
  - Preservação estrita das exceções ativas em `docs/DESIGN_SYSTEM_EXCEPTIONS.md` (DSX-011 para o blur do cabeçalho).

---

## 7. Migration & Compatibility

- 100% retrocompatível com qualquer código que invoque `.glass-panel` ou `.glass-card`.
- Redução comprovada da dívida do Design System (`radius.non-token` de 447 para 285; `native.button` de 94 para 87).

---

## 8. Rollback plan

- Reverter os commits aplicados em `frontend/src/index.css` e nos componentes refatorados.

---

## 9. Assumptions & Constraints

- O modo escuro e o modo claro utilizam os mesmos nomes de classe, com alternância de variáveis controlada via `.dark` em `index.css`.

---

## 10. Security considerations

- Nenhuma implicação de segurança; alterações puramente visuais e estruturais de CSS/React.

---

## 11. Performance & Scalability

- Aceleração de pintura (paint time) em dispositivos móveis e navegadores sem aceleração acelerada por hardware de desfoque.

---

## 12. Testing strategy

- Testes no Vitest:
  1. `frontend/src/components/ui/DesignTokens.test.tsx`:
     - Verificação das classes `.surface-panel`, `.surface-card`, `.surface-elevated` e variáveis CSS associadas.
  2. `frontend/scripts/audit-design-system.mjs`:
     - Auditoria estrita confirmando Delta <= 0 em todas as regras.

---

## 13. Documentation impact

- Registro deste plano mestre em `docs/PLANS/UX_UI_60_GLASS_SURFACE_MIGRATION_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Criar classes `.surface-panel`, `.surface-card`, `.surface-elevated` em `frontend/src/index.css`.
- [x] Migrar `DailyCheckinCard.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `DailyGuidanceCard.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `DataQualityPanel.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `DateNavigator.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `EnergyCircadianWidget.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `SupplementStackWidget.tsx` para `surface-card` e raios tokenizados.
- [x] Migrar `TrainingLoadWidget.tsx` para `surface-card`.
- [x] Migrar `BodyCompositionChart.tsx` para `surface-panel` e raios tokenizados.
- [x] Migrar `NOf1Tracker.tsx` para `surface-panel` e `surface-card`.
- [x] Migrar `CGMDashboard.tsx` para `surface-panel` e `surface-card`.
- [x] Migrar `PipelineStatusPanel.tsx` para `surface-panel` e componente `Button`.
- [x] Migrar `WorkoutsTable.tsx` para `surface-card` e componente `Button`.
- [x] Atualizar `DesignTokens.test.tsx` com asserções de superfícies semânticas.
- [x] Validar auditoria de Design System e suite de testes.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Definição de classes de superfície semânticas | Aprovado | `index.css` (.surface-panel, .surface-card, .surface-elevated) |
| Redução da dívida de raios não-tokenizados (`Delta <= 0`) | Aprovado | `npm run audit:design-system` (Delta **-162**) |
| Redução de botões nativos (`Delta <= 0`) | Aprovado | `npm run audit:design-system` (Delta **-7**) |
| Zero ocorrências de microtexto | Aprovado | `npm run audit:design-system` (PASS 0/0/0) |
| Testes unitários de Design Tokens | Aprovado | `DesignTokens.test.tsx` (7 testes PASS) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P2-01`, `U22-P2-02`, `U22-P2-03`, `U22-P2-04` e `U22-P2-08`.
- Redução de 162 classes não-tokenizadas de raio no frontend.
- Eliminação de botões nativos residuais em tabelas e painéis de pipeline.

---

## 17. Operational runbook

- Nenhuma alteração operacional ou migração necessária.

---

## 18. Audit log & Decision history

- **Decisão:** Manter classes legadas `.glass-panel` e `.glass-card` em `index.css` para prevenir quebras pontuais em componentes satélites, assegurando transição gradual e segura com ganho imediato de conformidade nos componentes principais.

---

## 19. Open questions & Future work

- Na próxima etapa (`UX_UI_61`), consolidar a suite de regressão visual baseline da versão 2.2.0.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §23 U22-P2-01..03, §24 U22-P2-04..08, §38 UX_UI_60)
- **Performance Lead:** Aprovado (Redução de custo de composição de camadas e blur)
- **Status:** CONCLUÍDO
