# Plano UX/UI — UX_UI_31_TABLE_RESPONSIVE_SYSTEM_2.0.0

> **Título:** Sistema Transversal de Tabelas, Densidade e Row Cards Móveis  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Padronizar o comportamento de tabelas em todo o produto, consolidando o padrão Desktop Table (>=768px) vs Mobile Row Card (<768px) com ordenação e filtros claros.

## Contexto da versão 2.0.0
LabResultsTable e WorkoutsTable tiveram suporte a Row Cards implementado na v2.0.0, mas outras tabelas (sono, auditoria, histórico de IA) precisam adotar a mesma consistência.

## Problema
Padrões divergentes de paginação, ordenação e padding entre tabelas de diferentes módulos.

## Evidências
Diferenças de padding e alinhamento encontradas na auditoria entre tabelas de sono e exames.

## Estado atual
Row Cards funcionais em LabResultsTable e WorkoutsTable.

## O que já foi resolvido
Eliminação de overflow horizontal em exames e treinos.

## O que permanece
Expansão do padrão para tabelas de sono, logs de auditoria e histórico de IA.

## Escopo
1. Aplicar a mesma arquitetura semântica de tabela responsiva às tabelas de sono e auditoria.
2. Alinhar números à direita em fonte monoespacada e texto à esquerda em todas as tabelas.
3. Definir padding canônico de cabeçalhos e células.

## Fora de escopo
Adicionar bibliotecas pesadas de data-grid.

## Arquivos afetados
- frontend/src/components/SleepView.tsx
- frontend/src/components/SupplementsView.tsx
- frontend/src/components/AICopilotView.tsx

## Componentes envolvidos
Tabelas de dados

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Reutilizar as classes semânticas `block md:table` e células responsivas `block md:table-cell`.

## Estados e comportamento
Transição suave de grade tabular para cartões individuais empilhados ao reduzir o viewport.

## Acessibilidade
Tags semânticas de tabela preservadas com labels textuais em mobile.

## Responsividade
Zero overflow horizontal em qualquer tabela nos viewports 375px e 390px.

## Dark/Light
Divisores sutis e contraste compatível.

## Microcopy
Cabeçalhos claros com unidades explícitas.

## Testes unitários
Testes unitários verificando labels responsivas em cada tabela.

## Testes E2E
mobile-audit.spec.ts verificando todas as abas tabulares.

## Visual QA
Revisão visual das tabelas no iPhone 14 e Desktop.

## Critérios de aceite
- 100% das tabelas da aplicação operando como Row Cards em <768px.
- Zero overflow horizontal em qualquer listagem de dados.

## Riscos
Quebra de alinhamento em tabelas com muitas colunas de metadados.

## Rollback
Reversão das alterações tabulares via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 16:37:41 | Windows 11 | Python 3.14.6 | PASS | ✓ built in 4.67s |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:37:51 | Windows 11 | Python 3.14.6 | PASS | 40 suites, 190 passed |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:38:02 | Windows 11 | Python 3.14.6 | PASS | 8 passed (iPhone SE, iPhone 14, iPad, Desktop) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
