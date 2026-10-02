# Plano UX/UI — UX_UI_32_TEMPORAL_SEMANTICS_2.0.0

> **Título:** Semântica Temporal Unificada, Timezones e Distinção de Dado Zero vs Ausente  
> **Fase:** Fase 2 (P1 Experiência)  
> **Prioridade:** P1  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Não Iniciado  

---

## Objetivo
Unificar o tratamento de datas, timezones, janelas temporais ('Hoje', 7d, 30d, 90d, Tudo) e garantir distinção universal entre valor zero medido (0) e dado ausente (—).

## Contexto da versão 2.0.0
DateNavigator e TimeRangeControl operam em diferentes áreas com ligeiras variações de timezone local vs UTC, e alguns widgets exibiam 0 para dias sem registros.

## Problema
Confusão clínica quando zero é interpretado como ausência de dado em indicadores onde 0 tem significado biológico (ex: calorias, passos, episódios de apneia).

## Evidências
Apontamento na Seção 30 e 31 da reauditoria sobre coerência temporal.

## Estado atual
TimeRangeControl criado e adotado parcialmente.

## O que já foi resolvido
Remoção de números de exemplo sintéticos.

## O que permanece
Regra universal no frontend para formatação de valores nulos e timezone explícito.

## Escopo
1. Criar helper formatMetricValue(val, unit) garantindo '—' para nulo/indisponível e '0 unit' para medição real igual a zero.
2. Padronizar formatação de data com timezone do navegador do usuário.

## Fora de escopo
Alterar campos de data no banco SQLite.

## Arquivos afetados
- frontend/src/lib/formatters.ts (Novo)
- frontend/src/components/MetricCard.tsx
- frontend/src/components/BodyCompositionChart.tsx
- frontend/src/components/SleepView.tsx

## Componentes envolvidos
Formatadores e widgets de métricas

## Dependências
Nenhuma.

## Estratégia de implementação
Centralizar rotinas de formatação numérica e temporal em módulo utilitário testado.

## Estados e comportamento
Exibição rigorosa de valores.

## Acessibilidade
Leitor de tela lê 'Não informado' para '—'.

## Responsividade
Tamanhos de fonte estáveis.

## Dark/Light
N/A.

## Microcopy
'Sem registro para esta data' quando apropriado.

## Testes unitários
formatters.test.ts cobrindo null, undefined, NaN, 0 e valores decimais.

## Testes E2E
N/A.

## Visual QA
Conferência visual de cards sem dados.

## Critérios de aceite
- Zero instâncias onde dado nulo é renderizado como 0.
- 100% dos testes de formatação aprovados.

## Riscos
Quebra de testes legados que esperavam strings específicas.

## Rollback
Reversão do helper via Git.

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
