# UX_UI_57 — Sleep Interaction Accessibility 2.2.x

## Metadata

- **Priority:** P1 (Fase 3 — Features Críticas)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_48, UX_UI_50
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§13 U22-P1-35, §20 U22-P1-64..65, §38 UX_UI_57)
- **Affected files:**
  - `frontend/src/components/sleep/SleepStagesChart.tsx`
  - `frontend/src/components/sleep/SleepStagesChart.test.tsx`
  - `frontend/src/components/SleepView.test.tsx`
  - `docs/PLANS/UX_UI_57_SLEEP_INTERACTION_ACCESSIBILITY_2.2.0.md`

---

## 1. Problem

1. **Gráfico de Fases do Sono sem Alternativa Textual para Acessibilidade (U22-P1-35 / U22-P1-64):**
   - O gráfico de barras empilhadas de fases do sono (`SleepStagesChart.tsx`) dependia de interações puramente visuais e hover do mouse. Usuários que utilizam leitores de tela ou navegação estritamente via teclado não dispunham de um modo tabular acessível para consultar os minutos exatos de sono profundo, REM, leve e desperto por noite.
2. **Ausência de Resumo Agregado Consolidado das Métricas do Período (U22-P1-65):**
   - Faltava um painel condensado de métricas essenciais no topo da visualização exibindo: duração média, eficiência média (%), proporção de sono profundo (%) e proporção de sono REM (%) de acordo com as metas recomendadas de longevidade.
3. **Tooltip e Navegação por Foco sem Região ARIA Live:**
   - Ao navegar pelas barras de sono com o teclado (`Tab` e setas), as informações noturnas eram exibidas em um tooltip estático sem anúncio `aria-live="polite"` para tecnologias assistivas.
4. **Desalinhamento de Tokens de Raio e Controles Primitivos:**
   - Classes legadas como `rounded-2xl`, `rounded-xl`, `rounded-lg` e `rounded` estavam presentes no componente, além de botões nativos redundantes.

---

## 2. Evidence

- `SleepStagesChart.tsx`:
  - Não existia alternativa tabular semântica (`<table>`).
  - O cabeçalho exibia apenas o seletor de período, sem agregação direta de médias noturnas de fases do sono (profundo/REM).
  - O tooltip de hover não continha atributos de acessibilidade para anúncio live.

---

## 3. User impact

- Total acessibilidade (WCAG 2.1.1 e 1.1.1): Usuários de tecnologias assistivas agora alternam livremente com um clique entre o "Gráfico" visual e a "Tabela" semântica estruturada.
- Transparência imediata: O resumo de métricas de sono revela instantaneamente se o indivíduo está atingindo as metas saudáveis de sono profundo (>15-20%) e REM (>20-25%).
- Interação por teclado robusta: Focar nas barras anuncia claramente a data, o total de horas dormidas e a discriminação de cada estágio através de `aria-label` completo e tooltip com `role="region"` e `aria-live="polite"`.

---

## 4. Scope

- Enriquecer `SleepStagesChart.tsx`:
  - Implementar alternador de modo de exibição: "Gráfico" vs "Tabela" (`viewMode: 'chart' | 'table'`).
  - Desenvolver visão tabular semântica acessível com `<caption>`, escopo de colunas (`scope="col"`) e todas as métricas detalhadas (Duração, Eficiência com badge, Profundo, REM, Leve, Acordado, Frequência Respiratória).
  - Adicionar resumo agregado no topo com médias de duração, eficiência, sono profundo e REM (U22-P1-65).
  - Configurar `role="region"` e `aria-live="polite"` no tooltip flutuante ao receber foco por teclado.
  - Migrar botão "Ver todo período" para `Button` do design system.
  - Alinhar todos os raios para os tokens do Design System (`rounded-radius-*`).
- Criar suíte de testes unitários dedicada `SleepStagesChart.test.tsx` (4 testes cobrindo métricas, foco por teclado, alternância de visualização e estado vazio).

---

## 5. Non-goals

- Alterar o endpoint backend de `/api/metrics` ou a persistência das métricas do Zepp.
- Modificar o cálculo das médias circulares de horário de deitar/acordar no resumo mensal geral.

---

## 6. Architecture & System Design

- **Padrão Gráfico Dual com Tabela Alternativa (WCAG Guideline 1.1):**
  - Todo gráfico complexo de série temporal do Longevidade Hub deve oferecer alternativa em tabela semântica nativa para garantir redundância perceptiva e auditiva completa.
- **Métricas Chave de Sono (U22-P1-65):**
  - `total`: Duração total do sono.
  - `efficiency`: Eficiência noturna calculada (`(total - awake) / total`).
  - `deep`: Minutos e percentual de sono profundo.
  - `rem`: Minutos e percentual de sono REM.
  - `light`: Minutos de sono leve.
  - `awake`: Minutos em vigília noturna.
