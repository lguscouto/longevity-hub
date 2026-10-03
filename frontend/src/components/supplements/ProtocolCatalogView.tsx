import React, { useState, useMemo } from 'react';
import { Search, Clock, Edit3, Trash2 } from 'lucide-react';
import { EmptyState, Input, Button, IconButton } from '../ui';
import { Supplement } from './types';

export interface ProtocolCatalogViewProps {
  supplements: Supplement[];
  onOpenAddModal: () => void;
  onOpenEditModal: (supp: Supplement) => void;
  onConfirmDelete: (supp: { id: number; name: string }) => void;
}

export const ProtocolCatalogView: React.FC<ProtocolCatalogViewProps> = ({
  supplements,
  onOpenAddModal,
  onOpenEditModal,
  onConfirmDelete,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'Todos' | 'Suplemento' | 'Hormônio'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  const countSuplemento = supplements.filter((s) => s.category !== 'Hormônio' && s.category !== 'Peptídeo').length;
  const countHormonio = supplements.filter((s) => s.category === 'Hormônio' || s.category === 'Peptídeo').length;

  const filteredSupplements = useMemo(() => {
    return supplements.filter((supp) => {
      const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';
      if (activeCategoryFilter === 'Suplemento' && isHormone) return false;
      if (activeCategoryFilter === 'Hormônio' && !isHormone) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = supp.name.toLowerCase().includes(term);
        const matchesDosage = supp.dosage.toLowerCase().includes(term);
        const matchesNotes = supp.notes?.toLowerCase().includes(term);
        const matchesTiming = supp.timing.toLowerCase().includes(term);
        return matchesName || matchesDosage || matchesNotes || matchesTiming;
      }
      return true;
    });
  }, [supplements, activeCategoryFilter, searchTerm]);

  return (
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

        <div className="w-full sm:w-64">
          <Input
            type="text"
            placeholder="Buscar composto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
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
            onClick: onOpenAddModal,
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSupplements.map((supp) => {
            const isHormone = supp.category === 'Hormônio' || supp.category === 'Peptídeo';
            return (
              <div
                key={supp.id}
                className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{supp.name}</h4>
                        <span
                          className={`text-xs uppercase font-extrabold px-1.5 py-0.5 rounded border ${
                            isHormone
                              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          {supp.category || 'Suplemento'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 mt-1">
                        <span className="font-extrabold text-cyan-600 dark:text-cyan-300">
                          {supp.dosage}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                          {supp.timing}
                        </span>
                        <span>•</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{supp.frequency}</span>
                      </div>
                    </div>
                  </div>

                  {supp.notes && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                      {supp.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Início: {supp.start_date || 'Não informado'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenEditModal(supp)}
                      leftIcon={Edit3}
                      className="min-h-0 h-auto py-1 px-2.5 text-xs font-semibold"
                    >
                      Editar
                    </Button>

                    <IconButton
                      icon={Trash2}
                      variant="ghost"
                      size="sm"
                      onClick={() => onConfirmDelete({ id: supp.id, name: supp.name })}
                      aria-label="Remover Composto"
                      title="Remover Composto"
                      className="hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
