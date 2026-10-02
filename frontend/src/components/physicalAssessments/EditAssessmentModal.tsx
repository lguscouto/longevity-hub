import React from 'react';
import { Pencil, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui';

interface EditAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  editError: string | null;
  editDate: string;
  setEditDate: (v: string) => void;
  editTitle: string;
  setEditTitle: (v: string) => void;
  editWeight: string;
  setEditWeight: (v: string) => void;
  editBodyFat: string;
  setEditBodyFat: (v: string) => void;
  editWaist: string;
  setEditWaist: (v: string) => void;
  editAbdomen: string;
  setEditAbdomen: (v: string) => void;
  editHip: string;
  setEditHip: (v: string) => void;
  editNotes: string;
  setEditNotes: (v: string) => void;
  editSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const EditAssessmentModal: React.FC<EditAssessmentModalProps> = ({
  isOpen,
  onClose,
  editError,
  editDate,
  setEditDate,
  editTitle,
  setEditTitle,
  editWeight,
  setEditWeight,
  editBodyFat,
  setEditBodyFat,
  editWaist,
  setEditWaist,
  editAbdomen,
  setEditAbdomen,
  editHip,
  setEditHip,
  editNotes,
  setEditNotes,
  editSubmitting,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Avaliação Física"
      icon={<Pencil className="h-5 w-5 text-amber-500" />}
      size="2xl"
    >
      <div className="space-y-4">
        {editError && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Avaliação <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Título (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Medição pós-treino"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 78.5"
                value={editWeight}
                onChange={e => setEditWeight(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Gordura Corporal (%)</label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 15.2"
                value={editBodyFat}
                onChange={e => setEditBodyFat(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Cintura (cm)</label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 82.0"
                value={editWaist}
                onChange={e => setEditWaist(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Abdômen (cm)</label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 85.0"
                value={editAbdomen}
                onChange={e => setEditAbdomen(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Quadril (cm)</label>
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 96.0"
                value={editHip}
                onChange={e => setEditHip(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Observações Pessoais</label>
            <textarea
              rows={3}
              placeholder="Ex: Atualizado peso e cintura após retorno das férias..."
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-medium transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-xs font-semibold shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {editSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