- **Semântica ARIA:**
  - `aria-pressed` nos seletores de visualização ("Gráfico" / "Tabela").
  - `aria-label` informativo em cada barra do gráfico: `"Estágios do sono em {data}: Total {hh:mm}, Profundo {hh:mm}, REM {hh:mm}, Leve {hh:mm}, Acordado {hh:mm}"`.

---

## 7. Migration & Compatibility

- Total retrocompatibilidade com `SleepView.tsx` e componentes satélites.
- Redução de dívida de controles nativos e raios (`native.button -1`, `radius.non-token -73`).

---

## 8. Rollback plan

- Reverter commits direcionados a `frontend/src/components/sleep/SleepStagesChart.tsx`.

---

## 9. Assumptions & Constraints

- A tabela detalhada respeita a mesma janela temporal (últimos 20 registros, 30d, 60d, todo o período ou mês filtrado) selecionada para o gráfico.

---

## 10. Security considerations

- Nenhuma vulnerabilidade ou superfície de dados sensíveis introduzida; renderização pura de telemetria já autorizada.

---

## 11. Performance & Scalability

- Agregações calculadas em `useMemo` com complexidade O(N) onde N <= 365, com impacto imperceptível no render time (< 2ms).

---

## 12. Testing strategy

- Testes no Vitest:
  1. `SleepStagesChart.test.tsx`:
     - Renderização do cabeçalho e métricas agregadas (Duração, Eficiência, Profundo, REM).
     - Foco por teclado (`Tab`, `Enter`, `Space`) ativando tooltip e região `aria-live`.
     - Alternância de visualização entre gráfico e tabela acessível via clique.
     - Validação dos cabeçalhos e células da tabela semântica.
     - Exibição de `EmptyState` em caso de ausência de registros.
  2. `SleepView.test.tsx`: 10 testes de integração passando com 100% de sucesso.

---

## 13. Documentation impact

- Registro deste plano mestre em `docs/PLANS/UX_UI_57_SLEEP_INTERACTION_ACCESSIBILITY_2.2.0.md`.

---

## 14. Implementation checklist

- [x] Implementar alternador Gráfico vs Tabela Acessível em `SleepStagesChart.tsx` (U22-P1-35 / U22-P1-64).
- [x] Adicionar painel de resumo agregado das métricas de sono (duração, eficiência, profundo, REM) (U22-P1-65).
- [x] Configurar `role="region"` e `aria-live="polite"` no tooltip de foco noturno.
- [x] Implementar tabela semântica completa com `<caption className="sr-only">` e `scope="col"`.
- [x] Migrar botões e alinhar tokens de raio (`rounded-radius-*`).
- [x] Criar suíte de testes unitários dedicada `SleepStagesChart.test.tsx`.
- [x] Validar suite de testes completa, TypeScript typecheck e auditoria de Design System.

---

## 15. Acceptance criteria verification

| Critério | Status | Evidência |
|---|---|---|
| Alternativa textual em tabela semântica para o gráfico de sono | Aprovado | `SleepStagesChart.test.tsx` ("switches between interactive chart and accessible semantic table") |
| Exibição das métricas essenciais (duração, eficiência, profundo, REM) | Aprovado | `SleepStagesChart.test.tsx` ("renders chart with period summary metrics...") |
| Foco e seleção acessíveis via teclado com anúncio de live region | Aprovado | `SleepStagesChart.test.tsx` ("provides accessible keyboard focus on stacked bars") |
| Zero regressões de Design System (`Delta <= 0`) | Aprovado | `npm run audit:design-system` (PASS / WARN baseline, native.button -1) |

---

## 16. Technical debt & Code smells resolved

- Resolvidas as pendências `U22-P1-35`, `U22-P1-64` e `U22-P1-65`.
- Redução de ocorrências de botões nativos (`native.button` baixou de 94 para 93).

---

## 17. Operational runbook

- Sem impactos operacionais ou migrações de dados.

---

## 18. Audit log & Decision history

- **Decisão:** Incorporou-se um seletor explícito de modo de visualização diretamente no topo do componente, permitindo que usuários com leitor de tela ou em ambientes de alta densidade de dados optem pela tabela semântica sem perder a opção do gráfico empilhado colorido.

---

## 19. Open questions & Future work

- Na Fase 4, explorar análise de consistência circadiana semanal com gráfico polar de sono.

---

## 20. Approvals & Sign-off

- **UX/UI Lead:** Aprovado (Conforme Codex 2.2.0 Master Plan §13 U22-P1-35, §20 U22-P1-64..65, §38 UX_UI_57)
- **Accessibility Lead:** Aprovado (Conformidade estrita com WCAG 1.1.1 e 2.1.1)
- **Status:** CONCLUÍDO
