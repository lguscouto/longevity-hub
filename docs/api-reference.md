# Referência da API

Base local: `http://127.0.0.1:8887`
Prefixo: `/api`
Formato padrão: JSON, exceto upload/download de CGM.

> Os exemplos abaixo descrevem os contratos presentes no código. Eles não devem conter chaves de IA nem dados clínicos reais em documentação, testes ou logs.

## Saúde e Algoritmos Determinísticos

| Método | Caminho | Finalidade |
|---|---|---|
| `GET` | `/api/health` | Status local, conexão do banco e versão (`0.6.0`). |
| `GET` | `/api/version` | Informações de versão da API: `{ "version": "0.6.0", "system": "Longevidade Hub" }`. |
| `GET` | `/api/daily-guidance` | Orientação diária conservadora baseada em HRV, RHR, sono e check-in. |
| `GET` | `/api/energy-circadian` | Bateria corporal (Energy Bank) e janelas de ritmo circadiano. |
| `GET` | `/api/quality/daily` | Diagnóstico de qualidade e integridade dos dados observacionais do dia. |
| `GET` | `/api/checkins/{date_ref}` | Consulta check-in subjetivo do dia (disposição, estresse, dor, notas, tags). |
| `GET` | `/api/pipeline-runs?limit=20` | Histórico sanitizado das execuções de pipeline. |

## Métricas e importação

| Método | Caminho | Corpo/consulta | Resultado |
|---|---|---|---|
| `GET` | `/api/metrics?days=30` | `days` entre 1 e 365 | Lista de `daily_metrics`, ordem decrescente por data. |
| `POST` | `/api/metrics` | Campos parciais de métrica, com `date_ref` obrigatório | Faz upsert da data. |
| `POST` | `/api/metrics/sync/zepp` | — | Importa Zepp e Google; retorna resultado estruturado por fonte com registros lidos, inseridos, rejeitados e status. |

Campos aceitos por `POST /api/metrics`: `date_ref`, `steps`, `sleep_minutes`, `sleep_deep_min`, `sleep_light_min`, `sleep_rem_min`, `rhr_bpm`, `avg_hr_bpm`, `hrv_ms`, `readiness_score`, `weight_kg`, `bmi`, `waist_cm`, `systolic_bp`, `diastolic_bp`, `grip_strength_kg`, `vo2_max`.

Exemplo:

```json
{
  "date_ref": "2026-07-29",
  "weight_kg": 90.0,
  "systolic_bp": 120,
  "diastolic_bp": 80
}
```

## Perfil

| Método | Caminho | Corpo | Resultado |
|---|---|---|---|
| `GET` | `/api/profile` | — | Perfil enriquecido com peso recente, altura, IMC e indicador de token Google. |
| `POST` | `/api/profile` | Campos parciais: `name`, `email`, `birthdate`, `chronological_age`, `height_cm`, `target_weight_kg`, `gender` | Atualiza a linha `user_profile.id=1`. |

## Exames e PhenoAge

| Método | Caminho | Corpo/consulta | Resultado |
|---|---|---|---|
| `GET` | `/api/labs` | — | Até 200 exames, por coleta/id decrescentes. |
| `GET` | `/api/labs/latest` | — | Último exame por `metric_key`. |
| `GET` | `/api/labs/targets` | — | Catálogo de metas `OPTIMAL_LONGEVITY_TARGETS`. |
| `POST` | `/api/labs/batch` | `chronological_age` e `records` | Insere o lote e cria um registro PhenoAge. |
| `DELETE` | `/api/labs/date/{collected_at}` | — | Exclui exames e PhenoAge daquela data. |
| `POST` | `/api/labs/delete` | `{ "collected_at": "YYYY-MM-DD" }` | Alternativa de exclusão por corpo JSON. |
| `GET` | `/api/phenoage/history` | — | Histórico de PhenoAge. |
| `POST` | `/api/phenoage/calculate` | Nove biomarcadores e `chronological_age` | Calcula e persiste PhenoAge. |

Formato mínimo para um lote:

```json
{
  "chronological_age": 32,
  "records": [
    {
      "collected_at": "2026-07-29",
      "metric_key": "fasting_glucose",
      "value": 88,
      "unit": "mg/dL"
    }
  ]
}
```

O parser completa nome, unidade, referência, meta e categoria quando a chave existe no catálogo interno.

## CGM

| Método | Caminho | Corpo | Resultado |
|---|---|---|---|
| `GET` | `/api/cgm/summary` | — | Resumos diários derivados de leituras brutas no banco. |
| `POST` | `/api/cgm/batch` | `{ "date_ref": "...", "glucose_readings": [85, 92] }` | Salva leituras brutas com timestamp incremental e deriva sumário automaticamente. |
| `POST` | `/api/cgm/readings` | `{ "timestamp": "2026-07-30T08:00:00", "glucose_mgdl": 92 }` | Insere leitura bruta (dedup por timestamp) e recalcula o sumário do dia. |
| `POST` | `/api/cgm/upload-csv` | `multipart/form-data` com campo `file` | Lê CSV, salva leituras brutas e deriva resumos diários. |
| `GET` | `/api/cgm/export-csv` | — | Download CSV separado por `;`. |

## Experimentos N-of-1

| Método | Caminho | Corpo | Resultado |
|---|---|---|---|
| `GET` | `/api/n-of-1` | — | Lista dos experimentos. |
| `POST` | `/api/n-of-1` | título, métrica e períodos de controle/intervenção | Calcula médias, Cohen's d e p-value e persiste o experimento. |

