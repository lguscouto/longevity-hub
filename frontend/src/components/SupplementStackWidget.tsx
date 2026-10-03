import React, { useState, useEffect } from 'react';
import { Pill, CheckCircle2, Circle, Plus, Sparkles, Clock, RefreshCw, AlertCircle, Trash2, X } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';
import { Modal, ConfirmDialog, Button, IconButton, FormField, Input, Select } from './ui';

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
          <table className="w-full text-xs border-collapse">
            <caption className="sr-only">Tabela do parecer estruturado da inteligência artificial</caption>
            {tableHeader.length > 0 && (
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-left">
                  {tableHeader.map((col, cIdx) => (
                    <th key={cIdx} scope="col" className="p-2 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
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

export const SupplementStackWidget: React.FC<SupplementStackWidgetProps> = ({ selectedDate }) => {
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [takenIds, setTakenIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmSupp, setDeleteConfirmSupp] = useState<{ id: number; name: string } | null>(null);
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
        requestJson<Supplement[]>('/api/supplements'),
        requestJson<number[]>(`/api/supplements/logs/${selectedDate}`)
      ]);
      setSupplements(resSupps || []);
      setTakenIds(resLogs || []);
      setLoadError(null);
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao carregar suplementos.');
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
      setFormData({ name: '', dosage: '', frequency: 'Diário', timing: 'Manhã', notes: '' });
      await loadData();
    } catch (caught) {
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao cadastrar suplemento.');
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
      setLoadError(caught instanceof ApiError ? caught.message : 'Erro ao remover suplemento.');
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

  const completionPct = supplements.length > 0
    ? Math.round((takenIds.length / supplements.length) * 100)
    : 0;

  const inputClass = "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none";

  return (
    <div className="glass-card p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
            <Pill className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Pilha de Suplementos (Longevity Stack)</h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/20">
                {completionPct}% Cumprido
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Rastreamento diário e horários de tomada</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleAnalyzeWithAI}
            disabled={isAnalyzing}
            loading={isAnalyzing}
            leftIcon={Sparkles}
          >
            {isAnalyzing ? 'Analisando...' : '⚡ Otimizar Pilha com IA'}
          </Button>

          <IconButton
            variant="secondary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            icon={Plus}
            aria-label="Adicionar Suplemento"
          />
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-800 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {/* Análise de IA Formatada em Destaque */}
      {aiAnalysis && (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-950 border border-cyan-500/40 text-xs text-slate-800 dark:text-slate-200 space-y-3 relative shadow-dialog">
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => setAiAnalysis(null)}
            icon={X}
            aria-label="Fechar Parecer"
            className="absolute top-3 right-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          />
          <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-300 font-extrabold text-sm border-b border-slate-200 dark:border-slate-800 pb-2">
            <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> Parecer Estruturado da Inteligência Artificial
          </div>
          <div className="max-h-96 overflow-y-auto pr-2 space-y-1">
            <FormattedAnalysis text={aiAnalysis} />
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
              className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 group ${
                isTaken
                  ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/40 text-slate-900 dark:text-white'
                  : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isTaken ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400 dark:text-slate-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {supp.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-0.5 flex-wrap">
                    <span className="font-semibold text-cyan-700 dark:text-cyan-400">{supp.dosage}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" /> {supp.timing}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {supp.notes && (
                  <span className="text-xs text-slate-600 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 max-w-[80px] truncate" title={supp.notes}>
                    {supp.notes}
                  </span>
                )}
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmSupp({ id: supp.id, name: supp.name });
                  }}
                  icon={Trash2}
                  aria-label="Excluir Suplemento"
                  className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Adicionar */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Novo Suplemento"
        icon={<Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        <form onSubmit={handleAddSupplement} className="space-y-4 text-xs">
          <FormField id="stack-supp-name" label="Nome do Composto" required>
            <Input
              id="stack-supp-name"
              type="text"
              placeholder="Ex: NMN, Creatina, Ômega-3"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="stack-supp-dosage" label="Dosagem" required>
              <Input
                id="stack-supp-dosage"
                type="text"
                placeholder="Ex: 500mg, 5g"
                value={formData.dosage}
                onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                required
              />
            </FormField>

            <FormField id="stack-supp-frequency" label="Frequência">
              <Select
                id="stack-supp-frequency"
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="Diário">Diário</option>
                <option value="Semanal">Semanal</option>
                <option value="Dias Alternados">Dias Alternados</option>
              </Select>
            </FormField>
          </div>

          <FormField id="stack-supp-timing" label="Horário / Cronobiologia">
            <Select
              id="stack-supp-timing"
              value={formData.timing}
              onChange={e => setFormData({ ...formData, timing: e.target.value })}
            >
              <option value="Manhã">Manhã (Jejum)</option>
              <option value="Almoço">Almoço</option>
              <option value="Tarde">Tarde</option>
              <option value="Jantar">Jantar</option>
              <option value="Antes de Dormir">Antes de Dormir</option>
            </Select>
          </FormField>

          <FormField id="stack-supp-notes" label="Notas / Objetivo (Opcional)">
            <Input
              id="stack-supp-notes"
              type="text"
              placeholder="Ex: Para otimização de NAD+"
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Salvar Suplemento
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmSupp)}
        title="Excluir Suplemento da Pilha"
        description={
          deleteConfirmSupp ? (
            <span>
              Tem certeza que deseja remover <strong className="text-slate-900 dark:text-white">{deleteConfirmSupp.name}</strong> da sua pilha ativa? Esta ação não pode ser desfeita.
            </span>
          ) : null
        }
        confirmLabel="Excluir Suplemento"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={handleDeleteSupplement}
        onClose={() => setDeleteConfirmSupp(null)}
      />
    </div>
  );
};
