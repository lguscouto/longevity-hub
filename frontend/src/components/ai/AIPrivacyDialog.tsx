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
      title="Confirmar Envio para IA Externa"
      description={
        pendingConfirm ? (
          <div className="space-y-3 text-xs">
            <p>
              Antes de <strong>{pendingConfirm.actionLabel}</strong>, confirme o envio de dados para o
              provedor de IA:
            </p>
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
      confirmLabel="Confirmar Envio"
      cancelLabel="Cancelar"
    />
  );
};
