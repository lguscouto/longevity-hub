import React from 'react';
import { Calculator } from 'lucide-react';
import { TermHelp } from '../ui';
import { LabResult, normalizeLabMetricKey } from './labMarkers';

const hasNumber = (value: number | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Cartões de Razões Cardiovasculares Avançadas (UX_UI_54) — métricas derivadas/calculadas com proveniência e fórmula sob demanda. */
export const CardiovascularRatios: React.FC<{ clinicalLabs: LabResult[] }> = ({ clinicalLabs }) => {
  const getV = (k: string) => clinicalLabs.find((l) => normalizeLabMetricKey(l.metric_key) === k)?.value;
  const apob = getV('apob');
  const apoa1 = getV('apoa1');
  const tg = getV('triglycerides');
  const hdl = getV('hdl_cholesterol');
  const totalChol = getV('total_cholesterol');
  const ldl = getV('ldl_cholesterol');

  const ratioApobApoa1 =
    hasNumber(apob) && hasNumber(apoa1) && apoa1 > 0 ? (apob / apoa1).toFixed(2) : null;
  const ratioTgHdl =
    hasNumber(tg) && hasNumber(hdl) && hdl > 0 ? (tg / hdl).toFixed(2) : null;
  const remnantChol =
    hasNumber(totalChol) && hasNumber(hdl) && hasNumber(ldl)
      ? (totalChol - hdl - ldl).toFixed(1)
      : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Razão ApoB / ApoA1 */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Razão ApoB / ApoA1
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-radius-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
              title="Métrica derivada calculada a partir de exames laboratoriais primários"
            >
              <Calculator className="h-2.5 w-2.5" aria-hidden="true" /> Calculado
            </span>
          </div>
          <TermHelp termKey="apob" />
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white" data-testid="ratio-apob-apoa1">
            {ratioApobApoa1 ? ratioApobApoa1 : '(Sem ApoB/A1)'}
          </span>
          <span
            className="text-xs font-bold text-cyan-600 dark:text-cyan-400"
            title="Referência funcional preconizada para longevidade preventiva (Peter Attia / Consensus)"
          >
            Alvo Ótimo: &lt; 0.60
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Índice de risco aterogênico celular • <span className="font-mono text-xs text-slate-400 dark:text-slate-500">ApoB ÷ ApoA1</span>
        </p>
      </div>

      {/* Razão Triglicerídeos / HDL */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Razão Triglicerídeos / HDL
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-radius-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
              title="Métrica derivada calculada a partir de exames laboratoriais primários"
            >
              <Calculator className="h-2.5 w-2.5" aria-hidden="true" /> Calculado
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white" data-testid="ratio-tg-hdl">
            {ratioTgHdl ? ratioTgHdl : '(Sem TG/HDL)'}
          </span>
          <span
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400"
            title="Referência funcional preconizada para longevidade preventiva"
          >
            Alvo Ótimo: &lt; 1.50
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sensibilidade à insulina e densidade de LDL • <span className="font-mono text-xs text-slate-400 dark:text-slate-500">Triglicérides ÷ HDL</span>
        </p>
      </div>

      {/* Colesterol Remanescente */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Colesterol Remanescente
            </span>
            <span
              className="inline-flex items-center gap-1 text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-radius-sm bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20"
              title="Métrica derivada calculada a partir de exames laboratoriais primários"
            >
              <Calculator className="h-2.5 w-2.5" aria-hidden="true" /> Calculado
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <span className="text-xl font-extrabold text-slate-900 dark:text-white" data-testid="remnant-cholesterol">
            {remnantChol ? `${remnantChol} mg/dL` : '(Sem dados)'}
          </span>
          <span
            className="text-xs font-bold text-amber-600 dark:text-amber-400"
            title="Referência funcional preconizada para longevidade preventiva"
          >
            Alvo Ótimo: &lt; 15 mg/dL
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Fração lipoproteica aterogênica residual • <span className="font-mono text-xs text-slate-400 dark:text-slate-500">Total - HDL - LDL</span>
        </p>
      </div>
    </div>
  );
};
