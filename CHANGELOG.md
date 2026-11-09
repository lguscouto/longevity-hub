# Changelog - Longevidade Hub

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [2.5.0] - 2026-11-07

### Adicionado (Fases 1 a 5 — Especificação Marcadores Biológicos)
- **Motor Determinístico de Biomarcadores Derivados (`src/longevidade/metrics/engine.py`)**:
  - Avaliação de todas as métricas clínicas derivadas cobrindo 7 categorias (§12): Idade Biológica, Glicemia/Insulina, Inflamação/Imunidade/Nutrição, Fígado/Esteatose, Cardiovascular/Lipídico/Renal, Adiposidade/Composição Corporal e Séries Históricas Diretas.
  - Modelos implementados: Levine PhenoAge (2018 Gompertz), Light BioAge (Hao et al., 2025: NHANES, UKB, CHARLS), GOLD BioAge (Hao et al., 2025: NHANES, UKB), HOMA-IR, QUICKI, McAuley, TyG, TyG-BMI, TyG-WC, TyG-WHtR, METS-IR, SPISE, eAG, NLR, PLR, MLR, SII, SIRI, PIV, CAR, CALLY, HALP, CONUT, PNI, FLI, HSI, FIB-4 (com limitação de idade < 18 anos), APRI, AST/ALT, AIP, Non-HDL, Castelli I e II, TG/HDL, CKD-EPI 2021 eGFR, BMI, WHtR, BRI, WWI, RFM, VAI, LAP, CMI.
  - Bloqueio explícito com status `blocked_reference` para modelos pendentes de calibração ou pacotes oficiais auditados (PREVENT CVD/Age, PhenoAge/KDM Acceleration residual, KDM Biological Age V2).
  - Bloqueio explícito contra imputação silenciosa: métricas com insumos ausentes retornam `status: "missing_inputs"` e lista de insumos faltantes.

- **Catálogo Unificado de Métricas Derivadas (`src/longevidade/metrics/derived_catalog.py`)**:
  - Especificação contratual de 67 métricas com `display_name`, categoria, subcategoria, versão do algoritmo, chaves de insumo canônicas, unidade, nível de evidência (P0-P4), links DOI/URL oficiais e limitações clínicas.

- **Normalização, Conversão de Unidades e Derivações Controladas (`src/longevidade/metrics/unit_conversion.py`)**:
  - Conversão determinística de unidades laboratoriais (mmol/L para mg/dL para glicose, colesterol e triglicerídeos; µmol/L para mg/dL para creatinina; g/L para g/dL para albumina e hemoglobina; mg/dL para mg/L para PCR-us; contagens celulares absolutas para 10³/µL; altura em metros para cm).
  - Derivação controlada com rastreabilidade completa:
    - BUN (mg/dL) ≈ Ureia (mg/dL) / 2.14.
    - Linfócitos absolutos (10³/µL) = Leucócitos (10³/µL) × Linfócitos (%) / 100.
    - Linfócitos (%) = Linfócitos absolutos / Leucócitos × 100.
  - Suporte a valores censurados (`<`, `<=`, `>`, `>=`) sem perda de precisão ou descarte silencioso (`parse_numeric_or_censored`).

- **Banco de Dados SQLite — Migration 19 (`src/longevidade/db/migrations.py` e `src/longevidade/db/repository.py`)**:
  - Nova tabela `derived_metric_records` com chave única composta (`metric_id`, `measured_at`, `cohort_variant`) e índice em `measured_at`.
  - Novos campos de contexto clínico em `user_profile`: `diabetes`, `hypertension`, `current_smoker`, `antihypertensive_treatment`, `lipid_lowering_treatment`, `prior_cvd`.
  - Armazenamento de `raw_value` e `raw_unit` na tabela `lab_results`.

- **API REST FastAPI (`backend/app/routers/biomarkers.py`)**:
  - `GET /api/biomarkers/catalog`: catálogo completo e metadados agrupados nas 7 categorias oficiais.
  - `GET /api/biomarkers/derived`: cálculo, pareamento temporal (antropometria em janela de ±7 dias), retorno por categorias e séries históricas diretas de biomarcadores.
  - `POST /api/biomarkers/evaluate`: endpoint síncrono para avaliação rápida e sem persistência de insumos arbitrários.

- **Frontend React/TypeScript**:
  - `frontend/src/components/labs/labMarkers.ts`: catálogo enriquecido com BUN separado de Ureia, novos alvos e referências para contagens absolutas de neutrófilos, linfócitos, monócitos e hematócrito, além de dezenas de aliases de exames.
  - `frontend/src/components/labs/DerivedBiomarkersPanel.tsx`: painel modular responsivo com seletores de data e coorte (NHANES/UKB/CHARLS), exibição dos 7 módulos clínicos da §12, badges de status, limitações e referências oficiais com link.
  - `frontend/src/components/labs/CardiovascularRatios.tsx`: isolamento temporal restrito à data mais recente para evitar misturar laudos laboratoriais de datas distintas.
  - `frontend/src/App.tsx`: eliminação de fallback estático `40` para idade cronológica em novos cadastros e integrações.

### Modificado
- **Equação PhenoAge (`src/longevidade/algorithms/phenoage.py`)**:
  - Substituição da aproximação linear anterior pela equação clínica Gompertz oficial de Morgan Levine (Levine et al., 2018 / BioAge), calculando o risco de mortalidade acumulada em 10 anos (`1 - exp(...)`) e a idade biológica calibrada.
  - Rejeição estrita de valores `<= 0` com motivo `invalid_biomarker_domain` sem truncamento forçado.
