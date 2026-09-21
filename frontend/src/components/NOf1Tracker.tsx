import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, Plus, CheckCircle2, AlertCircle, TrendingUp, BarChart2 } from 'lucide-react';

interface NOf1Experiment {
  id?: number;
  title: string;
  hypothesis?: string;
  metric_key: string;
  control_start: string;
  control_end: string;
  treatment_start: string;
  treatment_end: string;
  control_mean?: number;
  treatment_mean?: number;
  cohens_d?: number;
  p_value?: number;
  statistically_significant?: number | boolean;
  status?: string;
}

interface NOf1TrackerProps {
  experiments: NOf1Experiment[];
  onCreateExperiment: (expData: any) => void;
}

export const NOf1Tracker: React.FC<NOf1TrackerProps> = ({ experiments, onCreateExperiment }) => {
  const [showModal, setShowModal] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const [formData, setFormData] = useState({
    title: '',
    hypothesis: '',
    metric_key: 'hrv_ms',
    control_start: todayStr,
    control_end: todayStr,
    treatment_start: todayStr,
    treatment_end: todayStr,
    status: 'em_andamento'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateExperiment(formData);
    setShowModal(false);
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-900 dark:text-white font-medium focus:border-violet-500 focus:outline-none";

  return (
    <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" /> Experimentos N-of-1 (A/B Testing Pessoal)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">Validação estatística rigorosa (14d Controle vs 14d Intervenção) com d de Cohen e p-value</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-500 hover:bg-violet-400 text-slate-950 transition glow-violet shadow-md w-full sm:w-auto shrink-0"
        >
          <Plus className="h-4 w-4" /> Criar Experimento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {experiments.length === 0 ? (
          <div className="col-span-2 py-10 text-center text-slate-500 glass-card rounded-2xl border border-slate-200 dark:border-slate-800">
            Nenhum experimento N-of-1 ativo. Clique em "Criar Experimento" para testar uma nova suplementação ou alteração no estilo de vida.
          </div>
        ) : (
          experiments.map((exp, idx) => {
            const isSig = Boolean(exp.statistically_significant);
            return (
              <div key={idx} className="glass-card rounded-2xl p-5 border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-slate-50 to-white dark:from-violet-950/20 dark:to-slate-900 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 tracking-wider">Métrica: {exp.metric_key}</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{exp.title}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isSig ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'}`}>
                    {isSig ? 'Significativo (p < 0.05)' : 'Em andamento'}
                  </span>
                </div>

                {exp.hypothesis && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 mb-4 bg-slate-100/90 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    💡 <strong className="text-slate-900 dark:text-slate-200">Hipótese:</strong> {exp.hypothesis}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-900/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Média Controle</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{exp.control_mean ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Média Intervenção</span>
                    <span className="font-bold text-violet-700 dark:text-violet-300">{exp.treatment_mean ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Efeito (Cohen's d)</span>
                    <span className="font-bold text-cyan-700 dark:text-cyan-400">{exp.cohens_d ?? '--'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">p-value</span>
                    <span className="font-bold text-amber-700 dark:text-amber-400">{exp.p_value ?? '--'}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-violet-600 dark:text-violet-400" /> Criar Experimento N-of-1
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Título do Experimento</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Hipótese</label>
                <input type="text" value={formData.hypothesis} onChange={e => setFormData({...formData, hypothesis: e.target.value})} className={inputClass} />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Métrica Testada</label>
                <select value={formData.metric_key} onChange={e => setFormData({...formData, metric_key: e.target.value})} className={inputClass}>
                  <option value="hrv_ms">HRV (Variabilidade da Frequência Cardíaca)</option>
                  <option value="sleep_deep_min">Sono Profundo (minutos)</option>
                  <option value="sleep_rem_min">Sono REM (minutos)</option>
                  <option value="rhr_bpm">Frequência Cardíaca de Repouso (RHR)</option>
                  <option value="readiness_score">Readiness Score</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Início Controle (14d)</label>
                  <input type="date" value={formData.control_start} onChange={e => setFormData({...formData, control_start: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Fim Controle</label>
                  <input type="date" value={formData.control_end} onChange={e => setFormData({...formData, control_end: e.target.value})} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Início Intervenção (14d)</label>
                  <input type="date" value={formData.treatment_start} onChange={e => setFormData({...formData, treatment_start: e.target.value})} className={inputClass} />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Fim Intervenção</label>
                  <input type="date" value={formData.treatment_end} onChange={e => setFormData({...formData, treatment_end: e.target.value})} className={inputClass} />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-400 text-slate-950 font-bold glow-violet transition shadow-md">Criar & Analisar</button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </div>
  );
};
