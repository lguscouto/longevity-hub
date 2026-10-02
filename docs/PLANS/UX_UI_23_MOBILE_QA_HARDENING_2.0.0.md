# Plano UX/UI — UX_UI_23_MOBILE_QA_HARDENING_2.0.0

> **Título:** Hardening de QA Mobile: Validação por Fluxos de Tarefas Reais  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Evoluir a suíte de testes Playwright mobile para validar fluxos completos de tarefas (registro de métrica, marcação de suplemento, consulta de laudo) e não apenas contenção geométrica.

## Contexto da versão 2.0.0
mobile-audit.spec.ts verifica ausência de overflow horizontal, o que é fundamental, mas não valida se controles estão acessíveis para toque com uma mão e sem oclusão por teclado virtual.

## Problema
Telas sem overflow horizontal ainda podem apresentar botões muito próximos, labels truncadas ou ações críticas abaixo da linha de visibilidade.

## Evidências
Auditoria de mobile baseada quase que exclusivamente na métrica scrollWidth <= innerWidth.

## Estado atual
Auditoria de geometria passando em 4 viewports.

## O que já foi resolvido
4 viewports canônicos configurados (375, 390, 768, 1280).

## O que permanece
Testes interativos de execução de tarefas essenciais no mobile.

## Escopo
Implementar cenários ponta a ponta para 8 tarefas críticas em 375x667 e 390x844: registrar métrica, abrir briefing, marcar dose, navegar subabas, abrir histórico IA, recuperar rascunho de avaliação física.

## Fora de escopo
Testes em dispositivos físicos reais (mantido foco na emulação Playwright).

## Arquivos afetados
- frontend/e2e/mobile-audit.spec.ts
- frontend/e2e/task-flows.spec.ts (Novo)

## Componentes envolvidos
Header, Modais, Tabelas, Formulários

## Dependências
UX_UI_14_TOUCH_TARGET_AND_INTERACTION_TOKENS_2.0.0

## Estratégia de implementação
Criar frontend/e2e/task-flows.spec.ts com assertions de conclusão de tarefa e medição de cliques necessários.

## Estados e comportamento
Execução fluida sem bloqueios de interface no mobile.

## Acessibilidade
Verificação de foco visível durante interação touch/teclado.

## Responsividade
Foco nos viewports iPhone SE (375px) e iPhone 14 (390px).

## Dark/Light
Validação em ambos os modos.

## Microcopy
Validação de legibilidade de mensagens de retorno.

## Testes unitários
N/A.

## Testes E2E
npx playwright test e2e/task-flows.spec.ts aprovado com 100% de sucesso.

## Visual QA
Captura de screenshots das etapas intermediárias dos fluxos.

## Critérios de aceite
- 8 tarefas críticas executadas com sucesso no viewport de 375x667.
- Zero quebras de interação ou elementos bloqueados.

## Riscos
Tempo de execução maior da suíte E2E.

## Rollback
Reversão do arquivo de teste via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Playwright Mobile Task Flows (8 fluxos) | `npx playwright test -c e2e/playwright.config.ts e2e/task-flows.spec.ts` | 02/10/2026 16:02:38 | Windows 11 / Chromium & Mobile Safari | PASS | 32 passed across iPhone SE (375x667) e iPhone 14 (390x844) em 29.2s |
| Vite Production Build | `npm run build` | 02/10/2026 16:03:30 | Windows 11 | PASS | ✓ built in 5.02s (9.65s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:03:40 | Windows 11 | PASS | 181 passed across 38 test files |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:03:51 | Windows 11 | PASS | 8 passed (16.2s) |
| Backend Pytest Suite | `C:\Python314\python.exe -m pytest -q` | 02/10/2026 16:04:08 | Windows 11 | PASS | 357 passed, 3 warnings in 245.12s |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
