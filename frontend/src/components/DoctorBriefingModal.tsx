import React, { useState } from 'react';
import { Stethoscope, FileText, Download, Copy, Check } from 'lucide-react';

interface DoctorBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
}

export const DoctorBriefingModal: React.FC<DoctorBriefingModalProps> = ({
  isOpen,
  onClose,
  markdownContent
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Relatório Clínico (Doctor Briefing)</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">Documento formatado em Markdown para entrega em consultas médicas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
              {copied ? 'Copiado!' : 'Copiar MD'}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1">✕</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto my-4 p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {markdownContent || 'Gerando relatório...'}
        </div>

        <div className="flex justify-end border-t border-slate-200 dark:border-slate-800 pt-3">
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
