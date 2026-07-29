"""
Construtor de Contexto Clínico do Paciente para o Módulo de IA.
Agrega dados do SQLite (Perfil, PhenoAge, Wearables, Exames, CGM) em formato resumido e detalhado dia a dia.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository


def build_patient_clinical_context(db_path: str | Path) -> str:
    """Busca o estado clínico do paciente no banco de dados SQLite e formata como texto sintético detalhado."""
    repo = LongevityRepository(db_path)

    profile = repo.get_user_profile()
    daily_list = repo.get_daily_metrics(days=30)
    labs_map = repo.get_latest_labs_by_key()
    pheno_history = repo.get_phenoage_history(limit=5)
    cgm_list = repo.get_cgm_summaries(limit=14)
    experiments = repo.get_n_of_1_experiments()

    # 1. Perfil Básico
    lines = ["=== PERFIL DO PACIENTE ==="]
    lines.append(f"Nome: {profile.get('name', 'Paciente')}")
    lines.append(f"Idade Cronológica: {profile.get('chronological_age', 40)} anos (Nascimento: {profile.get('birthdate', 'N/A')})")
    lines.append(f"Altura: {profile.get('height_cm', 170)} cm | Peso Atual: {profile.get('current_weight_kg', 'Sem dados')} kg | Meta: {profile.get('target_weight_kg', 75)} kg")
    if profile.get('bmi'):
        lines.append(f"IMC: {profile.get('bmi')} kg/m²")

    # 2. Epigenética & PhenoAge
    lines.append("\n=== IDADE EPIGENÉTICA PHENOAGE ===")
    if pheno_history:
        latest_p = pheno_history[0]
        delta = latest_p.get('age_delta', 0)
        lines.append(f"Última Idade Biológica: {latest_p.get('pheno_age')} anos (Delta: {'+' if delta > 0 else ''}{delta} anos)")
        lines.append(f"Calculado em: {latest_p.get('calculated_at')}")
    else:
        lines.append("Nenhum histórico de PhenoAge gravado até o momento.")

    # 3. Métricas Médias de Wearables (Últimos 30 dias)
    lines.append("\n=== RESUMO DE WEARABLES (MÉDIAS DE 30 DIAS) ===")
    if daily_list:
        valid_steps = [m['steps'] for m in daily_list if m.get('steps')]
        valid_hrv = [m['hrv_ms'] for m in daily_list if m.get('hrv_ms')]
        valid_rhr = [m['rhr_bpm'] for m in daily_list if m.get('rhr_bpm')]
        valid_sleep = [m['sleep_minutes'] for m in daily_list if m.get('sleep_minutes')]
        valid_bp = [(m['systolic_bp'], m['diastolic_bp']) for m in daily_list if m.get('systolic_bp') and m.get('diastolic_bp')]

        avg_steps = round(sum(valid_steps) / len(valid_steps)) if valid_steps else "Sem dados"
        avg_hrv = round(sum(valid_hrv) / len(valid_hrv), 1) if valid_hrv else "Sem dados"
        avg_rhr = round(sum(valid_rhr) / len(valid_rhr), 1) if valid_rhr else "Sem dados"
        avg_sleep_h = round(sum(valid_sleep) / len(valid_sleep) / 60, 1) if valid_sleep else "Sem dados"

        lines.append(f"Passos Médios: {avg_steps} passos/dia")
        lines.append(f"HRV Noturna Média: {avg_hrv} ms")
        lines.append(f"Frequência Cardíaca de Repouso (RHR): {avg_rhr} bpm")
        lines.append(f"Sono Médio: {avg_sleep_h} horas/noite")

        if valid_bp:
            latest_bp = valid_bp[0]
            lines.append(f"Última Pressão Arterial: {latest_bp[0]}/{latest_bp[1]} mmHg")

        # 3.1 REGISTROS DIÁRIOS DETALHADOS DIA A DIA (ÚLTIMOS 14 DIAS)
        lines.append("\n=== REGISTROS DIÁRIOS DETALHADOS DIA A DIA (ÚLTIMOS 14 DIAS) ===")
        for m in daily_list[:14]:
            d_ref = m.get("date_ref", "N/A")
            st = m.get("steps") if m.get("steps") is not None else "-"
            slp_min = m.get("sleep_minutes")
            slp_str = f"{int(slp_min // 60)}h {int(slp_min % 60)}m" if slp_min else "-"
            hrv = m.get("hrv_ms") if m.get("hrv_ms") is not None else "-"
            rhr = m.get("rhr_bpm") if m.get("rhr_bpm") is not None else "-"
            bp_sys = m.get("systolic_bp")
            bp_dia = m.get("diastolic_bp")
            bp_str = f"{bp_sys}/{bp_dia}" if (bp_sys and bp_dia) else "-"

            deep = m.get("sleep_deep_min") or "-"
            rem = m.get("sleep_rem_min") or "-"
            light = m.get("sleep_light_min") or "-"

            lines.append(
                f"- Data: {d_ref} | Sono Total: {slp_str} (Profundo: {deep}m, REM: {rem}m, Leve: {light}m) | "
                f"HRV: {hrv} ms | RHR: {rhr} bpm | Passos: {st} | PA: {bp_str}"
            )
    else:
        lines.append("Nenhuma métrica diária sincronizada recente.")

    # 4. Exames Laboratoriais
    lines.append("\n=== EXAMES LABORATORIAIS RECENTES ===")
    if labs_map:
        for key, lab in labs_map.items():
            lines.append(f"- {lab.get('metric_name', key)}: {lab.get('value')} {lab.get('unit')} (Alvo: {lab.get('optimal_target', '-')} {lab.get('unit')}) | Coleta: {lab.get('collected_at')}")
    else:
        lines.append("Nenhum exame de sangue registrado.")

    # 5. Glicemia Contínua (CGM)
    lines.append("\n=== GLICEMIA CONTÍNUA (CGM) ===")
    if cgm_list:
        latest_cgm = cgm_list[0]
        lines.append(f"Glicemia Média 24h: {latest_cgm.get('mean_glucose')} mg/dL (Alvo: < 90 mg/dL)")
        lines.append(f"Time-in-Range (70-140 mg/dL): {latest_cgm.get('time_in_range_pct')}% (Alvo: > 95%)")
        lines.append(f"Variabilidade (CV %): {latest_cgm.get('cv_pct')}% (Alvo: < 15%)")
    else:
        lines.append("Sem leituras de sensor CGM registradas.")

    # 6. Experimentos N-of-1
    if experiments:
        lines.append("\n=== EXPERIMENTOS N-OF-1 ATIVOS ===")
        for exp in experiments[:3]:
            lines.append(f"- Expresso: {exp.get('title')} | Métrica: {exp.get('metric_key')} | Status: {exp.get('status')}")

    return "\n".join(lines)
