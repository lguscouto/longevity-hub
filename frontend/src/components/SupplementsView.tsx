import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Circle, Plus, Sparkles, Clock, RefreshCw, Trash2, Edit3, History, ShieldAlert, Activity, Filter, Search } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';

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
        return <strong key={idx} className="text-cyan-700 dark:text-cyan-300 font-bold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const flushTable = () => {
    if (tableRows.length > 0 || tableHeader.length > 0) {
      elements.push(
        <div key={`table-${currentKey++}`} className="my-2.5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/90">
          <table className="w-full text-[11px] border-collapse">
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th key={cIdx} className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
                      {renderInline(col.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b last:border-b-0 border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/60 text-slate-700 dark:text-slate-300">
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
        <h4 key={`h3-${currentKey++}`} className="font-bold text-slate-900 dark:text-white mt-3 mb-1 text-xs border-b border-slate-200 dark:border-slate-800 pb-1">
          {renderInline(line.replace('### ', ''))}
        </h4>
      );
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={`h2-${currentKey++}`} className="font-bold text-cyan-700 dark:text-cyan-300 mt-4 mb-1 text-xs uppercase tracking-wider">
          {renderInline(line.replace('## ', ''))}
        </h3>
      );
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${currentKey++}`} className="flex items-start gap-1.5 ml-1 my-0.5 text-slate-700 dark:text-slate-300">
          <span className="text-cyan-600 dark:text-cyan-400 font-bold">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    elements.push(
      <p key={`p-${currentKey++}`} className="my-1 text-slate-700 dark:text-slate-300 leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  if (inTable) flushTable();
  return <>{elements}</>;
};

export const SupplementsView: React.FC<SupplementsViewProps> = ({ selectedDate }) => {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [takenIds, setTakenIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupp, setEditingSupp] = useState<Supplement | null>(null);
  const [deleteConfirmSupp, setDeleteConfirmSupp] = useState<{ id: number; name: string } | null>(null);

  // Filtros
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'Todos' | 'Suplemento' | 'Hormônio'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário Adicionar
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Manhã',
    notes: ''
  });

  // Formulário Editar
  const [editFormData, setEditFormData] = useState({
    dosage: '',
    timing: '',
    notes: ''
  });

  const loadData = async () => {
    try {
      const [resSupps, resLogs, resAudit] = await Promise.all([
        requestJson<Supplement[]>('/api/supplements'),
        requestJson<number[]>(`/api/supplements/logs/${selectedDate}`),
        requestJson<AuditLog[]>('/api/supplements/audit-logs')
      ]);
      setSupplements(resSupps || []);
      setTakenIds(resLogs || []);
      setAuditLogs(resAudit || []);
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao carregar dados de suplementos.');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleToggleLog = async (id: number) => {
    setTakenIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );

    try {
      await requestJson('/api/supplements/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: id, date_ref: selectedDate })
      });
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao alternar suplemento.');
      await loadData();
    }
  };

  const handleAddSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dosage) return;

    try {
      await requestJson('/api/supplements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setShowAddModal(false);
      setFormData({ name: '', dosage: '', category: 'Suplemento', frequency: 'Diário', timing: 'Manhã', notes: '' });
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao cadastrar suplemento.');
    }
  };

  const handleUpdateSupplement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupp) return;

    try {
      await requestJson('/api/supplements/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplement_id: editingSupp.id,
          dosage: editFormData.dosage,
          timing: editFormData.timing,
          notes: editFormData.notes
        })
      });
      setEditingSupp(null);
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao atualizar suplemento.');
    }
  };

  const handleDeleteSupplement = async () => {
    if (!deleteConfirmSupp) return;
    try {
      await requestJson('/api/supplements/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: deleteConfirmSupp.id })
      });
      setDeleteConfirmSupp(null);
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao remover composto.');
    }
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await requestJson<{ status: string; analysis?: string }>('/api/supplements/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_ref: selectedDate })
      });
      if (res.analysis) {
        setAiAnalysis(res.analysis);
      }
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao analisar pilha com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openEditModal = (supp: Supplement) => {
    setEditingSupp(supp);
    setEditFormData({
      dosage: supp.dosage,
      timing: supp.timing,
      notes: supp.notes || ''
    });
  };

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

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Banner Principal da Página */}
      <div className="bg-gradient-to-r from-slate-100 via-slate-100 to-cyan-500/10 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" /> Módulo de Longevidade Médica
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">Data Ativa: <strong className="text-slate-900 dark:text-white">{selectedDate}</strong></span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pilha de Suplementação & Hormônios</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
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
              className="px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Adicionar Composto
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas de Topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Compostos Ativos</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{supplements.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Pill className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Cumprimento do Dia ({selectedDate})</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completionPct}%</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Registros na Linha de Auditoria</span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{auditLogs.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <History className="h-5 w-5" />
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-800 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {/* Análise de IA em Destaque */}
      {aiAnalysis && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-cyan-500/40 text-xs text-slate-800 dark:text-slate-200 space-y-3 relative shadow-2xl">
          <button
            onClick={() => setAiAnalysis(null)}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            ✕
          </button>
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-black text-base border-b border-slate-200 dark:border-slate-800 pb-3">
            <Sparkles className="h-5 w-5 text-cyan-600 dark:text-cyan-400 animate-pulse" /> Parecer Integrado do Copiloto de IA sobre a Pilha & Histórico
          </div>
          <div className="max-h-96 overflow-y-auto pr-2 space-y-1">
            <FormattedAnalysis text={aiAnalysis} />
          </div>
        </div>
      )}

      {/* Seção Principal: Lista (Esquerda) + Auditoria (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Coluna Esquerda: Filtros e Cards */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full sm:w-auto">
              <button
                onClick={() => setActiveCategoryFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Todos' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Todos ({supplements.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Suplemento')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Suplemento' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Suplementos
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Hormônio')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${activeCategoryFilter === 'Hormônio' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              >
                Hormônios & Peptídeos
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar composto..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
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
                  className={`p-4 rounded-3xl border transition cursor-pointer flex flex-col justify-between space-y-3 group shadow-sm ${
                    isTaken
                      ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-white'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      {isTaken ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{supp.name}</h4>
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                            isHormone
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                          }`}>
                            {supp.category || 'Suplemento'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                          <span className="font-extrabold text-cyan-600 dark:text-cyan-300">{supp.dosage}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {supp.timing}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
                    <span className="text-slate-500 truncate max-w-[150px]" title={supp.notes || ''}>
                      {supp.notes || `Início: ${supp.start_date}`}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(supp);
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-800 flex items-center gap-1"
                        title="Editar Dose / Horário"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" /> Editar
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmSupp({ id: supp.id, name: supp.name });
                        }}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition border border-slate-200 dark:border-slate-800"
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

        {/* Coluna Direita: Painel Lateral da Linha do Tempo Auditável de Alterações */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 flex flex-col space-y-4 shadow-xl h-[650px]">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Linha do Tempo de Auditoria
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">SQLite Audit Log</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
            {auditLogs.map((log) => {
              const isAdd = log.action_type === 'ADICIONADO';
              const isDel = log.action_type === 'REMOVIDO';
              const isDose = log.action_type === 'DOSE_ALTERADA';
              const isTiming = log.action_type === 'HORARIO_ALTERADO';

              return (
                <div key={log.id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                      isAdd ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                      isDel ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30' :
                      isDose ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' :
                      'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {log.action_type}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">{String(log.created_at).slice(0, 16)}</span>
                  </div>

                  <h5 className="font-bold text-slate-900 dark:text-white text-xs flex items-center justify-between">
                    <span>{log.compound_name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">({log.category})</span>
                  </h5>

                  {isDose && (
                    <p className="text-[11px] text-slate-700 dark:text-slate-300">
                      Dose: <span className="line-through text-slate-400">{log.old_value}</span> ➔ <strong className="text-amber-600 dark:text-amber-300">{log.new_value}</strong>
                    </p>
                  )}

                  {isTiming && (
                    <p className="text-[11px] text-slate-700 dark:text-slate-300">
                      Horário: <span className="line-through text-slate-400">{log.old_value}</span> ➔ <strong className="text-cyan-600 dark:text-cyan-300">{log.new_value}</strong>
                    </p>
                  )}

                  {isAdd && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-300">{log.new_value}</p>
                  )}

                  {isDel && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400">{log.old_value}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Adicionar Composto */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Adicionar Novo Composto
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSupplement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nome do Composto</label>
                <input
                  type="text"
                  placeholder="Ex: Metformina, Testosterona, CoQ10"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Dosagem</label>
                  <input
                    type="text"
                    placeholder="Ex: 500mg, 100mg/semana"
                    value={formData.dosage}
                    onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Suplemento">Suplemento</option>
                    <option value="Hormônio">Hormônio</option>
                    <option value="Peptídeo">Peptídeo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Frequência</label>
                  <select
                    value={formData.frequency}
                    onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Diário">Diário</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Dias Alternados">Dias Alternados</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Horário / Cronobiologia</label>
                  <select
                    value={formData.timing}
                    onChange={e => setFormData({ ...formData, timing: e.target.value })}
                    className={inputClass}
                  >
                    <option value="Manhã">Manhã (Jejum)</option>
                    <option value="Almoço">Almoço</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Jantar">Jantar</option>
                    <option value="Antes de Dormir">Antes de Dormir</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Notas / Protocolo de Aplicação</label>
                <input
                  type="text"
                  placeholder="Ex: Subcutâneo 2x por semana"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 font-bold shadow-md"
                >
                  Salvar Composto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Composto */}
      {editingSupp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Editar {editingSupp.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">As alterações serão registradas no Audit Log de longevidade</p>
              </div>
              <button onClick={() => setEditingSupp(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateSupplement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nova Dosagem</label>
                <input
                  type="text"
                  value={editFormData.dosage}
                  onChange={e => setEditFormData({ ...editFormData, dosage: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Novo Horário / Cronobiologia</label>
                <select
                  value={editFormData.timing}
                  onChange={e => setEditFormData({ ...editFormData, timing: e.target.value })}
                  className={inputClass}
                >
                  <option value="Manhã">Manhã (Jejum)</option>
                  <option value="Almoço">Almoço</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Jantar">Jantar</option>
                  <option value="Antes de Dormir">Antes de Dormir</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Notas / Observações</label>
                <input
                  type="text"
                  value={editFormData.notes}
                  onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setEditingSupp(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-md"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Exclusão */}
      {deleteConfirmSupp && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Remover Composto</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja remover <strong className="text-slate-900 dark:text-white">{deleteConfirmSupp.name}</strong> da sua pilha ativa? A remoção será registrada na auditoria.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmSupp(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteSupplement}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold transition shadow-md"
              >
                Confirmar Remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
