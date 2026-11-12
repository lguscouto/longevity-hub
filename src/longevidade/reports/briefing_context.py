"""Seções descritivas compartilhadas pelo resumo para consulta e pelo PDF."""
from collections import Counter
from datetime import date, timedelta
import json
from math import isfinite
from statistics import mean

from longevidade.db.repository import LongevityRepository
from longevidade.reports.lab_selection import ClinicalLabSnapshot


METRICS = (
    ("steps", "Passos", "passos"),
    ("sleep_minutes", "Sono", "min"),
    ("rhr_bpm", "Frequência cardíaca em repouso", "bpm"),
    ("hrv_ms", "Variabilidade da frequência cardíaca", "ms"),
    ("weight_kg", "Peso", "kg"),
)
PHENOAGE_INPUTS = (
    ("glucose_mgdl", "Glicose", "mg/dL"), ("creatinine_mgdl", "Creatinina", "mg/dL"),
    ("albumin_gdl", "Albumina", "g/dL"), ("hscrp_mgl", "PCR-us", "mg/L"),
    ("lymphocyte_pct", "Linfócitos", "%"), ("mcv_fl", "VCM", "fL"),
    ("rdw_pct", "RDW", "%"), ("alk_phos_ul", "Fosfatase alcalina", "U/L"),
    ("wbc_1000ul", "Leucócitos", "mil/µL"),
)
ORIGINS = {"patient_lab": "laudo do paciente", "imported": "importado"}


def _date_label(value) -> str:
    try:
        return date.fromisoformat(str(value)[:10]).strftime("%d/%m/%Y")
    except ValueError:
        return "data indisponível"


def _text(value) -> str:
    return " ".join(str(value or "").split())


def _numeric(value) -> bool:
    return isinstance(value, (float, int)) and isfinite(value)


def _kdm_inputs(value) -> list[str]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except ValueError:
            value = value.split(",")
    return [_text(item) for item in value if isinstance(item, str) and item.strip()] if isinstance(value, list) else []


def _age_models(repo, phenoage) -> list[str]:
    lines = []
    if phenoage:
        lines.append(f"PhenoAge de {_date_label(phenoage['calculated_at'])}: {phenoage['pheno_age']} anos.")
        inputs = [f"{label}: {phenoage[key]:g} {unit}" for key, label, unit in PHENOAGE_INPUTS if _numeric(phenoage.get(key))]
        lines.append(f"Insumos registrados no PhenoAge: {', '.join(inputs) or 'indisponíveis'}.")
    kdm = repo.get_latest_kdm_record()
    if kdm and _numeric(kdm.get("kdm_age")):
        lines.append(f"KDM de {_date_label(kdm['calculated_at'])}: {kdm['kdm_age']:g} anos.")
        lines.append(f"Insumos registrados no KDM: {', '.join(_kdm_inputs(kdm.get('biomarkers_used'))) or 'indisponíveis'}.")
    return lines or ["Sem estimativas registradas."]


def _timeline(repo, start: str, end: str) -> list[str]:
    entries = []
    for intervention in repo.get_interventions():
        label = _text(intervention.get("name"))
        category = _text(intervention.get("category"))
        if category:
            label = f"{category}: {label}"
        dose = _text(intervention.get("dosage"))
        for key, action in (("start_date", "Início"), ("end_date", "Fim registrado")):
            day = str(intervention.get(key) or "")[:10]
            if start <= day <= end:
                entries.append((day, f"{action}: {label}" + (f" ({dose})" if dose else "")))
    for change in repo.get_supplement_audit_logs(limit=50):
        day = str(change.get("created_at") or "")[:10]
        if start <= day <= end:
            action = _text(change.get("action_type")).lower()
            details = " → ".join(filter(None, (_text(change.get("old_value")), _text(change.get("new_value")))))
            label = f"{_text(change.get('category'))}: {_text(change.get('compound_name'))} ({action})"
            entries.append((day, label + (f" — {details}" if details else "")))
    return [f"{_date_label(day)} — {label}" for day, label in sorted(entries, reverse=True)[:15]]


