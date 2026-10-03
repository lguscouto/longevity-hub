import React, { useState, useMemo } from 'react';
import { History, Search, ArrowRight } from 'lucide-react';
import { EmptyState, Input } from '../ui';
import { AuditLog } from './types';

export interface AuditHistoryViewProps {
  auditLogs: AuditLog[];
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ auditLogs }) => {
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchTerm.trim()) return auditLogs;
    const term = auditSearchTerm.toLowerCase();
    return auditLogs.filter(
      (l) =>
        l.compound_name.toLowerCase().includes(term) ||
        l.action_type.toLowerCase().includes(term) ||
        l.category?.toLowerCase().includes(term) ||
        l.old_value?.toLowerCase().includes(term) ||
        l.new_value?.toLowerCase().includes(term)
    );
  }, [auditLogs, auditSearchTerm]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-500" />
              Rastreabilidade Imutável de Prescrição & Ajustes
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Registro cronológico longitudinal auditado de inclusões, alterações de dosagens e descontinuações.
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Input
              type="text"
              placeholder="Filtrar eventos de auditoria..."
              value={auditSearchTerm}
              onChange={(e) => setAuditSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4 text-slate-400" />}
            />
          </div>
        </div>

        {filteredAuditLogs.length === 0 ? (
          <EmptyState
            title="Nenhum registro de auditoria encontrado"
            description="Alterações em dosagens, compostos ou horários serão registradas automaticamente aqui com carimbo de data/hora."
          />
        ) : (
          <div className="space-y-3">
            {filteredAuditLogs.map((log) => {
              const isAdd = log.action_type === 'ADICIONADO';
              const isDel = log.action_type === 'REMOVIDO';
              const isDose = log.action_type === 'DOSE_ALTERADA';
              const isTiming = log.action_type === 'HORARIO_ALTERADO';

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs uppercase font-black px-2 py-0.5 rounded border ${
                          isAdd
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : isDel
                            ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30'
                            : isDose
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {log.action_type}
                      </span>
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {log.compound_name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({log.category || 'Suplemento'})
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {String(log.created_at).slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>

                  {/* Conteúdo da Alteração */}
                  <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    {isDose && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">Dosagem ajustada:</span>
                        <span className="line-through text-slate-400">{log.old_value}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                        <strong className="text-amber-600 dark:text-amber-400 font-bold">{log.new_value}</strong>
                      </div>
                    )}

                    {isTiming && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500">Horário alterado:</span>
                        <span className="line-through text-slate-400">{log.old_value}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-500" />
                        <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{log.new_value}</strong>
                      </div>
                    )}

                    {isAdd && (
                      <div className="text-emerald-700 dark:text-emerald-300">
                        <span className="text-slate-500">Parâmetros iniciais: </span>
                        <strong>{log.new_value}</strong>
                      </div>
                    )}

                    {isDel && (
                      <div className="text-rose-700 dark:text-rose-300">
                        <span className="text-slate-500">Último estado registrado: </span>
                        <strong>{log.old_value}</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
