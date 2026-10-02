# Plano UX/UI — UX_UI_19_SEMANTIC_REFERENCE_RANGES_2.0.0

> **Título:** Semântica de Metas, Intervalos de Referência e Faixas Clínicas  
> **Fase:** Fase 3 (P2 Polish)  
> **Prioridade:** P2  
> **Referência Master:** `CODEX_LONGEVIDADE_HUB_2.0.0_UX_UI_REAUDIT_MASTER.md`  
> **Status:** Concluído  

---

## Objetivo
Diferenciar semanticamente 'Alvo Pessoal', 'Intervalo de Referência Laboratorial' e 'Faixa do Modelo Algorítmico' nos cards de métricas e tabelas.

## Contexto da versão 2.0.0
Cards atuais usam termos ambíguos como 'Meta: < 55 bpm' ou 'Meta: 10.000', misturando referências populacionais com metas terapêuticas pessoais.

## Problema
Usuário não sabe se o valor indicado é uma meta definida por ele, uma faixa fisiológica normal ou um alvo preconizado por modelos de longevidade.

## Evidências
Ocorrências de 'Meta: ...' genéricas em MetricCard.tsx e LabResultsTable.tsx.

## Estado atual
Valores exibem texto estático 'Meta:'.

## O que já foi resolvido
Normalização de cores semânticas.

## O que permanece
Diferenciação textual e contextual da origem do alvo.

## Escopo
1. Categorizar limites em 'Alvo Pessoal', 'Faixa de Referência' e 'Alvo de Longevidade'.
2. Adicionar tooltip explicativo ao lado do valor de referência.
3. Não depender apenas de cor verde/vermelho para indicar conformidade.

## Fora de escopo
Alterar fórmulas médicas ou ranges laboratoriais padrão.

## Arquivos afetados
- frontend/src/components/MetricCard.tsx
- frontend/src/components/LabResultsTable.tsx

## Componentes envolvidos
MetricCard, StatusBadge, LabResultsTable

## Dependências
UX_UI_16_DESIGN_SYSTEM_CONFORMANCE_2.0.0

## Estratégia de implementação
Adicionar propriedade `rangeType?: 'target' | 'reference' | 'optimal'` ao MetricCard.

## Estados e comportamento
Exibição contextual do rótulo e ícone de auxílio informativo.

## Acessibilidade
Leitor de tela anuncia explicitamente o tipo de faixa além do número.

## Responsividade
Formatação condensada em mobile ('Ref:' ou 'Alvo:').

## Dark/Light
Contraste compatível.

## Microcopy
Substituição de 'Meta:' genérico por 'Alvo Pessoal:' ou 'Referência:'.

## Testes unitários
MetricCard.test.tsx validando rótulos diferenciados.

## Testes E2E
Verificação visual nas tabelas laboratoriais.

## Visual QA
Inspeção visual dos badges e tooltips.

## Critérios de aceite
- Distinção explícita entre alvo terapêutico pessoal e faixa de referência clínica em 100% dos cards.

## Riscos
Espaço horizontal reduzido em cards compactos de 3 colunas.

## Rollback
Reversão das props do MetricCard via Git.

## Evidências de execução

| Critério / Teste | Comando | Data/Hora | Ambiente | Status | Detalhes / Log |
|---|---|---|---|---|---|
| Vite Production Build | `npm run build` | 02/10/2026 16:56:24 | Windows 11 | Python 3.14.6 (Commit fbe74c2) | PASS | ✓ built in 5.45s (10.47s) |
| Vitest Unit & Component Suite | `npm run test:run` | 02/10/2026 16:56:34 | Windows 11 | Python 3.14.6 (Commit fbe74c2) | PASS | Duration 11.46s (44 suites, 206 tests passed) (12.36s) |
| Playwright Visual QA Multi-Viewport | `npx playwright test -c e2e/playwright.config.ts e2e/visual-qa.spec.ts` | 02/10/2026 16:56:46 | Windows 11 | Python 3.14.6 (Commit fbe74c2) | PASS | 8 passed (16.0s) (17.23s) |

## Checklist de conclusão
- [x] Implementação de código finalizada
- [x] Testes unitários aprovados
- [x] Testes E2E aprovados
- [x] Validação visual realizada
- [x] Evidências de execução registradas
- [x] Homologação concluída
