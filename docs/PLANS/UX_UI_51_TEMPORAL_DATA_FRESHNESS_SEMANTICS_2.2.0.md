# UX_UI_51 — Temporal & Data Freshness Semantics 2.2.x

## Metadata

- **Priority:** P1 (Fase 2 — Acessibilidade e Dados)
- **Status:** Concluído
- **Version:** 2.2.0
- **Dependencies:** UX_UI_47
- **Master Reference:** `CODEX_LONGEVIDADE_HUB_2.2.0_UX_UI_REAUDIT_MASTER.md` (§10 U22-P1-14..16, §16 U22-P1-56..57, §38 UX_UI_51)
- **Affected files:**
  - `backend/app/routers/quality.py`
  - `frontend/src/lib/dataSemantics.ts`
  - `frontend/src/lib/formatters.ts`
  - `frontend/src/lib/dataSemantics.test.ts`
  - `frontend/src/components/DataConfidenceBadge.tsx`
  - `frontend/src/components/DataConfidenceBadge.test.tsx`
  - `frontend/src/components/DataQualityPanel.tsx`
  - `frontend/src/components/ui/SyncStatusBadge.tsx`
  - `frontend/src/App.tsx`
  - `frontend/src/components/ManualEntryModal.tsx`
  - `frontend/src/components/NOf1Tracker.tsx`
  - `frontend/src/components/labs/LabBatchEntryModal.tsx`
  - `docs/PLANS/UX_UI_51_TEMPORAL_DATA_FRESHNESS_SEMANTICS_2.2.0.md`

---

## 1. Problem

1. **Distorção de Fuso Horário e Deriva de Data Local (U22-P1-14):**
   - Diversos pontos do frontend utilizavam `new Date().toISOString().slice(0, 10)` para determinar a data de hoje. Em fusos horários ocidentais com offset negativo (como Brasil UTC-3), entre 21h e 23h59 o UTC já avançou para o dia seguinte, gerando gravações e consultas com data futura involuntária.
2. **Confusão de Freshness com Data Selecionada no Calendário (U22-P1-14, U22-P1-16):**
   - O `DataConfidenceBadge` avaliava `formatDataFreshness(selectedDate)`. Quando o usuário navegava no histórico para consultar um dia de semanas atrás, o badge exibia erradamente "Desatualizado (há X dias)", confundindo visualização histórica legítima com estagnação de dados de hoje.
3. **Terminologia Crua de Confiança em Inglês (U22-P1-15):**
   - No `DataQualityPanel`, o status de confiança exibia palavras em inglês capitalizadas (`High`, `Medium`, `Low`, `Unavailable`), desconectadas do português canônico da aplicação.
4. **Conflito de Políticas de Stale (U22-P1-56):**
   - Havia divergência entre limiares de estagnação: `SyncStatusBadge` usava `>24h` para wearables, enquanto `dataSemantics` usava `7 dias` para métricas longitudinais, sem centralização conceitual.

---

## 2. Evidence

- Inspecção em `App.tsx`, `DataQualityPanel.tsx`, `LabBatchEntryModal.tsx`, `ManualEntryModal.tsx` e `NOf1Tracker.tsx` revelou 5 ocorrências de `new Date().toISOString().slice(0, 10)`.
- `DataConfidenceBadge.tsx` calculava freshness diretamente em `selectedDate`, gerando falsos positivos de dados desatualizados no modo histórico.
- `DataQualityPanel.tsx` exibia `summary?.confidence` via `capitalize`, além do typo "Cobertura Birométrica".
- O endpoint `/api/quality/daily` no backend não retornava os campos de auditoria temporal (`evaluated_at` e `last_sync_at`).

---

## 3. User impact

- Garantia absoluta de consistência de datas para usuários brasileiros: não ocorrem mais registros registrados em "amanhã" em sessões noturnas.
- Navegação histórica em Overview sem falsos alarmes de "Desatualizado".
- Alinhamento de linguagem técnica clara em português ("Alta confiança", "Média confiança", "Dados insuficientes").
- Auditoria clara da diferença entre densidade de amostras (cobertura) e confiabilidade das fontes (qualidade).

---

## 4. Scope

- Criar `formatLocalDateKey(date?: Date)` em `frontend/src/lib/dataSemantics.ts` e exportar em `formatters.ts`.
- Substituir chamadas UTC `toISOString().slice(0, 10)` por `formatLocalDateKey()` em todos os formulários e estados iniciais.
- Adicionar `formatConfidenceLabel(confidence, detailed)` para padronização semântica em português.
- Centralizar `STALE_THRESHOLDS` (`WEARABLE_HOURS = 24`, `CLINICAL_DAYS = 7`) e a função `evaluateSyncStale` em `dataSemantics.ts`.
- Enriquecer `formatDataFreshness` com opção `isHistorical: boolean` e `staleThresholdHours: number`.
- Atualizar `DailyQualitySummaryResponse` no backend (`backend/app/routers/quality.py`) com `evaluated_at` e `last_sync_at`.
- Atualizar `DataConfidenceBadge.tsx` e `DataQualityPanel.tsx`.
- Criar e expandir testes unitários em `dataSemantics.test.ts` e `DataConfidenceBadge.test.tsx`.

---

## 5. Non-goals

- Alteração da lógica matemática de cálculo de PhenoAge ou KDM (escopo de algoritmos).
- Redesenho visual completo dos painéis de qualidade (escopo da Fase 4).

---

## 6. Architecture

