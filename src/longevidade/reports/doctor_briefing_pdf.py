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


def generate_doctor_briefing_pdf(
    repo: LongevityRepository,
    patient_name: str = "Paciente",
    patient_age: float = 32.0,
) -> bytes:
    """Gera o PDF binário do relatório médico Doctor Briefing."""
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
    elements.append(Paragraph(f"<b>Data de Emissão:</b> {today_str} | <b>Paciente:</b> {patient_name} ({patient_age:.0f} anos)", body_style))
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

    elements.append(Paragraph("1. Resumo Fisiológico Média 30 Dias", h2_style))

    metrics_table_data = [
        [
            Paragraph("<b>Métrica</b>", body_style),
            Paragraph("<b>Média 30d</b>", body_style),
            Paragraph("<b>Alvo Clínico Longevidade</b>", body_style),
        ],
        [Paragraph("FC de Repouso (RHR)", body_style), Paragraph(f"{avg_str(rhrs, '{:.0f}')} bpm", body_style), Paragraph("< 60 bpm", body_style)],
        [Paragraph("Variabilidade Cardíaca (HRV)", body_style), Paragraph(f"{avg_str(hrvs, '{:.0f}')} ms", body_style), Paragraph("> 40 ms", body_style)],
        [Paragraph("Saturação de Oxigênio (SpO2)", body_style), Paragraph(f"{avg_str(spo2s, '{:.1f}')}%", body_style), Paragraph("96 - 99%", body_style)],
        [Paragraph("Freq. Respiratória Noturna", body_style), Paragraph(f"{avg_str(resps, '{:.1f}')} rpm", body_style), Paragraph("12 - 16 rpm", body_style)],
        [Paragraph("Capacidade Aeróbica (VO2 Max)", body_style), Paragraph(f"{avg_str(vo2s, '{:.1f}')} mL/kg/min", body_style), Paragraph("> 45.0 mL/kg/min", body_style)],
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
    latest_labs = repo.get_latest_labs_by_key()

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

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
