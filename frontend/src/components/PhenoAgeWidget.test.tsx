import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { PhenoAgeWidget } from './PhenoAgeWidget'

describe('PhenoAgeWidget', () => {
  it('shows incomplete PhenoAge input status with missing biomarkers', () => {
    render(
      <PhenoAgeWidget
        latestRecord={{
          status: 'incomplete',
          calculated_at: '2026-07-30',
          missing: ['glucose_mgdl', 'hscrp_mgl'],
        } as any}
        latestKdmRecord={null as any}
        onRecalculate={vi.fn()}
      />,
    )

    expect(screen.getByText(/PhenoAge indisponível/i)).toBeInTheDocument()
    expect(screen.getByText(/Faltam:/i)).toHaveTextContent(/Glicose/)
    expect(screen.getByText(/Faltam:/i)).toHaveTextContent(/hs-CRP/)
    expect(screen.queryByText(/yrs vs Cronológico/i)).not.toBeInTheDocument()
  })

  it('uses KDM backend status instead of deriving KDM from PhenoAge', () => {
    render(
      <PhenoAgeWidget
        latestRecord={{
          status: 'complete',
          pheno_age: 40,
          chronological_age: 42,
          age_delta: -2,
          calculated_at: '2026-07-30',
        } as any}
        latestKdmRecord={{
          status: 'incomplete',
          missing_biomarkers: ['rhr_bpm', 'systolic_bp'],
        } as any}
        onRecalculate={vi.fn()}
      />,
    )

    expect(screen.getByText(/KDM indisponível/i)).toBeInTheDocument()
    expect(screen.getByText(/Frequência cardíaca de repouso/i)).toBeInTheDocument()
    expect(screen.getByText(/Pressão sistólica/i)).toBeInTheDocument()
    expect(screen.queryByText(/40\.5\s*yrs/i)).not.toBeInTheDocument()
  })

  it('calculates from registered clinical labs without injecting example biomarker values', () => {
    const onRecalculate = vi.fn()

    render(
      <PhenoAgeWidget
        latestRecord={null}
        latestKdmRecord={null}
        onRecalculate={onRecalculate}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^calcular$/i }))

    expect(screen.getByRole('dialog', { name: /calcular phenoage/i })).toHaveTextContent(/exames clínicos registrados/i)
    expect(screen.queryByLabelText(/glicose/i)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /calcular com exames registrados/i }))

    expect(onRecalculate).toHaveBeenCalledWith({})
  })

  it('displays the information listing all 6 required laboratory exams', () => {
    render(
      <PhenoAgeWidget
        latestRecord={null}
        latestKdmRecord={null}
        onRecalculate={vi.fn()}
      />,
    )

    expect(screen.getByText(/Exames Necessários para o Cálculo Completo/i)).toBeInTheDocument()
    expect(screen.getByText(/Hemograma completo com diferencial de leucócitos/i)).toBeInTheDocument()
    expect(screen.getByText(/Albumina sérica/i)).toBeInTheDocument()
    expect(screen.getByText(/Creatinina sérica/i)).toBeInTheDocument()
    expect(screen.getByText(/Glicemia de jejum/i)).toBeInTheDocument()
    expect(screen.getByText(/Proteína C reativa ultrassensível \(PCR-us\)/i)).toBeInTheDocument()
    expect(screen.getByText('Fosfatase alcalina')).toBeInTheDocument()

    // Test toggle
    const toggleButton = screen.getByRole('button', { name: /ocultar/i })
    fireEvent.click(toggleButton)
    expect(screen.queryByText(/Hemograma completo com diferencial de leucócitos/i)).not.toBeInTheDocument()

    const showButton = screen.getByRole('button', { name: /ver todos/i })
    fireEvent.click(showButton)
    expect(screen.getByText(/Hemograma completo com diferencial de leucócitos/i)).toBeInTheDocument()
  })

  it('displays all required exams inside the calculation modal', () => {
    render(
      <PhenoAgeWidget
        latestRecord={null}
        latestKdmRecord={null}
        onRecalculate={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^calcular$/i }))

    const dialog = screen.getByRole('dialog', { name: /calcular phenoage/i })
    expect(dialog).toHaveTextContent(/Todos os exames necessários:/i)
    expect(dialog).toHaveTextContent(/Hemograma completo com diferencial de leucócitos/i)
    expect(dialog).toHaveTextContent(/Albumina sérica/i)
    expect(dialog).toHaveTextContent(/Creatinina sérica/i)
    expect(dialog).toHaveTextContent(/Glicemia de jejum/i)
    expect(dialog).toHaveTextContent(/Proteína C reativa ultrassensível \(PCR-us\)/i)
    expect(dialog).toHaveTextContent(/Fosfatase alcalina/i)
  })
})
