# Plano UX/UI — UX_UI_22_LARGE_VIEW_MODULARIZATION_2.0.0

> **Título:** Modularização de Componentes Monolíticos (SleepView e SupplementsView)  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Refatorar SleepView (~1600 linhas) e SupplementsView (~1239 linhas) em subcomponentes especializados por tarefa de usuário, aumentando a estabilidade visual.

## Contexto da versão 2.0.0
Grandes visões misturam chamadas de rede, formatação, filtros, paginação e modais em um único bloco de renderização.

## Problema
Alterações pontuais de estilo em uma aba acabam gerando efeitos colaterais em outras abas do mesmo componente.

## Evidências
Tamanho de SleepView.tsx (~1600 linhas) e SupplementsView.tsx (~1239 linhas).

## Estado atual
Modularizado com sucesso em subcomponentes sob `frontend/src/components/sleep/` e `frontend/src/components/supplements/`. Todas as visões abaixo de 300 linhas de código.

## O que já foi resolvido
SleepView e SupplementsView particionadas em módulos dedicados com tipagem isolada e alta coesão:
- `sleep/types.ts`, `sleep/SleepFilters.tsx`, `sleep/SleepSummaryCards.tsx`, `sleep/SleepStagesChart.tsx`, `sleep/SleepMonthlyTable.tsx`
- `supplements/types.ts`, `supplements/RoutineTodayView.tsx`, `supplements/ProtocolCatalogView.tsx`, `supplements/AuditHistoryView.tsx`, `supplements/SupplementAnalysisView.tsx`, `supplements/SupplementModals.tsx`

## O que permanece
Nada pendente neste plano.

## Escopo
1. Dividir SleepView em SleepSummaryCards, SleepStagesChart, SleepMonthlyTable e SleepFilters.
2. Dividir SupplementsView em RoutineTodayView, ProtocolCatalogView, AuditHistoryView e SupplementModals.

## Fora de escopo
Alterar regras de cálculo de sono ou modelos de auditoria do banco.

## Arquivos afetados
- frontend/src/components/SleepView.tsx
- frontend/src/components/sleep/*.tsx (Novos)
- frontend/src/components/SupplementsView.tsx
- frontend/src/components/supplements/*.tsx (Novos)

## Componentes envolvidos
SleepView, SupplementsView e subcomponentes

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0, UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Criar subdiretórios específicos e migrar blocos lógicos mantendo interfaces de comunicação limpas.

## Estados e comportamento
Zero impacto perceptivo para o usuário final.

## Acessibilidade
Preservação integral dos atributos ARIA e foco de teclado.

## Responsividade
Melhor isolamento de regras responsivas específicas de cada subbloco.

## Dark/Light
Preservação dos tokens semânticos.

## Microcopy
Preservação de textos.

## Testes unitários
SleepView.test.tsx e SupplementsView.test.tsx executando com 100% de sucesso.

## Testes E2E
mobile-audit.spec.ts e visual-qa.spec.ts sem regressões.

## Visual QA
Inspeção visual comparativa das abas.

## Critérios de aceite
- Nenhum arquivo de tela excedendo 600 linhas.
- Cobertura completa de testes unitários preservada.

## Riscos
Quebra de imports ou variáveis de estado compartilhadas.

## Rollback
Reversão das pastas extraídas via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 17:06:45 | Windows 11 | Python 3.14.6 (Commit d1d240c) | PASS | ✓ built in 5.54s (10.70s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 17:06:56 | Windows 11 | Python 3.14.6 (Commit d1d240c) | PASS | 44 arquivos de teste aprovados, 206 testes unitários PASS (12.60s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 17:07:09 | Windows 11 | Python 3.14.6 (Commit d1d240c) | PASS | 8 passed (iPhone SE, iPhone 14, iPad, Desktop) (17.26s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
