import React, { useEffect, useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle, Activity, Dna, Shield } from 'lucide-react';

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  isSyncing: boolean;
  syncResult?: {
    zepp_records_imported?: number;
    google_fit_records_imported?: number;
    total_sources?: number;
  } | null;
}

export const SyncProgressModal: React.FC<SyncProgressModalProps> = ({
  isOpen,
  onClose,
  isSyncing,
  syncResult
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isOpen && isSyncing) {
      setElapsedSeconds(0);
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, isSyncing]);

  if (!isOpen) return null;

  const isSuccess = !isSyncing && syncResult !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl glass-card border border-emerald-500/30 p-6 shadow-2xl text-center bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        {!isSyncing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center justify-center mb-6">
          {isSyncing ? (
            <div className="relative w-20 h-20 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin glow-emerald" />
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-pulse" />
            </div>
          ) : isSuccess ? (
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center mb-4 text-emerald-400 glow-emerald">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/40 flex items-center justify-center mb-4 text-amber-400">
              <AlertCircle className="w-10 h-10" />
            </div>
          )}

          <h2 className="text-xl font-extrabold text-white">
            {isSyncing
              ? 'Sincronizando Fontes de Longevidade...'
              : isSuccess
              ? 'Sincronização Concluída!'
              : 'Concluir Sincronização'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isSyncing
              ? `Reconciliando Zepp + Google Fit Hub (${elapsedSeconds}s)`
              : isSuccess
              ? 'Todas as métricas de wearable, sono, passos e PA foram atualizadas com sucesso.'
              : 'Aguardando atualização das fontes.'}
          </p>
        </div>

        {/* Progress bar line */}
        <div className="w-full bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isSyncing
                ? 'w-3/4 bg-gradient-to-r from-emerald-500 to-cyan-500 animate-pulse'
                : 'w-full bg-emerald-500'
            }`}
          />
        </div>

        {/* Stream checklist */}
        <div className="space-y-2 mb-6 text-left">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Zepp / Amazfit Wearable (HRV, Sono, RHR)</span>
            </div>
            <span className={isSyncing ? 'text-cyan-400 font-semibold animate-pulse' : 'text-emerald-400 font-bold'}>
              {isSyncing ? 'Processando...' : `${syncResult?.zepp_records_imported ?? 0} recs`}
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span>Google Fit Hub (Passos & Pressão Arterial)</span>
            </div>
            <span className={isSyncing ? 'text-cyan-400 font-semibold animate-pulse' : 'text-emerald-400 font-bold'}>
              {isSyncing ? 'Processando...' : `${syncResult?.google_fit_records_imported ?? 0} recs`}
            </span>
          </div>
        </div>

        {!isSyncing && (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all glow-emerald"
          >
            Fechar e Atualizar Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
