# Plano UX/UI — UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

> **Título:** Conformidade Transversal com Tokens do Design System  
> **Fase:** Fase 1 (P0 Estrutural)  
> **Prioridade:** P0  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Eliminar resíduos de estilos arbitrários (rounded-3xl, shadow-2xl, cores hexadecimais avulsas) alinhando o código ao docs/DESIGN_SYSTEM.md.

## Contexto da versão 2.0.0
Apesar dos tokens semânticos (radius-sm a xl, shadow-card/dialog) existirem, o código ainda continha usos arbitrários de rounded-3xl e shadow-2xl.

## Problema
Inconsistência visual em raios de curvatura e sombras entre telas recém-refatoradas e telas legadas.

## Evidências
Usos de rounded-3xl, shadow-2xl e bg-[#f4f7fb] mapeados e substituídos sistematicamente em todos os componentes.

## Estado atual
100% dos componentes e primitivos em conformidade com docs/DESIGN_SYSTEM.md (zero ocorrências de rounded-3xl, zero shadow-2xl, zero classes hexadecimais arbitrárias).

## O que já foi resolvido
Substituição cirúrgica executada em Modal, Drawer, ProfileView, SleepView, SupplementStackWidget, AICopilotView, CGMDashboard, DailyCheckinCard, DailyComplianceWidget, DailyGuidanceCard, DataQualityPanel, DateNavigator, EnergyCircadianWidget, ExerciseCatalogView, LabResultsTable, NOf1Tracker, PhenoAgeWidget, PipelineStatusPanel, SupplementsView, TrainingLoadWidget, WorkoutsTable, WorkoutsView, PersonalAssociationsCard, TimelineMonthView, TimelineWeekView, TimelineView e App.tsx.

## O que permanece
Nada pendente neste plano.

## Escopo
1. Mapear e substituir rounded-3xl por rounded-2xl (radius-lg) ou rounded-xl (radius-md) conforme a hierarquia de superfícies.
2. Substituir shadow-2xl por shadow-dialog nos modais/tooltips e shadow-elevation-3 na gaveta Drawer.
3. Remover cores hex inline (bg-[#f4f7fb] -> bg-slate-50) em favor de tokens Tailwind.

## Fora de escopo
Alterar a paleta de cores corporativa.

## Arquivos afetados
- frontend/src/components/*.tsx
- frontend/src/components/ui/Modal.tsx
- frontend/src/components/ui/Drawer.tsx
- frontend/src/App.tsx

## Componentes envolvidos
Modal, Drawer, Card, OverviewSection, MetricCard, PhenoAgeWidget, SleepView, SupplementsView, WorkoutsView, AICopilotView, ProfileView, TimelineView

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0

## Estratégia de implementação
Substituição cirúrgica orientada por busca estática, mantendo teste de tokens ativo.

## Estados e comportamento
Aparência mais sóbria e harmoniosa entre todos os módulos.

## Acessibilidade
Contraste preservado e sombras funcionais que não ofuscam o foco visual.

## Responsividade
Tokens proporcionais em todos os breakpoints.

## Dark/Light
Contraste correto garantido para superfícies 0 a 4.

## Microcopy
N/A.

## Testes unitários
Executar suíte DesignTokens.test.tsx e Card.test.tsx.

## Testes E2E
Executar visual-qa.spec.ts.

## Visual QA
Conferência visual de cards e modais.

## Critérios de aceite
- Zero usos não justificados de rounded-3xl e shadow-2xl (VERIFICADO: 0).
- 100% dos cartões e modais usando tokens de elevação semânticos (VERIFICADO).
- Zero regressão visual (VERIFICADO via Playwright multi-viewport).

## Riscos
Pequenas alterações visuais em layouts sensíveis.

## Rollback
Reversão das classes Tailwind via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Conformidade de Tokens (Zero rounded-3xl) | `Get-ChildItem -Path frontend/src -Recurse \| Select-String "rounded(-[tblr]*)?-3xl"` | 02/10/2026 15:02:11 | Windows 11 | PASS | 0 ocorrências encontradas |
| Conformidade de Sombras (Zero shadow-2xl) | `Get-ChildItem -Path frontend/src -Recurse \| Select-String "shadow-2xl"` | 02/10/2026 15:02:18 | Windows 11 | PASS | 0 ocorrências encontradas |
| Vite Production Build | `npm run build` | 02/10/2026 15:03:16 | Windows 11 | PASS | ✓ built in 5.32s |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 15:03:26 | Windows 11 | PASS | 171 passed (35 files) em 9.63s |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 15:03:37 | Windows 11 | PASS | 8 passed (iPhone SE, iPhone 14, iPad, Desktop) em 13.7s |
| Backend Pytest Suite | `pytest -q` | 02/10/2026 15:03:52 | Windows 11 | PASS | 357 passed em 255.65s |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
