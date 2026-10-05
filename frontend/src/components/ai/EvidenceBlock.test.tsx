import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EvidenceBlock } from './EvidenceBlock'
import { InsightItem } from './types'

describe('EvidenceBlock (U22-P1-45, U22-P1-47)', () => {
  const sampleInsight: InsightItem = {
    category: 'recovery',
    headline: 'Queda consistente do HRV noturno após treinos intensos tardios',
    insight_text: 'HRV médio reduziu de 62ms para 44ms nas noites seguintes a treinos após as 20h.',
    actionable_steps: 'Antecipar sessões intensas para antes das 18h ou incluir 10 min de respiração lenta.',
    observation: 'HRV médio reduziu de 62ms para 44ms nas noites seguintes a treinos após as 20h.',
    association: 'O estresse simpático residual tardio retarda a ativação parassimpática no início do sono.',
    recommendation: 'Antecipar sessões intensas para antes das 18h ou incluir 10 min de respiração lenta.',
    limitation: 'Amostra de 14 dias com 4 sessões tardias registradas; outros fatores como cafeína não foram controlados.',
  }

  it('renders all four epistemological tiers distinctly (U22-P1-45)', () => {
    render(
      <EvidenceBlock
        insight={sampleInsight}
        sourceContext={{
          timeWindowLabel: 'Últimos 30 dias',
          sampleCountText: '14 noites analisadas',
          sources: ['Oura Ring', 'Polar H10'],
        }}
      />
    )

    // Headline and category
    expect(screen.getByText('Queda consistente do HRV noturno após treinos intensos tardios')).toBeInTheDocument()
    expect(screen.getByText('recovery')).toBeInTheDocument()
    expect(screen.getByText('Interpretação por IA')).toBeInTheDocument()

    // Tier 1: Dado Fisiológico Observado
    expect(screen.getByText('Dado medido')).toBeInTheDocument()
    expect(screen.getByText(/HRV médio reduziu de 62ms para 44ms/)).toBeInTheDocument()

    // Tier 2: Interpretação e correlação
    expect(screen.getByText('O que os dados sugerem')).toBeInTheDocument()
    expect(screen.getByText(/estresse simpático residual tardio/)).toBeInTheDocument()

    // Tier 3: Ação Sugerida
    expect(screen.getByText('Próximo passo possível')).toBeInTheDocument()
    expect(screen.getByText(/Antecipar sessões intensas/)).toBeInTheDocument()

    // Tier 4: Limitação da análise
    expect(screen.getByText('Limitações da análise')).toBeInTheDocument()
    expect(screen.getByText(/Amostra de 14 dias com 4 sessões/)).toBeInTheDocument()

    // Evidence Sources & Window (U22-P1-47)
    expect(screen.getByText(/Oura Ring, Polar H10/)).toBeInTheDocument()
    expect(screen.getByText('14 noites analisadas')).toBeInTheDocument()
  })

  it('renders default prudential limitation and fallback sources when context is minimal', () => {
    const minimalInsight: InsightItem = {
      category: 'sleep',
      headline: 'Sono REM reduzido',
      insight_text: 'Duração média de sono REM ficou abaixo de 60 minutos.',
      actionable_steps: 'Ajustar horário de sono para garantir 8 horas de repouso.',
    }

    render(<EvidenceBlock insight={minimalInsight} />)

    expect(screen.getByText('Sono REM reduzido')).toBeInTheDocument()
    expect(screen.getByText('Duração média de sono REM ficou abaixo de 60 minutos.')).toBeInTheDocument()
    // Default limitation
    expect(screen.getByText(/Associação observacional sem inferência causal direta/)).toBeInTheDocument()
    // Default sources
    expect(screen.getByText(/Sono, HRV, RHR, CGM, Exames laboratoriais/)).toBeInTheDocument()
  })
})
