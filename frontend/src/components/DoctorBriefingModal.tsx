import React, { useState } from 'react';
import { Stethoscope, Download, Copy, Check } from 'lucide-react';
import { Modal } from './ui';

interface DoctorBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdownContent: string;
}

export const DoctorBriefingModal: React.FC<DoctorBriefingModalProps> = ({
  isOpen,
  onClose,
  markdownContent,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Relatório Clínico (Doctor Briefing)"
      description="Documento formatado em Markdown para entrega em consultas médicas"
      icon={
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
          <Stethoscope className="h-5 w-5" />
        </div>
      }
      size="3xl"
      closeButtonAriaLabel="Fechar"
      headerAction={
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <a
            href="/api/reports/doctor-briefing/pdf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition"
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            )}
            {copied ? 'Copiado!' : 'Copiar MD'}
          </button>
        </div>
      }
      footer={
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      }
    >
      <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
        {markdownContent || 'Gerando relatório...'}
      </div>
    </Modal>
  );
};
