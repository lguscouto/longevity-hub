---
name: lab-exam-import
description: >-
  Importa um novo exame de sangue / laudo laboratorial (PDF ou imagem) a partir
  de uma pasta local para o banco de dados do Longevidade Hub, calcula PhenoAge,
  biomarcadores derivados e KDM. Use quando o usuário pedir para cadastrar,
  importar ou processar um novo exame de sangue ou laudo laboratorial.
---

# Importação Padronizada de Exames Laboratoriais (Laudos PDF / Sangue)

Procedimento para ingestão e enriquecimento clínico de laudos de exames laboratoriais no Longevidade Hub.

## 1. Inspeção e Extração do Laudo PDF

1. Localize o arquivo PDF indicado pelo usuário (ex.: `Laudo-*.pdf`).
2. Utilize `read_file` no arquivo PDF para acionar o extrator OCR de alta fidelidade página a página.
3. Extraia com precisão:
   - **Cabeçalho:** Nome do paciente, Data de Nascimento (DN), Sexo/Gênero e Data da Coleta (`collected_at`).
   - **Todos os exames:** Nome do exame, valor numérico/censurado, unidade original, valores de referência (`ref_min`, `ref_max`) e método analítico nas notas.

## 2. Backup Preventivo Obrigatório

Antes de qualquer mutação no banco operacional `data/longevity.sqlite3`, execute um backup online consistente:
```powershell
.venv\Scripts\python.exe -m src.longevidade.backup create
```

## 3. Mapeamento Canônico de Biomarcadores

Mapeie cada exame para os aliases canônicos definidos em `src/longevidade/ingestion/lab_normalization.py` e `LAB_KEY_ALIASES`.

| Exame no Laudo | Chave Canônica (`metric_key`) | Unidade Canônica | Painel PhenoAge? |
|---|---|---|:---:|
| Glicose de Jejum | `glucose_mgdl` | `mg/dL` | Sim |
| Creatinina Sanguínea | `creatinine_mgdl` | `mg/dL` | Sim |
| Albumina Sanguínea | `albumin_gdl` | `g/dL` | Sim |
| Proteína C-Reativa (PCR-us) | `hscrp_mgl` | `mg/L` | Sim |
| Linfócitos (%) | `lymphocyte_pct` | `%` | Sim |
| Volume Corpuscular Médio (VCM) | `mcv_fl` | `fL` | Sim |
| Amplitude de Distribuição (RDW) | `rdw_pct` | `%` | Sim |
| Fosfatase Alcalina (ALP) | `alk_phos_ul` | `U/L` | Sim |
| Leucócitos Totais (WBC) | `wbc_1000ul` | `10³/µL` | Sim |
| Insulina de Jejum | `fasting_insulin` | `uIU/mL` | Não (Derivados) |
| Colesterol Total | `total_cholesterol` | `mg/dL` | Não (Derivados/KDM) |
| Colesterol HDL | `hdl_cholesterol` | `mg/dL` | Não (Derivados) |
| Colesterol LDL | `ldl_cholesterol` | `mg/dL` | Não (Derivados) |
| Triglicérides | `triglycerides` | `mg/dL` | Não (Derivados) |
| Hemoglobina Glicada (HbA1c) | `hba1c` | `%` | Não (Derivados) |
| Ureia | `urea` | `mg/dL` | Não (Derivados) |
| TGP / ALT | `alt` | `U/L` | Não (Derivados) |
| Gama GT (GGT) | `ggt` | `U/L` | Não (Derivados) |
| Testosterona Total | `testosterone_total` | `ng/dL` | Não |

> **IMPORTANTE:** Sempre preserve `raw_value` e `raw_unit` com os valores e strings exatas do laudo original (ex.: contagens em `/mm³` preservadas em `raw_unit` enquanto a unidade canônica persistida em `unit` é `10³/µL`).

## 4. Ingestão e Cálculos Clínicos em Cascata

Execute um script dedicado em Python (ou via API interna) contendo os 4 passos obrigatórios:

1. **Ingestão via `ingest_lab_records`**:
   - Ingestão com proveniência `record_origin=PATIENT_LAB_ORIGIN` (`patient_lab`).
   - Resolução determinística da idade cronológica por data de nascimento (`(collected_at - birthdate).days / 365.2425`).
   - Cálculo e persistência automatizada de PhenoAge (se os 9 marcadores estiverem completos na mesma data).
2. **Cálculo de Biomarcadores Derivados**:
   - Construir contexto via `build_observation_context_for_date(repo, collected_at, anthropometry_window_days=7)`.
   - Avaliar métricas via `evaluate_all_metrics(ctx, measured_at=collected_at)`.
   - Persistir via `repo.save_derived_metric_records(to_persist)`.
3. **Cálculo de KDM Biological Age**:
   - Chamar `calculate_and_save_kdm()`.
4. **Verificação de Integridade**:
   - Validar `PRAGMA integrity_check;` no banco.

## 5. Apresentação dos Resultados ao Usuário

Apresente um resumo estruturado destacando:
- Idade Cronológica vs. PhenoAge e Age Delta (com destaque visual para jovialidade biológica).
- Risco de mortalidade em 10 anos (Levine 2018).
- Marcadores derivados de destaque: HOMA-IR (sensibilidade à insulina), Perfil Lipídico Avançado (Não-HDL, AIP, Castelli), Função Renal (eGFR) e Razões Inflamatórias (NLR, PLR, SII).
