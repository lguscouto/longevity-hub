"""
Gerador de PDF de alta fidelidade para o Doctor Briefing 2.0 utilizando ReportLab.
"""

from __future__ import annotations

import html
import io
from datetime import date, timedelta

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from longevidade.db.repository import LongevityRepository
from longevidade.reports.doctor_briefing import briefing_goals, briefing_identity
from longevidade.reports.briefing_context import briefing_context
from longevidade.reports.lab_selection import get_clinical_lab_snapshot
from longevidade.reports.lab_reference import lab_reference_status


def generate_doctor_briefing_pdf(
    repo: LongevityRepository,
    patient_name: str | None = None,
    patient_age: float | None = None,
    *, questions: list[str] | None = None, selected_lab_ids: list[int] | None = None,
    selected_event_ids: list[str] | None = None,
) -> bytes:
    """Gera o PDF binário do relatório médico Doctor Briefing."""
    user_prof = repo.get_user_profile() or {}
    name, age_str = briefing_identity(user_prof, patient_name, patient_age)

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

    today = date.today()

    # Cabeçalho
    elements.append(Paragraph("🏥 Relatório Clínico Sintético de Longevidade (Doctor Briefing)", title_style))
    elements.append(Spacer(1, 4))
    today_str = today.strftime("%d/%m/%Y")
    safe_name = html.escape(str(name))
    safe_age_str = html.escape(str(age_str))
    elements.append(Paragraph(f"<b>Data de Emissão:</b> {today_str} | <b>Paciente:</b> {safe_name} ({safe_age_str})", body_style))
    elements.append(Spacer(1, 10))

    # Métricas Fisiológicas
    daily_90 = repo.get_daily_metrics_between((today - timedelta(days=89)).isoformat(), today.isoformat())
    first_30 = (today - timedelta(days=29)).isoformat()
    daily_30 = [row for row in daily_90 if row["date_ref"] >= first_30]
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
        ],
        [Paragraph(PHYSIOLOGICAL_TARGETS["rhr_bpm"]["label"], body_style), Paragraph(f"{avg_str(rhrs, '{:.0f}')} bpm", body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["hrv_ms"]["label"], body_style), Paragraph(f"{avg_str(hrvs, '{:.0f}')} ms", body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["spo2_avg_pct"]["label"], body_style), Paragraph(f"{avg_str(spo2s, '{:.1f}')}%", body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["respiratory_rate_rpm"]["label"], body_style), Paragraph(f"{avg_str(resps, '{:.1f}')} rpm", body_style)],
        [Paragraph(PHYSIOLOGICAL_TARGETS["vo2_max"]["label"], body_style), Paragraph(f"{avg_str(vo2s, '{:.1f}')} mL/kg/min", body_style)],
    ]

    t_metrics = Table(metrics_table_data, colWidths=[320, 220])
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
    clinical_snapshot = get_clinical_lab_snapshot(repo, selected_lab_ids)
    latest_labs = clinical_snapshot.latest_labs

    if not latest_labs:
        elements.append(Paragraph("Nenhum exame cadastrado no período.", body_style))
    else:
        labs_table_data = [
            [
                Paragraph("<b>Exame / Biomarcador</b>", body_style),
                Paragraph("<b>Resultado</b>", body_style),
                Paragraph("<b>Ref. Lab</b>", body_style),
                Paragraph("<b>Meta histórica não validada</b>", body_style),
            ]
        ]
        for key, lab in latest_labs.items():
            ref_str = f"{lab.get('ref_min', '')} - {lab.get('ref_max', '')}"
            target_str = str(lab.get("optimal_target") if lab.get("optimal_target") is not None else "—")
            status = {"in_clinical_range": "Na referência", "out_of_range": "Fora da referência",
                      "no_reference": "Sem classificação", "noncanonical_unit": "Unidade não normalizada; sem classificação",
                      "not_eligible": "Origem não verificada"}[lab_reference_status(lab)]
            if lab_reference_status(lab) == "noncanonical_unit":
                target_str = "—"
            labs_table_data.append([
                Paragraph(html.escape(str(lab.get("metric_name", ""))), body_style),
                Paragraph(html.escape(f"{lab.get('value', '')} {lab.get('unit', '')}".strip()), body_style),
                Paragraph(html.escape(f"{ref_str} ({status})"), body_style),
                Paragraph(html.escape(target_str), body_style),
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

    goals = briefing_goals(user_prof)
    if goals:
        elements.append(Paragraph("3. Objetivos registrados no perfil", h2_style))
        for goal in goals:
            elements.append(Paragraph(html.escape(goal), body_style))

    for title, items in briefing_context(repo, daily_90, clinical_snapshot, today, questions, selected_event_ids):
        elements.append(Paragraph(html.escape(title), h2_style))
        elements.extend(Paragraph(html.escape(item), body_style) for item in items)

    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
