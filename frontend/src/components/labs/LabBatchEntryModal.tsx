import React, { useState } from 'react';
import { Dna, Trash2 } from 'lucide-react';
import { Modal, Button, FormField, Input } from '../ui';
import { LAB_MARKERS_GROUPS, LabBatchRecord, formatOptimalTargetText } from './labMarkers';
import { formatLocalDateKey } from '../../lib/formatters';

interface LabBatchEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (records: LabBatchRecord[]) => void;
}

/** Modal de Inclusão em Lote (UX_UI_54): migrado para primitivos Input e FormField com validação explícita. */
export const LabBatchEntryModal: React.FC<LabBatchEntryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [collectedAt, setCollectedAt] = useState(formatLocalDateKey());
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateValue = (key: string, val: string): string | null => {
    if (!val || val.trim() === '') return null;
    const num = Number(val);
    if (isNaN(num)) return 'Use um número válido.';
    if (num < 0) return 'O valor não pode ser negativo.';
    if (num > 100000) return 'Valor excessivamente alto.';
    return null;
  };

  const handleInputChange = (key: string, val: string) => {
    setFormValues((prev) => ({ ...prev, [key]: val }));
    const err = validateValue(key, val);
    setErrors((prev) => {
      const next = { ...prev };
      if (err) next[key] = err;
      else delete next[key];
      return next;
    });
  };

  const hasAnyErrors = Object.keys(errors).length > 0;

  const validEntries = Object.entries(formValues).filter(([k, v]) => {
    if (!v || v.trim() === '') return false;
    const num = Number(v);
    return !isNaN(num) && num >= 0 && num <= 100000 && !errors[k];
  });

  const filledCount = validEntries.length;

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasAnyErrors || filledCount === 0) return;

    const recordsToSave: LabBatchRecord[] = [];

    LAB_MARKERS_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        const rawVal = formValues[item.key];
        if (rawVal !== undefined && rawVal.trim() !== '') {
          const num = Number(rawVal);
          if (!isNaN(num) && num >= 0 && !errors[item.key]) {
            recordsToSave.push({
              collected_at: collectedAt,
              metric_key: item.key,
              metric_name: item.name,
              value: num,
              unit: item.unit,
              ref_min: item.ref_min,
              ref_max: item.ref_max,
              optimal_target: item.optimal,
              category: item.category,
            });
          }
        }
      });
    });

    if (recordsToSave.length > 0) {
      onSubmit(recordsToSave);
      setFormValues({});
      setErrors({});
    }
  };

  const handleClearAll = () => {
    setFormValues({});
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar exames de sangue"
      description="Preencha apenas os exames que aparecem no seu laudo."
      icon={<Dna className="h-6 w-6 text-cyan-600 dark:text-cyan-400" aria-hidden="true" />}
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
              disabled={filledCount === 0 || hasAnyErrors}
            >
              Salvar Painel Completo ({filledCount})
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-radius-lg border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 max-w-xs">
            <FormField id="lab-collected-at" label="Data da Coleta:" className="flex items-center gap-2">
              <Input
                id="lab-collected-at"
                type="date"
                value={collectedAt}
                onChange={(e) => setCollectedAt(e.target.value)}
                className="max-w-[160px] py-1 text-xs"
              />
            </FormField>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleClearAll}
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
                <span aria-hidden="true">{group.icon}</span> {group.groupName}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {group.items.map((item) => {
                  const errorMsg = errors[item.key];
                  const targetFormatted = formatOptimalTargetText(item);

                  return (
                    <div
                      key={item.key}
                      className={`bg-slate-50 dark:bg-slate-950/80 p-3 rounded-radius-lg border transition shadow-sm ${
                        errorMsg
                          ? 'border-rose-400 dark:border-rose-700'
                          : 'border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <FormField
                        id={`lab-marker-${item.key}`}
                        label={item.name}
                        error={errorMsg}
                      >
                        <Input
                          id={`lab-marker-${item.key}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Vazio"
                          value={formValues[item.key] || ''}
                          error={errorMsg}
                          onChange={(e) => handleInputChange(item.key, e.target.value)}
                          rightIcon={
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              {item.unit}
                            </span>
                          }
                          className="text-xs font-semibold"
                        />
                      </FormField>

                      <span
                        className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 block truncate"
                        title={`Meta funcional preventiva: ${targetFormatted}${
                          item.provenance ? ` • Fonte: ${item.provenance}` : ''
                        }`}
                      >
                        Alvo Ótimo: {targetFormatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </form>
      </div>
    </Modal>
  );
};
