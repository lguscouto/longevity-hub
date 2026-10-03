# UX/UI 43 — Semântica de Dados (referência, qualidade, estados vazios e temporal)

## Metadata

- **Priority:** P1
- **Phase:** 3 — Data UX
- **Status:** Concluído (03/10/2026)
- **Dependencies:** UX_UI_35
- **Master:** UX21-P1-04, P1-05, P1-06, P1-15, P1-16, P2-05, §14–§16, §40–§47, §75–§78, §109–§110, §124
- **Affected files:** `MetricCard.tsx`, `LabResultsTable.tsx`, `CGMDashboard.tsx`, `ExerciseDetailModal.tsx`, `PhenoAgeWidget.tsx`, `OverviewSection.tsx`, `DataConfidenceBadge`, `DataQualityPanel`, `docs/GLOSSARY.md`, `docs/DESIGN_SYSTEM.md` §7

## Problem

1. **Vocabulário:** 16 usos de "Alvo" onde o valor é referência clínica ou estatística (`LabResultsTable` "Alvo Ótimo", `CGMDashboard` "Alvo Longevidade"). Master §14: nunca "Alvo" para referência estatística/clínica.
2. `DataConfidenceBadge` (6 usos) e `DataQualityPanel` (4) não cobrem as áreas onde a qualidade muda a interpretação.
3. Overview ainda é "metric card, metric card, chart" sem conclusão.
4. Estados `Sem dados / Não monitorado / Não calculável / Não sincronizado / Desatualizado / Erro` não são semanticamente distintos.
5. Dado observado × modelo × inferência sem camada visual consistente (PhenoAge/KDM = MODELO).

## Evidence

Greps de "Alvo/Meta" no índice; plano 19 PARTIAL; plano 32 PARTIAL.

## User impact

Leitura normativa indevida ("68 bpm, Alvo <55") e falsa sensação de certeza (§137).

## Scope

1. **Vocabulário canônico** (master §40): Meta, Referência clínica, Referência pessoal, Faixa observada, Estimativa, Modelo, Inferência, Sem dados, Não monitorado, Desatualizado. Regra de uso no DS §7 + GLOSSARY; refatorar os 16 "Alvo".
2. **Camada epistemológica:** `<SourceTag kind="observed|model|inference">` em HRV, PhenoAge, KDM, insights de IA.
3. **Qualidade do dado** nas métricas-chave: fonte, cobertura (ex. 27/30 dias), qualidade.
4. **Estados de ausência** com variantes tipadas; nunca `0`; `EmptyState` com Fonte / Última sync / Como adicionar / Por que não há dado.
5. **Overview orientado a decisão:** cada bloco responde a pergunta (estado, tendência, desvio, qualidade, mudança, fonte); onboarding leve (Perfil → Fontes → Primeiros dados → Métricas → Análise) quando vazio.
6. **Temporal:** `Hoje / Ontem / Últimos 7·30·90 dias / Personalizado` — rótulo único (sem `30d` vs `30 dias`); frescor ("Atualizado há 3 dias"); timezone local explícito.
7. Estados de loading preservando estrutura (skeleton do layout real) e `ErrorState` com impacto/ação/detalhe técnico secundário.

## Non-goals

Alterar algoritmos de PhenoAge/KDM; mudar faixas clínicas.

## Proposed solution

Primitive `SourceTag`, utilitário `describeAbsence(kind)`, tabela de termos única em `GLOSSARY.md` consumida por `TermHelp`.

## Component changes

Ver Affected files + `ui/SourceTag.tsx` (novo).

## Token changes

Semânticas visuais `observed|model|inference|clinical|warning|action` (cor + ícone + texto).

## Accessibility

Nunca só cor (§41); `aria-label` com tipo de dado.

## Responsive behavior

`SourceTag` compacto (ícone + texto curto) em cards mobile.

## Data semantics

Núcleo do plano.

## Tests

Vitest: nenhum `0` para ausência; textos "Alvo" só em contexto de meta pessoal; `SourceTag` renderiza texto; `formatMetricValue` cobre os 6 estados.

