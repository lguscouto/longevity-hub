import React, { useState } from 'react';
import { Dna, ArrowDownRight, ArrowUpRight, Calculator, CheckCircle2 } from 'lucide-react';

interface PhenoAgeRecord {
  pheno_age: number;
  chronological_age: number;
  age_delta: number;
  calculated_at?: string;
}

interface PhenoAgeWidgetProps {
  latestRecord?: PhenoAgeRecord;
  onRecalculate: (inputData: any) => void;
}

export const PhenoAgeWidget: React.FC<PhenoAgeWidgetProps> = ({ latestRecord, onRecalculate }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    chronological_age: 40,
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

  const isYounger = (latestRecord?.age_delta ?? 0) < 0;

  return (
    <>
      <div className="p-6 rounded-3xl glass-panel border border-cyan-500/20 bg-gradient-to-br from-cyan-950/20 via-slate-900/60 to-slate-950">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white glow-cyan">
              <Dna className="h-8 w-8 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Idade Epigenética PhenoAge</h2>
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Morgan Levine Alg.</span>
              </div>
              <p className="text-xs text-slate-400">Estimativa biológica via 9 biomarcadores de sangue</p>
            </div>
          </div>

          {/* Display Score */}
          <div className="flex items-center gap-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Idade Biológica</span>
              <span className="text-2xl font-extrabold text-white">{latestRecord ? `${latestRecord.pheno_age} anos` : '(Sem dados)'}</span>
            </div>

            <div className="h-8 w-[1px] bg-slate-800" />

            <div className="text-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Delta Rejuvenescimento</span>
              <div className="flex items-center justify-center gap-1">
                {latestRecord ? (
                  <>
                    {isYounger ? (
                      <ArrowDownRight className="h-5 w-5 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-rose-400" />
                    )}
                    <span className={`text-xl font-bold ${isYounger ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {`${latestRecord.age_delta > 0 ? '+' : ''}${latestRecord.age_delta} yrs`}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">(Sem dados)</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 transition glow-cyan"
            >
              <Calculator className="h-4 w-4" /> Calcular PhenoAge
            </button>
          </div>
        </div>
      </div>

      {/* Modal Calculator Rendered outside card overflow context */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-cyan-400" /> Calculadora de PhenoAge (Morgan Levine)
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
