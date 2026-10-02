import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { AssessmentComparison } from './AssessmentComparison';
import { PhysicalAssessment, ComparisonManifest } from './types';

const mockAssessments: PhysicalAssessment[] = [
  {
    id: 'ass-1',
    assessment_date: '2026-06-01',
    title: 'Baseline',
    weight_kg: 80.0,
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    photos: [],
  },
  {
    id: 'ass-2',
    assessment_date: '2026-07-01',
    title: 'Evolução Mês 1',
    weight_kg: 78.0,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    photos: [],
  },
];

const mockManifest: ComparisonManifest = {
  previous_assessment: mockAssessments[0],
  current_assessment: mockAssessments[1],
  days_between: 30,
  deltas: {
    weight_kg: -2.0,
    body_fat_percentage: -1.5,
    waist_cm: -2.0,
    abdomen_cm: -3.0,
    hip_cm: -1.0,
  },
  matched_photos: [],
};

describe('AssessmentComparison', () => {
  it('renders period selectors and enables button when both periods selected', () => {
    const handleRun = vi.fn();
    render(
      <AssessmentComparison
        assessments={mockAssessments}
        comparePrevId="ass-1"
        setComparePrevId={vi.fn()}
        compareCurrId="ass-2"
        setCompareCurrId={vi.fn()}
        compareLoading={false}
        compareError={null}
        comparisonManifest={null}
        onRunComparison={handleRun}
        onOpenLightbox={vi.fn()}
      />
    );

    const runBtn = screen.getByRole('button', { name: /Gerar Comparativo Lado a Lado/i });
    expect(runBtn).not.toBeDisabled();
    fireEvent.click(runBtn);
    expect(handleRun).toHaveBeenCalled();
  });

  it('renders comparison manifest deltas when comparisonManifest is provided', () => {
    render(
      <AssessmentComparison
        assessments={mockAssessments}
        comparePrevId="ass-1"
        setComparePrevId={vi.fn()}
        compareCurrId="ass-2"
        setCompareCurrId={vi.fn()}
        compareLoading={false}
        compareError={null}
        comparisonManifest={mockManifest}
        onRunComparison={vi.fn()}
        onOpenLightbox={vi.fn()}
      />
    );

    expect(screen.getByText('30 dias entre as avaliações')).toBeInTheDocument();
    expect(screen.getByText('-2 kg')).toBeInTheDocument();
    expect(screen.getByText('-1.5%')).toBeInTheDocument();
  });
});
