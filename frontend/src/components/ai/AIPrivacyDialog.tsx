import React from 'react';
import { ConfirmDialog } from '../ui';

export interface AIPrivacyDialogProps {
  pendingConfirm: {
    actionLabel: string;
    resolve: (ok: boolean) => void;
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
      title="Confirmar envio para a IA"
      description={
        pendingConfirm ? (
          <div className="space-y-3 text-xs">
            <p>
              Alguns dos seus dados poderão ser enviados ao serviço de IA escolhido para gerar esta análise. Revise o que será compartilhado antes de continuar.
            </p>
            {pendingConfirm.actionLabel && (
              <p className="text-slate-600 dark:text-slate-400">
                Ação: <strong>{pendingConfirm.actionLabel}</strong>
              </p>
            )}
            <div className="p-3 rounded-radius-sm bg-slate-100 dark:bg-slate-800 space-y-1 font-mono text-xs">
              <div>
                <strong>Provedor:</strong> {activeProvider.toUpperCase()}
              </div>
              <div>
                <strong>Modelo:</strong> {selectedModel}
              </div>
              <div>
                <strong>Modo:</strong> {privacyModeLabel}
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{privacyModeDescription}</p>
          </div>
        ) : undefined
      }
      confirmLabel="Enviar e continuar"
      cancelLabel="Cancelar"
    />
  );
};
