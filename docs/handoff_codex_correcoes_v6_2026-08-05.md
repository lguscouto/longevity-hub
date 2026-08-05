# Handoff para Codex — correções da reavaliação v6

**Data:** 05/08/2026
**Repositório:** `E:\\hermes\\longevidade`
**Branch:** `master`
**Base de trabalho:** `473fa67` (`fix(v5-audit): resolve all 8 pendencies from v5 evaluation report`)
**Relatório de origem:** [`reavaliacao_pos_codex_2026-08-05_v6.md`](reavaliacao_pos_codex_2026-08-05_v6.md)
**Estado de Git:** alterações estão **não commitadas**; nenhum push, merge ou alteração no banco operacional foi feito.

---

## Objetivo concluído

Foram implementadas as quatro correções propostas pela reavaliação v6:

1. política determinística e fail-closed para IA/chat em estados de recuperação não verificáveis;
2. provenance explícita para exames e exclusão compartilhada de dados não clínicos;
3. exclusão equivalente no Doctor Briefing Markdown e PDF;
4. fila serializada e segura para o autosave do check-in diário.

Além do botão identificado no relatório, foi removida uma segunda fonte equivalente de valores de exemplo: os nove valores pré-preenchidos do modal de PhenoAge.

Uma revisão independente posterior encontrou três falhas concretas adicionais — provenance implícita fail-open, mistura temporal no PhenoAge e perda de debounce ao sair da aba. Todas foram reproduzidas com regressões e corrigidas nesta mesma árvore de trabalho.

---

## 1. IA: política determinística antes do LLM e antes da persistência

### Implementação

- Novo módulo: `src/longevidade/ai/safety_policy.py`.
- `backend/app/routers/ai.py` calcula a decisão local **antes** de montar prompt, exigir chave ou chamar qualquer provedor externo.
- O LLM só pode ser chamado quando, simultaneamente:
  - `daily_guidance.confidence == "high"`; e
  - `energy_bank.status == "ok"`.
- Em qualquer outro estado, as rotas `POST /api/ai/generate-insights` e `POST /api/ai/chat`:
  - não chamam o LLM;
  - retornam somente texto determinístico e conservador;
  - usam uma ação fixa conservadora, sem reutilizar `primary_action` potencialmente intensa;
  - retornam `guardrail_applied: true` e `safety_reason` estruturado;
  - persistem somente o texto local seguro, com `provider_used=deterministic_safety_policy` e `model_used=v1`.

Isso elimina a dependência da blacklist textual anterior: sinônimos como “sprints máximos” não chegam a ser processados como saída externa em estado restrito.

### Regressões cobertas

`tests/test_ai_guardrail.py` cobre, com adaptador de LLM adversarial:

- dados de recuperação ausentes;
- orientação com confiança `medium` (dois sinais, sono ausente);
- Energy Bank `unavailable` com orientação `high` cuja `primary_action` é adversarial;
- prompt de sistema customizado;
- ausência de chamada ao LLM;
- ausência de persistência do texto inseguro;
- comportamento do chat e do gerador estruturado.

---

## 2. Provenance clínica e dados sintéticos

### Modelo e migration

- Novo módulo: `src/longevidade/lab_provenance.py`.
- Migration v4 em `src/longevidade/db/migrations.py` acrescenta `record_origin` a:
  - `lab_results`;
  - `phenoage_records`.
- Origens válidas:
  - `patient_lab`;
  - `imported`;
  - `manual`;
  - `calculated`;
  - `synthetic`;
  - `demo`;
  - `fixture`;
  - `unverified`.
- Apenas `patient_lab` e `imported` são elegíveis para análises e documentos clínicos.
- A migration marca registros legados como `unverified`, de forma deliberadamente fail-closed.

### Repositório e ingestão

`src/longevidade/db/repository.py` agora valida origem em escrita e aceita filtro de origem em consultas de laboratórios e PhenoAge.

`POST /api/labs/batch` controla a origem no servidor como `patient_lab`; um `record_origin` enviado pelo cliente não é aceito como fonte de verdade. Importadores internos podem informar origem explicitamente.

O normalizador e o repositório agora usam `unverified` como padrão quando uma origem é omitida. Assim, uma chamada interna que esqueça `record_origin` não pode promover dados ao contexto clínico, à IA ou aos relatórios por acidente.

### Consumidores filtrados

Dados não elegíveis deixaram de participar de:

- `Doctor Briefing` Markdown;
- `Doctor Briefing` PDF;
- cálculo de PhenoAge a partir de exames persistidos;
- cálculo KDM;
- contexto clínico enviado à IA;
- razões cardiovasculares da interface.

