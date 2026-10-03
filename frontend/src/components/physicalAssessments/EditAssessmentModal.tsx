import React from 'react';
import { Pencil, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Modal, Input, Textarea, FormField, Button } from '../ui';

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
          <div role="alert" className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField id="edit-assessment-date" label="Data da Avaliação" required>
              <Input
                id="edit-assessment-date"
                type="date"
                required
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
              />
            </FormField>

            <FormField id="edit-assessment-title" label="Título (Opcional)">
              <Input
                id="edit-assessment-title"
                type="text"
                placeholder="Ex: Medição pós-treino"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
            </FormField>

            <FormField id="edit-assessment-weight" label="Peso (kg)">
              <Input
                id="edit-assessment-weight"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 78.5"
                value={editWeight}
                onChange={e => setEditWeight(e.target.value)}
                rightIcon={<span className="text-xs text-slate-400 font-semibold pr-2">kg</span>}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField id="edit-assessment-bodyfat" label="Gordura Corporal (%)">
              <Input
                id="edit-assessment-bodyfat"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 15.2"
                value={editBodyFat}
                onChange={e => setEditBodyFat(e.target.value)}
                rightIcon={<span className="text-xs text-slate-400 font-semibold pr-2">%</span>}
              />
            </FormField>

            <FormField id="edit-assessment-waist" label="Cintura (cm)">
              <Input
                id="edit-assessment-waist"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 82.0"
                value={editWaist}
                onChange={e => setEditWaist(e.target.value)}
                rightIcon={<span className="text-xs text-slate-400 font-semibold pr-2">cm</span>}
              />
            </FormField>

            <FormField id="edit-assessment-abdomen" label="Abdômen (cm)">
              <Input
                id="edit-assessment-abdomen"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 85.0"
                value={editAbdomen}
                onChange={e => setEditAbdomen(e.target.value)}
                rightIcon={<span className="text-xs text-slate-400 font-semibold pr-2">cm</span>}
              />
            </FormField>

            <FormField id="edit-assessment-hip" label="Quadril (cm)">
              <Input
                id="edit-assessment-hip"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 96.0"
                value={editHip}
                onChange={e => setEditHip(e.target.value)}
                rightIcon={<span className="text-xs text-slate-400 font-semibold pr-2">cm</span>}
              />
            </FormField>
          </div>

          <FormField id="edit-assessment-notes" label="Observações Pessoais">
            <Textarea
              id="edit-assessment-notes"
              rows={3}
              placeholder="Ex: Atualizado peso e cintura após retorno das férias..."
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              className="resize-none"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={editSubmitting}
              loadingText="Salvando..."
              leftIcon={CheckCircle2}
            >
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
