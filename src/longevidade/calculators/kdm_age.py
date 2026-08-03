"""
Calculadora de Idade Biológica pelo Método Klemera-Doubal (KDM Biological Age).

Esta implementação é uma porta fiel do núcleo do BioAge `kdm_calc.R`:
- treina `biomarcador ~ idade` para cada biomarcador histórico;
- deriva q, k, s, r, rchar, s_r e s_ba2;
- projeta a idade biológica com o termo cronológico de ancoragem;
- retorna resultado incompleto quando faltam >2 biomarcadores ou quando o histórico
  não permite um ajuste estável.
"""

from __future__ import annotations

import math
from datetime import date, datetime
from typing import Any, Iterable, Mapping, Sequence

SECONDS_PER_YEAR = 365.2425
MAX_KDM_MISSING_BIOMARKERS = 2
MIN_FIT_OBSERVATIONS_PER_BIOMARKER = 3
MIN_FIT_ROWS = 3
MIN_FIT_BIOMARKERS = 7
MIN_AGE_RANGE_YEARS = 0.5

KDM_BIOMARKERS = (
    "glucose_mgdl",
    "creatinine_mgdl",
    "albumin_gdl",
    "hscrp_mgl",
    "rdw_pct",
    "alk_phos_ul",
    "wbc_1000ul",
    "rhr_bpm",
    "systolic_bp",
)

KDM_BIOMARKER_ALIASES: dict[str, tuple[str, ...]] = {
    "glucose_mgdl": ("glucose_mgdl", "fasting_glucose", "glucose", "glicose"),
    "creatinine_mgdl": ("creatinine_mgdl", "creatinine", "creatinina"),
    "albumin_gdl": ("albumin_gdl", "albumin", "albumina"),
    "hscrp_mgl": ("hscrp_mgl", "hscrp", "hs_crp", "crp", "pcr_us", "pcr-us"),
    "rdw_pct": ("rdw_pct", "rdw"),
    "alk_phos_ul": ("alk_phos_ul", "alk_phos", "alp", "fosfatase_alcalina"),
    "wbc_1000ul": ("wbc_1000ul", "wbc", "leukocytes", "leucocitos"),
    "rhr_bpm": ("rhr_bpm", "rhr", "resting_hr", "resting_heart_rate"),
    "systolic_bp": ("systolic_bp", "sbp", "pa_sistolica"),
}

_ALIAS_TO_CANONICAL = {
    alias: canonical
    for canonical, aliases in KDM_BIOMARKER_ALIASES.items()
    for alias in aliases
}


def _normalize_key(key: Any) -> str:
    return str(key or "").strip().lower().replace(" ", "_").replace("-", "_")


def canonical_kdm_biomarker(key: Any) -> str | None:
    """Mapeia chaves de exames/métricas para o nome canônico usado pelo KDM."""
    normalized = _normalize_key(key)
    return _ALIAS_TO_CANONICAL.get(normalized)


def _finite_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, Mapping) and "value" in value:
        value = value.get("value")
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(numeric):
        return None
    return numeric


def normalize_kdm_biomarkers(data: Mapping[str, Any] | None) -> dict[str, float]:
    """Normaliza um payload arbitrário para biomarcadores canônicos KDM."""
    values: dict[str, float] = {}
    if not data:
        return values

    for raw_key, raw_value in data.items():
        if raw_key in {"age", "chronological_age", "observation_date", "collected_at", "date_ref"}:
            continue
        canonical = canonical_kdm_biomarker(raw_key)
        if canonical is None:
            continue
        numeric = _finite_float(raw_value)
        if numeric is not None:
            values[canonical] = numeric
    return values


def _age_from_row(row: Mapping[str, Any]) -> float | None:
    for key in ("age", "chronological_age"):
        age = _finite_float(row.get(key))
        if age is not None:
            return age
    return None


