import React, { useEffect, useState } from 'react';
import { Target, Moon, Pill, Dumbbell, Utensils, CheckCircle2, Circle } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';

export type ComplianceStatus = 'loading' | 'no_record' | 'recorded' | 'error';

export interface CompliancePillars {
  sleep_schedule_ok: boolean;
  supplements_ok: boolean;
  exercise_ok: boolean;
  fasting_window_ok: boolean;
}

const DEFAULT_PILLARS: CompliancePillars = {
  sleep_schedule_ok: false,
  supplements_ok: false,
  exercise_ok: false,
  fasting_window_ok: false,
};

const PILLARS: Array<{
  key: keyof CompliancePillars;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  iconColor: string;
}> = [
  {
    key: 'sleep_schedule_ok',
    title: 'Janela de Sono',
    description: 'Dormir e acordar no horário',
    icon: Moon,
    iconColor: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'supplements_ok',
    title: 'Suplementação',
    description: 'Rotina do dia completa',
    icon: Pill,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
  },
  {
    key: 'exercise_ok',
    title: 'Treino / Exercício',
    description: 'Sessão de treino cumprida',
    icon: Dumbbell,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'fasting_window_ok',
    title: 'Janela de Jejum',
    description: 'Jejum noturno respeitado',
    icon: Utensils,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
];

interface DailyComplianceWidgetProps {
  selectedDate: string;
}

export const DailyComplianceWidget: React.FC<DailyComplianceWidgetProps> = ({ selectedDate }) => {
  const [compliance, setCompliance] = useState<CompliancePillars>(DEFAULT_PILLARS);
  const [status, setStatus] = useState<ComplianceStatus>('loading');
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCompliance = async () => {
    setStatus('loading');
    setLoadError(null);
    try {
      const response = await requestJson<any[]>('/api/compliance/history?days=14');
      if (Array.isArray(response)) {
        const found = response.find((item) => item.date_ref === selectedDate);
        if (found) {
          setCompliance({
            sleep_schedule_ok: Boolean(found.sleep_schedule_ok),
            supplements_ok: Boolean(found.supplements_ok),
            exercise_ok: Boolean(found.exercise_ok),
            fasting_window_ok: Boolean(found.fasting_window_ok),
          });
          setStatus('recorded');
        } else {
          setCompliance(DEFAULT_PILLARS);
          setStatus('no_record');
        }
      } else {
        setCompliance(DEFAULT_PILLARS);
        setStatus('no_record');
      }
    } catch (caught) {
      setStatus('error');
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar a adesão à rotina.');
    }
  };

  useEffect(() => {
    void loadCompliance();
  }, [selectedDate]);

  const handleTogglePillar = async (key: keyof CompliancePillars) => {
    if (isSaving) return;
    const previousPillars = compliance;
    const previousStatus = status;

    const updated = { ...compliance, [key]: !compliance[key] };
    setCompliance(updated);
    setStatus('recorded');
    setIsSaving(true);
    setLoadError(null);

    try {
      await requestJson('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_ref: selectedDate,
          ...updated,
        }),
      });
    } catch (caught) {
      console.error(caught);
      setCompliance(previousPillars);
      setStatus(previousStatus);
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível salvar a alteração.');
    } finally {
      setIsSaving(false);
    }
  };

  const scorePct =
    ((compliance.sleep_schedule_ok ? 1 : 0) +
      (compliance.supplements_ok ? 1 : 0) +
      (compliance.exercise_ok ? 1 : 0) +
      (compliance.fasting_window_ok ? 1 : 0)) *
    25;

  return (
    <div className="glass-card p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between h-full shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-radius-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Target className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Adesão à rotina</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">Hábitos e metas ({selectedDate})</p>
          </div>
        </div>

        <div className="text-right">
          {status === 'loading' ? (
            <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 animate-pulse block py-1">
              Carregando...
            </span>
          ) : status === 'no_record' ? (
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 block py-1" data-testid="compliance-no-record">
              Sem registro
            </span>
          ) : (
            <span className="text-2xl font-black text-slate-900 dark:text-white" data-testid="compliance-score">
              {scorePct}%
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-bold">Adesão</span>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="mb-4 rounded-radius-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-800 dark:text-rose-300">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        {PILLARS.map((p) => {
          const checked = compliance[p.key];
          const Icon = p.icon;
          return (
            /* ds-exception: DSX-017 */
            <button
              key={p.key}
              type="button"
              role="switch"
              aria-checked={checked}
              aria-label={`${p.title}: ${p.description}`}
              disabled={isSaving}
              onClick={() => void handleTogglePillar(p.key)}
              className={`p-3 rounded-radius-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 flex items-center gap-2.5 ${
                isSaving ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
              } ${
                checked
                  ? 'bg-indigo-500/10 dark:bg-indigo-950/30 border-indigo-500/40 text-slate-900 dark:text-white'
                  : 'bg-slate-100/90 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {checked ? (
                <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
              ) : (
                <Circle className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <span className="text-xs font-bold block text-slate-900 dark:text-white">{p.title}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Icon className={`h-3 w-3 ${p.iconColor}`} aria-hidden="true" /> {p.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
