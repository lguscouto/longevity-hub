"""
Gerador de Relatório Clínico Sintético para Consulta Médica (Doctor Briefing).
Compila métricas dos últimos 30-90 dias em um documento Markdown claro e objetivo.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List
import numpy as np

from longevidade.db.repository import LongevityRepository
from longevidade.reports.lab_selection import get_clinical_lab_snapshot


def generate_doctor_briefing(repo: LongevityRepository, patient_name: str | None = None, patient_age: float | None = None) -> str:
    """Gera o relatório Doctor Briefing em Markdown a partir do perfil do repositório."""
    user_prof = repo.get_user_profile() or {}
    name = patient_name or user_prof.get("name", "Paciente")
    age = patient_age if patient_age is not None else user_prof.get("chronological_age")
    age_str = f"{float(age):.0f} anos" if age is not None else "Idade não informada"

    daily_30 = repo.get_daily_metrics(days=30)
    clinical_snapshot = get_clinical_lab_snapshot(repo)
    latest_labs = clinical_snapshot.latest_labs
    latest_phenoage = clinical_snapshot.latest_phenoage

    today_str = date.today().strftime("%d/%m/%Y")

    # Cálculos das métricas dos últimos 30 dias
    bps_sys = [m["systolic_bp"] for m in daily_30 if m.get("systolic_bp") is not None]
    bps_dia = [m["diastolic_bp"] for m in daily_30 if m.get("diastolic_bp") is not None]
    weights = [m["weight_kg"] for m in daily_30 if m.get("weight_kg") is not None]
    rhrs = [m["rhr_bpm"] for m in daily_30 if m.get("rhr_bpm") is not None]
    hrvs = [m["hrv_ms"] for m in daily_30 if m.get("hrv_ms") is not None]
    vo2s = [m["vo2_max"] for m in daily_30 if m.get("vo2_max") is not None]
    spo2s = [m["spo2_avg_pct"] for m in daily_30 if m.get("spo2_avg_pct") is not None]
    resps = [m["respiratory_rate_rpm"] for m in daily_30 if m.get("respiratory_rate_rpm") is not None]
    rems = [m["sleep_rem_min"] for m in daily_30 if m.get("sleep_rem_min") is not None]

    bp_str = f"`{np.mean(bps_sys):.0f}/{np.mean(bps_dia):.0f} mmHg`" if (bps_sys and bps_dia) else "`(Sem dados)`"
    avg_weight = f"`{np.mean(weights):.1f} kg`" if weights else "`(Sem dados)`"
    avg_rhr = f"`{np.mean(rhrs):.0f} bpm`" if rhrs else "`(Sem dados)`"
    avg_hrv = f"`{np.mean(hrvs):.0f} ms`" if hrvs else "`(Sem dados)`"
    max_vo2 = f"`{np.max(vo2s):.1f} mL/kg/min`" if vo2s else "`(Sem dados)`"
    avg_spo2 = f"`{np.mean(spo2s):.1f}%`" if spo2s else "`(Sem dados)`"
    avg_resp = f"`{np.mean(resps):.1f} rpm`" if resps else "`(Sem dados)`"
    avg_rem = f"`{np.mean(rems):.0f} min/noite`" if rems else "`(Sem dados)`"

    pheno_txt = "(Sem dados)"
    if latest_phenoage:
        p = latest_phenoage
        pheno_txt = f"**{p['pheno_age']} anos** (Idade Cronológica: {p['chronological_age']} | Delta: **{p['age_delta']:+.1f} anos**)"

    lines = [
        f"# 🏥 Relatório Sintético de Longevidade & Saúde (Doctor Briefing)",
        f"**Data de Emissão**: {today_str}",
        f"**Paciente**: {name} ({age_str})",
        f"**Idade Biológica PhenoAge**: {pheno_txt}",
        "",
        "---",
        "",
        "## 1. Resumo Executivo das Métricas Fisiológicas (Últimos 30 Dias)",
        "",
        f"- **Pressão Arterial Média**: {bp_str}",
        f"- **Frequência Cardíaca de Repouso (RHR)**: {avg_rhr}",
        f"- **Variabilidade da Frequência Cardíaca (HRV)**: {avg_hrv}",
        f"- **Saturação de Oxigênio (SpO2)**: {avg_spo2}",
        f"- **Frequência Respiratória Média**: {avg_resp}",
        f"- **Média de Sono REM (Sonhos)**: {avg_rem}",
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
            ref_min = lab.get("ref_min")
            ref_max = lab.get("ref_max")

            if opt is not None:
                if key in ("apob", "lpa", "hscrp", "hba1c", "fasting_glucose", "fasting_insulin", "creatinine", "homocysteine") and val > opt:
                    status = "🟡 Acima do Alvo Ótimo"
                elif key in ("albumin", "vitamin_d") and val < opt:
                    status = "🟡 Abaixo do Alvo Ótimo"
            elif ref_min is not None or ref_max is not None:
                if ref_max is not None and val > ref_max:
                    status = "🔴 Fora da Ref. (Acima)"
                elif ref_min is not None and val < ref_min:
                    status = "🔴 Fora da Ref. (Abaixo)"
                else:
                    status = "🟢 Dentro da Ref."
            else:
                status = "⚪ Sem alvo/referência"

            lines.append(f"| {lab['metric_name']} | **{val_str}** | {ref_str} | {opt_str} | {status} |")

    excluded_count = clinical_snapshot.excluded_lab_results + clinical_snapshot.excluded_phenoage_records
    if excluded_count:
        lines.append(
            f"> Nota de segurança: {excluded_count} registro(s) sem provenance clínica verificável foram excluídos deste briefing."
        )

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
