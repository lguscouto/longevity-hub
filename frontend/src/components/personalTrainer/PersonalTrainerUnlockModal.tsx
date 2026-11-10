import React, { useState, useRef, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound, Check, X, ShieldCheck } from 'lucide-react';
import { Modal, Button, Input, FormField, useToast } from '../ui';

export const PERSONAL_PIN_STORAGE_KEY = 'longevidade_personal_lock_pin';
export const DEFAULT_PERSONAL_PIN = '1234';

export function getSavedPersonalPin(): string {
  try {
    return localStorage.getItem(PERSONAL_PIN_STORAGE_KEY) || DEFAULT_PERSONAL_PIN;
  } catch {
    return DEFAULT_PERSONAL_PIN;
  }
}

export function savePersonalPin(pin: string): void {
  try {
    localStorage.setItem(PERSONAL_PIN_STORAGE_KEY, pin);
  } catch {
    // Ignore localStorage errors
  }
}

export interface PersonalTrainerUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: () => void;
}

export const PersonalTrainerUnlockModal: React.FC<PersonalTrainerUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
}) => {
  const { showToast } = useToast();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modo de alteração de PIN
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsChangingPin(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setChangeError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const expectedPin = getSavedPersonalPin();
    if (pin.trim() === expectedPin) {
      setError(null);
      showToast({
        title: 'Acesso desbloqueado',
        message: 'Modo isolado desativado. Você retornou à sua área completa de saúde.',
        type: 'success',
      });
      onUnlockSuccess();
    } else {
      setError('PIN incorreto. Digite o código de 4 dígitos do titular.');
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    const expectedPin = getSavedPersonalPin();
    if (currentPinInput.trim() !== expectedPin) {
      setChangeError('PIN atual incorreto.');
      return;
    }
    if (!/^\d{4}$/.test(newPinInput.trim())) {
      setChangeError('O novo PIN deve conter exatamente 4 dígitos numéricos.');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setChangeError('A confirmação do novo PIN não confere.');
      return;
    }

    savePersonalPin(newPinInput.trim());
    showToast({
      title: 'PIN atualizado',
      message: 'Novo código de segurança configurado com sucesso.',
      type: 'success',
    });
    setIsChangingPin(false);
    setChangeError(null);
    setPin('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Lock className="h-5 w-5" />
          </div>
          <span>Área Restrita do Aluno</span>
        </div>
      }
      size="sm"
    >
      <div className="space-y-4">
        {/* Notice of Isolation */}
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            O <strong>Portal do Personal</strong> opera em <em>Modo Isolado</em> para garantir a confidencialidade
            dos seus exames médicos, suplementos, hormônios e registros clínicos.
          </span>
        </div>

        {!isChangingPin ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <FormField
              label="Digite seu PIN de 4 dígitos"
              error={error || undefined}
            >
              <Input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={pin}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setPin(val);
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="text-center text-2xl tracking-widest font-mono font-bold"
                autoComplete="off"
              />
            </FormField>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="submit"
                variant="primary"
                disabled={pin.length < 4}
                className="w-full justify-center"
              >
                Desbloquear Área Completa
              </Button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setIsChangingPin(true)}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" /> Alterar PIN
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
                >
                  Manter Isolado
                </button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSaveNewPin} className="space-y-3">
            <FormField label="PIN Atual (4 dígitos)">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={currentPinInput}
                onChange={e => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="PIN atual"
                className="text-center font-mono"
              />
            </FormField>

            <FormField label="Novo PIN (4 dígitos)">
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={newPinInput}
                onChange={e => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Novo PIN"
                className="text-center font-mono"
              />
            </FormField>

            <FormField label="Confirme o Novo PIN" error={changeError || undefined}>
              <Input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={confirmPinInput}
                onChange={e => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="Repita o novo PIN"
                className="text-center font-mono"
              />
            </FormField>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsChangingPin(false);
                  setChangeError(null);
                }}
                className="flex-1 justify-center"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="flex-1 justify-center"
              >
                Salvar PIN
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
