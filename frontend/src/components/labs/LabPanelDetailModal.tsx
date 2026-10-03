import React from 'react';
import { AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { Modal, Button, TermHelp, GLOSSARY_TERMS } from '../ui';
import {
  LabResult,
  LAB_MARKERS_GROUPS,
  getMarkerMeta,
  getMetricDisplayName,
  isClinicallyEligibleLab,
  isMarkerOptimal,
  normalizeLabMetricKey,
  recordOriginLabel,
} from './labMarkers';

interface LabPanelDetailModalProps {
  date: string | null;
  results: LabResult[] | undefined;
  onClose: () => void;
}

/** Modal de Detalhes do Laudo: biomarcadores agrupados por sistema, com origem e referências. */
export const LabPanelDetailModal: React.FC<LabPanelDetailModalProps> = ({ date, results, onClose }) => (
  <Modal
    isOpen={Boolean(date && results)}
    onClose={onClose}
    title={date ? `Laudo Médico — ${date}` : ''}
    description={date && results ? `Total de ${results.length} biomarcadores registrados nesta data` : undefined}
    icon={<FileText className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />}
    size="4xl"
    footer={
      <div className="flex justify-end w-full">
        <Button variant="outline" size="sm" onClick={onClose}>
          Fechar Laudo
        </Button>
      </div>
    }
  >
    {date && results && (
      <div className="space-y-6 pr-2">
        {LAB_MARKERS_GROUPS.map((group, idx) => {
          const groupKeys = group.items.map(i => i.key);
          const matchingResults = results.filter(r => groupKeys.includes(normalizeLabMetricKey(r.metric_key)));

          if (matchingResults.length === 0) return null;

          return (
            <div key={idx} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2">
                <span>{group.icon}</span> {group.groupName} ({matchingResults.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {matchingResults.map((item, i) => {
                  const isEligible = isClinicallyEligibleLab(item);
                  const isOpt = isEligible && isMarkerOptimal(item);
                  const markerMeta = getMarkerMeta(item.metric_key);
                  return (
                    <div key={i} className="bg-slate-50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={getMetricDisplayName(item)}>
                              {getMetricDisplayName(item)}
                            </span>
                            {GLOSSARY_TERMS[item.metric_key.toLowerCase()] && (
                              <TermHelp termKey={item.metric_key.toLowerCase()} />
                            )}
                          </div>
                          {isOpt ? (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Ótimo
                            </span>
                          ) : !isEligible ? (
                            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold">Não clínico</span>
                          ) : (
                            <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                              <AlertCircle className="h-3.5 w-3.5" /> Atenção
                            </span>
                          )}
                        </div>

                        <div className="text-xl font-extrabold text-cyan-700 dark:text-cyan-300">
                          {item.value} <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{item.unit}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                        <div className="flex justify-between items-center">
                          <span>Origem: {recordOriginLabel(item.record_origin)}</span>
                          {markerMeta?.ref_min != null && markerMeta?.ref_max != null && (
                            <span title="Intervalo populacional padrão de referência clínica">
                              Ref: {markerMeta.ref_min} - {markerMeta.ref_max}
                            </span>
                          )}
                        </div>
                        <div className="flex justify-end items-center">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400" title="Faixa funcional preconizada para longevidade preventiva">
                            Referência Ótima: {item.optimal_target} {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    )}
  </Modal>
);
