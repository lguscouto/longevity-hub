import React, { useState, useMemo } from 'react';
import {
  Footprints,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { StepDayRecord, formatStepNumber, formatDateBR } from './types';
import { Button, Input } from '../ui';

export interface DailyStepsTableProps {
  records: StepDayRecord[];
  targetGoal?: number;
}

export const DailyStepsTable: React.FC<DailyStepsTableProps> = ({ records, targetGoal = 8000 }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase().trim();
    return records.filter((r) => r.date_ref.includes(term) || formatDateBR(r.date_ref).includes(term));
  }, [records, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, Math.min(prev, totalPages) - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  return (
    <div className="rounded-radius-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Footprints className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Histórico Diário Detalhado
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {records.length} registros sincronizados do Zepp OS e fontes integradas
          </p>
        </div>

        {/* Busca por Data */}
        <div className="w-full sm:w-64">
          <Input
            type="text"
            placeholder="Buscar por data (ex: 2026-10)..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            leftIcon={<Search className="h-4 w-4" />}
            className="text-xs min-h-[36px] py-1.5"
          />
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-radius-lg shadow-2xs">
        <table className="w-full text-xs text-left" aria-label="Tabela detalhada de passos por dia">
          <caption className="sr-only">Passos de cada dia individual</caption>
          <thead className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th scope="col" className="p-3">Data</th>
              <th scope="col" className="p-3">Passos</th>
              <th scope="col" className="p-3">Meta</th>
              <th scope="col" className="p-3">Status</th>
              <th scope="col" className="p-3">Distância</th>
              <th scope="col" className="p-3">Calorias</th>
              <th scope="col" className="p-3">Tempo Ativo</th>
              <th scope="col" className="p-3">Média Móvel (7d)</th>
              <th scope="col" className="p-3">Dispositivo / Fonte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pageRecords.map((r) => {
              const met = r.steps >= (r.goal || targetGoal);
              const isNear = !met && r.steps >= (r.goal || targetGoal) * 0.7;

              return (
                <tr key={r.date_ref} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-3 font-mono font-medium text-slate-900 dark:text-white">
                    {formatDateBR(r.date_ref)}
                  </td>
                  <td className="p-3 font-mono font-bold text-sm text-slate-900 dark:text-white">
                    {formatStepNumber(r.steps)}
                  </td>
                  <td className="p-3 font-mono text-slate-500">
                    {formatStepNumber(r.goal || targetGoal)}
                  </td>
                  <td className="p-3">
                    {r.is_today_in_progress ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-radius-sm font-semibold text-2xs bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20">
                        <Clock className="h-3 w-3" /> Em andamento
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-radius-sm font-semibold text-2xs ${
                          met
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                            : isNear
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {met ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {met ? 'Meta atingida' : isNear ? 'Próximo' : 'Abaixo'}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                    {r.distance_km} km
                  </td>
                  <td className="p-3 font-mono text-amber-600 dark:text-amber-400">
                    {formatStepNumber(r.calories)} kcal
                  </td>
                  <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                    {r.active_minutes > 0 ? (
                      <span className="flex items-center gap-1" title={`Caminhada: ${r.walking_min}m | Corrida/Ativo: ${r.running_min}m`}>
                        <Clock className="h-3 w-3 text-slate-400" />
                        {r.active_minutes} min
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-3 font-mono text-cyan-600 dark:text-cyan-400 font-medium">
                    {formatStepNumber(r.ma7_steps)}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-radius-full text-2xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {r.source || 'Zepp'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
        <span>
          Página <strong className="text-slate-800 dark:text-slate-200">{safeCurrentPage}</strong> de{' '}
          <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> (
          {filteredRecords.length} dias)
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevPage}
            disabled={safeCurrentPage <= 1}
            leftIcon={ChevronLeft}
          >
            Anterior
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextPage}
            disabled={safeCurrentPage >= totalPages}
            rightIcon={ChevronRight}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
};
