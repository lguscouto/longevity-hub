import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Plus, Sparkles, History, Calendar, Layers } from 'lucide-react';
import { ApiError, requestJson } from '../lib/api';
import { useToast, Button } from './ui';
import {
  Supplement,
  AuditLog,
  SupplementsViewProps,
  SupplementTab,
  RoutineTodayView,
  ProtocolCatalogView,
  AuditHistoryView,
  SupplementAnalysisView,
  SupplementModals,
} from './supplements';

// Re-export types and subcomponents for full compatibility
export * from './supplements';

export const SupplementsView: React.FC<SupplementsViewProps> = ({ selectedDate }) => {
  const { showToast } = useToast();
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

  // Formulário Adicionar
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    category: 'Suplemento',
    frequency: 'Diário',
    timing: 'Manhã',
    notes: '',
  });

  // Formulário Editar
  const [editFormData, setEditFormData] = useState({
    dosage: '',
    timing: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      const [resSupps, resLogs, resAudit] = await Promise.all([
        requestJson<Supplement[]>('/api/supplements'),
        requestJson<number[]>(`/api/supplements/logs/${selectedDate}`),
        requestJson<AuditLog[]>('/api/supplements/audit-logs'),
      ]);
      setSupplements(resSupps || []);
      setTakenIds(resLogs || []);
      setAuditLogs(resAudit || []);
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível carregar os dados de suplementos.');
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const handleToggleLog = async (id: number) => {
    const isNowTaken = !takenIds.includes(id);
    const supp = supplements.find((s) => s.id === id);
    const name = supp?.name ? ` de ${supp.name}` : '';

    setTakenIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));

    try {
      await requestJson('/api/supplements/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: id, date_ref: selectedDate }),
      });
      showToast(isNowTaken ? `Dose${name} confirmada!` : `Dose${name} desmarcada!`, 'success');
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível registrar a tomada do item.');
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
        body: JSON.stringify(formData),
      });
      setShowAddModal(false);
      setFormData({
        name: '',
        dosage: '',
        category: 'Suplemento',
        frequency: 'Diário',
        timing: 'Manhã',
        notes: '',
      });
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível adicionar o item.');
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
          notes: editFormData.notes,
        }),
      });
      setEditingSupp(null);
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o item.');
    }
  };

  const handleDeleteSupplement = async () => {
    if (!deleteConfirmSupp) return;
    try {
      await requestJson('/api/supplements/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplement_id: deleteConfirmSupp.id }),
      });
      setDeleteConfirmSupp(null);
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível remover o item.');
    }
  };

  const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const res = await requestJson<{ status: string; analysis?: string }>('/api/supplements/analyze-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_ref: selectedDate }),
      });
      if (res.analysis) {
        setAiAnalysis(res.analysis);
      }
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Não foi possível analisar os suplementos com IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openEditModal = (supp: Supplement) => {
    setEditingSupp(supp);
    setEditFormData({
      dosage: supp.dosage,
      timing: supp.timing,
      notes: supp.notes || '',
    });
  };

  const completionPct =
    supplements.length > 0 ? Math.round((takenIds.length / supplements.length) * 100) : 0;
  const countSuplemento = supplements.filter((s) => s.category !== 'Hormônio' && s.category !== 'Peptídeo').length;
  const countHormonio = supplements.filter((s) => s.category === 'Hormônio' || s.category === 'Peptídeo').length;

  return (
    <div className="space-y-6">
      {/* Banner Principal */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                <Pill className="h-3.5 w-3.5" /> Rotina diária
              </span>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                Data ativa: <strong className="text-slate-900 dark:text-white">{selectedDate}</strong>
              </span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Suplementos e rotina
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
              Acompanhe seus suplementos e medicamentos por horário, marque o que já tomou e veja o histórico das suas alterações.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowAddModal(true)}
              leftIcon={Plus}
            >
              Adicionar item
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setActiveTab('analysis');
                handleAnalyzeWithAI();
              }}
              disabled={isAnalyzing}
              loading={isAnalyzing}
              leftIcon={Sparkles}
            >
              Analisar com IA
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">Itens ativos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{supplements.length}</span>
              <span className="text-xs text-slate-500 font-medium">({countSuplemento} sup., {countHormonio} horm.)</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Pill className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">Adesão do dia ({selectedDate})</span>
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
            <span className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 block">Alterações registradas</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{auditLogs.length}</span>
              <span className="text-xs text-slate-500 font-medium">no histórico</span>
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
          Hoje (Rotina)
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
          Minha rotina ({supplements.length})
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
          Histórico de alterações ({auditLogs.length})
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
          Análise com IA
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === 'today' && (
        <RoutineTodayView
          selectedDate={selectedDate}
          supplements={supplements}
          takenIds={takenIds}
          completionPct={completionPct}
          onToggleLog={handleToggleLog}
          onOpenAddModal={() => setShowAddModal(true)}
        />
      )}

      {activeTab === 'protocol' && (
        <ProtocolCatalogView
          supplements={supplements}
          onOpenAddModal={() => setShowAddModal(true)}
          onOpenEditModal={openEditModal}
          onConfirmDelete={setDeleteConfirmSupp}
        />
      )}

      {activeTab === 'audit' && <AuditHistoryView auditLogs={auditLogs} />}

      {activeTab === 'analysis' && (
        <SupplementAnalysisView
          selectedDate={selectedDate}
          isAnalyzing={isAnalyzing}
          aiAnalysis={aiAnalysis}
          onAnalyzeWithAI={handleAnalyzeWithAI}
          onHideAnalysis={() => setAiAnalysis(null)}
        />
      )}

      {/* Modais Compartilhados */}
      <SupplementModals
        showAddModal={showAddModal}
        onCloseAddModal={() => setShowAddModal(false)}
        onAddSupplement={handleAddSupplement}
        formData={formData}
        setFormData={setFormData}
        editingSupp={editingSupp}
        onCloseEditModal={() => setEditingSupp(null)}
        onUpdateSupplement={handleUpdateSupplement}
        editFormData={editFormData}
        setEditFormData={setEditFormData}
        deleteConfirmSupp={deleteConfirmSupp}
        onCloseDeleteConfirm={() => setDeleteConfirmSupp(null)}
        onConfirmDelete={handleDeleteSupplement}
      />
    </div>
  );
};
