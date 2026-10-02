import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';
import { Input } from './Input';

describe('FormField Component (UX_UI_33)', () => {
  it('renders label with linked htmlFor and required asterisk', () => {
    render(
      <FormField id="email-field" label="Endereço de E-mail" required>
        <Input id="email-field" type="email" />
      </FormField>
    );

    const label = screen.getByText('Endereço de E-mail');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'email-field');
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('renders helper text when no error exists', () => {
    render(
      <FormField id="weight-field" label="Peso Corporal" helperText="Em quilogramas (kg)">
        <Input id="weight-field" type="number" />
      </FormField>
    );

    expect(screen.getByText('Em quilogramas (kg)')).toBeInTheDocument();
  });

  it('renders error message with role="alert" when error is provided', () => {
    render(
      <FormField id="bp-field" label="Pressão Arterial" error="Valor fora do limite clínico permitido">
        <Input id="bp-field" error="Valor fora do limite clínico permitido" />
      </FormField>
    );

    const errorMsg = screen.getByRole('alert');
    expect(errorMsg).toBeInTheDocument();
    expect(errorMsg).toHaveTextContent('Valor fora do limite clínico permitido');
    expect(errorMsg).toHaveAttribute('id', 'bp-field-error');
  });
});
