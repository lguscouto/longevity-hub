import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Circle, Plus, Sparkles, Clock, RefreshCw, AlertCircle } from 'lucide-react';

interface Supplement {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  start_date: string;
  notes?: string;
}

interface SupplementStackWidgetProps {
  selectedDate: string;
}

export const SupplementStackWidget: React.FC<SupplementStackWidgetProps> = ({ selectedDate }) => {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [takenIds, setTakenIds] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    frequency: 'Diário',
    timing: 'Manhã',
    notes: ''
  });

  const loadData = async () => {
    try {
      const [resSupps, resLogs] = await Promise.all([
        fetch('/api/supplements').then(r => r.json()),
        fetch(`/api/supplements/logs/${selectedDate}`).then(r => r.json())
      ]);
      setSupplements(resSupps || []);
      setTakenIds(resLogs || []);
    } catch (e) {
      console.error("Erro ao carregar suplementos:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleToggleLog = async (id: number) => {
    // Optimistic UI Update
    setTakenIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

    try {
      await fetch('/api/supplements/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: id, date_ref: selectedDate })
      });
    } catch (e) {
      console.error(e);
      loadData();
    }
  };

  const handleAddSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage) return;

    try {
      const res = await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowAddModal(false);
        setFormData({ name: '', dosage: '', frequency: 'Diário', timing: 'Manhã', notes: '' });
        await loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/ai/analyze-supplements', { method: 'POST' });
      const body = await res.json();
      if (res.ok) {
        setAiAnalysis(body.analysis);
      } else {
        setAiAnalysis(`⚠️ ${body.detail || 'Falha ao analisar suplementos com IA.'}`);
      }
    } catch (e) {
      setAiAnalysis('⚠️ Erro de conexão com o servidor de IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const completionPct = supplements.length > 0
    ? Math.round((takenIds.length / supplements.length) * 100)
    : 0;

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Pilha de Suplementos (Longevity Stack)</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {completionPct}% Cumprido
              </span>
            </div>
            <p className="text-xs text-slate-400">Rastreamento diário e cronobiologia de tomadas</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 flex items-center gap-1.5 transition glow-cyan"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isAnalyzing ? 'Analisando...' : '⚡ Otimizar Pilha com IA'}
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Adicionar Suplemento"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Análise de IA em Destaque */}
      {aiAnalysis && (
        <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 text-xs text-slate-200 space-y-2 relative">
          <button
            onClick={() => setAiAnalysis(null)}
            className="absolute top-2 right-2 text-slate-400 hover:text-white text-xs"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
            <Sparkles className="h-4 w-4" /> Parecer de Inteligência Artificial da Pilha:
          </div>
          <div className="whitespace-pre-wrap leading-relaxed text-slate-300 max-h-48 overflow-y-auto pr-1">
            {aiAnalysis}
          </div>
        </div>
      )}

      {/* Lista de Suplementos em Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {supplements.map(supp => {
          const isTaken = takenIds.includes(supp.id);
          return (
            <div
              key={supp.id}
              onClick={() => handleToggleLog(supp.id)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                isTaken
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {isTaken ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-600 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    {supp.name}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                    <span className="font-semibold text-cyan-400">{supp.dosage}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" /> {supp.timing}
                    </span>
                  </div>
                </div>
              </div>

              {supp.notes && (
                <span className="text-[9px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 max-w-[90px] truncate" title={supp.notes}>
                  {supp.notes}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar Suplemento */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="h-4 w-4 text-cyan-400" /> Cadastrar Novo Suplemento
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleAddSupplement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome do Suplemento / Composto</label>
                <input
                  type="text"
                  placeholder="ex: NMN, Resveratrol, Metformina"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Dosagem</label>
                  <input
                    type="text"
                    placeholder="ex: 500 mg, 2000 UI"
                    value={formData.dosage}
                    onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Horário de Tomada</label>
                  <select
                    value={formData.timing}
                    onChange={e => setFormData({ ...formData, timing: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Manhã (Jejum)">Manhã (Jejum)</option>
                    <option value="Manhã">Manhã</option>
                    <option value="Almoço">Almoço</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Noite (Antes de dormir)">Noite (Antes de dormir)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Notas / Objetivo do Biohack</label>
                <input
                  type="text"
                  placeholder="ex: Otimização mitocondrial, NAD+"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold glow-cyan">Salvar Suplemento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
