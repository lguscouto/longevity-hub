#!/usr/bin/env python3
"""Script de Ingestão do Exame de Sangue de 07/11/2026 (Labi Saúde / DB Diagnósticos).

Arquivo de origem: E:\\antigravity\\projetos\\planos\\Laudo-AnalisesClinicas07.11.2026.pdf
Paciente: Luis Gustavo de Souza Couto (DN: 22/03/1994, 32 anos, Masculino)
Data de Coleta: 07/11/2026 (09:52 BRT)
"""

from __future__ import annotations

import json
from pathlib import Path
import sys

# Garante importação dos módulos locais
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from longevidade.db.repository import LongevityRepository
from longevidade.db.schema import initialize_db
from longevidade.ingestion.lab_parser import ingest_lab_records
from longevidade.lab_provenance import PATIENT_LAB_ORIGIN
from longevidade.metrics.engine import build_observation_context_for_date, evaluate_all_metrics
from backend.app.config import get_db_path
from backend.app.routers.kdm import calculate_and_save_kdm


LAB_RECORDS_20261107 = [
    # 1. Glicose (pág. 1)
    {
        "collected_at": "2026-11-07",
        "metric_key": "glucose_mgdl",
        "metric_name": "Glicose de Jejum",
        "value": 88.0,
        "unit": "mg/dL",
        "ref_min": 70.0,
        "ref_max": 99.0,
        "optimal_target": 85.0,
        "category": "Metabolismo",
        "notes": "Método: Enzimático. Labi Saúde / DB Diagnósticos",
        "raw_value": 88.0,
        "raw_unit": "mg/dL",
    },
    # 2. Insulina (pág. 1)
    {
        "collected_at": "2026-11-07",
        "metric_key": "fasting_insulin",
        "metric_name": "Insulina de Jejum",
        "value": 3.0,
        "unit": "uIU/mL",
        "ref_min": 2.6,
        "ref_max": 24.9,
        "optimal_target": 4.0,
        "category": "Metabolismo",
        "notes": "Método: Eletroquimioluminescência",
        "raw_value": 3.0,
        "raw_unit": "µUI/mL",
    },
    # 3. Testosterona Total (pág. 2)
    {
        "collected_at": "2026-11-07",
        "metric_key": "testosterone_total",
        "metric_name": "Testosterona Total",
        "value": 1360.0,
        "unit": "ng/dL",
        "ref_min": 249.19,
        "ref_max": 836.42,
        "optimal_target": 750.0,
        "category": "Hormônios",
        "notes": "Método: Eletroquimioluminescência",
        "raw_value": 1360.0,
        "raw_unit": "ng/dL",
    },
    # 4. Fosfatase Alcalina (pág. 3)
    {
        "collected_at": "2026-11-07",
        "metric_key": "alk_phos_ul",
        "metric_name": "Fosfatase Alcalina",
        "value": 88.0,
        "unit": "U/L",
        "ref_min": 30.0,
        "ref_max": 120.0,
        "optimal_target": 65.0,
        "category": "Hepático",
        "notes": "Método: Enzimático",
        "raw_value": 88.0,
        "raw_unit": "U/L",
    },
    # 5. Gama Glutamil Transferase (GGT) (pág. 3)
    {
        "collected_at": "2026-11-07",
        "metric_key": "ggt",
        "metric_name": "Gama GT (GGT)",
        "value": 34.0,
        "unit": "U/L",
        "ref_min": 0.0,
        "ref_max": 55.0,
        "optimal_target": 18.0,
        "category": "Hepático",
        "notes": "Método: Enzimático",
        "raw_value": 34.0,
        "raw_unit": "U/L",
    },
    # 6. TGP / ALT (pág. 4)
    {
        "collected_at": "2026-11-07",
        "metric_key": "alt",
        "metric_name": "TGP / ALT",
        "value": 27.0,
        "unit": "U/L",
        "ref_min": 0.0,
        "ref_max": 45.0,
        "optimal_target": 20.0,
        "category": "Hepático",
        "notes": "Método: Enzimático (Alanino Aminotransferase)",
        "raw_value": 27.0,
        "raw_unit": "U/L",
    },
    # 7. Ureia (pág. 4)
    {
        "collected_at": "2026-11-07",
        "metric_key": "urea",
        "metric_name": "Ureia",
        "value": 33.0,
        "unit": "mg/dL",
        "ref_min": 13.0,
        "ref_max": 43.0,
        "optimal_target": 25.0,
        "category": "Renal",
        "notes": "Método: Cinético",
        "raw_value": 33.0,
        "raw_unit": "mg/dL",
    },
    # 8. Albumina (pág. 5)
    {
        "collected_at": "2026-11-07",
        "metric_key": "albumin_gdl",
        "metric_name": "Albumina",
        "value": 4.5,
        "unit": "g/dL",
        "ref_min": 3.5,
        "ref_max": 5.2,
        "optimal_target": 4.6,
        "category": "Hepático",
        "notes": "Método: Colorimétrico",
        "raw_value": 4.5,
        "raw_unit": "g/dL",
    },
    # 9. Eritrócitos (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "erythrocytes",
        "metric_name": "Eritrócitos",
        "value": 5.75,
        "unit": "milhões/mm³",
        "ref_min": 4.10,
        "ref_max": 5.60,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 5.75,
        "raw_unit": "milhões/mm³",
    },
    # 10. Hemoglobina (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "hemoglobin",
        "metric_name": "Hemoglobina",
        "value": 16.1,
        "unit": "g/dL",
        "ref_min": 12.5,
        "ref_max": 17.0,
        "optimal_target": 15.0,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 16.1,
        "raw_unit": "g/dL",
    },
    # 11. Hematócrito (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "hematocrit",
        "metric_name": "Hematócrito",
        "value": 46.6,
        "unit": "%",
        "ref_min": 37.5,
        "ref_max": 51.0,
        "optimal_target": 45.0,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 46.6,
        "raw_unit": "%",
    },
    # 12. VCM (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "mcv_fl",
        "metric_name": "Volume Corpuscular Médio (MCV)",
        "value": 81.0,
        "unit": "fL",
        "ref_min": 80.0,
        "ref_max": 99.9,
        "optimal_target": 89.0,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 81.0,
        "raw_unit": "µm³",
    },
    # 13. HCM (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "mch",
        "metric_name": "HCM",
        "value": 28.0,
        "unit": "pg",
        "ref_min": 23.8,
        "ref_max": 33.4,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 28.0,
        "raw_unit": "pg",
    },
    # 14. CHCM (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "mchc",
        "metric_name": "CHCM",
        "value": 34.5,
        "unit": "g/dL",
        "ref_min": 31.4,
        "ref_max": 36.0,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 34.5,
        "raw_unit": "g/dL",
    },
    # 15. RDW (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "rdw_pct",
        "metric_name": "Amplitude de Distribuição (RDW)",
        "value": 10.9,
        "unit": "%",
        "ref_min": 12.0,
        "ref_max": 15.4,
        "optimal_target": 12.2,
        "category": "Hematologia",
        "notes": "Série Vermelha",
        "raw_value": 10.9,
        "raw_unit": "%",
    },
    # 16. Leucócitos Totais (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "wbc_1000ul",
        "metric_name": "Leucócitos Totais (WBC)",
        "value": 4.5,
        "unit": "10³/µL",
        "ref_min": 3.6,
        "ref_max": 12.0,
        "optimal_target": 5.5,
        "category": "Imunidade",
        "notes": "Série Branca (4.500 /mm³)",
        "raw_value": 4500,
        "raw_unit": "/mm³",
    },
    # 17. Segmentados / Neutrófilos (%) (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "neutrophils_pct",
        "metric_name": "Segmentados / Neutrófilos (%)",
        "value": 56.0,
        "unit": "%",
        "ref_min": 40.0,
        "ref_max": 75.0,
        "category": "Imunidade",
        "notes": "Série Branca",
        "raw_value": 56.0,
        "raw_unit": "%",
    },
    # 18. Neutrófilos Absolutos (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "neutrophils",
        "metric_name": "Neutrófilos Absolutos",
        "value": 2.52,
        "unit": "10³/µL",
        "ref_min": 1.44,
        "ref_max": 9.00,
        "optimal_target": 3.5,
        "category": "Imunidade",
        "notes": "Série Branca (2.520 /mm³)",
        "raw_value": 2520,
        "raw_unit": "/mm³",
    },
    # 19. Linfócitos (%) (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "lymphocyte_pct",
        "metric_name": "Linfócitos (%)",
        "value": 33.0,
        "unit": "%",
        "ref_min": 20.0,
        "ref_max": 45.0,
        "optimal_target": 30.0,
        "category": "Imunidade",
        "notes": "Série Branca",
        "raw_value": 33.0,
        "raw_unit": "%",
    },
    # 20. Linfócitos Absolutos (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "lymphocytes_abs",
        "metric_name": "Linfócitos Absolutos",
        "value": 1.485,
        "unit": "10³/µL",
        "ref_min": 0.72,
        "ref_max": 5.04,
        "optimal_target": 2.0,
        "category": "Imunidade",
        "notes": "Série Branca (1.485 /mm³)",
        "raw_value": 1485,
        "raw_unit": "/mm³",
    },
    # 21. Monócitos (%) (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "monocytes_pct",
        "metric_name": "Monócitos (%)",
        "value": 10.0,
        "unit": "%",
        "ref_min": 1.0,
        "ref_max": 12.0,
        "category": "Imunidade",
        "notes": "Série Branca",
        "raw_value": 10.0,
        "raw_unit": "%",
    },
    # 22. Monócitos Absolutos (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "monocytes",
        "metric_name": "Monócitos Absolutos",
        "value": 0.45,
        "unit": "10³/µL",
        "ref_min": 0.036,
        "ref_max": 1.44,
        "optimal_target": 0.4,
        "category": "Imunidade",
        "notes": "Série Branca (450 /mm³)",
        "raw_value": 450,
        "raw_unit": "/mm³",
    },
    # 23. Eosinófilos (%) (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "eosinophils_pct",
        "metric_name": "Eosinófilos (%)",
        "value": 1.0,
        "unit": "%",
        "ref_min": 1.0,
        "ref_max": 5.0,
        "category": "Imunidade",
        "notes": "Série Branca",
        "raw_value": 1.0,
        "raw_unit": "%",
    },
    # 24. Basófilos (%) (pág. 6)
    {
        "collected_at": "2026-11-07",
        "metric_key": "basophils_pct",
        "metric_name": "Basófilos (%)",
        "value": 0.0,
        "unit": "%",
        "ref_min": 0.0,
        "ref_max": 2.0,
        "category": "Imunidade",
        "notes": "Série Branca",
        "raw_value": 0.0,
        "raw_unit": "%",
    },
    # 25. Plaquetas (pág. 7)
    {
        "collected_at": "2026-11-07",
        "metric_key": "platelets",
        "metric_name": "Plaquetas",
        "value": 232.0,
        "unit": "10³/µL",
        "ref_min": 150.0,
        "ref_max": 450.0,
        "optimal_target": 220.0,
        "category": "Hematologia",
        "notes": "232.000 /mm³",
        "raw_value": 232000,
        "raw_unit": "/mm³",
    },
    # 26. VPM (Volume Plaquetário Médio) (pág. 7)
    {
        "collected_at": "2026-11-07",
        "metric_key": "mpv",
        "metric_name": "Volume Plaquetário Médio (VPM)",
        "value": 10.8,
        "unit": "fL",
        "ref_min": 7.4,
        "ref_max": 11.4,
        "category": "Hematologia",
        "notes": "Plaquetograma",
        "raw_value": 10.8,
        "raw_unit": "fL",
    },
    # 27. Hemoglobina Glicada (HbA1c) (pág. 7-8)
    {
        "collected_at": "2026-11-07",
        "metric_key": "hba1c",
        "metric_name": "Hemoglobina Glicada (HbA1c)",
        "value": 5.4,
        "unit": "%",
        "ref_min": 4.0,
        "ref_max": 5.7,
        "optimal_target": 5.2,
        "category": "Metabolismo",
        "notes": "Método: Turbidimetria (Glicose Média Estimada: 108 mg/dL)",
        "raw_value": 5.4,
        "raw_unit": "%",
    },
    # 28. Creatinina (pág. 8)
    {
        "collected_at": "2026-11-07",
        "metric_key": "creatinine_mgdl",
        "metric_name": "Creatinina",
        "value": 0.75,
        "unit": "mg/dL",
        "ref_min": 0.90,
        "ref_max": 1.30,
        "optimal_target": 0.9,
        "category": "Renal",
        "notes": "Método: Colorimétrico",
        "raw_value": 0.75,
        "raw_unit": "mg/dL",
    },
    # 29. Taxa de Filtração Glomerular (eGFR) (pág. 9)
    {
        "collected_at": "2026-11-07",
        "metric_key": "egfr",
        "metric_name": "Taxa de Filtração Glomerular (eGFR)",
        "value": 108.0,
        "unit": "mL/min",
        "ref_min": 90.0,
        "ref_max": 120.0,
        "optimal_target": 105.0,
        "category": "Renal",
        "notes": "Método: CKD-EPI Creatinina (> 90 mL/min/1,73m2)",
        "raw_value": 108.0,
        "raw_unit": "mL/min/1,73m2",
    },
    # 30. Colesterol Total (pág. 9)
    {
        "collected_at": "2026-11-07",
        "metric_key": "total_cholesterol",
        "metric_name": "Colesterol Total",
        "value": 159.0,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 190.0,
        "category": "Cardiovascular",
        "notes": "Método: Enzimático, Colorimétrico",
        "raw_value": 159.0,
        "raw_unit": "mg/dL",
    },
    # 31. Colesterol HDL (pág. 9)
    {
        "collected_at": "2026-11-07",
        "metric_key": "hdl_cholesterol",
        "metric_name": "Colesterol HDL",
        "value": 45.0,
        "unit": "mg/dL",
        "ref_min": 40.0,
        "ref_max": 90.0,
        "optimal_target": 60.0,
        "category": "Cardiovascular",
        "notes": "Método: Enzimático, Colorimétrico",
        "raw_value": 45.0,
        "raw_unit": "mg/dL",
    },
    # 32. Colesterol LDL (pág. 10)
    {
        "collected_at": "2026-11-07",
        "metric_key": "ldl_cholesterol",
        "metric_name": "Colesterol LDL",
        "value": 97.0,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 130.0,
        "optimal_target": 70.0,
        "category": "Cardiovascular",
        "notes": "Fórmula de Martin",
        "raw_value": 97.0,
        "raw_unit": "mg/dL",
    },
    # 33. Colesterol Não-HDL (pág. 10)
    {
        "collected_at": "2026-11-07",
        "metric_key": "non_hdl_cholesterol",
        "metric_name": "Colesterol Não-HDL",
        "value": 114.0,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 130.0,
        "category": "Cardiovascular",
        "notes": "Cálculo: CT - HDL",
        "raw_value": 114.0,
        "raw_unit": "mg/dL",
    },
    # 34. Colesterol VLDL (pág. 10)
    {
        "collected_at": "2026-11-07",
        "metric_key": "vldl",
        "metric_name": "Colesterol VLDL",
        "value": 17.0,
        "unit": "mg/dL",
        "category": "Cardiovascular",
        "notes": "Cálculo",
        "raw_value": 17.0,
        "raw_unit": "mg/dL",
    },
    # 35. Triglicérides (pág. 11)
    {
        "collected_at": "2026-11-07",
        "metric_key": "triglycerides",
        "metric_name": "Triglicérides",
        "value": 77.0,
        "unit": "mg/dL",
        "ref_min": 0.0,
        "ref_max": 150.0,
        "optimal_target": 80.0,
        "category": "Cardiovascular",
        "notes": "Método: Colorimétrico",
        "raw_value": 77.0,
        "raw_unit": "mg/dL",
    },
    # 36. Proteína C-Reativa Ultrassensível (PCR-us) (pág. 12)
    {
        "collected_at": "2026-11-07",
        "metric_key": "hscrp_mgl",
        "metric_name": "Proteína C-Reativa ultrassensível",
        "value": 1.34,
        "unit": "mg/L",
        "ref_min": 0.0,
        "ref_max": 3.0,
        "optimal_target": 0.5,
        "category": "Inflamação",
        "notes": "Método: Imunoturbidimetria",
        "raw_value": 1.34,
        "raw_unit": "mg/L",
    },
]


