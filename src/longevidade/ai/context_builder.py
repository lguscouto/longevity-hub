"""
Construtor de Contexto Clínico do Paciente para o Módulo de IA.
Agrega dados do SQLite (Perfil, PhenoAge, KDM Age, Wearables, Exames, Razões Cardiovasculares, Suplementos, Hormônios, Audit Logs, Compliance, CGM).
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository
from longevidade.calculators.kdm_age import (
    build_kdm_history_rows,
    calculate_kdm_biological_age,
    latest_kdm_biomarker_values,
)
from longevidade.calculators.cardio_ratios import calculate_cardiovascular_ratios


def build_patient_clinical_context(db_path: str | Path, privacy_mode: str = "minimal") -> str:
    """Busca o estado clínico no SQLite e formata contexto para IA.

    `privacy_mode="minimal"` é o padrão seguro: remove identificadores diretos
    e reduz janelas detalhadas antes de enviar dados a provedores externos.
    `privacy_mode="full"` mantém o contexto histórico amplo para uso local/opt-in.
    """
    normalized_privacy_mode = "full" if privacy_mode == "full" else "minimal"
    minimal_mode = normalized_privacy_mode == "minimal"
    detail_daily_limit = 3 if minimal_mode else 14
    compliance_detail_limit = 3 if minimal_mode else 7
    include_audit_history = not minimal_mode

    repo = LongevityRepository(db_path)

    profile = repo.get_user_profile()
    daily_list = repo.get_daily_metrics(days=30)
    labs_map = repo.get_latest_labs_by_key()
    pheno_history = repo.get_phenoage_history(limit=5)
    cgm_list = repo.get_cgm_summaries(limit=14)
    experiments = repo.get_n_of_1_experiments()
    supplements = repo.get_supplements(only_active=True)
    compliance_list = repo.get_daily_compliance_history(days=14)
    audit_logs = repo.get_supplement_audit_logs(limit=25)

    # 1. Perfil Básico
    lines = ["=== PERFIL DO PACIENTE ==="]
    lines.append(f"Modo de privacidade aplicado: {normalized_privacy_mode}")
    if minimal_mode:
        lines.append("Identificadores diretos removidos: nome, e-mail e data de nascimento não foram enviados ao provedor externo.")
        lines.append(f"Idade Cronológica: {profile.get('chronological_age', 32.0)} anos")
    else:
        lines.append(f"Nome: {profile.get('name', 'Paciente')}")
        lines.append(f"Idade Cronológica: {profile.get('chronological_age', 32.0)} anos (Nascimento: {profile.get('birthdate', 'N/A')})")
    lines.append(f"Altura: {profile.get('height_cm', 170.0)} cm | Peso Atual: {profile.get('current_weight_kg', 'Sem dados')} kg | Meta: {profile.get('target_weight_kg', 75.0)} kg")
    if profile.get('bmi'):
        lines.append(f"IMC: {profile.get('bmi')} kg/m²")

    # 2. Epigenética & Idade Biológica (PhenoAge + KDM Age)
    lines.append("\n=== IDADE EPIGENÉTICA E BIOLÓGICA (PHENOAGE + KDM) ===")
    if pheno_history:
        latest_p = pheno_history[0]
        delta_p = latest_p.get('age_delta', 0)
        lines.append(f"- Morgan Levine PhenoAge: {latest_p.get('pheno_age')} anos (Delta: {'+' if delta_p > 0 else ''}{delta_p} anos) | Calculado em: {latest_p.get('calculated_at')}")
    else:
        lines.append("- Morgan Levine PhenoAge: Nenhum histórico gravado.")

    # Cálculo dinâmico KDM baseado nos últimos exames + métricas
    kdm_input = {}
    if labs_map:
        for k, v in labs_map.items():
            if v.get("value") is not None:
                kdm_input[k] = float(v["value"])
    if daily_list and daily_list[0].get("rhr_bpm"):
        kdm_input["rhr_bpm"] = float(daily_list[0]["rhr_bpm"])

    kdm_res = calculate_kdm_biological_age(profile.get("chronological_age", 32.0), kdm_input)
    if kdm_res.get("status") == "complete":
        delta = kdm_res.get("kdm_delta") or 0
        lines.append(f"- Klemera-Doubal (KDM) Age: {kdm_res.get('kdm_age')} anos (Delta: {'+' if delta > 0 else ''}{delta} anos) | Biomarcadores usados: {kdm_res.get('biomarkers_count', 0)}")
    else:
        missing = kdm_res.get('missing_biomarkers') or []
        missing_text = ", ".join(missing[:6]) if missing else "indisponível"
        lines.append(f"- Klemera-Doubal (KDM) Age: indisponível ({kdm_res.get('reason', 'dados insuficientes')}) | Biomarcadores presentes: {kdm_res.get('biomarkers_count', 0)} | Faltando: {missing_text}")

    # 3. Métricas Médias de Wearables (Últimos 30 dias)
    lines.append("\n=== RESUMO DE WEARABLES (MÉDIAS DE 30 DIAS) ===")
    if daily_list:
        valid_steps = [m['steps'] for m in daily_list if m.get('steps')]
        valid_hrv = [m['hrv_ms'] for m in daily_list if m.get('hrv_ms')]
        valid_rhr = [m['rhr_bpm'] for m in daily_list if m.get('rhr_bpm')]
        valid_sleep = [m['sleep_minutes'] for m in daily_list if m.get('sleep_minutes')]
        valid_bp = [(m['systolic_bp'], m['diastolic_bp']) for m in daily_list if m.get('systolic_bp') and m.get('diastolic_bp')]
        valid_spo2 = [m['spo2_avg_pct'] for m in daily_list if m.get('spo2_avg_pct')]
        valid_resp = [m['respiratory_rate_rpm'] for m in daily_list if m.get('respiratory_rate_rpm')]
        valid_pai = [m['pai_score'] for m in daily_list if m.get('pai_score')]

        avg_steps = round(sum(valid_steps) / len(valid_steps)) if valid_steps else "Sem dados"
        avg_hrv = round(sum(valid_hrv) / len(valid_hrv), 1) if valid_hrv else "Sem dados"
        avg_rhr = round(sum(valid_rhr) / len(valid_rhr), 1) if valid_rhr else "Sem dados"
        avg_sleep_h = round(sum(valid_sleep) / len(valid_sleep) / 60, 1) if valid_sleep else "Sem dados"
        avg_spo2 = f"{round(sum(valid_spo2) / len(valid_spo2), 1)}%" if valid_spo2 else "Sem dados"
        avg_resp = f"{round(sum(valid_resp) / len(valid_resp), 1)} rpm" if valid_resp else "Sem dados"
        latest_pai = round(valid_pai[0], 1) if valid_pai else "Sem dados"

        lines.append(f"Passos Médios: {avg_steps} passos/dia")
        lines.append(f"HRV Noturna Média: {avg_hrv} ms")
        lines.append(f"Frequência Cardíaca de Repouso (RHR): {avg_rhr} bpm")
        lines.append(f"Sono Médio: {avg_sleep_h} horas/noite")
        lines.append(f"SpO2 Oxigenação Média: {avg_spo2}")
        lines.append(f"Frequência Respiratória Média: {avg_resp}")
        lines.append(f"PAI Score Recente: {latest_pai}")

        if valid_bp:
            latest_bp = valid_bp[0]
            lines.append(f"Última Pressão Arterial: {latest_bp[0]}/{latest_bp[1]} mmHg")

        # Registros detalhados recentes
        lines.append(f"\n=== REGISTROS DIÁRIOS DETALHADOS DIA A DIA (ÚLTIMOS {detail_daily_limit} DIAS) ===")
        for m in daily_list[:detail_daily_limit]:
            d_ref = m.get("date_ref", "N/A")
            st = m.get("steps") if m.get("steps") is not None else "-"
            slp_min = m.get("sleep_minutes")
            slp_str = f"{int(slp_min // 60)}h {int(slp_min % 60)}m" if slp_min else "-"
            hrv = m.get("hrv_ms") if m.get("hrv_ms") is not None else "-"
            rhr = m.get("rhr_bpm") if m.get("rhr_bpm") is not None else "-"
            bp_sys = m.get("systolic_bp")
            bp_dia = m.get("diastolic_bp")
            bp_str = f"{bp_sys}/{bp_dia}" if (bp_sys and bp_dia) else "-"
            spo2 = f"{m.get('spo2_avg_pct')}%" if m.get("spo2_avg_pct") is not None else "-"

            deep = m.get("sleep_deep_min") or "-"
            rem = m.get("sleep_rem_min") or "-"
            light = m.get("sleep_light_min") or "-"

            lines.append(
                f"- Data: {d_ref} | Sono Total: {slp_str} (Profundo: {deep}m, REM: {rem}m, Leve: {light}m) | "
                f"HRV: {hrv} ms | RHR: {rhr} bpm | SpO2: {spo2} | Passos: {st} | PA: {bp_str}"
            )
    else:
        lines.append("Nenhuma métrica diária sincronizada recente.")

    # 4. Exames Laboratoriais & Razões Cardiovasculares
    lines.append("\n=== EXAMES LABORATORIAIS & RAZÕES CARDIOVASCULARES ===")
    if labs_map:
        cardio_ratios = calculate_cardiovascular_ratios(labs_map)
        lines.append(f"- Razão ApoB/ApoA1: {cardio_ratios['apob_apoa1_ratio'] or 'N/A'} (Status: {cardio_ratios['apob_apoa1_status']})")
        lines.append(f"- Razão Triglicerídeos/HDL: {cardio_ratios['tg_hdl_ratio'] or 'N/A'} (Status: {cardio_ratios['tg_hdl_status']})")
        lines.append(f"- Colesterol Remanescente: {cardio_ratios['remnant_cholesterol'] or 'N/A'} mg/dL (Status: {cardio_ratios['remnant_status']})")

        lines.append("\nBiomarcadores de Sangue:")
        for key, lab in labs_map.items():
            lines.append(f"- {lab.get('metric_name', key)}: {lab.get('value')} {lab.get('unit')} (Alvo: {lab.get('optimal_target', '-')} {lab.get('unit')}) | Coleta: {lab.get('collected_at')}")
    else:
        lines.append("Nenhum exame de sangue registrado.")

    # 5. Pilha Ativa de Suplementos & Hormônios
    lines.append("\n=== PILHA ATIVA DE SUPLEMENTOS & HORMÔNIOS ===")
    if supplements:
        for s in supplements:
            cat = s.get("category", "Suplemento")
            lines.append(f"- [{cat.upper()}] {s.get('name')}: {s.get('dosage')} (Horário: {s.get('timing')}) | Início: {s.get('start_date')} | Nota: {s.get('notes', '-')}")
    else:
        lines.append("Nenhum composto ativo registrado.")

    # 5.1 Histórico Auditável de Alterações de Suplementos e Hormônios
    if include_audit_history:
        lines.append("\n=== HISTÓRICO AUDITÁVEL DE ALTERAÇÕES DE SUPLEMENTOS E HORMÔNIOS ===")
        if audit_logs:
            for log in audit_logs:
                c_name = log.get("compound_name", "Composto")
                c_cat = log.get("category", "Suplemento")
                action = log.get("action_type")
                old_val = log.get("old_value")
                new_val = log.get("new_value")
                created = str(log.get("created_at", ""))[:16]

                if action == "ADICIONADO":
                    lines.append(f"- [{created}] {c_name} ({c_cat}): ADICIONADO à pilha ({new_val})")
                elif action == "DOSE_ALTERADA":
                    lines.append(f"- [{created}] {c_name} ({c_cat}): DOSE ALTERADA — De '{old_val}' Para '{new_val}'")
                elif action == "HORARIO_ALTERADO":
                    lines.append(f"- [{created}] {c_name} ({c_cat}): HORÁRIO ALTERADO — De '{old_val}' Para '{new_val}'")
                elif action == "REMOVIDO":
                    lines.append(f"- [{created}] {c_name} ({c_cat}): REMOVIDO da pilha (Dose anterior: {old_val})")
                else:
                    lines.append(f"- [{created}] {c_name} ({c_cat}): {action} (De: {old_val} -> Para: {new_val})")
        else:
            lines.append("Nenhum registro no histórico de auditoria.")
    else:
        lines.append("\n=== HISTÓRICO AUDITÁVEL DE ALTERAÇÕES DE SUPLEMENTOS E HORMÔNIOS ===")
        lines.append("Omitido por privacy_mode=minimal; histórico completo permanece somente no SQLite local.")

    # 6. Conformidade Diária Blueprint (Score)
    lines.append("\n=== CONFORMIDADE DIÁRIA DO PROTOCOLO BLUEPRINT ===")
    if compliance_list:
        valid_scores = [c.get("compliance_score", 0) for c in compliance_list]
        avg_score = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 0
        lines.append(f"Média de Conformidade (Últimos {len(compliance_list)} dias): {avg_score}%")
        for c in compliance_list[:compliance_detail_limit]:
            lines.append(f"- Data: {c.get('date_ref')} | Score: {c.get('compliance_score')}% | Sono: {'OK' if c.get('sleep_schedule_ok') else 'X'} | Suplementos: {'OK' if c.get('supplements_ok') else 'X'} | Treino: {'OK' if c.get('exercise_ok') else 'X'} | Jejum: {'OK' if c.get('fasting_window_ok') else 'X'}")
    else:
        lines.append("Nenhum registro recente de conformidade diária.")

    # 7. Glicemia Contínua (CGM)
    lines.append("\n=== GLICEMIA CONTÍNUA (CGM) ===")
    if cgm_list:
        latest_cgm = cgm_list[0]
        lines.append(f"Glicemia Média 24h: {latest_cgm.get('mean_glucose')} mg/dL (Alvo: < 90 mg/dL)")
        lines.append(f"Time-in-Range (70-140 mg/dL): {latest_cgm.get('time_in_range_pct')}% (Alvo: > 95%)")
        lines.append(f"Variabilidade (CV %): {latest_cgm.get('cv_pct')}% (Alvo: < 15%)")
    else:
        lines.append("Sem leituras de sensor CGM registradas.")

    # 8. Experimentos N-of-1
    if experiments:
        lines.append("\n=== EXPERIMENTOS N-OF-1 ATIVOS ===")
        for exp in experiments[:1 if minimal_mode else 3]:
            lines.append(f"- Expresso: {exp.get('title')} | Métrica: {exp.get('metric_key')} | Status: {exp.get('status')}")

    return "\n".join(lines)
