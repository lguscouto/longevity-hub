import React from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Modal, Button, Select, IconButton } from '../ui';
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
      title="Adicionar fotos à avaliação"
      icon={<Camera className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
      size="2xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onUpload}
            disabled={detailsPhotoDrafts.length === 0}
            loading={submitting}
            loadingText="Enviando fotos..."
          >
            Enviar {detailsPhotoDrafts.length} {detailsPhotoDrafts.length === 1 ? 'Foto' : 'Fotos'}
          </Button>
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
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Selecione as fotos que deseja adicionar</p>
          </label>
        </div>

        {detailsPhotoDrafts.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {detailsPhotoDrafts.map((d, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 shadow-sm">
                <img src={d.previewUrl} alt="Preview" className="w-12 h-14 object-cover rounded" />
                <div className="w-40">
                  <Select
                    value={d.angle}
                    onChange={e => {
                      const val = e.target.value as any;
                      setDetailsPhotoDrafts(prev => {
                        const copy = [...prev];
                        copy[idx].angle = val;
                        return copy;
                      });
                    }}
                    aria-label="Ângulo da foto"
                    className="min-h-[36px] text-xs py-1"
                  >
                    <option value="front">Frente</option>
                    <option value="back">Costas</option>
                    <option value="left_side">Lado Esquerdo</option>
                    <option value="right_side">Lado Direito</option>
                    <option value="other">Outro</option>
                  </Select>
                </div>
                <IconButton
                  icon={X}
                  onClick={() => onRemoveDraft(idx)}
                  className="text-rose-500 ml-auto"
                  aria-label="Remover rascunho de foto"
                  variant="ghost"
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
