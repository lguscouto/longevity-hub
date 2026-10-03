import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LabBatchEntryModal } from './LabBatchEntryModal';

describe('LabBatchEntryModal (UX_UI_54)', () => {
  it('validates numeric inputs explicitly and blocks submit on invalid input (U22-P1-20 & U22-P1-21)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LabBatchEntryModal isOpen onClose={vi.fn()} onSubmit={onSubmit} />);

    const submitBtn = screen.getByRole('button', { name: /salvar painel completo/i });
    expect(submitBtn).toBeDisabled();

    const glucoseInput = screen.getByLabelText(/Glicose de Jejum/i);

    // Digitar valor negativo deve exibir erro explícito e desabilitar submit
    await user.type(glucoseInput, '-10');
    expect(screen.getByText('O valor não pode ser negativo.')).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    // Limpar e digitar valor válido
    await user.clear(glucoseInput);
    await user.type(glucoseInput, '82');
    expect(screen.queryByText('O valor não pode ser negativo.')).not.toBeInTheDocument();
    expect(screen.getByText('1 marcador(es) pronto(s) para salvar')).toBeInTheDocument();
    expect(submitBtn).toBeEnabled();

    // Submeter
    await user.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          metric_key: 'fasting_glucose',
          value: 82,
          unit: 'mg/dL',
        }),
      ])
    );
  });
});
