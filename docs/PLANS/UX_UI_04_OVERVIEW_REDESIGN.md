# Plano UX/UI — UX_UI_04_OVERVIEW_REDESIGN

## Objetivo
Reestruturar a página inicial (Overview / "Hoje") do Longevidade Hub para uma hierarquia em 3 camadas de leitura progressiva:
1. **Hoje (Primeira Dobra):** Foco no momento atual — data, confiabilidade do dado, resumo em uma frase, 4-5 métricas essenciais do dia e check-in diário.
2. **Contexto & Recuperação:** Aderência a protocolos, Carga de Treino aguda/crônica e Ritmo Circadiano 24h.
3. **Análises Avançadas:** PhenoAge/KDM, CGM (Glicose Contínua) e Histórico Detalhado de Treinos colapsável.

## Problema
- Na versão 1.9.8, `App.tsx` empilhava linearmente mais de 8 métricas e múltiplos widgets analíticos pesados sem separação hierárquica.
- A primeira dobra estava sobrecarregada, competindo pela atenção do usuário logo na chegada.
- Widgets analíticos de longo prazo (como PhenoAge e CGM) dividiam o mesmo nível de importância que o check-in diário e os passos de hoje.

## Evidências
- `frontend/src/App.tsx` (linhas 521-608): sequência vertical longa de widgets.
- Auditoria de UX/UI v1.9.8: item `UX-P0-01` e screenshot `dashboard_overview.png`.

## Escopo
- Criar o componente primitivo `OverviewSection.tsx` para delimitar seções semânticas.
- Reorganizar os widgets do Overview nas três camadas lógicas.
- Priorizar 4 a 5 métricas principais na primeira dobra (Passos, FC Repouso, HRV, Sono Total, Gasto Calórico) e disponibilizar métricas secundárias (Taxa Respiratória, SpO2) via expansor elegante "Métricas Adicionais do Dia".
- Manter o auto-save de `DailyCheckinCard` e todos os fluxos de atualização sem quebras.

## Fora de escopo
- Remoção de qualquer dado ou métrica calculada.
- Alteração nas APIs de backend (`/api/metrics`, `/api/phenoage/calculate`, etc.).

## Arquivos afetados
- `frontend/src/components/OverviewSection.tsx` (Novo)
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`

## Componentes envolvidos
- `OverviewSection`
- `DateNavigator`
- `DataConfidenceBadge`
- `DailyGuidanceCard`
- `MetricCard`
- `DailyCheckinCard`
- `DailyComplianceWidget`
- `TrainingLoadWidget`
- `EnergyCircadianWidget`
- `PhenoAgeWidget`
- `CGMDashboard`
- `WorkoutsTable`

## Dependências
- `UX_UI_03_NAVIGATION_REDESIGN`

## Estratégia de implementação
1. Criar `OverviewSection.tsx` com container semântico, título com peso tipográfico equilibrado, descrição e slots para ações.
2. No `App.tsx`, estruturar a visão da aba `today` / `overview` em 3 blocos explícitos usando `OverviewSection`.
3. Adicionar estado de toggle controlado para "Métricas Adicionais" na primeira dobra.
4. Validar preservação de eventos, callbacks e compatibilidade com os testes existentes.

## Estados e comportamento
- **Com dados:** Exibe os dados do dia selecionado com badges e tendências.
- **Sem dados:** Exibe feedback claro através do rótulo existente ("Sem dados para a data") e estado vazio estruturado.
- **Loading:** Indicador de atualização suave sem desmontar os cards.

## Acessibilidade
- Títulos de seção associados com `aria-labelledby` ou `aria-label`.
- Botões de alternância e expansão com estados anunciados (`aria-expanded`).
- Foco visível em todos os controles interativos.

## Responsividade
- Grid adaptativo: 1 coluna no mobile (< 640px), 2 colunas em tablet (sm/md), até 4 colunas em telas amplas (lg/xl).
- Redução de altura da primeira dobra em 40% no mobile.

## Testes
- Testes unitários com Vitest (`App.test.tsx`).
- Testes E2E com Playwright (`smoke.spec.ts`).

## Critérios de aceite
- [x] Primeira dobra contém apenas informações essenciais do dia + ação rápida de check-in.
- [x] Separação nítida entre "Hoje", "Contexto" e "Análises Avançadas".
- [x] Todos os dados e widgets atuais permanecem acessíveis e funcionais.
- [x] Auto-save do check-in permanece preservado.
- [x] Zero regressão na suíte de testes.

## Riscos
- Risco de ocultar métricas esperadas por testes automatizados. Mitigação: manter as métricas acessíveis no DOM ou renderizadas com seletores transparentes.

## Rollback
- Reversão simples via Git de `App.tsx` e remoção de `OverviewSection.tsx`.

## Checklist de conclusão
- [ ] Criar `OverviewSection.tsx`
- [ ] Reorganizar o Overview no `App.tsx`
- [ ] Executar e validar a suíte de testes
