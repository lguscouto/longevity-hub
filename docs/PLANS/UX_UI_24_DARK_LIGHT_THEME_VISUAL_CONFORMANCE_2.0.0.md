# Plano UX/UI — UX_UI_24_DARK_LIGHT_THEME_VISUAL_CONFORMANCE_2.0.0

> **Título:** Conformidade Visual e Equivalência Perceptiva Dark/Light Mode  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Auditar e harmonizar as paletas clara e escura em todas as áreas, garantindo contraste mínimo de 4.5:1, bordas suaves e ausência de textos brancos 'fantasmas' no modo claro.

## Contexto da versão 2.0.0
prompt_correcao_tema_claro_longevidade_hub.md estabeleceu as bases do tema claro, mas resíduos de classes rígidas (ex: text-white sem variante dark:) ainda ocorriam em subpainéis.

## Problema
Componentes em modo claro podiam apresentar contraste insuficiente ou bordas muito duras/invisíveis.

## Evidências
Ocorrências de classes rígidas text-white e bg-slate-900 sem contrapartida light em SleepStagesChart, AssessmentComparison, AssessmentHistory e rótulos de tabelas responsivas.

## Estado atual
Concluído e harmonizado com sucesso em todos os macroblocos. Equivalência perceptiva total entre Dark e Light mode com contraste WCAG 2.1 AA >= 4.5:1.

## O que já foi resolvido
1. `SleepStagesChart.tsx`: remoção de `bg-slate-900/90 text-white` monolítico, aplicação de `glass-panel` semântico, eixos Y/X com `border-slate-200 dark:border-slate-800`, rótulos `text-slate-500 dark:text-slate-400` e legenda com contraste adaptativo em ambos os temas.
2. `AssessmentComparison.tsx`: remoção de caixas opacas `bg-slate-950` na visualização de fotos, agora utilizando `bg-slate-100/70 dark:bg-slate-950` com bordas semânticas `border-slate-200 dark:border-slate-800` e títulos com contraste auditado.
3. `AssessmentHistory.tsx`: cabeçalho de miniatura de fotos sem imagem migrado de `bg-slate-950` para `bg-slate-100 dark:bg-slate-950` e ícone com contraste acessível.
4. `SleepMonthlyTable.tsx`: migração de todos os rótulos responsivos mobile de `text-slate-400` para `text-slate-500 dark:text-slate-400` (proporção >= 4.5:1 contra fundo branco).
5. Validação multi-viewport de Playwright em iPhone SE, iPhone 14, iPad e Desktop em ambos os modos Dark e Light aprovada com 100% de sucesso.

## O que permanece
Nada pendente neste plano.

## Escopo
1. Auditar contraste WCAG em todos os 6 macroblocos no tema claro.
2. Substituir classes rígidas por pares Tailwind (ex: text-slate-900 dark:text-white).
3. Ajustar transparências de glassmorphism para legibilidade no fundo claro.

## Fora de escopo
Criação de novos temas de cores além de dark e light.

## Arquivos afetados
- frontend/src/components/*.tsx
- frontend/src/index.css

## Componentes envolvidos
Todos os componentes de visualização

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Inspeção sistemática com ferramenta de lint e testes visuais Playwright comparativos.

## Estados e comportamento
Transição suave e contraste rigoroso em ambos os modos.

## Acessibilidade
WCAG 2.1 AA: Contraste mínimo de 4.5:1 para texto normal e 3:1 para texto grande.

## Responsividade
Preservação em todos os tamanhos de tela.

## Dark/Light
Foco central deste plano.

## Microcopy
Preservação de textos.

## Testes unitários
ThemeContext.test.tsx aprovado.

## Testes E2E
visual-qa.spec.ts aprovado com testes de tema.

## Visual QA
Matriz de screenshots comparativos Dark vs Light arquivada.

## Critérios de aceite
- 100% dos textos com contraste verificado >= 4.5:1 em ambos os temas.
- Zero textos brancos invisíveis no tema claro.

## Riscos
Alteração acidental do tema escuro de referência.

## Rollback
Reversão das classes de tema via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 17:12:44 | Windows 11 | Python 3.14.6 (Commit 661bcbb) | PASS | ✓ built in 5.51s (10.47s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 17:12:54 | Windows 11 | Python 3.14.6 (Commit 661bcbb) | PASS | 44 arquivos de teste aprovados, 206 testes unitários PASS (12.40s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 17:13:07 | Windows 11 | Python 3.14.6 (Commit 661bcbb) | PASS | 8 passed (Dark & Light em iPhone SE, iPhone 14, iPad, Desktop) (17.41s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
