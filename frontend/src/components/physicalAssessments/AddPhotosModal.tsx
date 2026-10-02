import React from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Modal } from '../ui';
import { NewPhotoDraft } from './types';

interface AddPhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  submitting: boolean;
  detailsPhotoDrafts: NewPhotoDraft[];
  setDetailsPhotoDrafts: React.Dispatch<React.SetStateAction<NewPhotoDraft[]>>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDraft: (index: number) => void;
  onUpload: () => void;
}

export const AddPhotosModal: React.FC<AddPhotosModalProps> = ({
  isOpen,
  onClose,
  submitting,
  detailsPhotoDrafts,
  setDetailsPhotoDrafts,
  onDrop,
  onFileSelect,
  onRemoveDraft,
  onUpload,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Fotos a esta Avaliação"
      icon={<Camera className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
      size="2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onUpload}
            disabled={submitting || detailsPhotoDrafts.length === 0}
            className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            Enviar {detailsPhotoDrafts.length} {detailsPhotoDrafts.length === 1 ? 'Foto' : 'Fotos'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-6 text-center cursor-pointer"
        >
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileSelect}
            className="hidden"
            id="details-photo-upload"
          />
          <label htmlFor="details-photo-upload" className="cursor-pointer block">
            <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Clique para selecionar novas fotos</p>
          </label>
        </div>

        {detailsPhotoDrafts.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {detailsPhotoDrafts.map((d, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 shadow-sm">
                <img src={d.previewUrl} alt="Preview" className="w-12 h-14 object-cover rounded" />
                <select
                  value={d.angle}
                  onChange={e => {
                    const val = e.target.value as any;
                    setDetailsPhotoDrafts(prev => {
                      const copy = [...prev];
                      copy[idx].angle = val;
                      return copy;
                    });
                  }}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1 text-slate-800 dark:text-slate-200"
                >
                  <option value="front">Frente</option>
                  <option value="back">Costas</option>
                  <option value="left_side">Lado Esquerdo</option>
                  <option value="right_side">Lado Direito</option>
                  <option value="other">Outro</option>
                </select>
                <button
                  type="button"
                  onClick={() => onRemoveDraft(idx)}
                  className="text-rose-500 ml-auto p-1 cursor-pointer"
                  aria-label="Remover rascunho de foto"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
