"""
Gerador de Relatório Clínico Sintético para Consulta Médica (Doctor Briefing).
Compila métricas dos últimos 30-90 dias em um documento Markdown claro e objetivo.
"""

from __future__ import annotations

from datetime import date, timedelta
from math import isfinite
from typing import Any, Dict, List
import numpy as np

from longevidade.db.repository import LongevityRepository
from longevidade.reports.briefing_context import briefing_context
from longevidade.reports.lab_selection import get_clinical_lab_snapshot
from longevidade.reports.lab_reference import lab_reference_status


def briefing_identity(profile: dict, patient_name: str | None, patient_age: float | None) -> tuple[str, str]:
    name = patient_name or profile.get("name") or "Paciente"
    age = patient_age if patient_age is not None else profile.get("chronological_age")
    age_text = f"{age:.0f} anos" if isinstance(age, (int, float)) and isfinite(age) and 0 <= age <= 130 else "Idade não informada"
    return name, age_text


def briefing_goals(profile: dict) -> list[str]:
    goals = profile.get("longevity_goals")
    if not isinstance(goals, list):
        return []
    return [" ".join(goal.split()) for goal in goals if isinstance(goal, str) and goal.strip()]


def generate_doctor_briefing(repo: LongevityRepository, patient_name: str | None = None, patient_age: float | None = None,
                             *, questions: list[str] | None = None, selected_lab_ids: list[int] | None = None,
                             selected_event_ids: list[str] | None = None) -> str:
    """Gera o relatório Doctor Briefing em Markdown a partir do perfil do repositório."""
    user_prof = repo.get_user_profile() or {}
    name, age_str = briefing_identity(user_prof, patient_name, patient_age)

    today = date.today()
    daily_90 = repo.get_daily_metrics_between((today - timedelta(days=89)).isoformat(), today.isoformat())
    first_30 = (today - timedelta(days=29)).isoformat()
    daily_30 = [row for row in daily_90 if row["date_ref"] >= first_30]
    clinical_snapshot = get_clinical_lab_snapshot(repo, selected_lab_ids)
    latest_labs = clinical_snapshot.latest_labs
    latest_phenoage = clinical_snapshot.latest_phenoage

    today_str = today.strftime("%d/%m/%Y")

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
    ]

    medical_items = []
    if user_prof.get("blood_type"):
        medical_items.append(f"**Tipo Sanguíneo**: `{user_prof['blood_type']}`")
    if user_prof.get("allergies"):
        medical_items.append(f"**Alergias**: `{user_prof['allergies']}`")
    if user_prof.get("emergency_contact_name") or user_prof.get("emergency_contact_phone"):
        ice_contact = f"{user_prof.get('emergency_contact_name', '')} {user_prof.get('emergency_contact_phone', '')}".strip()
        medical_items.append(f"**ICE**: `{ice_contact}`")
    if user_prof.get("primary_physician"):
        medical_items.append(f"**Médico de Ref.**: `{user_prof['primary_physician']}`")

    if medical_items:
        lines.append(f"**Ficha Médica**: {' • '.join(medical_items)}")

    lines.extend([
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
        "## 2. Marcadores Sanguíneos e Referências Registradas",
        "",
        "| Marcador | Valor Recente | Referência registrada (origem a confirmar) | Meta histórica não validada | Status |",
        "| :--- | :---: | :---: | :---: | :---: |",
    ])

    if not latest_labs:
        lines.append("| (Sem dados laboratoriais registrados) | - | - | - | - |")
    else:
        for key, lab in latest_labs.items():
            val = lab["value"]
            unit = lab.get("unit", "")
            val_str = f"{val} {unit}".strip()
            ref_str = f"{lab.get('ref_min') if lab.get('ref_min') is not None else '—'}-{lab.get('ref_max') if lab.get('ref_max') is not None else '—'}"
            opt = lab.get("optimal_target")
            opt_str = f"{opt} {unit}".strip() if opt is not None else "-"

            status = {"in_clinical_range": "Na referência", "out_of_range": "Fora da referência",
                      "no_reference": "Sem classificação", "noncanonical_unit": "Unidade não normalizada; sem classificação",
                      "not_eligible": "Origem não verificada"}[lab_reference_status(lab)]
            if lab_reference_status(lab) == "noncanonical_unit":
                opt_str = "—"

            lines.append(f"| {lab['metric_name']} | **{val_str}** | {ref_str} | {opt_str} | {status} |")

    excluded_count = clinical_snapshot.excluded_lab_results + clinical_snapshot.excluded_phenoage_records
    if excluded_count:
        lines.append(
            f"> Nota de segurança: {excluded_count} registro(s) sem provenance clínica verificável foram excluídos deste briefing."
        )

    goals = briefing_goals(user_prof)
    if goals:
        lines.extend(["", "---", "", "## 3. Objetivos registrados no perfil", ""])
        lines.extend(f"- {goal}" for goal in goals)
    for title, items in briefing_context(repo, daily_90, clinical_snapshot, today, questions, selected_event_ids):
        lines.extend(["", f"## {title}", ""])
        lines.extend(f"- {item}" for item in items)
    lines.extend(["", "---", "*Documento gerado automaticamente pelo Longevidade Hub.*"])

    return "\n".join(lines)
