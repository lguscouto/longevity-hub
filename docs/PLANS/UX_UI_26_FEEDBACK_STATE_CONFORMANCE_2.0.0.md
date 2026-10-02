# Plano UX/UI — UX_UI_26_FEEDBACK_STATE_CONFORMANCE_2.0.0

> **Título:** Adoção Transversal de Primitives de Feedback (Loading, Error e Empty)  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Assegurar que 100% das áreas do produto adotem os primitives EmptyState, ErrorState e LoadingIndicator, eliminando mensagens ad-hoc de texto puro.

## Contexto da versão 2.0.0
Os primitives de feedback foram criados em frontend/src/components/ui/, mas subpainéis e gavetas de gráficos ainda utilizam divs simples com 'Carregando...'.

## Problema
Inconsistência na forma como falhas e estados sem dados são comunicados ao usuário.

## Evidências
Ocorrências de 'Carregando painel...' em divs ad-hoc no App.tsx e gráficos.

## Estado atual
EmptyState amplamente adotado nos módulos principais na v2.0.0.

## O que já foi resolvido
Criação dos primitives e testes unitários.

## O que permanece
Padronização das transições de loading assíncrono e fallbacks de Suspense.

## Escopo
Substituir mensagens informais em Suspense fallbacks e blocos de catch por <LoadingIndicator> e <ErrorState> com botões de ação e tentativa.

## Fora de escopo
Alterar regras de timeout de requisições de rede.

## Arquivos afetados
- frontend/src/App.tsx
- frontend/src/components/BodyCompositionChart.tsx
- frontend/src/components/WorkoutsView.tsx

## Componentes envolvidos
LoadingIndicator, ErrorState, EmptyState, App

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Padronizar fallbacks de React Suspense e handlers de erro de queries.

## Estados e comportamento
Feedback semântico anunciado para leitores de tela com aria-live='polite' e role='status'/'alert'.

## Acessibilidade
Acessibilidade plena em estados transitórios.

## Responsividade
Centralização vertical e horizontal sem quebra de layout.

## Dark/Light
Cores semânticas padronizadas.

## Microcopy
Mensagens amigáveis com indicação da ação corretiva.

## Testes unitários
ErrorState.test.tsx e LoadingIndicator.test.tsx aprovados.

## Testes E2E
Validação de estados vazios no Playwright.

## Visual QA
Revisão visual dos spinners e alertas.

## Critérios de aceite
- 100% dos estados de carregamento estruturais utilizando LoadingIndicator.
- 100% dos erros recuperáveis oferecendo botão de 'Tentar novamente'.

## Riscos
Pequenas alterações no timing de testes de mock que esperavam divs simples.

## Rollback
Reversão das substituições via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Adoção de Primitives de Feedback | Inspeção estática em `App.tsx`, `BodyCompositionChart.tsx`, `WorkoutsView.tsx`, `TimelineView.tsx` | 02/10/2026 16:21:46 | Windows 11 | PASS | 100% de adoção de `LoadingIndicator`, `ErrorState` (com `onRetry`), `EmptyState` em fallbacks assíncronos e estados transitórios |
| Vite Production Build | `npm run build` | 02/10/2026 16:22:51 | Windows 11 | PASS | ✓ built in 5.17s (9.91s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:23:01 | Windows 11 | PASS | 181 passed across 38 test files (12.30s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:23:13 | Windows 11 | PASS | 8 passed across 4 viewports (17.86s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
