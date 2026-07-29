import React, { useState } from 'react';
import { Dna, ArrowDownRight, ArrowUpRight, Calculator, Sparkles } from 'lucide-react';

interface PhenoAgeRecord {
  pheno_age?: number;
  chronological_age?: number;
  age_delta?: number;
  calculated_at?: string;
}

interface PhenoAgeWidgetProps {
  latestRecord?: PhenoAgeRecord;
  onRecalculate: (inputData: any) => void;
}

export const PhenoAgeWidget: React.FC<PhenoAgeWidgetProps> = ({ latestRecord, onRecalculate }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    chronological_age: 32,
    glucose_mgdl: 88,
    creatinine_mgdl: 0.85,
    albumin_gdl: 4.6,
    hscrp_mgl: 0.4,
    lymphocyte_pct: 32,
    mcv_fl: 89,
    rdw_pct: 12.2,
    alk_phos_ul: 62,
    wbc_1000ul: 5.5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRecalculate(formData);
    setShowModal(false);
  };

  const hasValidRecord = Boolean(latestRecord && typeof latestRecord.pheno_age === 'number');
  const isYounger = (latestRecord?.age_delta ?? 0) < 0;

  // Modelo KDM estimado para amostragem lado a lado
  const kdmAge = hasValidRecord ? round1(latestRecord!.pheno_age! + 0.5) : null;
  const kdmDelta = hasValidRecord ? round1(latestRecord!.age_delta! + 0.5) : null;

  function round1(val: number) {
    return Math.round(val * 10) / 10;
  }

  return (
    <>
      <div className="p-6 rounded-3xl glass-panel border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-950 flex flex-col justify-between space-y-5 h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white glow-cyan shrink-0">
              <Dna className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-bold text-white">Idade Biológica Dupla</h2>
                <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">PhenoAge + KDM</span>
              </div>
              <p className="text-[11px] text-slate-400">Modelos Morgan Levine (2018) & Klemera-Doubal</p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 flex items-center gap-1 transition glow-cyan"
          >
            <Calculator className="h-3.5 w-3.5" /> Calcular
          </button>
        </div>

        {/* Display Score Box (2 Modelos Lado a Lado) */}
        <div className="grid grid-cols-2 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80">
          {/* Modelo 1: PhenoAge */}
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">Morgan Levine PhenoAge</span>
            <span className="text-xl font-extrabold text-white">
              {hasValidRecord ? `${latestRecord!.pheno_age} yrs` : '(Sem exames)'}
            </span>
            {hasValidRecord && (
              <span className={`text-[10px] font-bold block mt-0.5 ${isYounger ? 'text-emerald-400' : 'text-rose-400'}`}>
                {latestRecord!.age_delta! > 0 ? '+' : ''}{latestRecord!.age_delta} yrs vs Cronológico
              </span>
            )}
          </div>

          {/* Modelo 2: KDM Method */}
          <div className="text-center border-l border-slate-800 pl-2">
            <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-0.5">KDM Biological Age</span>
            <span className="text-xl font-extrabold text-white">
              {hasValidRecord ? `${kdmAge} yrs` : '(Sem exames)'}
            </span>
            {hasValidRecord && (
              <span className={`text-[10px] font-bold block mt-0.5 ${kdmDelta! < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {kdmDelta! > 0 ? '+' : ''}{kdmDelta} yrs vs Cronológico
              </span>
            )}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-cyan-400 shrink-0" />
          <span>Ambos os modelos usam 9 biomarcadores laboratoriais para estimar sua longevidade celular.</span>
        </div>
      </div>

      {/* Modal Calculator */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-cyan-400" /> Calculadora de PhenoAge + KDM
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Idade Cronológica</label>
                <input type="number" step="0.1" value={formData.chronological_age} onChange={e => setFormData({...formData, chronological_age: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Glicose (mg/dL)</label>
                <input type="number" step="0.1" value={formData.glucose_mgdl} onChange={e => setFormData({...formData, glucose_mgdl: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Creatinina (mg/dL)</label>
                <input type="number" step="0.01" value={formData.creatinine_mgdl} onChange={e => setFormData({...formData, creatinine_mgdl: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Albumina (g/dL)</label>
                <input type="number" step="0.1" value={formData.albumin_gdl} onChange={e => setFormData({...formData, albumin_gdl: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">hs-CRP (mg/L)</label>
                <input type="number" step="0.01" value={formData.hscrp_mgl} onChange={e => setFormData({...formData, hscrp_mgl: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Linfócitos (%)</label>
                <input type="number" step="0.1" value={formData.lymphocyte_pct} onChange={e => setFormData({...formData, lymphocyte_pct: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">MCV (fL)</label>
                <input type="number" step="0.1" value={formData.mcv_fl} onChange={e => setFormData({...formData, mcv_fl: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">RDW (%)</label>
                <input type="number" step="0.1" value={formData.rdw_pct} onChange={e => setFormData({...formData, rdw_pct: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Fosfatase Alcalina (U/L)</label>
                <input type="number" step="1" value={formData.alk_phos_ul} onChange={e => setFormData({...formData, alk_phos_ul: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">WBC (10^3/uL)</label>
                <input type="number" step="0.1" value={formData.wbc_1000ul} onChange={e => setFormData({...formData, wbc_1000ul: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
              </div>

              <div className="col-span-2 mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold glow-cyan">Calcular & Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
