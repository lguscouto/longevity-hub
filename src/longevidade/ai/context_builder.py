"""
Construtor de Contexto Clínico do Paciente para o Módulo de IA.
Agrega dados do SQLite (Perfil, PhenoAge, KDM Age, Wearables, Exames, Razões Cardiovasculares, Suplementos, Hormônios, Audit Logs, Compliance, CGM).
"""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Any, Dict

from longevidade.db.repository import LongevityRepository
from longevidade.calculators.kdm_age import (
    build_kdm_history_rows,
    calculate_kdm_biological_age,
    latest_kdm_biomarker_values,
)
from longevidade.calculators.cardio_ratios import calculate_cardiovascular_ratios
from longevidade.algorithms.daily_guidance import generate_daily_guidance
from longevidade.calculators.energy_and_stress import calculate_energy_bank
from longevidade.lab_provenance import CLINICALLY_ELIGIBLE_LAB_ORIGINS
from longevidade.ai.safety_policy import resolve_today_metric_with_rhr_fallback


def build_patient_clinical_context(
    db_path: str | Path,
    privacy_mode: str = "minimal",
    time_window: str = "30d",
) -> str:
    """Busca o estado clínico no SQLite e formata contexto para IA.

    `privacy_mode="minimal"` é o padrão seguro: remove identificadores diretos
    e reduz janelas detalhadas antes de enviar dados a provedores externos.
    `privacy_mode="full"` mantém o contexto histórico amplo para uso local/opt-in.
    `time_window` define o horizonte analítico prioritário ("today", "7d", "30d").
    """
    normalized_privacy_mode = "full" if privacy_mode == "full" else "minimal"
    minimal_mode = normalized_privacy_mode == "minimal"
    norm_window = time_window if time_window in ("today", "7d", "30d") else "30d"

    if norm_window == "today":
        detail_daily_limit = 2
    elif norm_window == "7d":
        detail_daily_limit = 7
    else:
        detail_daily_limit = 3 if minimal_mode else 14

    compliance_detail_limit = 3 if minimal_mode else 7
    include_audit_history = not minimal_mode

    repo = LongevityRepository(db_path)

    profile = repo.get_user_profile()
    daily_list = repo.get_daily_metrics(days=30)
    labs_map = repo.get_latest_labs_by_key(
        record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
    )
    pheno_history = repo.get_phenoage_history(
        limit=5,
        record_origins=CLINICALLY_ELIGIBLE_LAB_ORIGINS,
    )
    cgm_list = repo.get_cgm_summaries(limit=14)
    experiments = repo.get_n_of_1_experiments()
    supplements = repo.get_supplements(only_active=True)
    compliance_list = repo.get_daily_compliance_history(days=14)
    audit_logs = repo.get_supplement_audit_logs(limit=25)

    today_str = date.today().isoformat()
    today_metric = repo.get_daily_metric_by_date(today_str)
    all_60_metrics = repo.get_daily_metrics(days=60)
    history_metrics = [m for m in all_60_metrics if m.get("date_ref") and m["date_ref"] < today_str]
    resolved_today, rhr_projected = resolve_today_metric_with_rhr_fallback(today_metric, history_metrics)
    guidance_res = generate_daily_guidance(resolved_today, history_metrics)
    energy_res = calculate_energy_bank(resolved_today)

    # 1. Perfil Básico
    lines = ["=== PERFIL DO PACIENTE ==="]
    lines.append(f"Modo de privacidade aplicado: {normalized_privacy_mode}")
    chrono_val = profile.get('chronological_age')
    chrono_str = f"{chrono_val} anos" if chrono_val is not None else "Não informada"
    if minimal_mode:
        lines.append("Identificadores diretos removidos: nome, e-mail e data de nascimento não foram enviados ao provedor externo.")
        lines.append(f"Idade Cronológica: {chrono_str}")
    else:
        lines.append(f"Nome: {profile.get('name', 'Paciente')}")
        bdate_val = profile.get('birthdate') or 'N/A'
        lines.append(f"Idade Cronológica: {chrono_str} (Nascimento: {bdate_val})")

    height_val = profile.get('height_cm')
    height_str = f"{height_val} cm" if height_val is not None else "Sem dados"
    curr_weight = profile.get('current_weight_kg')
    curr_weight_str = f"{curr_weight} kg" if curr_weight is not None else "Sem dados"
    target_weight = profile.get('target_weight_kg')
    target_weight_str = f"{target_weight} kg" if target_weight is not None else "Sem meta"
    lines.append(f"Altura: {height_str} | Peso Atual: {curr_weight_str} | Meta: {target_weight_str}")
    if profile.get('bmi'):
        lines.append(f"IMC: {profile.get('bmi')} kg/m²")

    # 1.1 Algoritmos Determinísticos & Trava de Segurança (Hoje)
    lines.append("\n=== ALGORITMOS DETERMINÍSTICOS E TRAVAS DE SEGURANÇA (HOJE) ===")
    if rhr_projected and resolved_today and resolved_today.get("rhr_bpm") is not None:
        lines.append(f"- Observação de RHR: O RHR de hoje ({resolved_today['rhr_bpm']:.0f} bpm) é uma projeção do dia anterior (D-1) enquanto aguarda consolidação do wearable.")
    lines.append(f"- Orientação Diária (Daily Guidance): estado='{guidance_res.get('state')}', score={guidance_res.get('score')}, confiança='{guidance_res.get('confidence')}'")
    lines.append(f"  Ação Recomendada: {guidance_res.get('primary_action')}")
    if guidance_res.get("limitations"):
        lines.append(f"  Limitações/Guardrails: {'; '.join(guidance_res['limitations'])}")

    lines.append(f"- Bateria Corporal (Energy Bank): nível={energy_res.get('current_level')}%, status='{energy_res.get('status')}', recarga={energy_res.get('recharge')}, consumo={energy_res.get('drain')}")
    lines.append(f"  Recomendação: {energy_res.get('recommendation')}")
    if energy_res.get("missing_components"):
        lines.append(f"  Componentes Ausentes: {', '.join(energy_res['missing_components'])}")

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
    elif rhr_projected and resolved_today and resolved_today.get("rhr_bpm"):
        kdm_input["rhr_bpm"] = float(resolved_today["rhr_bpm"])

    chrono_age_val = profile.get("chronological_age")
    if chrono_age_val is not None:
        kdm_res = calculate_kdm_biological_age(chrono_age_val, kdm_input)
    else:
        kdm_res = {
            "status": "incomplete",
            "reason": "Idade cronológica não definida no perfil",
            "biomarkers_count": 0,
            "missing_biomarkers": ["chronological_age"],
        }
    if kdm_res.get("status") == "complete":
        delta = kdm_res.get("kdm_delta") or 0
        lines.append(f"- Klemera-Doubal (KDM) Age: {kdm_res.get('kdm_age')} anos (Delta: {'+' if delta > 0 else ''}{delta} anos) | Biomarcadores usados: {kdm_res.get('biomarkers_count', 0)}")
    else:
        missing = kdm_res.get('missing_biomarkers') or []
        missing_text = ", ".join(missing[:6]) if missing else "indisponível"
        lines.append(f"- Klemera-Doubal (KDM) Age: indisponível ({kdm_res.get('reason', 'dados insuficientes')}) | Biomarcadores presentes: {kdm_res.get('biomarkers_count', 0)} | Faltando: {missing_text}")

    # 3. Métricas Médias de Wearables (Janela Analítica: {norm_window.upper()})
    lines.append(f"\n=== RESUMO DE WEARABLES (JANELA ANALÍTICA: {norm_window.upper()}) ===")
    if daily_list:
        valid_steps = [m['steps'] for m in daily_list if m.get('steps')]
        valid_hrv = [m['hrv_ms'] for m in daily_list if m.get('hrv_ms')]
        valid_rhr = [m['rhr_bpm'] for m in daily_list if m.get('rhr_bpm')]
        valid_sleep = [m['sleep_minutes'] for m in daily_list if m.get('sleep_minutes')]
        valid_bp = [(m['systolic_bp'], m['diastolic_bp']) for m in daily_list if m.get('systolic_bp') and m.get('diastolic_bp')]
        valid_spo2 = [m['spo2_avg_pct'] for m in daily_list if m.get('spo2_avg_pct')]
        valid_resp = [m['respiratory_rate_rpm'] for m in daily_list if m.get('respiratory_rate_rpm')]
        valid_pai = [m['pai_score'] for m in daily_list if m.get('pai_score')]
        valid_load = [m['training_load_daily'] for m in daily_list if m.get('training_load_daily')]
        valid_rolling_load = [m['training_load_rolling'] for m in daily_list if m.get('training_load_rolling')]

        avg_steps = round(sum(valid_steps) / len(valid_steps)) if valid_steps else "Sem dados"
        avg_hrv = round(sum(valid_hrv) / len(valid_hrv), 1) if valid_hrv else "Sem dados"
        avg_rhr = round(sum(valid_rhr) / len(valid_rhr), 1) if valid_rhr else "Sem dados"
        avg_sleep_h = round(sum(valid_sleep) / len(valid_sleep) / 60, 1) if valid_sleep else "Sem dados"
        avg_spo2 = f"{round(sum(valid_spo2) / len(valid_spo2), 1)}%" if valid_spo2 else "Sem dados"
        avg_resp = f"{round(sum(valid_resp) / len(valid_resp), 1)} rpm" if valid_resp else "Sem dados"
        latest_pai = round(valid_pai[0], 1) if valid_pai else "Sem dados"

        # Médias do microciclo semanal (7 dias) vs baseline de 30 dias
        daily_7 = daily_list[:7]
        v_steps_7 = [m['steps'] for m in daily_7 if m.get('steps')]
        v_hrv_7 = [m['hrv_ms'] for m in daily_7 if m.get('hrv_ms')]
        v_rhr_7 = [m['rhr_bpm'] for m in daily_7 if m.get('rhr_bpm')]
        v_sleep_7 = [m['sleep_minutes'] for m in daily_7 if m.get('sleep_minutes')]
        v_load_7 = [m['training_load_daily'] for m in daily_7 if m.get('training_load_daily')]

        avg_steps_7 = round(sum(v_steps_7) / len(v_steps_7)) if v_steps_7 else None
        avg_hrv_7 = round(sum(v_hrv_7) / len(v_hrv_7), 1) if v_hrv_7 else None
        avg_rhr_7 = round(sum(v_rhr_7) / len(v_rhr_7), 1) if v_rhr_7 else None
        avg_sleep_7_h = round(sum(v_sleep_7) / len(v_sleep_7) / 60, 1) if v_sleep_7 else None
        avg_load_7 = round(sum(v_load_7) / len(v_load_7), 1) if v_load_7 else None

        if norm_window == "7d":
            lines.append("--- MÉDIAS DO MICROCICLO SEMANAL (7 DIAS) VS LINHA DE BASE (30 DIAS) ---")
            if avg_hrv_7 is not None and isinstance(avg_hrv, (int, float)):
                d_hrv = round(avg_hrv_7 - avg_hrv, 1)
                lines.append(f"HRV Noturna Média (7d): {avg_hrv_7} ms (Linha de base 30d: {avg_hrv} ms | Delta: {'+' if d_hrv > 0 else ''}{d_hrv} ms)")
            elif avg_hrv_7 is not None:
                lines.append(f"HRV Noturna Média (7d): {avg_hrv_7} ms")

            if avg_rhr_7 is not None and isinstance(avg_rhr, (int, float)):
                d_rhr = round(avg_rhr_7 - avg_rhr, 1)
                lines.append(f"Frequência Cardíaca de Repouso (7d): {avg_rhr_7} bpm (Linha de base 30d: {avg_rhr} bpm | Delta: {'+' if d_rhr > 0 else ''}{d_rhr} bpm)")
            elif avg_rhr_7 is not None:
                lines.append(f"Frequência Cardíaca de Repouso (7d): {avg_rhr_7} bpm")

            if avg_sleep_7_h is not None and isinstance(avg_sleep_h, (int, float)):
                d_slp = round(avg_sleep_7_h - avg_sleep_h, 1)
                lines.append(f"Sono Médio (7d): {avg_sleep_7_h} h/noite (Linha de base 30d: {avg_sleep_h} h/noite | Delta: {'+' if d_slp > 0 else ''}{d_slp} h)")
            elif avg_sleep_7_h is not None:
                lines.append(f"Sono Médio (7d): {avg_sleep_7_h} h/noite")

            if avg_steps_7 is not None:
                lines.append(f"Passos Médios (7d): {avg_steps_7} passos/dia (Linha de base 30d: {avg_steps})")

            if avg_load_7 is not None:
                lines.append(f"Carga de Treino Média (7d - Carga Aguda): {avg_load_7}")
        else:
            lines.append(f"Passos Médios: {avg_steps} passos/dia")
            lines.append(f"HRV Noturna Média: {avg_hrv} ms")
            lines.append(f"Frequência Cardíaca de Repouso (RHR): {avg_rhr} bpm")
            lines.append(f"Sono Médio: {avg_sleep_h} horas/noite")

        lines.append(f"SpO2 Oxigenação Média: {avg_spo2}")
        lines.append(f"Frequência Respiratória Média: {avg_resp}")
        lines.append(f"PAI Score Recente: {latest_pai}")

        if valid_load and norm_window != "7d":
            avg_ld = round(sum(valid_load) / len(valid_load), 1)
            recent_ld = round(valid_load[0], 1)
            roll_ld = round(valid_rolling_load[0], 1) if valid_rolling_load else "Sem dados"
            lines.append(f"Carga de Treino: Aguda recente={recent_ld} | Média 30d={avg_ld} | Crônica (Rolling)={roll_ld}")

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
            tl_part = f" | Carga: {round(m['training_load_daily'], 1)}" if m.get("training_load_daily") is not None else ""

            deep = m.get("sleep_deep_min") or "-"
            rem = m.get("sleep_rem_min") or "-"
            light = m.get("sleep_light_min") or "-"

            lines.append(
                f"- Data: {d_ref} | Sono Total: {slp_str} (Profundo: {deep}m, REM: {rem}m, Leve: {light}m) | "
                f"HRV: {hrv} ms | RHR: {rhr} bpm | SpO2: {spo2} | Passos: {st} | PA: {bp_str}{tl_part}"
            )
    else:
        lines.append("Nenhuma métrica diária sincronizada recente.")

    # 3.1 Síntese de Treinos Recentes
    workout_limit = 3 if minimal_mode else 10
    try:
        recent_workouts = repo.get_workouts(limit=workout_limit)
    except Exception:
        recent_workouts = []

    if recent_workouts:
        lines.append(f"\n=== HISTÓRICO DE TREINOS RECENTES (ÚLTIMOS {workout_limit} REGISTROS) ===")
        for w in recent_workouts:
            w_date = w.get("workout_date") or "N/A"
            w_title = w.get("title")
            w_act = w.get("activity_type")
            if w_title and w_act and w_title != w_act:
                w_name = f"{w_title} - {w_act}"
            else:
                w_name = w_title or w_act or "Treino"
            details = []
            if w.get("duration_min"):
                details.append(f"{round(w['duration_min'])}m")
            if w.get("calories"):
                details.append(f"{round(w['calories'])} kcal")
            if w.get("volume_kg") and w["volume_kg"] > 0:
                vol_str = f"Volume: {round(w['volume_kg'])} kg"
                if w.get("sets_count"):
                    vol_str += f" ({w['sets_count']} séries"
                    if w.get("reps_count"):
                        vol_str += f", {w['reps_count']} reps"
                    vol_str += ")"
                details.append(vol_str)
            if w.get("avg_hr"):
                details.append(f"FC Média: {round(w['avg_hr'])} bpm")
            src = w.get("source") or "App"
            details.append(f"Origem: {src}")
            lines.append(f"- Data: {w_date} | {w_name} ({' • '.join(details)})")

    # 3.2 Linha do Tempo & Eventos de Contexto (Health Events)
    event_limit = 3 if minimal_mode else 12
    timeline_events = []
    try:
        with repo._get_connection() as conn:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='health_events';"
            )
            if cur.fetchone():
                cur = conn.execute(
                    """
                    SELECT date_ref, time_ref, category, event_type, title, description, significance, source
                    FROM health_events
                    ORDER BY date_ref DESC, time_ref DESC
                    LIMIT ?;
                    """,
                    (event_limit,),
                )
                timeline_events = [dict(row) for row in cur.fetchall()]
    except Exception:
        timeline_events = []

    lines.append(f"\n=== EVENTOS DE CONTEXTO E LINHA DO TEMPO (ÚLTIMOS {event_limit} EVENTOS) ===")
    if timeline_events:
        for ev in timeline_events:
            d = ev.get("date_ref") or "N/A"
            cat = ev.get("category") or "evento"
            tit = ev.get("title") or "Evento"
            sig = ev.get("significance") or "normal"
            if minimal_mode:
                lines.append(f"- Data: {d} | [{cat.upper()}] {tit} (Significância: {sig})")
            else:
                desc = f": {ev['description']}" if ev.get("description") else ""
                lines.append(f"- Data: {d} | [{cat.upper()}] {tit}{desc} (Significância: {sig})")
    else:
        lines.append("Nenhum evento registrado na Linha do Tempo recente.")

    # 3.3 Padrões Fisiológicos Pessoais Aprendidos (Bayesian Engine)
    learned_associations = []
    try:
        from longevidade.context.personal_associations import load_personal_associations

        with repo._get_connection() as conn:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='personal_associations';"
            )
            if cur.fetchone():
                learned_associations = load_personal_associations(
                    conn, min_confidence="moderate", min_samples=3
                )
    except Exception:
        learned_associations = []

    lines.append("\n=== PADRÕES PESSOAIS E ASSOCIAÇÕES APRENDIDAS (HISTÓRICO DO PACIENTE) ===")
    if learned_associations:
        for a in learned_associations[:3 if minimal_mode else 7]:
            lines.append(f"- [{a.confidence.upper()}] {a.evidence_text} [Amostras: n={a.sample_size}]")
    else:
        lines.append("Nenhum padrão pessoal com confiança moderada/alta consolidado até o momento.")

    # 3.4 Quebras de Patamar Detectadas (Change Points)
    change_points = []
    try:
        from longevidade.context.change_detection import load_change_points

        with repo._get_connection() as conn:
            cur = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='metric_change_points';"
            )
            if cur.fetchone():
                change_points = load_change_points(conn, limit=5)
    except Exception:
        change_points = []

    if change_points:
        lines.append("\n=== QUEBRAS ESTRUTURAIS DE PATAMAR DETECTADAS (CHANGE POINTS) ===")
        for cp in change_points:
            lines.append(
                f"- Data: {cp.date_ref} | Métrica: {cp.metric} | {cp.headline} "
                f"(Delta: {cp.delta_percent:+.1f}%, Persistência: {cp.persisted_days} dias)"
            )

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

    # 6. Conformidade Diária Longevidade Hub (Score)
    lines.append("\n=== CONFORMIDADE DIÁRIA DO PROTOCOLO LONGEVIDADE HUB ===")
    if compliance_list:
        valid_scores = [c.get("compliance_score", 0) for c in compliance_list]
        avg_score = round(sum(valid_scores) / len(valid_scores), 1) if valid_scores else 0
        lines.append(f"Média de Conformidade (Últimos {len(compliance_list)} dias): {avg_score}%")
        for c in compliance_list[:compliance_detail_limit]:
            lines.append(f"- Data: {c.get('date_ref')} | Score: {c.get('compliance_score')}% | Sono: {'OK' if c.get('sleep_schedule_ok') else 'X'} | Suplementos: {'OK' if c.get('supplements_ok') else 'X'} | Treino: {'OK' if c.get('exercise_ok') else 'X'} | Jejum: {'OK' if c.get('fasting_window_ok') else 'X'}")
    else:
        lines.append("Nenhum registro recente de conformidade diária.")

    # 6.1 Avaliações Físicas Recentes (Composição Corporal)
    try:
        assessments = repo.list_physical_assessments(limit=2)
    except Exception:
        assessments = []

    if assessments:
        lines.append("\n=== AVALIAÇÕES FÍSICAS RECENTES (COMPOSIÇÃO CORPORAL) ===")
        for pa in assessments:
            d_pa = pa.get("assessment_date") or "N/A"
            parts = []
            if pa.get("weight_kg"):
                parts.append(f"Peso: {pa['weight_kg']} kg")
            if pa.get("body_fat_percentage"):
                parts.append(f"Gordura: {pa['body_fat_percentage']}%")
            if pa.get("waist_cm"):
                parts.append(f"Cintura: {pa['waist_cm']} cm")
            if pa.get("abdomen_cm"):
                parts.append(f"Abdômen: {pa['abdomen_cm']} cm")
            lines.append(f"- Data: {d_pa} | {' | '.join(parts)}")

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
            if not minimal_mode and exp.get("intervention_name"):
                lines.append(f"  Intervenção testada: {exp.get('intervention_name')} (Monitorar balanço de covariáveis)")

    return "\n".join(lines)
