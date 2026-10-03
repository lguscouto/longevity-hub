import React, { useState } from 'react';
import { Dna, Trash2 } from 'lucide-react';
import { Modal, Button } from '../ui';
import { LAB_MARKERS_GROUPS, LabBatchRecord } from './labMarkers';
import { formatLocalDateKey } from '../../lib/formatters';

interface LabBatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (records: LabBatchRecord[]) => void;
}

/** Modal de Inclusão em Lote: preenche apenas os marcadores presentes no laudo. */
export const LabBatchEntryModal: React.FC<LabBatchEntryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [collectedAt, setCollectedAt] = useState(formatLocalDateKey());
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleInputChange = (key: string, val: string) => {
    setFormValues(prev => ({ ...prev, [key]: val }));
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordsToSave: LabBatchRecord[] = [];

    LAB_MARKERS_GROUPS.forEach(group => {
      group.items.forEach(item => {
        const rawVal = formValues[item.key];
        if (rawVal !== undefined && rawVal !== '' && !isNaN(Number(rawVal))) {
          recordsToSave.push({
            collected_at: collectedAt,
            metric_key: item.key,
            metric_name: item.name,
            value: Number(rawVal),
            unit: item.unit,
            ref_min: item.ref_min,
            ref_max: item.ref_max,
            optimal_target: item.optimal,
            category: item.category
          });
        }
      });
    });

    if (recordsToSave.length > 0) {
      onSubmit(recordsToSave);
      setFormValues({});
    }
  };

  const filledCount = Object.values(formValues).filter(v => v !== '' && !isNaN(Number(v))).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Painel Completo de Exames de Sangue"
      description="Preencha apenas os marcadores realizados no seu laudo médico"
      icon={<Dna className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />}
      size="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
            {filledCount} marcador(es) pronto(s) para salvar
          </span>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>

            <Button
              type="submit"
              form="batch-lab-form"
              variant="primary"
              size="sm"
              disabled={filledCount === 0}
            >
              Salvar Painel Completo ({filledCount})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="lab-collected-at" className="text-slate-600 dark:text-slate-400 font-semibold">Data da Coleta:</label>
            <input
              id="lab-collected-at"
              type="date"
              value={collectedAt}
              onChange={e => setCollectedAt(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-medium focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setFormValues({})}
              leftIcon={Trash2}
            >
              Limpar Tudo
            </Button>
          </div>
        </div>

        <form id="batch-lab-form" onSubmit={handleBatchSubmit} className="space-y-6 pr-2">
          {LAB_MARKERS_GROUPS.map((group, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                <span>{group.icon}</span> {group.groupName}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {group.items.map((item) => (
                  <div key={item.key} className="bg-slate-50 dark:bg-slate-950/80 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-sm">
                    <label htmlFor={`lab-marker-${item.key}`} className="block text-xs font-bold text-slate-900 dark:text-white mb-1 truncate" title={item.name}>
                      {item.name}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id={`lab-marker-${item.key}`}
                        type="number"
                        step="0.01"
                        placeholder="Vazio"
                        value={formValues[item.key] || ''}
                        onChange={e => handleInputChange(item.key, e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-semibold text-xs focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none"
                      />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{item.unit}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block" title="Referência funcional preconizada para longevidade preventiva">
                      Referência Ótima: {item.optimal} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </form>
      </div>
    </Modal>
  );
};