def run_ingestion() -> None:
    db_path = get_db_path()
    print(f"Banco de dados operacional: {db_path}")

    initialize_db(db_path)
    repo = LongevityRepository(db_path)

    # 1. Executa ingestão e cálculo automatizado de PhenoAge
    print(f"Ingerindo {len(LAB_RECORDS_20261107)} exames coletados em 07/11/2026...")
    res = ingest_lab_records(LAB_RECORDS_20261107, repo, record_origin=PATIENT_LAB_ORIGIN)
    print(f"Exames inseridos: {res['inserted']}")

    pheno = res.get("phenoage", {})
    if pheno.get("status") == "complete":
        print("\n=== Resultado PhenoAge (Levine 2018) ===")
        print(f"  Idade Cronológica: {pheno['chronological_age']} anos")
        print(f"  Idade Biológica (PhenoAge): {pheno['pheno_age']} anos")
        print(f"  Diferencial de Idade (Delta): {pheno['age_delta']} anos")
        print(f"  Risco de Mortalidade em 10 anos: {pheno['mortality_risk_10yr_pct']}%")
    else:
        print(f"PhenoAge status: {pheno.get('status')} - Motivo: {pheno.get('reason')}")

    # 2. Executa cálculo e persistência dos Biomarcadores Derivados para a data
    print("\nCalculando biomarcadores derivados clínicos para 07/11/2026...")
    ctx, pair_lim = build_observation_context_for_date(repo, "2026-11-07", anthropometry_window_days=7)
    eval_results = evaluate_all_metrics(ctx, measured_at="2026-11-07")
    to_persist = [r for r in eval_results.values() if r.get("status") != "not_implemented"]
    persisted_count = repo.save_derived_metric_records(to_persist)
    print(f"Biomarcadores derivados persistidos: {persisted_count}")

    # Exibe alguns dos biomarcadores derivados principais
    print("\n=== Principais Biomarcadores Derivados Calculados ===")
    for k in [
        "homa_ir", "quicki", "tyg_index", "estimated_average_glucose",
        "aip", "castelli_1", "castelli_2", "tg_hdl_ratio", "non_hdl_cholesterol",
        "remnant_cholesterol", "nlr", "plr", "sii", "siri", "egfr", "light_bioage", "gold_bioage"
    ]:
        item = eval_results.get(k)
        if item and item.get("status") == "calculated":
            print(f"  {k}: {item.get('value')} {item.get('unit')} (Classificação: {item.get('interpretation', {}).get('tier', 'N/A')})")

    # 3. Executa KDM real
    print("\nCalculando KDM Biological Age...")
    try:
        kdm_out = calculate_and_save_kdm()
        kdm_res = kdm_out.get("result", {})
        if kdm_res.get("status") == "complete":
            print(f"  KDM Age: {kdm_res.get('kdm_age')} anos")
            print(f"  KDM Delta: {kdm_res.get('kdm_delta')} anos")
        else:
            print(f"  KDM Status: {kdm_res.get('status')} ({kdm_res.get('reason')})")
    except Exception as exc:
        print(f"  Erro no cálculo KDM: {exc}")

    print("\nIngestão e processamento concluídos com total sucesso!")


if __name__ == "__main__":
    run_ingestion()
