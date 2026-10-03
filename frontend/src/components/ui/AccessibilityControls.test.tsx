import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WorkoutSessionCard } from '../workouts/WorkoutSessionCard';
import { RoutineTodayView } from '../supplements/RoutineTodayView';
import { TermHelp } from './TermHelp';
// @ts-expect-error - tailwind config is a JS file
import tailwindConfig from '../../../tailwind.config.js';

describe('Accessibility Controls & Overlay QA (UX_UI_50)', () => {
  it('WorkoutSessionCard renders header as accessible button with aria-expanded', () => {
    const onToggle = vi.fn();
    const mockWorkout = {
      id: 'w-1',
      title: 'Treino A - Peito e Tríceps',
      source: 'Hevy',
      workout_date: '2026-10-02',
      workout_time: '18:00',
      duration_min: 45,
      volume_kg: 1250,
      sets_count: 12,
      category: 'Musculação',
    };

    const { rerender } = render(
      <WorkoutSessionCard
        workout={mockWorkout as any}
        isExpanded={false}
        details={mockWorkout as any}
        isLoadingDetails={false}
        onToggleExpand={onToggle}
        onOpenExerciseMedia={vi.fn()}
      />
    );

    const expandBtn = screen.getByRole('button', { name: /Expandir detalhes do treino Treino A/i });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(expandBtn);
    expect(onToggle).toHaveBeenCalledWith('w-1');

    rerender(
      <WorkoutSessionCard
        workout={mockWorkout as any}
        isExpanded={true}
        details={mockWorkout as any}
        isLoadingDetails={false}
        onToggleExpand={onToggle}
        onOpenExerciseMedia={vi.fn()}
      />
    );

    const collapseBtn = screen.getByRole('button', { name: /Recolher detalhes do treino Treino A/i });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
  });

  it('WorkoutSessionCard exercise media renders as accessible button trigger', () => {
    const onOpenMedia = vi.fn();
    const mockWorkout = {
      id: 'w-2',
      title: 'Treino B',
      source: 'Hevy',
      workout_date: '2026-10-02',
      duration_min: 30,
      category: 'Musculação',
      exercises: [
        {
          id: 'ex-1',
          title: 'Supino Reto',
          notes: '',
          media: { image_url: 'https://example.com/supino.gif' },
          sets: [{ index: 1, type: 'normal', weight_kg: 80, reps: 10, rpe: 8 }],
        },
      ],
    };

    render(
      <WorkoutSessionCard
        workout={mockWorkout as any}
        isExpanded={true}
        details={mockWorkout as any}
        isLoadingDetails={false}
        onToggleExpand={vi.fn()}
        onOpenExerciseMedia={onOpenMedia}
      />
    );

    const mediaBtn = screen.getByRole('button', { name: /Ver animação e execução de Supino Reto/i });
    expect(mediaBtn).toBeInTheDocument();

    fireEvent.click(mediaBtn);
    expect(onOpenMedia).toHaveBeenCalledWith(
      'Supino Reto',
      expect.objectContaining({ image_url: 'https://example.com/supino.gif' }),
      'w-2',
      0
    );
  });

  it('RoutineTodayView renders clean single button per supplement without nested buttons', () => {
    const onToggle = vi.fn();
    const mockSupplements = [
      {
        id: 10,
        name: 'Omega 3',
        dosage: '2g',
        frequency: 'Diário',
        category: 'Lipídios',
        timing: 'Manhã',
      },
    ];

    render(
      <RoutineTodayView
        selectedDate="2026-10-02"
        completionPct={0}
        supplements={mockSupplements as any}
        takenIds={[]}
        onToggleLog={onToggle}
        onOpenAddModal={vi.fn()}
      />
    );

    const doseBtn = screen.getByRole('button', { name: /Marcar dose de Omega 3/i });
    expect(doseBtn).toBeInTheDocument();
    expect(doseBtn).toHaveAttribute('aria-pressed', 'false');

    // Ensure there are no nested buttons inside this button
    const nestedButtons = doseBtn.querySelectorAll('button');
    expect(nestedButtons.length).toBe(0);

    fireEvent.click(doseBtn);
    expect(onToggle).toHaveBeenCalledWith(10);
  });

  it('TermHelp supports keyboard activation (Enter / Space) on trigger with children', () => {
    render(
      <TermHelp termKey="phenoage">
        <span>Idade Fenotípica</span>
      </TermHelp>
    );

    const trigger = screen.getByRole('button', { name: /Idade Fenotípica/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    // Trigger Enter key
    fireEvent.keyDown(trigger, { key: 'Enter' });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    expect(screen.getAllByText(/PhenoAge/i).length).toBeGreaterThan(0);

    // Trigger Space key to close
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('Tailwind configuration defines canonical zIndex scale', () => {
    const zIndex = (tailwindConfig as any).theme?.extend?.zIndex;
    expect(zIndex).toBeDefined();
    expect(zIndex.base).toBe('0');
    expect(zIndex.sticky).toBe('20');
    expect(zIndex.dropdown).toBe('30');
    expect(zIndex.drawer).toBe('40');
    expect(zIndex.modal).toBe('50');
    expect(zIndex.confirm).toBe('60');
    expect(zIndex.toast).toBe('70');
  });
});
