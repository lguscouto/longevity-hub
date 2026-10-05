import React from 'react';
import { Pill, Edit3 } from 'lucide-react';
import { Modal, ConfirmDialog, FormField, Input, Select, Button } from '../ui';
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
        title="Adicionar item à rotina"
        icon={<Pill className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        <form onSubmit={onAddSupplement} className="space-y-4 text-xs">
          <FormField id="supp-name" label="Nome" required>
            <Input
              id="supp-name"
              type="text"
              placeholder="Ex.: Creatina, CoQ10, Vitamina D"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="supp-dosage" label="Dosagem" required>
              <Input
                id="supp-dosage"
                type="text"
                placeholder="Ex: 500mg, 100mg/semana"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
              />
            </FormField>

            <FormField id="supp-category" label="Categoria">
              <Select
                id="supp-category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Suplemento">Suplemento</option>
                <option value="Hormônio">Hormônio</option>
                <option value="Peptídeo">Peptídeo</option>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField id="supp-frequency" label="Frequência">
              <Select
                id="supp-frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="Diário">Diário</option>
                <option value="Semanal">Semanal</option>
                <option value="Dias Alternados">Dias Alternados</option>
              </Select>
            </FormField>

            <FormField id="supp-timing" label="Horário de uso">
              <Select
                id="supp-timing"
                value={formData.timing}
                onChange={(e) => setFormData({ ...formData, timing: e.target.value })}
              >
                <option value="Manhã">Manhã (Jejum)</option>
                <option value="Almoço">Almoço</option>
                <option value="Tarde">Tarde</option>
                <option value="Jantar">Jantar</option>
                <option value="Antes de Dormir">Antes de Dormir</option>
              </Select>
            </FormField>
          </div>

          <FormField id="supp-notes" label="Notas de uso">
            <Input
              id="supp-notes"
              type="text"
              placeholder="Ex.: Tomar com água ou refeição"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </FormField>

          <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCloseAddModal}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              Salvar item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Composto */}
      <Modal
        isOpen={Boolean(editingSupp)}
        onClose={onCloseEditModal}
        title={editingSupp ? `Editar ${editingSupp.name}` : ''}
        description="Esta alteração será registrada no seu histórico."
        icon={<Edit3 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
        size="md"
      >
        {editingSupp && (
          <form onSubmit={onUpdateSupplement} className="space-y-4 text-xs">
            <FormField id="edit-supp-dosage" label="Nova Dosagem" required>
              <Input
                id="edit-supp-dosage"
                type="text"
                value={editFormData.dosage}
                onChange={(e) => setEditFormData({ ...editFormData, dosage: e.target.value })}
                required
              />
            </FormField>

            <FormField id="edit-supp-timing" label="Novo horário de uso">
              <Select
                id="edit-supp-timing"
                value={editFormData.timing}
                onChange={(e) => setEditFormData({ ...editFormData, timing: e.target.value })}
              >
                <option value="Manhã">Manhã (Jejum)</option>
                <option value="Almoço">Almoço</option>
                <option value="Tarde">Tarde</option>
                <option value="Jantar">Jantar</option>
                <option value="Antes de Dormir">Antes de Dormir</option>
              </Select>
            </FormField>

            <FormField id="edit-supp-notes" label="Observações">
              <Input
                id="edit-supp-notes"
                type="text"
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
              />
            </FormField>

            <div className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCloseEditModal}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
              >
                Salvar Alterações
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Diálogo de Confirmação para Remoção de Composto */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmSupp)}
        title="Remover item da rotina"
        description={`Deseja remover ${
          deleteConfirmSupp?.name || 'este item'
        } da sua rotina? A alteração ficará registrada no seu histórico.`}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        isDestructive
        onConfirm={onConfirmDelete}
        onClose={onCloseDeleteConfirm}
      />
    </>
  );
};
