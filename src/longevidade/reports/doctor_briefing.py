"""
Gerador de Relatório Clínico Sintético para Consulta Médica (Doctor Briefing).
Compila métricas dos últimos 30-90 dias em um documento Markdown claro e objetivo.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List
import numpy as np

from longevidade.db.repository import LongevityRepository


def generate_doctor_briefing(repo: LongevityRepository, patient_name: str = "Paciente", patient_age: float = 40.0) -> str:
    """Gera o relatório Doctor Briefing em Markdown."""
    daily_30 = repo.get_daily_metrics(days=30)
    latest_labs = repo.get_latest_labs_by_key()
    pheno_history = repo.get_phenoage_history(limit=1)

    today_str = date.today().strftime("%d/%m/%Y")

    # Cálculos das métricas dos últimos 30 dias
    bps_sys = [m["systolic_bp"] for m in daily_30 if m.get("systolic_bp") is not None]
    bps_dia = [m["diastolic_bp"] for m in daily_30 if m.get("diastolic_bp") is not None]
    weights = [m["weight_kg"] for m in daily_30 if m.get("weight_kg") is not None]
    rhrs = [m["rhr_bpm"] for m in daily_30 if m.get("rhr_bpm") is not None]
    hrvs = [m["hrv_ms"] for m in daily_30 if m.get("hrv_ms") is not None]
    vo2s = [m["vo2_max"] for m in daily_30 if m.get("vo2_max") is not None]

    bp_str = f"`{np.mean(bps_sys):.0f}/{np.mean(bps_dia):.0f} mmHg`" if (bps_sys and bps_dia) else "`(Sem dados)`"
    avg_weight = f"`{np.mean(weights):.1f} kg`" if weights else "`(Sem dados)`"
    avg_rhr = f"`{np.mean(rhrs):.0f} bpm`" if rhrs else "`(Sem dados)`"
    avg_hrv = f"`{np.mean(hrvs):.0f} ms`" if hrvs else "`(Sem dados)`"
    max_vo2 = f"`{np.max(vo2s):.1f} mL/kg/min`" if vo2s else "`(Sem dados)`"

    pheno_txt = "(Sem dados)"
    if pheno_history:
        p = pheno_history[0]
        pheno_txt = f"**{p['pheno_age']} anos** (Idade Cronológica: {p['chronological_age']} | Delta: **{p['age_delta']:+.1f} anos**)"

    lines = [
        f"# 🏥 Relatório Sintético de Longevidade & Saúde (Doctor Briefing)",
        f"**Data de Emissão**: {today_str}",
        f"**Paciente**: {patient_name} ({patient_age:.0f} anos)",
        f"**Idade Biológica PhenoAge**: {pheno_txt}",
        "",
        "---",
        "",
        "## 1. Resumo Executivo das Métricas Fisiológicas (Últimos 30 Dias)",
        "",
        f"- **Pressão Arterial Média**: {bp_str}",
        f"- **Frequência Cardíaca de Repouso (RHR)**: {avg_rhr}",
        f"- **Variabilidade da Frequência Cardíaca (HRV)**: {avg_hrv}",
        f"- **Capacidade Cardiorrespiratória (VO2 Max)**: {max_vo2}",
        f"- **Peso Corporal Médio**: {avg_weight}",
        "",
        "---",
        "",
        "## 2. Marcadores Sanguíneos & Comparativo com Alvos de Longevidade",
        "",
        "| Marcador | Valor Recente | Faixa de Ref. Laboratorial | Alvo Ótimo Longevidade | Status |",
        "| :--- | :---: | :---: | :---: | :---: |"
    ]

    if not latest_labs:
        lines.append("| (Sem dados laboratoriais registrados) | - | - | - | - |")
    else:
        for key, lab in latest_labs.items():
            val = lab["value"]
            unit = lab.get("unit", "")
            val_str = f"{val} {unit}".strip()
            ref_str = f"{lab.get('ref_min', '-')}-{lab.get('ref_max', '-')}"
            opt = lab.get("optimal_target")
            opt_str = f"{opt} {unit}".strip() if opt is not None else "-"

            status = "🟢 Ótimo"
            if opt is not None:
                if key in ("apob", "lpa", "hscrp", "hba1c", "fasting_glucose", "fasting_insulin", "creatinine", "homocysteine") and val > opt:
                    status = "🟡 Acima do Alvo Ótimo"
                elif key in ("albumin", "vitamin_d") and val < opt:
                    status = "🟡 Abaixo do Alvo Ótimo"

            lines.append(f"| {lab['metric_name']} | **{val_str}** | {ref_str} | {opt_str} | {status} |")

    lines.extend([
        "",
        "---",
        "",
        "## 3. Principais Objetivos da Consulta",
        "",
        "1. Avaliação dos marcadores lipidicos e inflamatórios (ApoB / hs-CRP) em relação às metas de longevidade.",
        "2. Revisão da rotina de treino aeróbico (Zona 2 vs VO2 Max) e preservação de massa magra.",
        "3. Ajuste fino de suplementação baseada nas deficiências detectadas no painel sanguíneo.",
        "",
        "---",
        "*Documento gerado automaticamente pelo Sistema Longevidade (Blueprint Protocol Local Hub).*"
    ])

    return "\n".join(lines)