## Visual QA

Overview vazio, parcial, completo; dark/light.

## Acceptance criteria

- [x] "Alvo" só para meta pessoal definida pelo usuário.
- [x] Todo indicador derivado com `SourceTag`.
- [x] 6 estados de ausência distintos e testados.
- [x] Overview vazio com caminho inicial orientado.

## Evidence of execution

1. **Camada Epistemológica & Taxonomia de Ausência (`frontend/src/lib/dataSemantics.ts`):**
   - Implementado `SourceKind` (`observed`, `model`, `inference`, `clinical`, `warning`, `action`) com `getSourceConfig`.
   - Implementada taxonomia dos 6 estados de ausência em `AbsenceKind` (`no_data`, `unmonitored`, `uncomputable`, `unsynced`, `stale`, `error`) e `describeAbsence`.
   - Adicionada formatação civil de frescor com timezone local (`formatDataFreshness`).
   - Cobertura de 19 testes unitários dedicados em `frontend/src/lib/dataSemantics.test.ts` (100% PASS).

2. **Primitive `<SourceTag>` (`frontend/src/components/ui/SourceTag.tsx`):**
   - Elemento acessível (`role="note"`, WCAG 1.4.1 cor + ícone + texto, tokens canônicos `rounded-radius-sm`).
   - Suporte a variantes regular e compacta (`compact`).
   - 4 testes unitários dedicados em `frontend/src/components/ui/SourceTag.test.tsx` (100% PASS).

3. **Extirpação do termo "Alvo" em contextos clínicos e estatísticos:**
   - `LabResultsTable.tsx`: "Alvo Ótimo" migrado para "Referência Ótima" em badges, colunas e formulário de inserção rápida. Título canônico: "Exames Laboratoriais & Referências de Longevidade".
   - `CGMDashboard.tsx`: "Alvo Longevidade" / "Alvo Estabilidade" migrado para "Referência Longevidade", "Referência Estabilidade", "Referência Funcional" e "Tempo na Faixa de Longevidade".
   - `ExerciseDetailModal.tsx`: "Alvo:" migrado para "Foco Muscular:".
   - `TermHelp.tsx`: "Tempo no Alvo" migrado para "Tempo na Faixa" (TIR) e "Alvo / Direção" para "Referência / Direção".
   - `MetricCard.tsx`: Semântica canônica com `Meta Pessoal`, `Referência Clínica`, `Referência Ótima` e integração de `sourceKind` com `SourceTag`.

4. **EmptyState Orientado e Onboarding (`frontend/src/components/ui/EmptyState.tsx`):**
   - Suporte a `absenceKind`, badges semânticos de ausência, metadados de proveniência (`source`, `lastSync`, `reason`).
   - Lista visual de onboarding recomendada (`pipelineSteps`: Perfil → Fontes → Primeiros dados → Métricas → Análise) quando a aplicação se encontra sem métricas registradas.

5. **Anotação Epistemológica nos Componentes Analíticos:**
   - `PhenoAgeWidget.tsx`: Adicionado `<SourceTag kind="model" />` no header e em cada score (Morgan Levine e KDM).
   - `AICopilotView.tsx`: Adicionado `<SourceTag kind="inference" compact />` nos cards de insights gerados.
   - `InsightDrawer.tsx`: Adicionado `<SourceTag kind="inference" compact />` na síntese explicativa.
   - `App.tsx`: Cards de métricas primárias e secundárias anotados com `sourceKind="observed"`.

6. **Validação e Auditoria Automatizada:**
   - `npm run test:run`: 51 arquivos de teste, 259 testes passando (100% PASS).
   - `npm run audit:design-system`: PASS em todas as categorias críticas, `radius.non-token` com 481 ocorrências (abaixo do baseline de 482).
   - `npm run build`: Build de produção Vite gerado com sucesso (exit code 0, 5.4s).

## Rollback

Por componente.

## Definition of Done

- [x] código + testes
- [x] GLOSSARY/DS atualizados
- [x] evidência registrada
