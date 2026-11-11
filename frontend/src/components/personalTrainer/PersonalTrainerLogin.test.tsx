import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../ui';
import { PersonalTrainerLogin } from './PersonalTrainerLogin';
import { PERSONAL_SESSION_STORAGE_KEY } from './types';

const requestJson = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({ requestJson }));

describe('PersonalTrainerLogin', () => {
  beforeEach(() => {
    requestJson.mockReset();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('does not create an offline session when the server is unavailable', async () => {
    requestJson.mockRejectedValueOnce(new Error('Servidor indisponível'));
    const onLoginSuccess = vi.fn();
    render(<ToastProvider><PersonalTrainerLogin onLoginSuccess={onLoginSuccess} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText(/Usuário do Personal/i), { target: { value: 'willian' } });
    fireEvent.change(screen.getByLabelText(/Senha do Personal/i), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Portal do Treinador/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Servidor indisponível');
    expect(onLoginSuccess).not.toHaveBeenCalled();
    expect(localStorage.getItem(PERSONAL_SESSION_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(PERSONAL_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('requires the initial password to be replaced before opening the portal', async () => {
    requestJson.mockResolvedValueOnce({ authenticated: true, username: 'trainer', name: 'Trainer', role: 'personal_trainer', token: 'temporary', requires_password_change: true });
    requestJson.mockResolvedValueOnce({ status: 'ok' });
    const onLoginSuccess = vi.fn();
    render(<ToastProvider><PersonalTrainerLogin onLoginSuccess={onLoginSuccess} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText(/Usuário do Personal/i), { target: { value: 'trainer' } });
    fireEvent.change(screen.getByLabelText(/Senha do Personal/i), { target: { value: '1234' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Portal do Treinador/i }));
    expect(await screen.findByText('Atualize a senha do personal')).toBeInTheDocument();
    expect(onLoginSuccess).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/^Nova senha/i), { target: { value: 'senha-segura-de-teste' } });
    fireEvent.change(screen.getByLabelText(/^Confirme a nova senha/i), { target: { value: 'senha-segura-de-teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));
    await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(expect.objectContaining({ requires_password_change: false })));
    expect(requestJson).toHaveBeenCalledTimes(2);
  });
});
