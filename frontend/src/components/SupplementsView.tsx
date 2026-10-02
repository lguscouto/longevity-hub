import React, { useState, useEffect } from 'react';
import {
  Pill,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  Clock,
  Trash2,
  Edit3,
  History,
  Search,
  Sun,
  Utensils,
  Dumbbell,
  Moon,
  Calendar,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';
import { ConfirmDialog, EmptyState, Modal } from './ui';

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

export type SupplementTab = 'today' | 'protocol' | 'audit' | 'analysis';

type ChronoPeriodKey = 'morning' | 'lunch' | 'afternoon' | 'night' | 'other';

interface ChronoPeriodDef {
  key: ChronoPeriodKey;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const CHRONO_PERIODS: ChronoPeriodDef[] = [
  {
    key: 'morning',
    label: 'Manhã / Jejum',
    description: 'Ao acordar ou primeiro horário',
    icon: Sun,
    accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  },
  {
    key: 'lunch',
    label: 'Almoço',
    description: 'Junto à principal refeição diurna',
    icon: Utensils,
    accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    key: 'afternoon',
    label: 'Tarde / Treino',
    description: 'Janela da tarde ou pré/pós-treino',
    icon: Dumbbell,
    accentColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
  },
  {
    key: 'night',
    label: 'Noite / Antes de Dormir',
    description: 'Jantar ou rotina de indução ao sono',
    icon: Moon,
    accentColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
  },
  {
    key: 'other',
    label: 'Outros Horários',
    description: 'Horários flexíveis ou não categorizados',
    icon: Clock,
    accentColor: 'text-slate-500 bg-slate-500/10 border-slate-500/20'
  }
];

const getPeriodForTiming = (timing: string = ''): ChronoPeriodKey => {
  const t = timing.toLowerCase();
  if (t.includes('manhã') || t.includes('manha') || t.includes('jejum')) return 'morning';
  if (t.includes('almoço') || t.includes('almoco')) return 'lunch';
  if (t.includes('tarde') || t.includes('treino')) return 'afternoon';
  if (t.includes('noite') || t.includes('jantar') || t.includes('dormir') || t.includes('ceia')) return 'night';
  return 'other';
};

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

  // Tab State
  const [activeTab, setActiveTab] = useState<SupplementTab>('today');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupp, setEditingSupp] = useState<Supplement | null>(null);
  const [deleteConfirmSupp, setDeleteConfirmSupp] = useState<{ id: number; name: string } | null>(null);

  // Filters for Protocol
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'Todos' | 'Suplemento' | 'Hormônio'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters for Audit Log
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

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

  // Filtered compounds for Protocol
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

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    if (!auditSearchTerm.trim()) return true;
    const term = auditSearchTerm.toLowerCase();
    return (
      log.compound_name.toLowerCase().includes(term) ||
      log.action_type.toLowerCase().includes(term) ||
      (log.category && log.category.toLowerCase().includes(term)) ||
      (log.old_value && log.old_value.toLowerCase().includes(term)) ||
      (log.new_value && log.new_value.toLowerCase().includes(term))
    );
  });

  const completionPct = supplements.length > 0
    ? Math.round((takenIds.length / supplements.length) * 100)
    : 0;

  const countSuplemento = supplements.filter(s => s.category === 'Suplemento' || !s.category).length;
  const countHormonio = supplements.filter(s => s.category === 'Hormônio' || s.category === 'Peptídeo').length;

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus:outline-none";

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-gradient-to-r from-slate-100 via-slate-100 to-cyan-500/10 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" /> Módulo de Longevidade Médica
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Data Ativa: <strong className="text-slate-900 dark:text-white">{selectedDate}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Pilha de Suplementação & Hormônios
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Gerencie seus compostos ativos por janelas cronobiológicas, monitore adesão diária e audite alterações longitudinais.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-slate-700 transition flex items-center gap-2 text-xs shadow-sm"
            >
              <Plus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              Adicionar Composto
            </button>
            <button
              onClick={() => {
                setActiveTab('analysis');
                handleAnalyzeWithAI();
              }}
              disabled={isAnalyzing}
              className="px-4 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/25 glow-cyan"
            >
              <Sparkles className="h-4 w-4" />
              {isAnalyzing ? 'Analisando...' : 'Otimizar com IA'}
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Compostos Ativos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{supplements.length}</span>
              <span className="text-xs text-slate-500 font-medium">({countSuplemento} sup, {countHormonio} horm)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Pill className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Adesão do Dia ({selectedDate})</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completionPct}%</span>
              <span className="text-xs text-slate-500 font-medium">({takenIds.length}/{supplements.length} doses)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Registros na Auditoria</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{auditLogs.length}</span>
              <span className="text-xs text-slate-500 font-medium">eventos imutáveis</span>
            </div>
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

      {/* Segmented Control / Navegação de Tarefas */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'today'
              ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Hoje (Rotina & Adesão)
        </button>

        <button
          onClick={() => setActiveTab('protocol')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'protocol'
              ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="h-4 w-4" />
          Meu Protocolo ({supplements.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="h-4 w-4" />
          Histórico & Auditoria ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
            activeTab === 'analysis'
              ? 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-300 shadow-sm border border-slate-200/80 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Análise & Interações (IA)
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {/* 1. ABA HOJE: ROTINA E ADESÃO CRONOBIOLÓGICA */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Card de Progresso Geral da Adesão */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500" />
                  Progresso de Doses para {selectedDate}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Clique na dose para marcar ou desmarcar a ingestão diária.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  {takenIds.length} de {supplements.length} doses registradas
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  {completionPct}%
                </span>
              </div>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Se não houver suplementos */}
          {supplements.length === 0 ? (
            <EmptyState
              title="Nenhum composto cadastrado"
              description="Cadastre seus suplementos, peptídeos e hormônios para gerenciar sua rotina diária."
              action={{
                label: 'Adicionar Composto',
                onClick: () => setShowAddModal(true)
              }}
            />
          ) : (
            <div className="space-y-6">
              {CHRONO_PERIODS.map(period => {
                const items = supplements.filter(s => getPeriodForTiming(s.timing) === period.key);
                if (items.length === 0) return null;

                const takenCount = items.filter(s => takenIds.includes(s.id)).length;
                const PeriodIcon = period.icon;

                return (
                  <div key={period.key} className="space-y-3">
                    {/* Cabeçalho do Período */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${period.accentColor}`}>
                          <PeriodIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            {period.label}
                          </h4>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {period.description}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {takenCount} de {items.length} tomados
                      </span>
                    </div>

                    {/* Doses do Período */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {items.map(supp => {
                        const isTaken = takenIds.includes(supp.id);
                        const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';

                        return (
                          <div
                            key={supp.id}
                            onClick={() => handleToggleLog(supp.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleToggleLog(supp.id);
                              }
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                              isTaken
                                ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-white shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                aria-label={`Marcar dose de ${supp.name}`}
                                className="shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
                              >
                                {isTaken ? (
                                  <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                  <Circle className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h5 className={`text-sm font-bold truncate ${isTaken ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                    {supp.name}
                                  </h5>
                                  <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                                    isHormone
                                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                      : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                                  }`}>
                                    {supp.category || 'Suplemento'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  <span className="font-extrabold text-cyan-600 dark:text-cyan-400">{supp.dosage}</span>
                                  <span>•</span>
                                  <span>{supp.frequency}</span>
                                </div>
                                {supp.notes && (
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-1">
                                    {supp.notes}
                                  </p>
                                )}
                              </div>
                            </div>

                            <span className="text-xs font-semibold text-slate-400 shrink-0">
                              {isTaken ? 'Tomado' : 'Pendente'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. ABA MEU PROTOCOLO: GESTÃO DA PILHA ATIVA */}
      {activeTab === 'protocol' && (
        <div className="space-y-4">
          {/* Barra de Busca e Filtros */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full sm:w-auto overflow-x-auto">
              <button
                onClick={() => setActiveCategoryFilter('Todos')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  activeCategoryFilter === 'Todos'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todos ({supplements.length})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Suplemento')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  activeCategoryFilter === 'Suplemento'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Suplementos ({countSuplemento})
              </button>
              <button
                onClick={() => setActiveCategoryFilter('Hormônio')}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                  activeCategoryFilter === 'Hormônio'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Hormônios & Peptídeos ({countHormonio})
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
          {filteredSupplements.length === 0 ? (
            <EmptyState
              title="Nenhum composto encontrado"
              description="Nenhum composto cadastrado corresponde aos filtros de busca atuais."
              action={{
                label: 'Adicionar Composto',
                onClick: () => setShowAddModal(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSupplements.map(supp => {
                const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';
                return (
                  <div
                    key={supp.id}
                    className="p-4 rounded-3xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
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
                              <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                              {supp.timing}
                            </span>
                            <span>•</span>
                            <span className="text-[11px] text-slate-500">{supp.frequency}</span>
                          </div>
                        </div>
                      </div>

                      {supp.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                          {supp.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px]">
                      <span className="text-slate-400">
                        Início: {supp.start_date || 'Não informado'}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(supp)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition border border-slate-200 dark:border-slate-800 flex items-center gap-1 font-semibold"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                          Editar
                        </button>

                        <button
                          onClick={() => setDeleteConfirmSupp({ id: supp.id, name: supp.name })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-950 hover:bg-rose-500/10 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition border border-slate-200 dark:border-slate-800 flex items-center gap-1"
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
          )}
        </div>
      )}

      {/* 3. ABA HISTÓRICO & AUDITORIA: RASTREABILIDADE IMUTÁVEL COMPLETA */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-indigo-500" />
                  Rastreabilidade Imutável de Prescrição & Ajustes
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Registro cronológico longitudinal auditado de inclusões, alterações de dosagens e descontinuações.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar eventos de auditoria..."
                  value={auditSearchTerm}
                  onChange={e => setAuditSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {filteredAuditLogs.length === 0 ? (
              <EmptyState
                title="Nenhum registro de auditoria encontrado"
                description="Alterações em dosagens, compostos ou horários serão registradas automaticamente aqui com carimbo de data/hora."
              />
            ) : (
              <div className="space-y-3">
                {filteredAuditLogs.map(log => {
                  const isAdd = log.action_type === 'ADICIONADO';
                  const isDel = log.action_type === 'REMOVIDO';
                  const isDose = log.action_type === 'DOSE_ALTERADA';
                  const isTiming = log.action_type === 'HORARIO_ALTERADO';

                  return (
                    <div
                      key={log.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border ${
                            isAdd ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' :
                            isDel ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30' :
                            isDose ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30' :
                            'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30'
                          }`}>
                            {log.action_type}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {log.compound_name}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            ({log.category || 'Suplemento'})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {String(log.created_at).slice(0, 19).replace('T', ' ')}
                        </span>
                      </div>

                      {/* Conteúdo da Alteração */}
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        {isDose && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500">Dosagem ajustada:</span>
                            <span className="line-through text-slate-400">{log.old_value}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                            <strong className="text-amber-600 dark:text-amber-400 font-bold">{log.new_value}</strong>
                          </div>
                        )}

                        {isTiming && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-500">Horário alterado:</span>
                            <span className="line-through text-slate-400">{log.old_value}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-cyan-500" />
                            <strong className="text-cyan-600 dark:text-cyan-400 font-bold">{log.new_value}</strong>
                          </div>
                        )}

                        {isAdd && (
                          <div className="text-emerald-700 dark:text-emerald-300">
                            <span className="text-slate-500">Parâmetros iniciais: </span>
                            <strong>{log.new_value}</strong>
                          </div>
                        )}

                        {isDel && (
                          <div className="text-rose-700 dark:text-rose-300">
                            <span className="text-slate-500">Último estado registrado: </span>
                            <strong>{log.old_value}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ABA ANÁLISE & INTERAÇÕES (IA) */}
      {activeTab === 'analysis' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                  Parecer Integrado do Copiloto de IA
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                  Análise farmacodinâmica, sinergia entre compostos, janelas de absorção cronobiológica e potenciais interações da sua pilha ativa.
                </p>
              </div>

              <button
                onClick={handleAnalyzeWithAI}
                disabled={isAnalyzing}
                className="px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-black shadow-md shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                {isAnalyzing ? 'Processando Análise...' : 'Gerar Nova Análise'}
              </button>
            </div>

            {isAnalyzing && (
              <div className="py-12 text-center space-y-3">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  O Copiloto de IA está avaliando dosagens, timing e histórico clínico da sua pilha...
                </p>
              </div>
            )}

            {!isAnalyzing && aiAnalysis && (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-cyan-500/30 text-xs text-slate-800 dark:text-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-cyan-600 dark:text-cyan-400">
                    Relatório Clínico Gerado para {selectedDate}
                  </span>
                  <button
                    onClick={() => setAiAnalysis(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Ocultar Relatório
                  </button>
                </div>
                <div className="space-y-1">
                  <FormattedAnalysis text={aiAnalysis} />
                </div>
              </div>
            )}

            {!isAnalyzing && !aiAnalysis && (
              <EmptyState
                title="Nenhuma análise gerada recentemente"
                description="Clique no botão acima para submeter a pilha ativa e o histórico de auditoria à inteligência clínica do sistema."
                action={{
                  label: '⚡ Iniciar Análise com IA',
                  onClick: handleAnalyzeWithAI
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Modal Adicionar Composto */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Adicionar Novo Composto"
        icon={<Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        <form onSubmit={handleAddSupplement} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nome do Composto</label>
            <input
              type="text"
              placeholder="Ex: Metformina, Testosterona, CoQ10"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              required
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
                required
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
              placeholder="Ex: Tomar com refeição gordurosa"
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
      </Modal>

      {/* Modal Editar Composto */}
      <Modal
        isOpen={Boolean(editingSupp)}
        onClose={() => setEditingSupp(null)}
        title={editingSupp ? `Editar ${editingSupp.name}` : ''}
        description="As alterações serão registradas no Audit Log de longevidade"
        icon={<Edit3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        {editingSupp && (
          <form onSubmit={handleUpdateSupplement} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">Nova Dosagem</label>
              <input
                type="text"
                value={editFormData.dosage}
                onChange={e => setEditFormData({ ...editFormData, dosage: e.target.value })}
                className={inputClass}
                required
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
        )}
      </Modal>

      {/* Diálogo de Confirmação para Remoção de Composto */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmSupp)}
        title="Remover Composto"
        description={`Tem certeza que deseja remover ${deleteConfirmSupp?.name || ''} da sua pilha ativa? Esta alteração será registrada no histórico de auditoria imutável.`}
        confirmLabel="Confirmar Remoção"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={handleDeleteSupplement}
        onClose={() => setDeleteConfirmSupp(null)}
      />
    </div>
  );
};
