import React from 'react';
import { TermHelp } from '../ui';
import { LabResult, normalizeLabMetricKey } from './labMarkers';

const hasNumber = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value);

/** Cartões de Razões Cardiovasculares Avançadas (Fase 3) — usam apenas exames clinicamente elegíveis. */
export const CardiovascularRatios: React.FC<{ clinicalLabs: LabResult[] }> = ({ clinicalLabs }) => {
  const getV = (k: string) => clinicalLabs.find(l => normalizeLabMetricKey(l.metric_key) === k)?.value;
  const apob = getV('apob');
  const apoa1 = getV('apoa1');
  const tg = getV('triglycerides');
  const hdl = getV('hdl_cholesterol');
  const totalChol = getV('total_cholesterol');
  const ldl = getV('ldl_cholesterol');

  const ratioApobApoa1 = (hasNumber(apob) && hasNumber(apoa1) && apoa1 > 0) ? (apob / apoa1).toFixed(2) : null;
  const ratioTgHdl = (hasNumber(tg) && hasNumber(hdl) && hdl > 0) ? (tg / hdl).toFixed(2) : null;
  const remnantChol = (hasNumber(totalChol) && hasNumber(hdl) && hasNumber(ldl)) ? (totalChol - hdl - ldl).toFixed(1) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Razão ApoB / ApoA1</span>
          <TermHelp termKey="apob" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">{ratioApobApoa1 ? ratioApobApoa1 : '(Sem ApoB/A1)'}</span>
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400" title="Referência funcional preconizada para longevidade preventiva">Referência Ótima: &lt; 0.60</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Índice primário de risco aterogênico celular (Attia / Longevidade Hub)</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Razão Triglicerídeos / HDL</span>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">{ratioTgHdl ? ratioTgHdl : '(Sem TG/HDL)'}</span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400" title="Referência funcional preconizada para longevidade preventiva">Referência Ótima: &lt; 1.5</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Indicador direto de sensibilidade à insulina e LDL denso</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Colesterol Remanescente</span>
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white">{remnantChol ? `${remnantChol} mg/dL` : '(Sem dados)'}</span>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400" title="Referência funcional preconizada para longevidade preventiva">Referência Ótima: &lt; 15 mg/dL</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Lipoproteínas altamente inflamatórias (Total - HDL - LDL)</p>
      </div>
    </div>
  );
};
