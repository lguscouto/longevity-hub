# Plano UX/UI — UX_UI_18_OVERVIEW_INFORMATION_HIERARCHY_2.0.0

> **Título:** Hierarquia de Informação e Desafogamento Cognitivo do Overview  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Reorganizar o painel Overview para responder de imediato 'Como estou hoje?' sem sobrecarregar o usuário com todos os widgets simultaneamente.

## Contexto da versão 2.0.0
A criação de OverviewSection agrupou os widgets em 3 camadas, mas o primeiro carregamento ainda expõe simultaneamente mais de 10 cards e dashboards densos.

## Problema
Excesso de decisões visuais concorrentes na primeira tela: KPIs, check-in, compliance, circadiano, carga de treino, PhenoAge e CGM competindo por atenção.

## Evidências
docs/screenshots/dashboard_overview.png mostra alta densidade de gráficos no primeiro viewport.

## Estado atual
Organizado em 3 seções, mas todas abertas e densas por padrão.

## O que já foi resolvido
Separação lógica em Hoje, Contexto e Análises Avançadas.

## O que permanece
Tornar blocos analíticos secundários colapsáveis ou focados na tarefa.

## Escopo
1. Estabelecer o bloco Hoje com orientação principal, 5 KPIs e check-in.
2. Adicionar controle colapsável inteligente ou abas contextuais para Análises Avançadas (PhenoAge, CGM, Histórico de Treinos).
3. Preservar persistência do estado no localStorage.

## Fora de escopo
Exclusão de qualquer métrica ou cálculo existente.

## Arquivos afetados
- frontend/src/App.tsx
- frontend/src/components/OverviewSection.tsx

## Componentes envolvidos
OverviewSection, App, DailyGuidanceCard, MetricCard

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Adicionar suporte a 'defaultCollapsed' e botões de alternância com transição suave em seções de menor urgência diária.

## Estados e comportamento
Hoje sempre visível; Análises Avançadas expansíveis sob demanda.

## Acessibilidade
aria-expanded em seções colapsáveis, teclado acessível.

## Responsividade
Redução drástica do scroll vertical no mobile.

## Dark/Light
Contraste preservado em superfícies recolhidas.

## Microcopy
'Exibir análises detalhadas', 'Ocultar detalhes'.

## Testes unitários
App.test.tsx testando expansão/recolhimento de seções.

## Testes E2E
visual-qa.spec.ts verificando primeira dobra em 375x667.

## Visual QA
Captura comparativa de altura útil no mobile.

## Critérios de aceite
- Altura útil no primeiro carregamento reduzida em pelo menos 30% no mobile.
- 100% dos dados acessíveis em até 1 clique.
- Zero perda de métricas.

## Riscos
Usuários habituados a ver todos os gráficos abertos sentirem falta de visualização imediata.

## Rollback
Reversão das propriedades colapsáveis via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Planejamento Inicial | N/A | 02/10/2026 | Local | PENDING | Aguardando início da execução |

## Checklist de conclusão
- [ ] Implementação de código finalizada
- [ ] Testes unitários aprovados
- [ ] Testes E2E aprovados
- [ ] Validação visual realizada
- [ ] Evidências de execução registradas
- [ ] Homologação concluída
