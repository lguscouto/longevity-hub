import React, { useContext } from 'react';
import { Dumbbell, ShieldCheck, Lock, Sun, Moon, User, LogOut } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import { Button } from '../ui';
import { PersonalTrainerSession } from './types';

export interface PersonalTrainerTopBarProps {
  onRequestUnlock: () => void;
  session?: PersonalTrainerSession | null;
  onLogout?: () => void;
  onOwnerLogout?: () => void;
}

export const PersonalTrainerTopBar: React.FC<PersonalTrainerTopBarProps> = ({
  onRequestUnlock,
  session,
  onLogout,
  onOwnerLogout,
}) => {
  const themeCtx = useContext(ThemeContext);
  const theme = themeCtx?.theme ?? 'dark';
  const toggleTheme = themeCtx?.toggleTheme ?? (() => {});

  return (
    <header className="sticky top-0 z-sticky glass-panel border-b border-slate-200/80 dark:border-slate-800 px-3 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Isolation Identity */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-radius-lg bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
                  LONGEVIDADE
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-radius-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                  PORTAL DO PERSONAL
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span className="truncate">Modo Isolado • Acesso restrito a avaliações, fotos e exames</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Actions: Trainer Info, Logout, Theme toggle and Student Area Unlock button */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOwnerLogout && <Button type="button" variant="ghost" size="sm" onClick={onOwnerLogout} aria-label="Sair da conta do proprietário" title="Sair da conta do proprietário" leftIcon={LogOut}>Sair do proprietário</Button>}
          {/* Badge do Personal Logado */}
          {session && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-700 dark:text-cyan-300"
              title={`Conectado como ${session.name || session.username}`}
            >
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <User className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <span className="capitalize">{session.name || session.username}</span>
            </div>
          )}

          {/* Botão de Logout do Personal */}
          {session && onLogout && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onLogout}
              leftIcon={LogOut}
              className="text-xs font-semibold border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-400 dark:hover:text-rose-400"
              title="Encerrar sessão no Portal do Personal Trainer"
            >
              Sair
            </Button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 min-h-[36px] min-w-[36px] rounded-radius-md hover:bg-slate-200/60 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition shrink-0 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none flex items-center justify-center cursor-pointer"
            title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
            aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>

          {/* Unlock Student Area Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRequestUnlock}
            leftIcon={Lock}
            className="text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
            title="Acessar a área do proprietário"
          >
            Área do Aluno 🔒
          </Button>
        </div>
      </div>
    </header>
  );
};
