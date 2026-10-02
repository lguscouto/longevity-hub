# Plano UX/UI — UX_UI_17_TYPOGRAPHY_LEGIBILITY_2.0.0

> **Título:** Legibilidade Tipográfica e Eliminação de Microtipografias Funcionais  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Reduzir drasticamente o uso de tipografias inferiores a 12px (text-[9px], text-[10px], text-[11px]) em conteúdos clínicos essenciais, dosagens e dados de saúde.

## Contexto da versão 2.0.0
A reauditoria registrou cerca de 160 ocorrências de text-[10px] e 104 de text-[11px], muitas delas em informações clínicas relevantes.

## Problema
Textos clínicos essenciais tornam-se difíceis de ler para usuários com baixa acuidade visual ou em ambientes com reflexo no mobile.

## Evidências
Contagem de 160 ocorrências de text-[10px] em componentes de saúde e IA.

## Estado atual
Escala tipográfica recomendada em docs/DESIGN_SYSTEM.md, mas pendente de aplicação nos dados.

## O que já foi resolvido
Valores de métricas principais aumentados para text-metric/font-mono.

## O que permanece
Ajuste de tabelas, timestamps, dosagens e textos de chat.

## Escopo
Migrar textos funcionais para text-xs (12px) e text-sm (14px), restringindo <11px exclusivamente a tags e badges compactos decorativos.

## Fora de escopo
Alterar tamanho de gráficos SVG renderizados por bibliotecas terceiras.

## Arquivos afetados
- frontend/src/components/LabResultsTable.tsx
- frontend/src/components/SupplementsView.tsx
- frontend/src/components/AICopilotView.tsx
- frontend/src/components/SleepView.tsx

## Componentes envolvidos
Tabelas, listas de suplementos, balões de chat

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Substituir text-[10px]/text-[11px] por text-xs em informações legíveis e aplicar line-height proporcional.

## Estados e comportamento
Leitura escaneável e confortável.

## Acessibilidade
WCAG 2.1 SC 1.4.4 Resize text e legibilidade mínima recomendada.

## Responsividade
Texto ajustado para não quebrar tabelas no mobile.

## Dark/Light
Contraste aprimorado com slate-700/300.

## Microcopy
Textos mais claros e legíveis.

## Testes unitários
Validar testes de componentes para checar quebras de renderização.

## Testes E2E
Executar mobile-audit.spec.ts verificando contenção.

## Visual QA
Revisão de telas em 375x667.

## Critérios de aceite
- Queda de pelo menos 70% nas ocorrências de text-[10px] em conteúdo funcional.
- Mínimo de 12px para dosagens, unidades e resultados laboratoriais.

## Riscos
Risco de overflow em colunas muito apertadas de tabelas.

## Rollback
Reversão das classes tipográficas via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 16:52:26 | Windows 11 | Python 3.14.6 (Commit 4dcb9c3) | PASS | ✓ built in 4.74s (9.43s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:52:36 | Windows 11 | Python 3.14.6 (Commit 4dcb9c3) | PASS | Duration 11.98s (44 suites, 205 tests passed) (12.92s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:52:49 | Windows 11 | Python 3.14.6 (Commit 4dcb9c3) | PASS | 8 passed (16.4s) (17.62s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
