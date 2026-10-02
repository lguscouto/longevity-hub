import React from 'react';
import { Pill, Edit3 } from 'lucide-react';
import { Modal, ConfirmDialog } from '../ui';
import { Supplement } from './types';

export interface SupplementModalsProps {
  showAddModal: boolean;
  onCloseAddModal: () => void;
  onAddSupplement: (e: React.FormEvent) => void;
  formData: {
    name: string;
    dosage: string;
    category: string;
    frequency: string;
    timing: string;
    notes: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      dosage: string;
      category: string;
      frequency: string;
      timing: string;
      notes: string;
    }>
  >;
  editingSupp: Supplement | null;
  onCloseEditModal: () => void;
  onUpdateSupplement: (e: React.FormEvent) => void;
  editFormData: {
    dosage: string;
    timing: string;
    notes: string;
  };
  setEditFormData: React.Dispatch<
    React.SetStateAction<{
      dosage: string;
      timing: string;
      notes: string;
    }>
  >;
  deleteConfirmSupp: { id: number; name: string } | null;
  onCloseDeleteConfirm: () => void;
  onConfirmDelete: () => void;
}

const inputClass =
  'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-cyan-500 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:outline-none';

export const SupplementModals: React.FC<SupplementModalsProps> = ({
  showAddModal,
  onCloseAddModal,
  onAddSupplement,
  formData,
  setFormData,
  editingSupp,
  onCloseEditModal,
  onUpdateSupplement,
  editFormData,
  setEditFormData,
  deleteConfirmSupp,
  onCloseDeleteConfirm,
  onConfirmDelete,
}) => {
  return (
    <>
      {/* Modal Adicionar Composto */}
      <Modal
        isOpen={showAddModal}
        onClose={onCloseAddModal}
        title="Adicionar Novo Composto"
        icon={<Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        <form onSubmit={onAddSupplement} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
              Nome do Composto
            </label>
            <input
              type="text"
              placeholder="Ex: Metformina, Testosterona, CoQ10"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Dosagem
              </label>
              <input
                type="text"
                placeholder="Ex: 500mg, 100mg/semana"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Frequência
              </label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className={inputClass}
              >
                <option value="Diário">Diário</option>
                <option value="Semanal">Semanal</option>
                <option value="Dias Alternados">Dias Alternados</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Horário / Cronobiologia
              </label>
              <select
                value={formData.timing}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
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
            <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
              Notas / Protocolo de Aplicação
            </label>
            <input
              type="text"
              placeholder="Ex: Tomar com refeição gordurosa"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
            <button
              type="button"
              onClick={onCloseAddModal}
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
        onClose={onCloseEditModal}
        title={editingSupp ? `Editar ${editingSupp.name}` : ''}
        description="As alterações serão registradas no Audit Log de longevidade"
        icon={<Edit3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        {editingSupp && (
          <form onSubmit={onUpdateSupplement} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Nova Dosagem
              </label>
              <input
                type="text"
                value={editFormData.dosage}
                onChange={(e) => setEditFormData({ ...editFormData, dosage: e.target.value })}
                className={inputClass}
                required
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Novo Horário / Cronobiologia
              </label>
              <select
                value={editFormData.timing}
                onChange={(e) => setEditFormData({ ...editFormData, timing: e.target.value })}
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
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">
                Notas / Observações
              </label>
              <input
                type="text"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              <button
                type="button"
                onClick={onCloseEditModal}
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
        description={`Tem certeza que deseja remover ${
          deleteConfirmSupp?.name || ''
        } da sua pilha ativa? Esta alteração será registrada no histórico de auditoria imutável.`}
        confirmLabel="Confirmar Remoção"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={onConfirmDelete}
        onClose={onCloseDeleteConfirm}
      />
    </>
  );
};
