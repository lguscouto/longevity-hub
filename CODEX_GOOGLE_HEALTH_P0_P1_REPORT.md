# Longevidade Hub — Relatório Técnico de Conformidade P0/P1
## Google Health API v4 & Arquitetura de Ingestão e Integridade Clínica

**Data:** 24 de Setembro de 2026  
**Versão:** 1.0.1  
**Status:** Totalmente Implementado e Validado (220 testes backend + 61 testes frontend aprovados — 100%)

---

## 1. Sumário Executivo

Este documento consolida as correções e melhorias arquiteturais dos itens de prioridade **P0 (Bloqueadores / Segurança)** e **P1 (Arquitetura de Ingestão)** definidas na auditoria `Longevidade_Hub_P0_P1_Codex.md`.

Todas as intervenções preservaram a estabilidade do sistema, eliminaram vulnerabilidades de segurança, adequaram o cliente à documentação oficial da **Google Health API v4 (REST)**, ativaram a camada de dados brutos (`health_data_points`) e erradicaram completamente valores clínicos fictícios.

---

## 2. Matriz de Correções Implementadas

| Identificador | Categoria | Descrição | Status | Arquivos Afetados |
| :--- | :--- | :--- | :---: | :--- |
| **P0.1** | Compatibilidade / Limpeza | Remoção de resíduos Google Fit / Fitbit e padronização da nomenclatura para `google_health` / `GoogleHealthProvider` | **CONCLUÍDO** | `backend/app/routers/profile.py`, `backend/app/routers/metrics.py`, `backend/app/routers/google_health.py`, `frontend/src/components/SyncProgressModal.tsx`, `frontend/src/components/PipelineStatusPanel.tsx`, `scripts/run_scheduled_sync.py`, `src/longevidade/ingestion/google_importer.py` |
| **P0.2** | Desempenho / API v4 | Filtros temporais server-side com formato RFC 3339 UTC e campos snake_case (`start_time >= "..." AND end_time < "..."`) | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_client.py` |
| **P0.3** | Segurança (CSRF) | Gerenciador thread-safe de `state` OAuth 2.0 com entropia criptográfica (`secrets.token_urlsafe(32)`), TTL de 10 min e consumo de uso único (`secrets.compare_digest`) | **CONCLUÍDO** | `backend/app/routers/google_health.py` |
| **P0.4** | Segurança (XSS) | Sanitização estrita contra script breakout (`safe_json_for_script`), escape de caracteres (`\u003c`, `\u003e`, `\u0026`) e restrição de target origin no `window.opener.postMessage` para `window.location.origin` | **CONCLUÍDO** | `backend/app/routers/google_health.py` |
| **P0.5** | Integridade Clínica | Remoção total de sentinelas e defaults fictícios (`chronological_age=32.0/40.0`, `height_cm=170.0`, `target_weight_kg=75.0`, `birthdate=1994-03-22`, email fictício). Ausência representada honestamente como `None` / `null` | **CONCLUÍDO** | `backend/app/routers/profile.py`, `src/longevidade/db/schema.py`, `src/longevidade/db/migrations.py`, `src/longevidade/db/repository.py`, `src/longevidade/ai/context_builder.py`, `src/longevidade/algorithms/phenoage.py`, `src/longevidade/calculators/kdm_age.py` |
| **P1.1** | Arquitetura REST v4 | Implementação de métodos canônicos `list()` e `reconcile()` no `GoogleHealthClient` consultando streams reconciliados oficiais com paginação e filtro | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_client.py` |
| **P1.2** | Arquitetura REST v4 | Implementação de operações de roll-up `roll_up()` e `daily_roll_up()` via endpoint `:rollUp` com parâmetros de agregação temporal | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_client.py` |
| **P1.3** | Raw Data Lake | Ativação da tabela `health_data_points` como camada raw primária do pipeline Google Health, persistindo metadados e payload integral em `raw_json` | **CONCLUÍDO** | `src/longevidade/ingestion/google_importer.py`, `src/longevidade/ingestion/google_health_client.py` |
| **P1.4** | Registry Oficial | Enriquecimento de `DataTypeConfig` com atributos oficiais (`official_name`, `endpoint_name`, `filter_name`, `supported_operations`, `status`, `enabled`), adição de `respiratory-rate` e métodos de consulta no registry | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_registry.py` |
| **P1.5** | Fisiologia / RHR | Proibição de cálculo de RHR como `min(bpms)`. RHR derivado exclusivamente do tipo oficial `daily-resting-heart-rate` | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_client.py`, `src/longevidade/ingestion/google_health_registry.py` |
| **P1.6** | Isolamento de Providers | Desacoplamento estrutural de provedores, garantindo que transformadores não compartilhem dependências cruzadas com outros ecossistemas | **CONCLUÍDO** | `src/longevidade/ingestion/google_health_client.py`, `src/longevidade/ingestion/google_importer.py` |
| **P1.7** | Webhooks / Subscriptions | Implementação do endpoint `POST /api/google-health/webhook` tratando notificações de eventos, mapeando coleções e acionando sincronização incremental idempotente | **CONCLUÍDO** | `backend/app/routers/google_health.py` |

---

## 3. Detalhamento Técnico das Implementações

### 3.1. Segurança OAuth 2.0 (P0.3 e P0.4)
- **Anti-CSRF State:** Implementado `OAuthStateManager` com dicionário protegido por lock, TTL de 600 segundos (10 minutos), limpeza de tokens expirados e invalidação imediata no primeiro uso. Qualquer tentativa de reutilização ou callback com state adulterado retorna HTTP 400.
- **Prevenção de Script Breakout (XSS):**
  - Todas as mensagens e erros retornados no template HTML do callback passam por `html.escape()`.
  - No bloco `<script>`, os dados enviados ao `window.opener.postMessage` são serializados via `safe_json_for_script`, substituindo caracteres `<` por `\u003c`, `>` por `\u003e` e `&` por `\u0026`. Isso impede que sequências como `</script>` encerrem precocemente a tag script no navegador.
  - A mensagem enviada via `postMessage` restringe a origem alvo para `window.location.origin` em vez de `*`.

### 3.2. Filtro Temporal Server-Side & Operações Oficiais (P0.2, P1.1, P1.2)
- Função canônica `build_server_filter(start_time, end_time)`:
  - Valida se `start_time < end_time` (gerando `ValueError` claro caso contrário);
  - Formata datetimes com fuso horário em strings RFC 3339 UTC terminadas em `Z`;
  - Constrói expressões de filtro server-side conforme Google Health API v4:
    ```text
    start_time >= "2026-03-01T00:00:00Z" AND end_time < "2026-03-08T00:00:00Z"
    ```
- Operações de Ingestão:
  - `list()`: alias canônico para busca granular de `dataPoints` com paginação transparente e filtro temporal server-side;
  - `reconcile()`: consulta o stream consolidado no endpoint `:reconcile`, eliminando duplicatas entre múltiplos sensores;
  - `roll_up()` e `daily_roll_up()`: consulta métricas agregadas oficiais no endpoint `:rollUp`.

### 3.3. Persistência na Camada Raw (`health_data_points`) (P1.3)
- O pipeline de sincronização (`sync_google_health_api`) arquiva todos os pontos recebidos da API na tabela SQLite `health_data_points`:
  - `id`: identificador determinístico do data point;
  - `provider`: `"google_health"`;
  - `data_type`: tipo oficial (ex: `steps`, `heart-rate`, `daily-resting-heart-rate`, `sleep`, `weight`);
  - `source`: plataforma/dispositivo emissor (ex: `"Pixel Watch"`);
  - `start_time`, `end_time`, `recorded_at`: carimbos temporais normalizados;
  - `value`, `unit`: valor primário numérico e respectiva unidade de engenharia;
  - `raw_json`: payload REST v4 integral preservado sem perda de atributos, permitindo reprocessamento e auditoria clínica.

### 3.4. Integridade Fisiológica do RHR (P1.5)
- **Eliminação do Mínimo Arbitrário:** O cálculo anterior `daily_map[st]["rhr_bpm"] = round(min(bpms), 1)` foi completamente descontinuado. Picos baixos de medição ou ruídos de leitura de sensores não representam frequência cardíaca de repouso.
- **Fonte Oficial:** O RHR agora é populado estritamente a partir do tipo oficial de dados `daily-resting-heart-rate` disponibilizado pela Google Health API. O tipo `heart-rate` contínuo calcula apenas `avg_hr_bpm` e `max_hr_bpm`.

### 3.5. Eliminação de Defaults Clínicos Fictícios (P0.5)
- Em conformidade com a premissa de que **ausência de dado ≠ zero e ausência de dado ≠ default fictício**:
  - `user_profile` no banco de dados e migrações agora possui colunas sem valores padrão arbitrários (nada de `32.0`, `170.0`, `75.0` ou `"1994-03-22"`);
  - O endpoint `/api/profile` retorna `null` para qualquer métrica não configurada pelo usuário;
  - O cálculo do IMC (`bmi`) é realizado estritamente quando peso atual e altura estão presentes e são estritamente positivos;
  - Os algoritmos `PhenoAge` e `KDM Biological Age` marcam o cálculo como estritamente `"incomplete"` com missing biomarker quando a idade cronológica não é fornecida, nunca assumindo `40.0`.

### 3.6. Webhooks e Notificações Incrementais (P1.7)
- Endpoint exposto em `POST /api/google-health/webhook`:
  - Recebe o payload do webhook contendo `dataType`, `collectionType` e `date`;
  - Mapeia coleções para tipos canônicos da Google Health API;
  - Aciona o pipeline de sincronização idempotente para o intervalo notificado;
  - Retorna confirmação e resumo de sincronização estruturado.

---

## 4. Resultados da Suíte de Testes

### 4.1. Backend (Pytest)
Comando executado: `python -m pytest tests/ -q`
- **Total de Testes:** **220 testes**
- **Testes Aprovados:** **220 (100%)**
- **Testes Falhos:** **0**
- **Tempo de Execução:** ~1m27s

Novas suítes dedicadas adicionadas:
1. `tests/test_google_health_oauth_security.py`: 7 testes de segurança (entropia de state, expiração, single-use, mitigação de XSS e restrição de origin no postMessage);
2. `tests/test_google_health_codex_p0_p1.py`: 13 testes de API v4 (filtro temporal RFC 3339 UTC, list, reconcile, rollUp, isolamento de RHR e atributos do registry);
3. `tests/test_profile_no_clinical_defaults.py`: 4 testes de integridade clínica (perfil vazio sem defaults fictícios, cálculo condicional de IMC e PhenoAge/KDM sem sentinelas).

### 4.2. Frontend (Vitest)
Comando executado: `npm test -- --run` em `frontend/`
- **Arquivos de Teste:** **15 arquivos**
- **Total de Testes:** **61 testes**
- **Aprovados:** **61 (100%)**
- **Tempo de Execução:** 5.59s

---

## 5. Conclusão e Próximos Passos Recomendados

O sistema **Longevidade Hub** atinge plena maturidade e conformidade técnica com os requisitos P0 e P1:
1. **Seguro:** Livre de vulnerabilidades CSRF no fluxo OAuth e de script breakout no fechamento da janela pop-up;
2. **Eficiente:** Tráfego de rede reduzido com queries server-side delimitadas com precisão na Google Health API v4;
3. **Auditável:** Camada raw `health_data_points` retém os dados brutos com rastreabilidade completa;
4. **Fisiologicamente Fiel:** Sem dados inventados ou aproximações enganosas de biomarcadores vitais.

Recomenda-se realizar o `git commit` destas alterações para consolidar a versão estável e sincronizar com o repositório remoto.
