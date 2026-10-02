# Plano UX/UI — UX_UI_25_KEYBOARD_NAVIGATION_AUDIT_2.0.0

> **Título:** Auditoria de Navegação por Teclado e Eliminação de focus:outline-none  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Garantir navegação 100% operável via teclado em todos os fluxos da aplicação, eliminando ocorrências residuais de focus:outline-none sem anel de foco substituto.

## Contexto da versão 2.0.0
index.css definiu regra global :focus-visible, mas ainda existem cerca de 40 ocorrências de focus:outline-none que podem anular o indicador visual.

## Problema
Usuários que navegam exclusivamente por teclado (Tab / Shift+Tab) perdem o rastro do cursor em formulários e barras de ferramentas.

## Evidências
40 ocorrências de focus:outline-none detectadas no código.

## Estado atual
64 usos de focus-visible ativos e useFocusTrap funcional.

## O que já foi resolvido
Foco visível nos botões primários e modais principais.

## O que permanece
Inputs, selects e botões contextuais em tabelas.

## Escopo
Substituir focus:outline-none por focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none em todos os controles interativos.

## Fora de escopo
Atalhos globais de teclado complexos além dos já previstos (ESC, setas).

## Arquivos afetados
- frontend/src/components/*.tsx
- frontend/src/components/ui/*.tsx

## Componentes envolvidos
Inputs, selects, botões, abas

## Dependências
UX_UI_13_MODAL_MIGRATION_2.0.0, UX_UI_14_TOUCH_TARGET_AND_INTERACTION_TOKENS_2.0.0

## Estratégia de implementação
Varredura e substituição pelos padrões de foco do Design System.

## Estados e comportamento
Anel de foco nítido e visível imediatamente ao navegar com tecla Tab.

## Acessibilidade
WCAG 2.1 SC 2.4.7 Focus Visible (Nível AA).

## Responsividade
Não afeta clique com mouse/touch.

## Dark/Light
Anel de foco em cyan-500 visível contra fundos escuros e claros.

## Microcopy
N/A.

## Testes unitários
useFocusTrap.test.tsx e Button.test.tsx aprovados.

## Testes E2E
Teste Playwright navegando sequência de tabs com keyboard.press('Tab').

## Visual QA
Conferência visual dos anéis de foco.

## Critérios de aceite
- Zero controles interativos sem anel de foco visível ao usar teclado.
- Zero focus:outline-none isolado.

## Riscos
Anéis de foco aparecendo indevidamente em cliques com mouse se não for usado :focus-visible.

## Rollback
Reversão das classes de foco via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Playwright Keyboard Navigation E2E (8 fluxos) | `npx playwright test -c e2e/playwright.config.ts e2e/keyboard-navigation.spec.ts` | 02/10/2026 16:12:39 | Windows 11 / Chromium & Mobile Safari | PASS | 8 passed across Chromium e Mobile (Tab sequence, modal focus trap, Escape key) em 9.1s |
| Eliminação de focus:outline-none | Verificação estática (`Select-String`) | 02/10/2026 16:11:20 | Windows 11 | PASS | 0 ocorrências residuais de `focus:outline-none`; 100% substituídos por `focus-visible:ring-2` e `focus-visible:outline-none` |
| Vite Production Build | `npm run build` | 02/10/2026 16:17:49 | Windows 11 | PASS | ✓ built in 4.68s (9.41s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:17:58 | Windows 11 | PASS | 181 passed across 38 test files |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:18:09 | Windows 11 | PASS | 8 passed (16.4s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