Corpo obrigatório:

```json
{
  "title": "Intervenção de sono",
  "metric_key": "hrv_ms",
  "control_start": "2026-07-01",
  "control_end": "2026-07-14",
  "treatment_start": "2026-07-15",
  "treatment_end": "2026-07-28"
}
```

A função retorna amostra insuficiente quando qualquer período tem menos de três observações válidas.

## Suplementos, hormônios e aderência

| Método | Caminho | Corpo/consulta | Resultado |
|---|---|---|---|
| `GET` | `/api/supplements` | — | Compostos ativos. |
| `POST` | `/api/supplements` | `name`, `dosage`, campos opcionais de categoria/frequência/horário | Cria composto e audit log `ADICIONADO`. |
| `POST` | `/api/supplements/update` | `supplement_id` e campos a mudar | Atualiza; dose/horário geram audit log. |
| `GET` | `/api/supplements/audit-logs?limit=50` | `limit` opcional | Trilha de auditoria mais recente primeiro. |
| `GET` | `/api/supplements/logs/{date_str}` | data no caminho | IDs marcados como tomados. |
| `POST` | `/api/supplements/toggle` | `supplement_id`, `date_ref` opcional | Alterna a tomada do dia. |
| `DELETE` | `/api/supplements/{supplement_id}` | — | Remove e registra auditoria. |
| `POST` | `/api/supplements/delete` | `{ "supplement_id": 1 }` | Alternativa de remoção. |
| `POST` | `/api/compliance` | quatro booleans e `date_ref` opcional | Salva a conformidade e score de 0–100. |
| `GET` | `/api/compliance/history?days=14` | `days` | Histórico de conformidade. |

## Relatórios

| Método | Caminho | Corpo/consulta | Resultado |
|---|---|---|---|
| `GET` | `/api/reports/doctor-briefing?name=...&age=...` | query opcional | `{ "markdown": "..." }` com Doctor Briefing. |
| `POST` | `/api/reports/doctor-briefing` | `{ "patient_name": "...", "patient_age": 32 }` | Mesmo relatório em Markdown. |

## IA

| Método | Caminho | Corpo | Resultado |
|---|---|---|---|
| `GET` | `/api/ai/settings` | — | Provedor/modelo, `privacy_mode`, indicadores de chave e máscaras; chaves reais ficam fora do SQLite quando o cofre do SO está disponível. |
| `POST` | `/api/ai/settings` | configurações, `privacy_mode` e chaves opcionais | Persiste as configurações; valor vazio ou mascarado preserva a chave existente. |
| `POST` | `/api/ai/test-connection` | `provider`, `api_key`, `model` opcional | Faz uma chamada mínima ao provedor. |
| `POST` | `/api/ai/generate-insights` | — | Contexto clínico reduzido ou completo conforme `privacy_mode`, seguido de análise estruturada. Exige chave do provedor ativo. |
| `POST` | `/api/ai/chat` | { "prompt": "..." } | Resposta ao chat contextualizado e persistida com metadados mínimos em modo `minimal`. |
| `GET` | `/api/ai/history` | — | Últimos 30 insights/chats persistidos. |
| `POST` | `/api/ai/analyze-supplements` | — | Parecer Markdown sobre a pilha ativa com o mesmo contrato de privacidade. |

### Provedores reconhecidos

- `openai`: `https://api.openai.com/v1/chat/completions`
- `anthropic`: `https://api.anthropic.com/v1/messages`
- `openrouter`: `https://openrouter.ai/api/v1/chat/completions`

Os endpoints de IA enviam o contexto clínico ao fornecedor selecionado. Consulte os limites de privacidade em [data-model-and-security.md](data-model-and-security.md).

## Avaliações Físicas por Fotos (`/api/physical-assessments`)

- `GET /api/physical-assessments`: Lista avaliações ordenadas por data (aceita `limit`, `offset`, `start_date`, `end_date`).
- `POST /api/physical-assessments`: Cria novo registro de avaliação física.
- `GET /api/physical-assessments/compare`: Retorna manifesto de comparação entre duas avaliações (`previous_id` e `current_id`).
- `GET /api/physical-assessments/{id}`: Retorna detalhes de uma avaliação com lista de fotos.
- `PATCH /api/physical-assessments/{id}`: Atualiza metadados e medidas antropométricas.
- `DELETE /api/physical-assessments/{id}`: Exclui a avaliação, registros de fotos no banco e arquivos físicos do disco.
- `POST /api/physical-assessments/{id}/photos`: Upload `multipart/form-data` de imagens (aceita `files`, `angle`, `body_state`, `description`).
- `PATCH /api/physical-assessments/{id}/photos/{photo_id}`: Atualiza metadados da foto.
- `DELETE /api/physical-assessments/{id}/photos/{photo_id}`: Exclui foto individual e o arquivo físico.
- `GET /api/physical-assessments/{id}/photos/{photo_id}/content`: Stream binário da imagem protegida contra path traversal.

## Respostas de erro

- Validações de corpo são feitas pelo Pydantic/FastAPI.
- Falta de chave de IA retorna HTTP 400.
- Falha do LLM retorna HTTP 500 com um resumo do erro.
- Importadores registram falhas/ausências em `pipeline_run` e devolvem resultado estruturado por fonte.
