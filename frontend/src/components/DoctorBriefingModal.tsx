import React, { useState } from 'react';
import { Stethoscope, Download, Copy, Check } from 'lucide-react';
import { Modal, Button } from './ui';

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
        <div className="hidden sm:flex items-center gap-2">
          <a
            href="/api/reports/doctor-briefing/pdf"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition"
          >
            <Download className="h-4 w-4" /> Baixar PDF
          </a>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            leftIcon={copied ? Check : Copy}
          >
            {copied ? 'Copiado!' : 'Copiar MD'}
          </Button>
        </div>
      }
      footer={
        <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
          <div className="flex sm:hidden items-center gap-2">
            <a
              href="/api/reports/doctor-briefing/pdf"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 transition"
            >
              <Download className="h-4 w-4" /> PDF
            </a>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              leftIcon={copied ? Check : Copy}
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-900 dark:text-cyan-200 flex items-start gap-2.5">
          <span className="font-bold shrink-0">Aviso Clínico:</span>
          <span className="leading-relaxed">
            Este relatório sintetiza dados registrados pelo próprio usuário para subsidiar a discussão em consulta médica. Não substitui o diagnóstico, acompanhamento ou prescrição profissional.
          </span>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {markdownContent || 'Gerando relatório...'}
        </div>
      </div>
    </Modal>
  );
};
