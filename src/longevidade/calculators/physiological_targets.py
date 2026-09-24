"""
Catálogo centralizado e versionado de metas e referências fisiológicas de longevidade.
Utilizado pelos relatórios Markdown e PDF (Doctor Briefing).
"""

from __future__ import annotations

from typing import Any, Dict

PHYSIOLOGICAL_TARGETS: Dict[str, Dict[str, Any]] = {
    "rhr_bpm": {
        "label": "FC de Repouso (RHR)",
        "target": "< 60 bpm",
        "description": "Frequência cardíaca noturna/repouso (Longevidade Hub / Attia)",
    },
    "hrv_ms": {
        "label": "Variabilidade Cardíaca (HRV)",
        "target": "> 40 ms",
        "description": "Variabilidade de frequência cardíaca noturna rMSSD",
    },
    "spo2_avg_pct": {
        "label": "Saturação de Oxigênio (SpO2)",
        "target": "96 - 99%",
        "description": "Saturação média noturna de oxigênio no sangue",
    },
    "respiratory_rate_rpm": {
        "label": "Freq. Respiratória Noturna",
        "target": "12 - 16 rpm",
        "description": "Frequência respiratória noturna média em repouso",
    },
    "vo2_max": {
        "label": "Capacidade Aeróbica (VO2 Max)",
        "target": "> 45.0 mL/kg/min",
        "description": "Estimativa de capacidade aeróbica para proteção cardiovascular",
    },
}
