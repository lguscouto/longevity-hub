# Plano UX/UI — UX_UI_13_MODAL_MIGRATION_2.0.0

> **Título:** Migração Completa de Modais e Overlays para Primitives Canônicos  
> **Fase:** Fase 1 (P0 Estrutural)  
> **Prioridade:** P0  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Eliminar todas as instâncias residuais de `createPortal` isolados e overlays ad-hoc no código, unificando diálogos e gavetas sob os primitives `Modal` e `Drawer` com focus-trap, ESC e retorno de foco.

## Contexto da versão 2.0.0
Na versão 2.0.0 foram criados os primitives `Modal.tsx`, `Drawer.tsx` e o hook `useFocusTrap`. Contudo, múltiplos componentes de negócio continuavam instanciando `createPortal` diretamente com estruturas de dialog divergentes.

## Problema
Caixas de diálogo comportam-se de forma inconsistente pela aplicação: algumas prendem o foco do teclado, outras não; algumas fecham com ESC, outras requerem clique em botão; z-index e backdrops variam arbitrariamente.

## Evidências
createPortal detectados em PhenoAgeWidget.tsx, NOf1Tracker.tsx, LabResultsTable.tsx, SupplementStackWidget.tsx, PhysicalAssessmentsView.tsx e SupplementsView.tsx.

## Estado atual
Concluído. Todos os modais e overlays foram migrados para os primitives canônicos <Modal> e <ConfirmDialog>. Zero ocorrências residuais de `createPortal` fora de `components/ui/`.

## O que já foi resolvido
Primitives Modal, Drawer e useFocusTrap criados e testados unitariamente em frontend/src/components/ui/. Todos os componentes de negócio migrados.

## O que permanece
Nenhum item pendente para este plano.

## Escopo
1. Inventariar todos os createPortal na UI.
2. Migrar diálogos de PhenoAgeWidget, NOf1Tracker, LabResultsTable, SupplementStackWidget, PhysicalAssessmentsView e SupplementsView para <Modal> ou <ConfirmDialog>.
3. Garantir focus trap, tecla Escape, aria-labelledby, aria-modal='true' e retorno de foco ao trigger.

## Fora de escopo
Redesenho de layouts internos dos formulários contidos nos modais.

## Arquivos afetados
- frontend/src/components/PhenoAgeWidget.tsx
- frontend/src/components/NOf1Tracker.tsx
- frontend/src/components/LabResultsTable.tsx
- frontend/src/components/SupplementStackWidget.tsx
- frontend/src/components/PhysicalAssessmentsView.tsx
- frontend/src/components/SupplementsView.tsx
- frontend/src/components/ui/Modal.tsx

## Componentes envolvidos
Modal, Drawer, PhenoAgeWidget, NOf1Tracker, LabResultsTable, SupplementsView, PhysicalAssessmentsView

## Dependências
Nenhuma (bloqueante para os demais planos de acessibilidade e tokens).

## Estratégia de implementação
1. Substituir createPortal e divs de backdrop inline por <Modal isOpen={...} onClose={...} title={...} size={...}>.
2. Vincular referências de trigger para restauração de foco no fechamento.
3. Validar encadeamento de diálogos e fechar com Escape.

## Estados e comportamento
Abertura com foco no primeiro input focável; fechamento suave com remoção do backdrop; restauração do foco no botão disparador.

## Acessibilidade
WCAG 2.1 AA: role='dialog' ou 'alertdialog', aria-modal='true', aria-labelledby='modal-title', foco confinado enquanto aberto, bloqueio de scroll no body.

## Responsividade
Modais ocupam w-[95%] no mobile (<768px) e tamanhos proporcionais (sm/md/lg/xl/3xl) no desktop.

## Dark/Light
Backdrop com bg-slate-950/70 (dark) e bg-slate-900/40 (light); superfície com bg-white dark:bg-slate-900.

## Microcopy
Botões de fechamento e cancelamento com rótulos consistentes ('Fechar', 'Cancelar', 'Salvar').

## Testes unitários
Atualizar testes de unidade para simular fechamento por ESC e validação de acessibilidade via @testing-library/react.

## Testes E2E
Playwright e2e/visual-qa.spec.ts cobrindo abertura e fechamento por Escape nos 4 viewports.

## Visual QA
Inspeção de sobreposição nos viewports 375x667 e 1280x800.

## Critérios de aceite
- Zero chamadas de createPortal para modais genéricos fora de frontend/src/components/ui/.
- 100% dos diálogos fecham com tecla Escape.
- 100% dos diálogos restauram foco ao elemento de origem.
- 100% dos testes Vitest e E2E aprovados.

## Riscos
Quebra de testes unitários legados que buscam portais por IDs fixos no document.body.

## Rollback
Reversão das alterações dos componentes via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Zero createPortal em views | `git grep "createPortal" frontend/src` | 02/10/2026 14:30 | Windows / pwsh | PASS | Apenas Modal.tsx e Drawer.tsx usam createPortal |
| Compilação e Build Vite | `npm run build` | 02/10/2026 14:30 | Node 20+ / Vite | PASS | Bundle gerado com sucesso sem erros de tipagem |
| Testes Unitários Vitest | `npm run test:run` | 02/10/2026 14:31 | JSDOM / Vitest | PASS | 35 arquivos de teste, 169 testes aprovados (100%) |
| Testes E2E Visual QA | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 14:31 | Chromium / Mobile | PASS | 8 testes aprovados em 4 viewports (Light & Dark) |
| Testes Backend Pytest | `python -m pytest` | 02/10/2026 14:35 | Python 3.14 | PASS | 357 testes aprovados (100%) |


## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