def _normalize_history_rows(history_rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for row in history_rows:
        age = _age_from_row(row)
        if age is None:
            continue
        normalized: dict[str, Any] = {"age": age}
        if row.get("observation_date"):
            normalized["observation_date"] = row.get("observation_date")
        normalized.update(normalize_kdm_biomarkers(row))
        if any(marker in normalized for marker in KDM_BIOMARKERS):
            rows.append(normalized)
    return rows


def _linear_regression(y_values: Sequence[float], x_values: Sequence[float]) -> dict[str, float] | None:
    """Regressão linear simples y ~ x, usando sigma de resíduos como no R lm()."""
    n = len(y_values)
    if n < MIN_FIT_OBSERVATIONS_PER_BIOMARKER:
        return None

    mean_x = sum(x_values) / n
    mean_y = sum(y_values) / n
    ss_x = sum((x - mean_x) ** 2 for x in x_values)
    ss_y = sum((y - mean_y) ** 2 for y in y_values)
    if ss_x <= 0 or ss_y <= 0:
        return None

    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_values, y_values))
    k = cov_xy / ss_x
    q = mean_y - k * mean_x
    residual_sum_squares = sum((y - (q + k * x)) ** 2 for x, y in zip(x_values, y_values))
    dof = n - 2
    if dof <= 0:
        return None
    residual_variance = residual_sum_squares / dof
    s = math.sqrt(residual_variance) if residual_variance > 0 else 1e-6
    if not math.isfinite(s) or k == 0:
        return None

    r = (cov_xy**2) / (ss_x * ss_y)
    return {"q": q, "k": k, "s": s, "r": max(0.0, min(1.0, r))}


