import React, { useState, useEffect } from 'react';
import { Target, Moon, Pill, Dumbbell, Utensils, CheckCircle2, Circle } from 'lucide-react';

interface DailyComplianceWidgetProps {
  selectedDate: string;
}

export const DailyComplianceWidget: React.FC<DailyComplianceWidgetProps> = ({ selectedDate }) => {
  const [compliance, setCompliance] = useState({
    sleep_schedule_ok: false,
    supplements_ok: false,
    exercise_ok: false,
    fasting_window_ok: false
  });

  const loadCompliance = async () => {
    try {
      const res = await fetch('/api/compliance/history?days=14').then(r => r.json());
      if (res && Array.isArray(res)) {
        const found = res.find((item: any) => item.date_ref === selectedDate);
        if (found) {
          setCompliance({
            sleep_schedule_ok: Boolean(found.sleep_schedule_ok),
            supplements_ok: Boolean(found.supplements_ok),
            exercise_ok: Boolean(found.exercise_ok),
            fasting_window_ok: Boolean(found.fasting_window_ok)
          });
        } else {
          setCompliance({
            sleep_schedule_ok: false,
            supplements_ok: false,
            exercise_ok: false,
            fasting_window_ok: false
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadCompliance();
  }, [selectedDate]);

  const handleTogglePillar = async (key: keyof typeof compliance) => {
    const updated = { ...compliance, [key]: !compliance[key] };
    setCompliance(updated);

    try {
      await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date_ref: selectedDate,
          ...updated
        })
      });
    } catch (e) {
      console.error(e);
      loadCompliance();
    }
  };

  const scorePct = (
    (compliance.sleep_schedule_ok ? 1 : 0) +
    (compliance.supplements_ok ? 1 : 0) +
    (compliance.exercise_ok ? 1 : 0) +
    (compliance.fasting_window_ok ? 1 : 0)
  ) * 25;

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Score de Disciplina Blueprint</h3>
            <p className="text-[11px] text-slate-400">Padrão de Longevidade ({selectedDate})</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-2xl font-black text-white">{scorePct}%</span>
          <span className="text-[10px] text-slate-400 block uppercase font-bold">Conformidade</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Pilar 1: Janela de Sono */}
        <div
          onClick={() => handleTogglePillar('sleep_schedule_ok')}
          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 ${
            compliance.sleep_schedule_ok
              ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          {compliance.sleep_schedule_ok ? (
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-slate-600 shrink-0" />
          )}
          <div>
            <span className="text-xs font-bold block text-white">Janela de Sono</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Moon className="h-3 w-3 text-indigo-400" /> Dormir & Acordar no horário
            </span>
          </div>
        </div>

        {/* Pilar 2: Suplementos */}
        <div
          onClick={() => handleTogglePillar('supplements_ok')}
          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 ${
            compliance.supplements_ok
              ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          {compliance.supplements_ok ? (
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-slate-600 shrink-0" />
          )}
          <div>
            <span className="text-xs font-bold block text-white">Suplementação</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Pill className="h-3 w-3 text-cyan-400" /> Pilha do dia completa
            </span>
          </div>
        </div>

        {/* Pilar 3: Exercício */}
        <div
          onClick={() => handleTogglePillar('exercise_ok')}
          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 ${
            compliance.exercise_ok
              ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          {compliance.exercise_ok ? (
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-slate-600 shrink-0" />
          )}
          <div>
            <span className="text-xs font-bold block text-white">Treino / Exercício</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Dumbbell className="h-3 w-3 text-emerald-400" /> Sessão de treino cumprida
            </span>
          </div>
        </div>

        {/* Pilar 4: Janela de Jejum */}
        <div
          onClick={() => handleTogglePillar('fasting_window_ok')}
          className={`p-3 rounded-2xl border transition cursor-pointer flex items-center gap-2.5 ${
            compliance.fasting_window_ok
              ? 'bg-indigo-950/30 border-indigo-500/40 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          {compliance.fasting_window_ok ? (
            <CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" />
          ) : (
            <Circle className="h-4 w-4 text-slate-600 shrink-0" />
          )}
          <div>
            <span className="text-xs font-bold block text-white">Janela de Jejum</span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Utensils className="h-3 w-3 text-amber-400" /> Jejum noturno respeitado
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
