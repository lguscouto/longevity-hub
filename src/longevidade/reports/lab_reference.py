"""Comparação descritiva com a referência registrada no laudo."""
from math import isfinite
from typing import Any, Mapping

from longevidade.metrics.unit_conversion import has_canonical_clinical_unit


def lab_reference_status(lab: Mapping[str, Any]) -> str:
    if lab.get('record_origin') not in {'patient_lab', 'imported'}:
        return 'not_eligible'
    if not has_canonical_clinical_unit(str(lab.get('metric_key') or ''), lab.get('unit')):
        return 'noncanonical_unit'
    value, lower, upper = lab.get('value'), lab.get('ref_min'), lab.get('ref_max')
    if not isinstance(value, (int, float)) or not isfinite(value):
        return 'no_reference'
    if lower is None and upper is None:
        return 'no_reference'
    if any(bound is not None and (not isinstance(bound, (int, float)) or not isfinite(bound)) for bound in (lower, upper)):
        return 'no_reference'
    if lower is not None and upper is not None and lower > upper:
        return 'no_reference'
    if (lower is not None and value < lower) or (upper is not None and value > upper):
        return 'out_of_range'
    return 'in_clinical_range'