def _incomplete_result(
    chronological_age: float,
    reason: str,
    *,
    biomarkers_used: Sequence[str] | None = None,
    missing_biomarkers: Sequence[str] | None = None,
    fit: Mapping[str, Any] | None = None,
    details: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    fit_biomarkers = list(fit.get("biomarkers", [])) if fit else []
    result: dict[str, Any] = {
        "status": "incomplete",
        "reason": reason,
        "kdm_age": None,
        "chronological_age": round(float(chronological_age), 2),
        "kdm_delta": None,
        "biomarkers_count": len(biomarkers_used or []),
        "biomarkers_used": list(biomarkers_used or []),
        "missing_biomarkers": list(missing_biomarkers or []),
        "missing_biomarker_count": len(missing_biomarkers or []),
        "fit_biomarkers": fit_biomarkers,
        "fit_biomarkers_count": len(fit_biomarkers),
        "fit_observations": int(fit.get("nobs", 0)) if fit else 0,
    }
    if fit and fit.get("age_range"):
        result["fit_age_range"] = [round(float(x), 2) for x in fit["age_range"]]
    if details:
        result.update(details)
    return result


def build_kdm_fit(
    historical_data: Sequence[Mapping[str, Any]],
    *,
    biomarkers: Sequence[str] = KDM_BIOMARKERS,
    s_ba2: float | None = None,
) -> dict[str, Any]:
    """Treina os parâmetros KDM a partir de dados históricos no formato BioAge.

    Cada linha deve conter `age` (ou `chronological_age`) e um subconjunto dos biomarcadores.
    O ajuste segue `biomarker ~ age`, exatamente como `kdm_calc.R`.
    """
    rows = _normalize_history_rows(historical_data)
    if len(rows) < MIN_FIT_ROWS:
        return {"status": "incomplete", "reason": "insufficient_historical_data", "rows": len(rows)}

    ages = [float(row["age"]) for row in rows]
    age_min, age_max = min(ages), max(ages)
    age_span = age_max - age_min
    if age_span < MIN_AGE_RANGE_YEARS:
        return {
            "status": "incomplete",
            "reason": "insufficient_age_range",
            "rows": len(rows),
            "age_range": [age_min, age_max],
        }

    age_models: list[dict[str, float | str]] = []
    skipped: dict[str, str] = {}
    for marker in biomarkers:
        pairs = [
            (float(row["age"]), float(row[marker]))
            for row in rows
            if _finite_float(row.get(marker)) is not None
        ]
        if len(pairs) < MIN_FIT_OBSERVATIONS_PER_BIOMARKER:
            skipped[marker] = "insufficient_observations"
            continue

        x_age = [age for age, _value in pairs]
        y_marker = [value for _age, value in pairs]
        regression = _linear_regression(y_marker, x_age)
        if regression is None:
            skipped[marker] = "unstable_regression"
            continue

        k = regression["k"]
        s = regression["s"]
        r = regression["r"]
        model: dict[str, float | str] = {
            "bm": marker,
            "q": regression["q"],
            "k": k,
            "s": s,
            "r": r,
            "r1": abs((k / s) * math.sqrt(r)),
            "r2": abs(k / s),
            "n2": (k / s) ** 2,
            "nobs": len(pairs),
        }
        age_models.append(model)

    if len(age_models) < MIN_FIT_BIOMARKERS:
        return {
            "status": "incomplete",
            "reason": "insufficient_fit_biomarkers",
            "rows": len(rows),
            "fit_biomarkers_count": len(age_models),
            "skipped_biomarkers": skipped,
        }

    sum_r2 = sum(float(model["r2"]) for model in age_models)
    if sum_r2 <= 0:
        return {"status": "incomplete", "reason": "unstable_rchar", "rows": len(rows)}
    rchar = sum(float(model["r1"]) for model in age_models) / sum_r2
    if rchar <= 0 or not math.isfinite(rchar):
        return {"status": "incomplete", "reason": "unstable_rchar", "rows": len(rows)}

    s_r = ((1 - (rchar**2)) / (rchar**2)) * ((age_span**2) / (12 * len(age_models)))
    bae_d = sum(float(model["n2"]) for model in age_models)
    if bae_d <= 0:
        return {"status": "incomplete", "reason": "unstable_biomarker_weights", "rows": len(rows)}

    ba_ca_values: list[float] = []
    for row in rows:
        obs_count = 0
        bae_n = 0.0
        for model in age_models:
            marker = str(model["bm"])
            value = _finite_float(row.get(marker))
            if value is None:
                continue
            obs_count += 1
            q = float(model["q"])
            k = float(model["k"])
            s = float(model["s"])
            bae_n += (value - q) * (k / (s**2))
        if obs_count == 0:
            continue
        ba_eo = bae_n / bae_d
        ba_e = (ba_eo / obs_count) * len(age_models)
        ba_ca_values.append(ba_e - float(row["age"]))

    if len(ba_ca_values) < MIN_FIT_ROWS:
        return {"status": "incomplete", "reason": "insufficient_fit_observations", "rows": len(rows)}

    mean_ba_ca = sum(ba_ca_values) / len(ba_ca_values)
    s2 = sum((value - mean_ba_ca) ** 2 for value in ba_ca_values) / len(ba_ca_values)
    calculated_s_ba2 = s_ba2 if s_ba2 is not None else s2 - s_r
    if calculated_s_ba2 is None or calculated_s_ba2 <= 0 or not math.isfinite(calculated_s_ba2):
        return {
            "status": "incomplete",
            "reason": "unstable_s_ba2",
            "rows": len(rows),
            "s2": s2,
            "s_r": s_r,
        }

    fit = {
        "status": "complete",
        "lm_age": age_models,
        "biomarkers": [str(model["bm"]) for model in age_models],
        "s_r": s_r,
        "s_ba2": calculated_s_ba2,
        "s2": s2,
        "nobs": len(ba_ca_values),
        "rows": len(rows),
        "age_range": [age_min, age_max],
        "rchar": rchar,
        "skipped_biomarkers": skipped,
    }
    return {"status": "complete", "fit": fit}


def _models_from_fit(fit: Mapping[str, Any]) -> list[Mapping[str, Any]]:
    models = fit.get("lm_age") or []
    if isinstance(models, Mapping):
        return [dict(model, bm=marker) for marker, model in models.items()]
    return list(models)


def calculate_kdm_biological_age(
    chronological_age: float,
    lab_and_metric_data: Mapping[str, Any],
    *,
    historical_data: Sequence[Mapping[str, Any]] | None = None,
    fit: Mapping[str, Any] | None = None,
    s_ba2: float | None = None,
) -> dict[str, Any]:
    """Calcula KDM Biological Age com a fórmula BioAge `kdm_calc`.

    Sem `fit` ou `historical_data`, a função retorna incompleto em vez de usar parâmetros
    arbitrários. Isso impede valores fabricados por offset constante ou por coeficientes locais
    sem evidência de treinamento.
    """
    age = _finite_float(chronological_age) or 40.0
    current_values = normalize_kdm_biomarkers(lab_and_metric_data)

    if fit is None:
        if historical_data is None:
            expected_missing = [marker for marker in KDM_BIOMARKERS if marker not in current_values]
            return _incomplete_result(
                age,
                "historical_fit_unavailable",
                biomarkers_used=list(current_values.keys()),
                missing_biomarkers=expected_missing,
            )
        fit_result = build_kdm_fit(historical_data, s_ba2=s_ba2)
        if fit_result.get("status") != "complete":
            expected_missing = [marker for marker in KDM_BIOMARKERS if marker not in current_values]
            return _incomplete_result(
                age,
                str(fit_result.get("reason", "insufficient_historical_data")),
                biomarkers_used=list(current_values.keys()),
                missing_biomarkers=expected_missing,
                details={k: v for k, v in fit_result.items() if k not in {"status", "fit"}},
            )
        fit = fit_result["fit"]

    models = _models_from_fit(fit)
    fit_biomarkers = [str(model["bm"]) for model in models]
    missing = [marker for marker in fit_biomarkers if marker not in current_values]
    used = [marker for marker in fit_biomarkers if marker in current_values]

    if len(missing) > MAX_KDM_MISSING_BIOMARKERS:
        return _incomplete_result(
            age,
            "too_many_missing_biomarkers",
            biomarkers_used=used,
            missing_biomarkers=missing,
            fit=fit,
        )

    bae_n = 0.0
    for model in models:
        marker = str(model["bm"])
        value = current_values.get(marker)
        if value is None:
            continue
        q = float(model["q"])
        k = float(model["k"])
        s = float(model["s"])
        bae_n += (value - q) * (k / (s**2))

    bae_d = sum(float(model["n2"]) for model in models)
    s_ba2_value = _finite_float(fit.get("s_ba2"))
    if bae_d <= 0 or s_ba2_value is None or s_ba2_value <= 0:
        return _incomplete_result(
            age,
            "unstable_fit",
            biomarkers_used=used,
            missing_biomarkers=missing,
            fit=fit,
        )

    kdm_age = (bae_n + (age / s_ba2_value)) / (bae_d + (1 / s_ba2_value))
    if not math.isfinite(kdm_age):
        return _incomplete_result(
            age,
            "unstable_projection",
            biomarkers_used=used,
            missing_biomarkers=missing,
            fit=fit,
        )

    kdm_delta = kdm_age - age
    return {
        "status": "complete",
        "reason": None,
        "kdm_age": round(kdm_age, 2),
        "chronological_age": round(age, 2),
        "kdm_delta": round(kdm_delta, 2),
        "biomarkers_count": len(used),
        "biomarkers_used": used,
        "missing_biomarkers": missing,
        "missing_biomarker_count": len(missing),
        "fit_biomarkers": fit_biomarkers,
        "fit_biomarkers_count": len(fit_biomarkers),
        "fit_observations": int(fit.get("nobs", 0)),
        "fit_age_range": [round(float(x), 2) for x in fit.get("age_range", [])],
    }


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _estimated_age_at_date(current_age: float, observation_date: date, reference_date: date) -> float:
    days_delta = (reference_date - observation_date).days
    return float(current_age) - (days_delta / SECONDS_PER_YEAR)


def build_kdm_history_rows(
    lab_results: Iterable[Mapping[str, Any]],
    daily_metrics: Iterable[Mapping[str, Any]],
    chronological_age: float,
    *,
    reference_date: date | None = None,
) -> list[dict[str, Any]]:
    """Combina exames e métricas diárias em linhas históricas para treinar KDM."""
    ref_date = reference_date or date.today()
    current_age = _finite_float(chronological_age) or 40.0
    rows_by_date: dict[str, dict[str, Any]] = {}

    def row_for(obs_date: date) -> dict[str, Any]:
        key = obs_date.isoformat()
        if key not in rows_by_date:
            rows_by_date[key] = {
                "observation_date": key,
                "age": _estimated_age_at_date(current_age, obs_date, ref_date),
            }
        return rows_by_date[key]

    for lab in lab_results:
        obs_date = _parse_date(lab.get("collected_at"))
        marker = canonical_kdm_biomarker(lab.get("metric_key"))
        value = _finite_float(lab.get("value"))
        if obs_date is None or marker is None or value is None:
            continue
        row_for(obs_date)[marker] = value

    for metric in daily_metrics:
        obs_date = _parse_date(metric.get("date_ref"))
        if obs_date is None:
            continue
        row = row_for(obs_date)
        for marker in ("rhr_bpm", "systolic_bp"):
            value = _finite_float(metric.get(marker))
            if value is not None:
                row[marker] = value

    return [rows_by_date[key] for key in sorted(rows_by_date)]


def latest_kdm_biomarker_values(
    lab_results: Iterable[Mapping[str, Any]],
    daily_metrics: Iterable[Mapping[str, Any]],
) -> dict[str, float]:
    """Extrai os biomarcadores KDM mais recentes de exames e métricas diárias."""
    values: dict[str, float] = {}
    for lab in lab_results:
        marker = canonical_kdm_biomarker(lab.get("metric_key"))
        value = _finite_float(lab.get("value"))
        if marker is not None and value is not None and marker not in values:
            values[marker] = value

    for metric in daily_metrics:
        for marker in ("rhr_bpm", "systolic_bp"):
            value = _finite_float(metric.get(marker))
            if value is not None and marker not in values:
                values[marker] = value
    return values