A seleção usada pelos dois briefings foi centralizada em `src/longevidade/reports/lab_selection.py`, evitando lógica duplicada entre Markdown e PDF.

### Coerência temporal do PhenoAge

- Novo módulo: `src/longevidade/algorithms/phenoage_panel.py`.
- PhenoAge só é calculado quando os nove marcadores clinicamente elegíveis pertencem à **mesma data de coleta**.
- A rota `POST /api/phenoage/calculate` e a ingestão `POST /api/labs/batch` compartilham essa seleção; marcadores distribuídos entre coletas retornam `incomplete` e não persistem uma idade biológica fabricada.
- A persistência usa a data do painel efetivamente calculado, não a maior data arbitrária do batch.
- Um override manual enviado diretamente à rota nunca é mesclado com exames clínicos persistidos; ele precisa fornecer o painel completo por conta própria e continua inelegível ao histórico clínico.

### Interface

- Removido o botão **“9 Marcadores PhenoAge”** de `LabResultsTable`.
- `PhenoAgeWidget` não tem mais números de exemplo predefinidos nem campos para persistir valores arbitrários:
  - o modal chama o cálculo com `{}`;
  - o backend usa exclusivamente exames clínicos já registrados;
  - o modal explica que dados sintéticos, manuais ou não verificados não entram no cálculo clínico.
- A tabela mostra provenance de registros não clínicos para auditoria e os exclui de cartões/razões clínicas.

### Regressões cobertas

- `tests/test_lab_provenance.py` prova que um registro sintético mais recente não mascara o resultado clínico anterior em Markdown, PDF, PhenoAge, KDM ou contexto de IA.
- O mesmo teste cobre origem omitida como `unverified`, cálculo direto e ingestão em lote com os nove marcadores divididos em duas datas, ambos sem persistência de PhenoAge, e override manual parcial que não pode ser mesclado ao painel clínico.
- `tests/test_db_migrations.py` prova upgrade de banco v3 para provenance `unverified`.
- `frontend/src/components/LabResultsTable.test.tsx` prova remoção do preset e exclusão de registros sem provenance das razões.
- `frontend/src/components/PhenoAgeWidget.test.tsx` prova que o modal não injeta valores e envia `{}` ao cálculo.

---

## 3. Autosave do check-in diário

`frontend/src/components/DailyCheckinCard.tsx` deixou de usar um debounce que disparava `PUT`s independentes.

A implementação atual possui:

- fila de payloads por data, com coalescência apenas para a mesma data;
- no máximo uma gravação `PUT` em voo;
- uso de `dataToSave.date_ref` para a URL, não da data selecionada posteriormente;
- preservação de edição com debounce ao trocar de data;
- revisão local para impedir que uma resposta de `GET` antiga substitua uma edição já feita;
- feedback de sucesso/erro emitido somente para a revisão mais recente daquela data;
- retry explícito após falha de rede, sem repetição silenciosa;
- payload em debounce é enfileirado e enviado no unmount, sem callback/atualização de estado depois de desmontado;
- o card permanece montado e apenas oculto ao mudar de aba, preservando a fila e a ordem de gravação entre Visão Geral e as demais seções;
- feedback acessível de “Salvando”, “Salvo” e erro/retry.

### Regressões cobertas

`frontend/src/components/DailyCheckinCard.test.tsx` cobre:

1. segunda alteração não abre outro `PUT` enquanto o primeiro está pendente;
2. segunda gravação usa a alteração mais nova depois da primeira concluir;
3. retry ocorre somente após ação explícita;
4. fila mantém a data original ao trocar a data selecionada;
5. uma edição ainda em debounce não se perde ao navegar para outro dia;
6. unmount envia o debounce pendente sem efeitos visuais após desmontagem.
7. uma confirmação antiga não exibe “Salvo” enquanto uma revisão nova ainda aguarda persistência.
8. trocar de Visão Geral para Exames antes do debounce não perde o `PUT`.

---

## Evidência de validação executada

Todos os comandos abaixo foram executados no repositório de destino. O pytest usou SQLite temporário via `LONGEVIDADE_DB_PATH`; nenhum banco operacional foi usado.

| Gate | Resultado observado |
|---|---|
| `pytest -q` com SQLite temporário | **125 passed** em 34,49 s |
| `npm run test:run` | **12 arquivos / 46 testes passed** |
| `npm run build` | `tsc && vite build` concluído com sucesso |
| `npm run test:e2e` | **4 Playwright smoke tests passed** com fixtures sintéticas |
| `python -m compileall -q backend src tests` | sucesso |
| `git diff --check` | sucesso |

