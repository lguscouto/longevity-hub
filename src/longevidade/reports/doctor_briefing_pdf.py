"""
Gerador de PDF de alta fidelidade para o Doctor Briefing 2.0 utilizando ReportLab.
"""

from __future__ import annotations

import io
from datetime import date
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from longevidade.db.repository import LongevityRepository
from longevidade.reports.lab_selection import get_clinical_lab_snapshot


def generate_doctor_briefing_pdf(
    repo: LongevityRepository,
    patient_name: str | None = None,
    patient_age: float | None = None,
) -> bytes:
    """Gera o PDF binário do relatório médico Doctor Briefing."""
    user_prof = repo.get_user_profile() or {}
    name = patient_name or user_prof.get("name", "Paciente")
    age = patient_age if patient_age is not None else user_prof.get("chronological_age")
    age_str = f"{float(age):.0f} anos" if age is not None else "Idade não informada"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        fontName="Helvetica-Bold",
    )

    h2_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#1E293B"),
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#334155"),
        fontName="Helvetica",
    )

    elements = []

    # Cabeçalho
    elements.append(Paragraph("🏥 Relatório Clínico Sintético de Longevidade (Doctor Briefing)", title_style))
    elements.append(Spacer(1, 4))
    today_str = date.today().strftime("%d/%m/%Y")
    elements.append(Paragraph(f"<b>Data de Emissão:</b> {today_str} | <b>Paciente:</b> {name} ({age_str})", body_style))
    elements.append(Spacer(1, 10))

    # Métricas Fisiológicas
    daily_30 = repo.get_daily_metrics(days=30)
    rhrs = [m["rhr_bpm"] for m in daily_30 if m.get("rhr_bpm") is not None]
    hrvs = [m["hrv_ms"] for m in daily_30 if m.get("hrv_ms") is not None]
    spo2s = [m["spo2_avg_pct"] for m in daily_30 if m.get("spo2_avg_pct") is not None]
    resps = [m["respiratory_rate_rpm"] for m in daily_30 if m.get("respiratory_rate_rpm") is not None]
    vo2s = [m["vo2_max"] for m in daily_30 if m.get("vo2_max") is not None]

    def avg_str(vals, fmt="{:.1f}"):
        return fmt.format(sum(vals) / len(vals)) if vals else "—"

    from longevidade.calculators.physiological_targets import PHYSIOLOGICAL_TARGETS

    elements.append(Paragraph("1. Resumo Fisiológico Média 30 Dias", h2_style))

    metrics_table_data = [
        [
            Paragraph("<b>Métrica</b>", body_style),
            Paragraph("<b>Média 30d</b>", body_style),
            Paragraph("<b>Alvo Clínico Longevidade (Referência Geral)</b>", body_style),
        ],
        [Paragraph(PHYSIOLOGICAL_TARGETS["rhr_bpm"]["label"], body_style), Paragraph(f"{avg_str(rhrs, '{:.0f}')} bpm", body_style), Paragraph(PHYSIOLOGICAL_TARGETS["rhr_bpm"]["target"], body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["hrv_ms"]["label"], body_style), Paragraph(f"{avg_str(hrvs, '{:.0f}')} ms", body_style), Paragraph(PHYSIOLOGICAL_TARGETS["hrv_ms"]["target"], body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["spo2_avg_pct"]["label"], body_style), Paragraph(f"{avg_str(spo2s, '{:.1f}')}%", body_style), Paragraph(PHYSIOLOGICAL_TARGETS["spo2_avg_pct"]["target"], body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["respiratory_rate_rpm"]["label"], body_style), Paragraph(f"{avg_str(resps, '{:.1f}')} rpm", body_style), Paragraph(PHYSIOLOGICAL_TARGETS["respiratory_rate_rpm"]["target"], body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["vo2_max"]["label"], body_style), Paragraph(f"{avg_str(vo2s, '{:.1f}')} mL/kg/min", body_style), Paragraph(PHYSIOLOGICAL_TARGETS["vo2_max"]["target"], body_style)],
    ]

    t_metrics = Table(metrics_table_data, colWidths=[200, 140, 200])
    t_metrics.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("PADDING", (0, 0), (-1, -1), 5),
        ])
    )
    elements.append(t_metrics)
    elements.append(Spacer(1, 12))

    # Exames Laboratoriais
    elements.append(Paragraph("2. Marcadores Laboratoriais Recentes", h2_style))
    clinical_snapshot = get_clinical_lab_snapshot(repo)
    latest_labs = clinical_snapshot.latest_labs

    if not latest_labs:
        elements.append(Paragraph("Nenhum exame cadastrado no período.", body_style))
    else:
        labs_table_data = [
            [
                Paragraph("<b>Exame / Biomarcador</b>", body_style),
                Paragraph("<b>Resultado</b>", body_style),
                Paragraph("<b>Ref. Lab</b>", body_style),
                Paragraph("<b>Alvo Ótimo</b>", body_style),
            ]
        ]
        for key, lab in latest_labs.items():
            ref_str = f"{lab.get('ref_min', '')} - {lab.get('ref_max', '')}"
            target_str = str(lab.get("optimal_target", "—"))
            labs_table_data.append([
                Paragraph(lab["metric_name"], body_style),
                Paragraph(f"{lab['value']} {lab.get('unit', '')}", body_style),
                Paragraph(ref_str, body_style),
                Paragraph(target_str, body_style),
            ])

        t_labs = Table(labs_table_data, colWidths=[180, 120, 120, 120])
        t_labs.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                ("PADDING", (0, 0), (-1, -1), 5),
            ])
        )
        elements.append(t_labs)

    excluded_count = clinical_snapshot.excluded_lab_results + clinical_snapshot.excluded_phenoage_records
    if excluded_count:
        elements.append(Spacer(1, 6))
        elements.append(
            Paragraph(
                f"Nota de segurança: {excluded_count} registro(s) sem provenance clínica verificável foram excluídos deste briefing.",
                body_style,
            )
        )

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
