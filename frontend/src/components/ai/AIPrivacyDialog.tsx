import React from 'react';
import { ConfirmDialog } from '../ui';

export interface AIPrivacyDialogProps {
  pendingConfirm: {
    actionLabel: string;
    resolve: (ok: boolean) => void;
    preview: { provider: string; model: string; privacy_mode: string; context: string; system_prompt: string; review_hash: string };
  } | null;
  onClose: () => void;
  onConfirm: () => void;
  activeProvider: string;
  selectedModel: string;
  privacyModeLabel: string;
  privacyModeDescription: string;
}

export const AIPrivacyDialog: React.FC<AIPrivacyDialogProps> = ({
  pendingConfirm,
  onClose,
  onConfirm,
  activeProvider,
  selectedModel,
  privacyModeLabel,
  privacyModeDescription,
}) => {
  return (
    <ConfirmDialog
      isOpen={Boolean(pendingConfirm)}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Enviar dados para a IA?"
      description={
        pendingConfirm ? (
          <div className="space-y-3 text-xs">
            <p>
              Para gerar esta análise, alguns dos seus dados serão enviados ao serviço de IA escolhido. Confira abaixo o que será compartilhado antes de continuar.
            </p>
            {pendingConfirm.actionLabel && (
              <p className="text-slate-600 dark:text-slate-400">
                O que você está fazendo: <strong>{pendingConfirm.actionLabel}</strong>
              </p>
            )}
            <div className="p-3 rounded-radius-sm bg-slate-100 dark:bg-slate-800 space-y-1 font-mono text-xs">
              <div>
                <strong>Serviço:</strong> {(pendingConfirm.preview.provider || activeProvider).toUpperCase()}
              </div>
              <div>
                <strong>Modelo:</strong> {pendingConfirm.preview.model || selectedModel}
              </div>
              <div>
                <strong>Privacidade:</strong> {pendingConfirm.preview.privacy_mode === 'full' ? 'Contexto ampliado' : privacyModeLabel}
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{privacyModeDescription}</p>
            <p>Contexto que será enviado; se os dados mudarem, uma nova revisão será solicitada.</p>
            <pre className="whitespace-pre-wrap max-h-48 overflow-auto p-2 rounded-radius-sm bg-slate-100 dark:bg-slate-900">{pendingConfirm.preview.context}</pre>
            <details><summary>Instruções de sistema</summary><pre className="whitespace-pre-wrap max-h-32 overflow-auto">{pendingConfirm.preview.system_prompt}</pre></details>
          </div>
        ) : undefined
      }
      confirmLabel="Enviar e continuar"
      cancelLabel="Cancelar"
    />
  );
};