### Probes integrados adicionais

Um Uvicorn temporário foi iniciado em `127.0.0.1:8899` com SQLite isolado e depois encerrado.

- `GET /api/health` retornou HTTP 200.
- Sem dados de recuperação e sem chave configurada, `POST /api/ai/generate-insights` retornou HTTP 200 com:
  - `provider: deterministic_safety_policy`;
  - `guardrail_applied: true`;
  - `safety_reason: guidance_insufficient_data`;
  - texto seguro local.
- `POST /api/ai/chat` no mesmo estado retornou texto seguro local e o histórico persistiu somente registros `deterministic_safety_policy`.
- Um `POST /api/labs/batch` contendo tentativa de `record_origin: synthetic` persistiu o registro como `patient_lab`, decisão tomada no backend.
- No probe complementar pós-revisão, os nove marcadores foram distribuídos entre `2020-01-01` e `2026-08-01`:
  - o batch retornou PhenoAge `incomplete`;
  - todos os nove exames persistidos tinham origem `patient_lab`, mesmo com `record_origin: synthetic` no payload externo;
  - `POST /api/phenoage/calculate` retornou `saved: false` e `reason: no_complete_single_collection_panel`;
  - o histórico PhenoAge permaneceu vazio.
- Foi gerado PDF real em diretório temporário e extraído com `pdftotext`:
  - contém `Glicose clínica` e `88.0 mg/dL`;
  - não contém `Marcador sintético` nem `999.0 u`.
- Ao final, não havia processo em escuta nas portas `8899` nem `3030`.

---

## Arquivos principais alterados/adicionados

### Backend e domínio

- `backend/app/routers/ai.py`
- `backend/app/routers/labs.py`
- `backend/app/routers/phenoage.py`
- `backend/app/routers/kdm.py`
- `src/longevidade/ai/safety_policy.py` **(novo)**
- `src/longevidade/algorithms/phenoage_panel.py` **(novo)**
- `src/longevidade/ai/context_builder.py`
- `src/longevidade/lab_provenance.py` **(novo)**
- `src/longevidade/db/migrations.py`
- `src/longevidade/db/repository.py`
- `src/longevidade/db/schema.py`
- `src/longevidade/ingestion/lab_parser.py`
- `src/longevidade/reports/lab_selection.py` **(novo)**
- `src/longevidade/reports/doctor_briefing.py`
- `src/longevidade/reports/doctor_briefing_pdf.py`

### Frontend e testes

- `frontend/src/components/DailyCheckinCard.tsx`
- `frontend/src/components/DailyCheckinCard.test.tsx` **(novo)**
- `frontend/src/App.tsx`
- `frontend/src/App.test.tsx`
- `frontend/src/components/LabResultsTable.tsx`
- `frontend/src/components/LabResultsTable.test.tsx`
- `frontend/src/components/PhenoAgeWidget.tsx`
- `frontend/src/components/PhenoAgeWidget.test.tsx`
- `tests/test_ai_guardrail.py`
- `tests/test_lab_provenance.py` **(novo)**
- `tests/test_db_migrations.py`

---

## Atenções para o Codex antes de commit/cutover

1. **Não marcar registros legados automaticamente como clínicos.** A migration os converte para `unverified` e, por segurança, eles somem dos cálculos e briefings até serem reimportados ou receberem uma classificação revisada.
2. **Planejar uma interface de reclassificação/auditoria** antes de depender de dados legados em produção. Esta entrega preserva os registros e os exibe para auditoria, mas não inventa sua procedência.
3. **Manter a política determinística como autoridade.** Não reintroduzir fallback de LLM, blacklist textual ou persistência do texto cru quando `confidence != high` ou Energy Bank não estiver `ok`.
4. **Dados manuais enviados diretamente à rota de PhenoAge** recebem origem `manual` e ficam fora do histórico/briefing clínico. A interface principal não envia mais esse tipo de payload.
5. **Não misturar datas de coleta em PhenoAge.** Se o painel tiver marcadores em datas distintas, complete ou reimporte uma única coleta; não faça fallback para o “último” valor de cada item.
6. **Não tratar a aprovação técnica como aprovação clínica.** A aplicação continua experimental, voltada a acompanhamento pessoal e discussão com profissional de saúde.
7. Revise o diff e faça commit com paths explícitos; esta entrega não criou commit nem modificou remote.
