import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Circle, Plus, Sparkles, Clock, RefreshCw, Trash2, Edit3, History, ShieldAlert, Activity, Filter, Search } from 'lucide-react';

interface Supplement {
  id: number;
  name: string;
  dosage: string;
  category?: string;
  frequency: string;
  timing: string;
  start_date: string;
  notes?: string;
}

interface AuditLog {
  id: number;
  supplement_id: number;
  compound_name: string;
  category: string;
  action_type: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

interface SupplementsViewProps {
  selectedDate: string;
}

const FormattedAnalysis: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];
  let currentKey = 0;

  const renderInline = (rawStr: string) => {
    const parts = rawStr.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="text-cyan-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div key={`table-${currentKey++}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90">
          <table className="w-full text-[11px] border-collapse">
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-200 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th key={cIdx} className="p-2 border-r last:border-r-0 border-slate-800">
                      {renderInline(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-slate-800/60 hover:bg-slate-900/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r last:border-r-0 border-slate-800/60 text-slate-300">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (line.includes('---')) continue;
      if (!inTable) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (!line) {
      elements.push(<div key={`sp-${currentKey++}`} className="h-1.5" />);
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={`h3-${currentKey++}`} className="font-extrabold text-white text-xs mt-3 mb-1.5 border-b border-slate-800 pb-1 flex items-center gap-1.5">
          {renderInline(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${currentKey++}`} className="font-black text-cyan-300 text-sm mt-3.5 mb-1.5 border-b border-cyan-500/20 pb-1">
          {renderInline(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ') || /^\d+\.\s/.test(line)) {
      const cleanLine = line.replace(/^[-*]\s+|\d+\.\s+/, '');
      elements.push(
        <div key={`li-${currentKey++}`} className="flex items-start gap-1.5 ml-2 my-0.5 text-slate-300 text-[11px]">
          <span className="text-cyan-400 font-bold">•</span>
          <span>{renderInline(cleanLine)}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${currentKey++}`} className="my-1 leading-relaxed text-slate-300 text-[11px]">
        {renderInline(line)}
      </p>
    );
  }

  if (inTable) flushTable();

  return <div className="space-y-0.5">{elements}</div>;
};

export const SupplementsView: React.FC<SupplementsViewProps> = ({ selectedDate }) => {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [takenIds, setTakenIds] = useState<number[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'Todos' | 'Suplemento' | 'Hormônio'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupp, setEditingSupp] = useState<Supplement | null>(null);
  const [deleteConfirmSupp, setDeleteConfirmSupp] = useState<{ id: number; name: string } | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const [addFormData, setAddFormData] = useState({
    name: '',
    dosage: '',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Manhã (Jejum)',
    notes: ''
  });

  const [editFormData, setEditFormData] = useState({
    supplement_id: 0,
    name: '',
    dosage: '',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Manhã',
    notes: ''
  });

  const loadAllData = async () => {
    try {
      const [resSupps, resLogs, resAudit] = await Promise.all([
        fetch('/api/supplements').then(r => r.json()),
        fetch(`/api/supplements/logs/${selectedDate}`).then(r => r.json()),
        fetch('/api/supplements/audit-logs').then(r => r.json())
      ]);
      setSupplements(resSupps || []);
      setTakenIds(resLogs || []);
      setAuditLogs(resAudit || []);
    } catch (e) {
      console.error("Erro ao carregar dados de suplementos e auditoria:", e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [selectedDate]);

  const handleToggleLog = async (id: number) => {
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
      loadAllData();
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name || !addFormData.dosage) return;

    try {
      const res = await fetch('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addFormData)
      });
      if (res.ok) {
        setShowAddModal(false);
        setAddFormData({ name: '', dosage: '', category: 'Suplemento', frequency: 'Diário', timing: 'Manhã (Jejum)', notes: '' });
        await loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.name || !editFormData.dosage) return;

    try {
      const res = await fetch('/api/supplements/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingSupp(null);
        await loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmSupp) return;
    try {
      await fetch('/api/supplements/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: deleteConfirmSupp.id })
      });
      setDeleteConfirmSupp(null);
      await loadAllData();
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

  const openEditModal = (supp: Supplement) => {
    setEditingSupp(supp);
    setEditFormData({
      supplement_id: supp.id,
      name: supp.name,
      dosage: supp.dosage,
      category: supp.category || 'Suplemento',
      frequency: supp.frequency || 'Diário',
      timing: supp.timing || 'Manhã',
      notes: supp.notes || ''
    });
  };

  // Filtragem de lista
  const filteredSupplements = supplements.filter(s => {
    const matchesCategory =
      activeCategoryFilter === 'Todos' ||
      (activeCategoryFilter === 'Suplemento' && (s.category === 'Suplemento' || !s.category)) ||
      (activeCategoryFilter === 'Hormônio' && (s.category === 'Hormônio' || s.category === 'Peptídeo'));

    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const completionPct = supplements.length > 0
    ? Math.round((takenIds.length / supplements.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Banner Principal da Página */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" /> Módulo de Longevidade Médica
              </span>
              <span className="text-xs text-slate-400">Data Ativa: <strong className="text-white">{selectedDate}</strong></span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Pilha de Suplementação & Hormônios</h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Gerencie seus compostos ativos, ajuste dosagens e cronobiologia de tomadas com registro de <strong>histórico auditável imutável</strong> sincronizado ao Copiloto de IA.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleAnalyzeWithAI}
              disabled={isAnalyzing}
              className="px-5 py-3 rounded-2xl font-bold flex items-center gap-2 transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black shadow-lg shadow-cyan-500/25 glow-cyan"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? 'Analisando Pilha...' : '⚡ Otimizar Pilha com IA'}
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 transition flex items-center gap-2 text-xs"
            >
              <Plus className="h-4 w-4 text-cyan-400" /> Adicionar Composto
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas de Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Compostos Ativos</span>
            <span className="text-2xl font-black text-white">{supplements.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Pill className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Cumprimento do Dia ({selectedDate})</span>
            <span className="text-2xl font-black text-emerald-400">{completionPct}%</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registros na Linha de Auditoria</span>
            <span className="text-2xl font-black text-indigo-400">{auditLogs.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <History className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Análise de IA em Destaque (Se ativa) */}
      {aiAnalysis && (
        <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 text-xs text-slate-200 space-y-3 relative shadow-2xl">
          <button
            onClick={() => setAiAnalysis(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 text-cyan-300 font-black text-base border-b border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-cyan-400 animate-pulse" /> Parecer Integrado do Copiloto de IA sobre a Pilha & Histórico
          </div>
          <div className="max-h-96 overflow-y-auto pr-2 space-y-1">
            <FormattedAnalysis text={aiAnalysis} />
          </div>
        </div>
      )}

      {/* Seção Principal: Lista de Compostos (Esquerda) + Linha do Tempo de Auditoria (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna Esquerda: Filtros e Cards de Compostos (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
              <button
                onClick={() => setActiveCategoryFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Todos' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Todos ({supplements.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Suplemento')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Suplemento' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Suplementos
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Hormônio')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Hormônio' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Hormônios & Peptídeos
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar composto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Grid de Compostos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredSupplements.map(supp => {
              const isTaken = takenIds.includes(supp.id);
              const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';
              return (
                <div
                  key={supp.id}
                  onClick={() => handleToggleLog(supp.id)}
                  className={`p-4 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-3 group ${
                    isTaken
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-white'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {isTaken ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-600 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-white">{supp.name}</h4>
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                            isHormone
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          }`}>
                            {supp.category || 'Suplemento'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                          <span className="font-extrabold text-cyan-300">{supp.dosage}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-500" /> {supp.timing}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 truncate max-w-[150px]" title={supp.notes || ''}>
                      {supp.notes || `Início: ${supp.start_date}`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(supp);
                        }}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white transition border border-slate-800 flex items-center gap-1"
                        title="Editar Dose / Horário"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-cyan-400" /> Editar
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmSupp({ id: supp.id, name: supp.name });
                        }}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition border border-slate-800"
                        title="Remover Composto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna Direita: Painel Lateral da Linha do Tempo Auditável de Alterações (1 Col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" /> Linha do Tempo de Auditoria
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">SQLite Audit Log</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {auditLogs.map((log) => {
              const isAdd = log.action_type === 'ADICIONADO';
              const isDel = log.action_type === 'REMOVIDO';
              const isDose = log.action_type === 'DOSE_ALTERADA';
              const isTiming = log.action_type === 'HORARIO_ALTERADO';

              return (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                      isAdd ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      isDel ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      isDose ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {log.action_type}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">{String(log.created_at).slice(0, 16)}</span>
                  </div>

                  <h5 className="font-bold text-white text-xs flex items-center justify-between">
                    <span>{log.compound_name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({log.category})</span>
                  </h5>

                  {isDose && (
                    <p className="text-[11px] text-slate-300">
                      Dose: <span className="line-through text-slate-500">{log.old_value}</span> ➔ <strong className="text-amber-300">{log.new_value}</strong>
                    </p>
                  )}

                  {isTiming && (
                    <p className="text-[11px] text-slate-300">
                      Horário: <span className="line-through text-slate-500">{log.old_value}</span> ➔ <strong className="text-cyan-300">{log.new_value}</strong>
                    </p>
                  )}

                  {isAdd && (
                    <p className="text-[11px] text-emerald-300">{log.new_value}</p>
                  )}

                  {isDel && (
                    <p className="text-[11px] text-rose-400">{log.old_value}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Composto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" /> Novo Composto na Pilha
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Categoria do Composto</label>
                <select
                  value={addFormData.category}
                  onChange={e => setAddFormData({ ...addFormData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                >
                  <option value="Suplemento">Suplemento</option>
                  <option value="Hormônio">Hormônio</option>
                  <option value="Peptídeo">Peptídeo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Nome do Composto</label>
                <input
                  type="text"
                  placeholder="ex: Berberina, NMN, Testosterona Gel"
                  value={addFormData.name}
                  onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Dosagem</label>
                  <input
                    type="text"
                    placeholder="ex: 500 mg, 50 mg"
                    value={addFormData.dosage}
                    onChange={e => setAddFormData({ ...addFormData, dosage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Horário de Tomada</label>
                  <select
                    value={addFormData.timing}
                    onChange={e => setAddFormData({ ...addFormData, timing: e.target.value })}
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
                <label className="block text-slate-400 mb-1">Notas / Alvo Científico</label>
                <input
                  type="text"
                  placeholder="ex: Otimização de NAD+, sensibilidade à insulina"
                  value={addFormData.notes}
                  onChange={e => setAddFormData({ ...addFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold glow-cyan">Cadastrar & Gravar Audit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Dose / Horário */}
      {editingSupp && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-amber-400" /> Editar Dose / Composto
              </h3>
              <button onClick={() => setEditingSupp(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Nome do Composto</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Nova Dosagem</label>
                  <input
                    type="text"
                    value={editFormData.dosage}
                    onChange={e => setEditFormData({ ...editFormData, dosage: e.target.value })}
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-amber-300 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Categoria</label>
                  <select
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="Suplemento">Suplemento</option>
                    <option value="Hormônio">Hormônio</option>
                    <option value="Peptídeo">Peptídeo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Horário de Tomada</label>
                <select
                  value={editFormData.timing}
                  onChange={e => setEditFormData({ ...editFormData, timing: e.target.value })}
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

              <div>
                <label className="block text-slate-400 mb-1">Notas</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingSupp(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold glow-amber">Salvar & Gravar Audit Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteConfirmSupp && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Excluir Composto?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Deseja remover <strong>"{deleteConfirmSupp.name}"</strong>? Esta ação será gravada permanentemente no log de auditoria.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button onClick={() => setDeleteConfirmSupp(null)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs">Cancelar</button>
              <button onClick={handleDeleteSubmit} className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-lg">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
