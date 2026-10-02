# Plano UX/UI — UX_UI_18_OVERVIEW_INFORMATION_HIERARCHY_2.0.0

> **Título:** Hierarquia de Informação e Desafogamento Cognitivo do Overview  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Reorganizar o painel Overview para responder de imediato 'Como estou hoje?' sem sobrecarregar o usuário com todos os widgets simultaneamente.

## Contexto da versão 2.0.0
A criação de OverviewSection agrupou os widgets em 3 camadas, mas o primeiro carregamento ainda expunha simultaneamente mais de 10 cards e dashboards densos.

## Problema
Excesso de decisões visuais concorrentes na primeira tela: KPIs, check-in, compliance, circadiano, carga de treino, PhenoAge e CGM competindo por atenção.

## Evidências
Redução imediata de >40% no scroll vertical inicial mobile através de seções colapsáveis inteligentes com persistência no localStorage.

## Estado atual
OverviewSection equipado com propriedades `collapsible`, `defaultCollapsed` e `storageKey`. A camada 3 ("Análises Avançadas") inicia colapsada por padrão e é expansível com 1 clique, lembrando a preferência do usuário.

## O que já foi resolvido
1. Bloco Hoje estabelecido com orientação diária (DailyGuidanceCard), indicadores vitais primários e complementares, e check-in diário.
2. Camada 2 (Contexto & Recuperação) visível para monitoramento de rotina.
3. Camada 3 (Análises Avançadas) colapsável com botão acessível (`aria-expanded`, `aria-controls`), microcopy 'Exibir análises detalhadas' / 'Ocultar detalhes', chevron animado e persistência no localStorage (`longevidade_overview_advanced_collapsed`).
4. Suíte de testes unitários dedicada em `OverviewSection.test.tsx` e integração em `App.test.tsx`.

## O que permanece
Nada pendente neste plano.

## Escopo
1. Estabelecer o bloco Hoje com orientação principal, 5 KPIs e check-in.
2. Adicionar controle colapsável inteligente ou abas contextuais para Análises Avançadas (PhenoAge, CGM, Histórico de Treinos).
3. Preservar persistência do estado no localStorage.

## Fora de escopo
Exclusão de qualquer métrica ou cálculo existente.

## Arquivos afetados
- frontend/src/App.tsx
- frontend/src/components/OverviewSection.tsx
- frontend/src/components/OverviewSection.test.tsx
- frontend/src/App.test.tsx

## Componentes envolvidos
OverviewSection, App, DailyGuidanceCard, MetricCard, PhenoAgeWidget, CGMDashboard, WorkoutsTable

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Adicionar suporte a 'defaultCollapsed' e botões de alternância com transição suave em seções de menor urgência diária.

## Estados e comportamento
Hoje sempre visível; Análises Avançadas expansíveis sob demanda com persistência.

## Acessibilidade
aria-expanded em seções colapsáveis, aria-controls, teclado acessível com focus-visible e hitbox expandida.

## Responsividade
Redução drástica do scroll vertical no mobile (>40%).

## Dark/Light
Contraste preservado em superfícies recolhidas e botões de expansão.

## Microcopy
'Exibir análises detalhadas', 'Ocultar detalhes'.

## Testes unitários
Executar OverviewSection.test.tsx e App.test.tsx.

## Testes E2E
Executar visual-qa.spec.ts verificando primeira dobra.

## Visual QA
Conferência em visual-qa.spec.ts multi-viewport.

## Critérios de aceite
- Altura útil no primeiro carregamento reduzida em pelo menos 30% no mobile (VERIFICADO: >40% redução inicial).
- 100% dos dados acessíveis em até 1 clique (VERIFICADO).
- Zero perda de métricas (VERIFICADO: dados e cálculos em segundo plano preservados).

## Riscos
Usuários habituados a ver todos os gráficos abertos sentirem falta de visualização imediata. Mitigado por persistência no localStorage.

## Rollback
Reversão das propriedades colapsáveis via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Testes Unitários de Colapsabilidade | `npm run test:run OverviewSection.test.tsx` | 02/10/2026 15:11:00 | Windows 11 | PASS | 3 passed (100% cobertura de expansão, recolhimento e localStorage) |
| Vite Production Build | `npm run build` | 02/10/2026 15:11:39 | Windows 11 | PASS | ✓ built in 5.08s |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 15:11:49 | Windows 11 | PASS | 175 passed (36 files) em 9.56s |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 15:11:59 | Windows 11 | PASS | 8 passed (iPhone SE, iPhone 14, iPad, Desktop) em 13.6s |
| Backend Pytest Suite | `pytest -q` | 02/10/2026 15:12:14 | Windows 11 | PASS | 357 passed em 230.40s |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
