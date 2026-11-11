import React, { useState } from 'react';
import {
  Dumbbell,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Button, Input, FormField, useToast } from '../ui';
import { requestJson } from '../../lib/api';
import {
  PersonalTrainerSession,
  savePersonalTrainerSession,
} from './types';

export interface PersonalTrainerLoginProps {
  onLoginSuccess: (session: PersonalTrainerSession) => void;
  onRequestStudentUnlock?: () => void;
}

export const PersonalTrainerLogin: React.FC<PersonalTrainerLoginProps> = ({
  onLoginSuccess,
  onRequestStudentUnlock,
}) => {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingSession, setPendingSession] = useState<PersonalTrainerSession | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setError('Por favor, informe o nome de usuário.');
      return;
    }
    if (!password) {
      setError('Por favor, informe a senha.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await requestJson<PersonalTrainerSession>('/api/personal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: password,
        }),
      });

      if (resp.requires_password_change) {
        setPendingSession(resp);
        return;
      }
      savePersonalTrainerSession(resp, rememberMe);
      showToast({
        title: 'Login efetuado com sucesso',
        message: `Bem-vindo ao portal, ${resp.name || resp.username}!`,
        type: 'success',
      });
      onLoginSuccess(resp);
    } catch (err: any) {
      const msg =
        err?.message ||
        'Usuário ou senha incorretos. Verifique suas credenciais de acesso ao Portal do Personal.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSession) return;
    if (newPassword.length < 12 || newPassword !== confirmPassword) {
      setError('Use pelo menos 12 caracteres e confirme a nova senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestJson('/api/personal/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Personal-Token': pendingSession.token },
        body: JSON.stringify({ current_password: password, new_password: newPassword }),
      });
      const updated = { ...pendingSession, requires_password_change: false };
      savePersonalTrainerSession(updated, rememberMe);
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onLoginSuccess(updated);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível atualizar a senha.');
    } finally { setLoading(false); }
  };

  if (pendingSession) return (
    <div className="mx-auto w-full max-w-md p-6">
      <h1 className="text-xl font-bold">Atualize a senha do personal</h1>
      <p className="mt-2 text-sm">A senha inicial precisa ser substituída antes de acessar os dados. Essa troca deve ser feita no computador do servidor ou por quem estiver autenticado como proprietário.</p>
      <form onSubmit={handlePasswordChange} className="mt-5 space-y-4">
        <FormField id="trainer-new-password" label="Nova senha" required>
          <Input id="trainer-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
        </FormField>
        <FormField id="trainer-confirm-password" label="Confirme a nova senha" required>
          <Input id="trainer-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </FormField>
        {error && <p role="alert">{error}</p>}
        <Button type="submit" disabled={loading}>Salvar nova senha</Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="w-full max-w-md">
        {/* Card Principal de Login */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
          {/* Luz de destaque decorativa no topo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1.5 bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full" />

          {/* Cabeçalho do Card */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shadow-md mb-4 ring-4 ring-cyan-500/10">
              <Dumbbell className="h-7 w-7" aria-hidden="true" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold tracking-wider uppercase mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Portal do Personal Trainer</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Acesso Exclusivo do Treinador
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
              Informe suas credenciais para visualizar a evolução corporal, fotos e exames do aluno.
            </p>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-shake"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Formulário de Autenticação */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField id="trainer-username" label="Usuário do Personal" required>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <Input
                  id="trainer-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  required
                  className="pl-9"
                  disabled={loading}
                />
              </div>
            </FormField>

            <FormField id="trainer-password" label="Senha do Personal" required>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <Input
                  id="trainer-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="pl-9 pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {/* Manter conectado */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span>Lembrar neste navegador</span>
              </label>
            </div>

            {/* Botão de Entrar */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold shadow-md cursor-pointer mt-2"
              disabled={loading}
            >
              <span>{loading ? 'Validando acesso...' : 'Acessar Portal do Treinador'}</span>
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Aviso de Privacidade e Segurança */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <ShieldAlert className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Ambiente Isolado • Acesso restrito a fotos, avaliações e exames</span>
            </div>
          </div>
        </div>

        {/* Atalho para o Aluno desbloquear a área completa caso esteja na máquina do aluno */}
        {onRequestStudentUnlock && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onRequestStudentUnlock}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900/60"
            >
              <KeyRound className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>É o aluno? Desbloquear painel com PIN</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
