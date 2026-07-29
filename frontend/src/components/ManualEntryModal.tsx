import React, { useState } from 'react';
import { PlusCircle, Heart, Dumbbell, Scale, Activity } from 'lucide-react';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMetric: (metricData: any) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSaveMetric
}) => {
  const [formData, setFormData] = useState({
    date_ref: new Date().toISOString().slice(0, 10),
    systolic_bp: 120,
    diastolic_bp: 78,
    waist_cm: 82,
    grip_strength_kg: 48,
    weight_kg: 74.5,
    vo2_max: 46.5
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMetric(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Registrar Métricas Manuais</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Data de Referência</label>
            <input type="date" value={formData.date_ref} onChange={e => setFormData({...formData, date_ref: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Pressão Sistólica (mmHg)</label>
              <input type="number" value={formData.systolic_bp} onChange={e => setFormData({...formData, systolic_bp: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Pressão Diastólica (mmHg)</label>
              <input type="number" value={formData.diastolic_bp} onChange={e => setFormData({...formData, diastolic_bp: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Circunferência da Cintura (cm)</label>
              <input type="number" step="0.5" value={formData.waist_cm} onChange={e => setFormData({...formData, waist_cm: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Dinamometria / Grip (kg)</label>
              <input type="number" step="0.5" value={formData.grip_strength_kg} onChange={e => setFormData({...formData, grip_strength_kg: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-slate-400 mb-1">Peso (kg)</label>
              <input type="number" step="0.1" value={formData.weight_kg} onChange={e => setFormData({...formData, weight_kg: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">VO2 Max Estimado</label>
              <input type="number" step="0.1" value={formData.vo2_max} onChange={e => setFormData({...formData, vo2_max: +e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white" />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold glow-emerald">Salvar Registro</button>
          </div>
        </form>
      </div>
    </div>
  );
};