def _experiments(repo, start: str, end: str) -> list[str]:
    lines = []
    for experiment in repo.get_n_of_1_experiments():
        if experiment["treatment_start"] > end or experiment["treatment_end"] < start:
            continue
        p_value = experiment.get("p_value")
        evidence = f"p={p_value:g}. Confiança limitada para interpretação individual" if _numeric(p_value) else "Confiança indeterminada, sem estatística registrada"
        control = experiment.get("control_mean")
        treatment = experiment.get("treatment_mean")
        if _numeric(control) and _numeric(treatment):
            label = next((label for key, label, _ in METRICS if key == experiment["metric_key"]), experiment["metric_key"])
            evidence = f"{label}: média {control:g} no controle e {treatment:g} na intervenção. {evidence}"
        lines.append(f"{_text(experiment['title'])} ({_date_label(experiment['treatment_start'])} a {_date_label(experiment['treatment_end'])}). {evidence}.")
        if len(lines) == 5:
            break
    return lines


def briefing_context(
    repo: LongevityRepository, rows: list[dict], labs: ClinicalLabSnapshot, today: date,
    questions: list[str] | None = None,
    selected_event_ids: list[str] | None = None,
) -> list[tuple[str, list[str]]]:
    start = (today - timedelta(days=89)).isoformat()
    end = today.isoformat()
    sources = sorted({_text(row.get("source")) for row in rows} - {""})
    lab_origins = sorted({ORIGINS.get(lab.get("record_origin"), "origem não detalhada") for lab in labs.latest_labs.values()})
    sections = [("Cobertura e origem dos dados", [
        f"{len(rows)}/90 dias com registro diário ({_date_label(start)} a {_date_label(end)}).",
        f"Fontes registradas nas linhas diárias: {', '.join(sources) or 'indisponíveis'}. Uma linha pode reunir medições de fontes diferentes.",
        f"{len(labs.latest_labs)} marcadores laboratoriais elegíveis. Origem: {', '.join(lab_origins) or 'indisponível'}.",
    ])]
    trends = []
    for key, label, unit in METRICS:
        windows = []
        for days in (7, 30, 90):
            first = (today - timedelta(days=days - 1)).isoformat()
            values = [row[key] for row in rows if row["date_ref"] >= first and _numeric(row.get(key))]
            summary = f"média {mean(values):.1f} {unit} ({len(values)}/{days} dias)" if values else "sem medições"
            if len(values) > 1:
                summary += f", primeira à última medição {values[-1] - values[0]:+.1f} {unit}"
            windows.append(f"{days} dias: {summary}")
        trends.append(f"{label} — {' | '.join(windows)}.")
    sections.append(("Tendências em 7, 30 e 90 dias", trends))
    sections.append(("Estimativas de idade biológica", _age_models(repo, labs.latest_phenoage)))

    checkins = [row for row in repo.list_daily_checkins() if start <= row["date_ref"] <= end]
    symptoms = sum(1 for row in checkins if (row.get("symptom_severity") or 0) > 0)
    tags = Counter(tag for row in checkins for tag in row["tags"] if isinstance(tag, str) and tag.strip())
    checkin_lines = [f"{len(checkins)} dias com check-in; {symptoms} com intensidade de sintomas acima de zero."] if checkins else ["Sem check-ins no período."]
    if tags:
        checkin_lines.append("Marcadores mais registrados: " + ", ".join(f"{_text(tag)} ({count})" for tag, count in tags.most_common(5)) + ".")
    sections.append(("Sintomas e check-ins", checkin_lines))
    if selected_event_ids is None:
        timeline = _timeline(repo, start, end)
    elif not selected_event_ids:
        timeline = []
    else:
        placeholders = ','.join('?' for _ in selected_event_ids)
        with repo._get_connection() as conn:
            events = conn.execute(f'SELECT date_ref, title, description, source FROM health_events WHERE id IN ({placeholders}) ORDER BY date_ref DESC, id', selected_event_ids).fetchall()
        timeline = [f"{_date_label(row['date_ref'])} — {_text(row['title'])} ({_text(row['source']) or 'origem indisponível'})" + (f" — {_text(row['description'])}" if row['description'] else '') for row in events]
    sections.append(("Eventos selecionados" if selected_event_ids is not None else "Linha do tempo de intervenções",
                     timeline or (["Nenhum evento selecionado."] if selected_event_ids is not None else ["Sem mudanças registradas no período."])))
    experiments = _experiments(repo, start, end)
    sections.append(("Experimentos N-of-1", experiments or ["Sem experimentos registrados no período."]))
    if questions := [_text(question) for question in (questions or []) if _text(question)]:
        sections.append(("Perguntas para a consulta", questions))
    return sections
