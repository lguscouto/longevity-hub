import React, { useState } from 'react';
import { Dna, Plus, AlertCircle, CheckCircle2, Trash2, Eye, FileText } from 'lucide-react';

import { ApiError, requestJson } from '../lib/api';
import { ConfirmDialog, EmptyState, InlineError, Button, IconButton, ResponsiveDataTable, DataColumn } from './ui';
import {
  LabResult,
  getLabMarkerStatus,
  getMetricDisplayName,
  isClinicallyEligibleLab,
  isMarkerOptimal,
  pickHighlights,
} from './labs/labMarkers';
import { CardiovascularRatios } from './labs/CardiovascularRatios';
import { LabPanelDetailModal } from './labs/LabPanelDetailModal';
import { LabBatchEntryModal } from './labs/LabBatchEntryModal';

export type { LabResult };

interface LabResultsTableProps {
  labs: LabResult[];
  onAddBatchLabs: (records: any[]) => void;
  onRefreshData?: () => void;
}

interface PanelRow {
  date: string;
  items: LabResult[];
  totalCount: number;
  clinicalCount: number;
  nonClinicalCount: number;
  optimalCount: number;
  inRangeCount: number;
  attentionCount: number;
  highlights: LabResult[];
}

export const LabResultsTable: React.FC<LabResultsTableProps> = ({ labs = [], onAddBatchLabs, onRefreshData }) => {
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedPanelDate, setSelectedPanelDate] = useState<string | null>(null);
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const safeLabs = Array.isArray(labs) ? labs : [];
  const clinicalLabs = safeLabs.filter(isClinicallyEligibleLab);
  const excludedLabsCount = safeLabs.length - clinicalLabs.length;

  // Agrupamento dos exames por data da coleta (collected_at)
  const groupedLabs: Record<string, LabResult[]> = {};
  safeLabs.forEach((lab) => {
    const dt = lab?.collected_at || 'Desconhecido';
    if (!groupedLabs[dt]) groupedLabs[dt] = [];
    groupedLabs[dt].push(lab);
  });

  // Ordenação cronológica DESC
  const sortedDates = Object.keys(groupedLabs).sort((a, b) => b.localeCompare(a));

  const panelRows: PanelRow[] = sortedDates.map((dt) => {
    const items = groupedLabs[dt] || [];
    const totalCount = items.length;
    const clinicalItems = items.filter(isClinicallyEligibleLab);
    const clinicalCount = clinicalItems.length;
    const nonClinicalCount = totalCount - clinicalCount;

    let optimalCount = 0;
    let inRangeCount = 0;
    let attentionCount = 0;

    clinicalItems.forEach((item) => {
      const status = getLabMarkerStatus(item);
      if (status === 'optimal') optimalCount += 1;
      else if (status === 'in_clinical_range') inRangeCount += 1;
      else if (status === 'out_of_range') attentionCount += 1;
    });

    const highlights = pickHighlights(items, 3);
    return {
      date: dt,
      items,
      totalCount,
      clinicalCount,
      nonClinicalCount,
      optimalCount,
      inRangeCount,
      attentionCount,
      highlights,
    };
  });

  const handleConfirmDelete = async () => {
    if (!deleteConfirmDate) return;
    setIsDeleting(true);
    try {
      await requestJson('/api/labs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collected_at: deleteConfirmDate }),
      });
      setDeleteConfirmDate(null);
      setDeleteError(null);
      if (selectedPanelDate === deleteConfirmDate) setSelectedPanelDate(null);
      if (onRefreshData) onRefreshData();
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Falha ao excluir o laudo.');
    } finally {
      setIsDeleting(false);
    }
  };

  const panelColumns: DataColumn<PanelRow>[] = [
    {
      key: 'date',
      header: 'Data do Laudo',
      priority: 'primary',
      cellClassName: 'text-slate-900 dark:text-white font-mono font-bold',
      render: (row) => row.date,
    },
    {
      key: 'description',
      header: 'Exame / Descrição',
      priority: 'secondary',
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span className="font-bold text-slate-800 dark:text-slate-200">Painel Completo de Sangue</span>
          <span className="px-2 py-0.5 rounded-radius-full text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-semibold">
            {row.totalCount} exames
          </span>
          {row.nonClinicalCount > 0 && (
            <span className="px-2 py-0.5 rounded-radius-full text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30 font-semibold">
              {row.nonClinicalCount} sem provenance clínica
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'highlights',
      header: 'Destaques Principais',
      priority: 'secondary',
      render: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.highlights.map((item, i) => (
            <span
              key={i}
              className="text-xs font-semibold px-2 py-0.5 rounded-radius-sm bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
            >
              <strong className="text-cyan-600 dark:text-cyan-400">{getMetricDisplayName(item).split(' ')[0]}:</strong>{' '}
              {item.value} {item.unit}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status dos Biomarcadores',
      priority: 'secondary',
      render: (row) => (
        <div className="flex items-center gap-2 flex-wrap">
          {row.clinicalCount > 0 ? (
            <>
              {row.optimalCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-radius-sm bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> {row.optimalCount} Ótimos
                </span>
              )}
              {row.inRangeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-radius-sm bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                  {row.inRangeCount} Na referência
                </span>
              )}
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-radius-sm bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Sem dados clínicos elegíveis
            </span>
          )}
          {row.attentionCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-radius-sm bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
              <AlertCircle className="h-3 w-3" aria-hidden="true" /> {row.attentionCount} Atenção clínica
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      priority: 'action',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-start md:justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedPanelDate(row.date)}
            leftIcon={Eye}
          >
            Ver Laudo Completo
          </Button>

          <IconButton
            variant="destructive"
            size="sm"
            onClick={() => setDeleteConfirmDate(row.date)}
            icon={Trash2}
            title="Excluir este laudo"
            aria-label="Excluir este laudo"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="glass-panel rounded-radius-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Dna className="h-5 w-5 text-cyan-600 dark:text-cyan-400" /> Exames Laboratoriais & Referências de Longevidade
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Histórico de laudos em ordem cronológica (mais recente ao mais antigo)
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowBatchModal(true)}
          leftIcon={Plus}
          className="w-full sm:w-auto shrink-0"
        >
          Novo Painel de Exames
        </Button>
      </div>

      {deleteError && <InlineError message={deleteError} />}

      {excludedLabsCount > 0 && (
        <div role="status" className="rounded-radius-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          {excludedLabsCount} registro(s) sem provenance clínica verificável estão visíveis para auditoria, mas foram excluídos de cálculos, razões e relatórios clínicos.
        </div>
      )}

      {/* Cartões de Razões Cardiovasculares Avançadas */}
      <CardiovascularRatios clinicalLabs={clinicalLabs} />

      {/* Tabela / Cards de Laudos Consolidada */}
      {panelRows.length === 0 ? (
        <div className="py-4">
          <EmptyState
            title="Nenhum laudo cadastrado"
            description="Clique em 'Cadastrar Primeiro Laudo' para registrar seus biomarcadores de sangue."
            icon={FileText}
            action={{
              label: 'Cadastrar Primeiro Laudo',
              onClick: () => setShowBatchModal(true),
            }}
          />
        </div>
      ) : (
        <ResponsiveDataTable
          caption={`Laudos laboratoriais cadastrados (${panelRows.length})`}
          columns={panelColumns}
          rows={panelRows}
          getRowKey={(row) => row.date}
          getRowLabel={(row) => `Laudo de ${row.date} (${row.totalCount} exames)`}
          onRowClick={(row) => setSelectedPanelDate(row.date)}
          stickyFirstColumn
        />
      )}

      {/* Modal de Detalhes do Laudo */}
      <LabPanelDetailModal
        date={selectedPanelDate}
        results={selectedPanelDate ? groupedLabs[selectedPanelDate] : undefined}
        onClose={() => setSelectedPanelDate(null)}
      />

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmDate)}
        onClose={() => setDeleteConfirmDate(null)}
        onConfirm={handleConfirmDelete}
        title="Confirmar Exclusão de Laudo"
        description={
          deleteConfirmDate ? (
            <span>
              Tem certeza que deseja excluir todos os{' '}
              <strong className="text-slate-900 dark:text-white">
                {groupedLabs[deleteConfirmDate]?.length || 0} exames
              </strong>{' '}
              registrados no laudo do dia{' '}
              <strong className="text-cyan-600 dark:text-cyan-400">{deleteConfirmDate}</strong>? Ação irreversível de banco de dados.
            </span>
          ) : null
        }
        confirmLabel="Confirmar Exclusão"
        cancelLabel="Cancelar"
        isDestructive
        loading={isDeleting}
      />

      {/* Modal de Inclusão em Lote */}
      <LabBatchEntryModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        onSubmit={(records) => {
          onAddBatchLabs(records);
          setShowBatchModal(false);
        }}
      />
    </div>
  );
};
