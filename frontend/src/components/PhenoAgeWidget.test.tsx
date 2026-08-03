import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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
    expect(screen.getByText(/Glicose/i)).toBeInTheDocument()
    expect(screen.getByText(/hs-CRP/i)).toBeInTheDocument()
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
})