- **Semântica Temporal:** O sistema adota a distinção clara entre:
  - *Data de Registro (`date_ref`):* Data cronológica local (AAAA-MM-DD) à qual o dado clínico ou wearable pertence.
  - *Data de Sincronização (`last_sync_at`):* Timestamp ISO UTC do último pipeline de importação concluído.
  - *Data de Avaliação (`evaluated_at`):* Timestamp ISO UTC em que o motor de qualidade computou os índices.
- **Taxonomia de Freshness:**
  - Se visualizando um registro do passado (`isHistorical: true`), o badge indica "Registro histórico", sem penalidade de stale.
  - Se visualizando a data atual (`isToday: true`), a estagnação obedece ao limiar de 24 horas para sincronizações contínuas de wearable e 7 dias para dados clínicos esparsos.

---

## 7. Dependencies

- `UX_UI_47` (Integridade de Documentação e Conformidade).

---

## 8. File changes

- `backend/app/routers/quality.py`: inclusão de `evaluated_at` e `last_sync_at`.
- `frontend/src/lib/dataSemantics.ts`: implementação de `formatLocalDateKey`, `formatConfidenceLabel`, `STALE_THRESHOLDS`, `evaluateSyncStale` e extensão de `formatDataFreshness`.
- `frontend/src/lib/formatters.ts`: re-export de `formatLocalDateKey` e `formatConfidenceLabel`.
- `frontend/src/components/DataConfidenceBadge.tsx`: uso de timestamps reais e distinção de registros históricos.
- `frontend/src/components/DataQualityPanel.tsx`: uso de `formatLocalDateKey`, rótulos canônicos e correção ortográfica.
- `frontend/src/components/ui/SyncStatusBadge.tsx`: consumo de `STALE_THRESHOLDS.WEARABLE_HOURS`.
- `frontend/src/App.tsx`: substituição de `toISOString().slice(0, 10)` por `formatLocalDateKey()`.
- `frontend/src/components/ManualEntryModal.tsx`: uso de `formatLocalDateKey()`.
- `frontend/src/components/NOf1Tracker.tsx`: uso de `formatLocalDateKey()`.
- `frontend/src/components/labs/LabBatchEntryModal.tsx`: uso de `formatLocalDateKey()`.
- `frontend/src/lib/dataSemantics.test.ts`: 7 novos testes de semântica temporal.
- `frontend/src/components/DataConfidenceBadge.test.tsx`: novo arquivo com 3 testes unitários.

---

## 9. Step-by-step

1. Modificar `backend/app/routers/quality.py` e validar via `pytest` (357 testes passando).
2. Adicionar helpers de governança temporal em `dataSemantics.ts` e re-exportar em `formatters.ts`.
3. Migrar componentes consumidores de datas locais para `formatLocalDateKey()`.
4. Refatorar `DataConfidenceBadge.tsx` e `DataQualityPanel.tsx`.
5. Unificar limiar em `SyncStatusBadge.tsx`.
6. Criar e rodar testes unitários em `DataConfidenceBadge.test.tsx` e `dataSemantics.test.ts`.
7. Validar build e conformidade geral.

---

## 10. Test strategy

- **Backend:** `python -m pytest` garante integridade de contratos e serialização Pydantic.
- **Frontend Unitário:** `dataSemantics.test.ts` valida cálculo em horas/dias, neutralidade em datas históricas e formatação no fuso horário local.
- **Componentes:** `DataConfidenceBadge.test.tsx` valida rótulos em português, ausência de falsos alertas de desatualização no histórico e alerta correto em dados estagnados de hoje.
- **Typecheck & Build:** `npm run typecheck && npm run build`.

---

## 11. Accessibility

- Atributos `title` e leituras ARIA utilizam linguagem clara em português ("Alta confiança", "Dados insuficientes", "Registro histórico").
- Sem perda de informação semântica para leitores de tela.

---

## 12. Responsive behavior

- Badges e cards utilizam layouts fluidos em grid e flexbox com wrapping responsivo.

---

## 13. Security / Privacy

- Nenhuma credencial ou dado clínico pessoal é exposto indevidamente. O fuso horário respeita o ambiente de execução local sem vazamento de dados.

---

## 14. Performance

- Operações de data locais executam em microssegundos no cliente sem recalcular timers desnecessários.

---

## 15. Rollback plan

- Reverter os commits correspondentes via `git revert`.

---

## 16. Validation evidence

- `npm run typecheck`: PASS (0 erros).
- `npm run build`: PASS (5.13s).
- `npm run test:run`: PASS (298 testes em 55 arquivos).
- `python -m pytest`: PASS (357 testes).
- `node scripts/audit-design-system.mjs`: PASS/WARN (zero FAIL, 0 deltas).

---

## 17. Acceptance checklist

- [x] Chave de data local centralizada (`formatLocalDateKey`)
- [x] Eliminação de `toISOString().slice(0, 10)` nos fluxos críticos
- [x] Rótulos canônicos de confiança em português (`formatConfidenceLabel`)
- [x] Limiar de stale unificado (`STALE_THRESHOLDS`)
- [x] Backend fornece `evaluated_at` e `last_sync_at` no endpoint de qualidade
- [x] `DataConfidenceBadge` não rotula histórico como desatualizado
- [x] Suíte de testes unitários dedicada e passando
- [x] Pipeline e build 100% verdes

---

## 18. Open questions

- Nenhuma. O modelo temporal está perfeitamente alinhado às diretrizes 2.2.0.

---

## 19. Reviewers

- Longevidade Hub Core Team
- Clinical Data Semantics Guild

---

## 20. Changelog

- **2026-10-03:** Conclusão da semântica temporal e frescor dos dados, padronização de fusos horários locais, unificação de limiares de estagnação e enriquecimento da API de qualidade.
