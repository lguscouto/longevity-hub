import React, { useEffect, useState } from 'react';
import { Stethoscope, Download, Copy, Check } from 'lucide-react';
import { Modal, Button, FormField, Textarea, Checkbox } from './ui';
import { requestJson } from '../lib/api';

type BriefingOptions = { labs: Array<{ id: number; metric_name: string; collected_at: string; record_origin: string }>; events: Array<{ id: string; date_ref: string; title: string; source: string }> };

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
  const [questionsText, setQuestionsText] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [options, setOptions] = useState<BriefingOptions | null>(null);
  const [selectedLabs, setSelectedLabs] = useState<number[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [selectedPreview, setSelectedPreview] = useState('');
  const questions = questionsText.split('\n').map(line => line.trim()).filter(Boolean);
  const questionsError = questions.length > 10 || questions.some(line => line.length > 300)
    ? 'Digite até 10 perguntas, com no máximo 300 caracteres por linha.'
    : '';

  useEffect(() => {
    if (!isOpen || !selectionEnabled) return;
    let active = true;
    requestJson<BriefingOptions>('/api/reports/doctor-briefing/options')
      .then(value => { if (active) setOptions(value); })
      .catch(() => { if (active) setActionError('Não foi possível carregar os itens para seleção.'); });
    return () => { active = false; };
  }, [isOpen, selectionEnabled]);

  const selectionPayload = () => selectionEnabled ? { selected_lab_ids: selectedLabs, selected_event_ids: selectedEvents } : {};
  const loadSelectedMarkdown = async () => {
    const result = await requestJson<{ markdown: string }>('/api/reports/doctor-briefing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questions, ...selectionPayload() }),
    });
    setSelectedPreview(result.markdown);
    return result.markdown;
  };

  const handleCopy = async () => {
    setActionError('');
    const appendix = questions.length ? `\n\n## Perguntas para a consulta\n\n${questions.map(question => `- ${question}`).join('\n')}` : '';
    try {
      const text = selectionEnabled ? await loadSelectedMarkdown() : markdownContent + appendix;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionError('Não foi possível copiar o resumo.');
    }
  };

  const handleDownload = async () => {
    setActionError('');
    setDownloading(true);
    try {
      const response = await fetch('/api/reports/doctor-briefing/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions, ...selectionPayload() }),
      });
      if (!response.ok || !response.headers.get('Content-Type')?.includes('application/pdf')) {
        throw new Error('PDF indisponível');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = 'doctor_briefing_longevidade.pdf';
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setActionError('Não foi possível baixar o PDF. Tente novamente.');
    } finally {
      setDownloading(false);
    }
  };

  const downloadButton = <Button type="button" variant="secondary" size="sm" leftIcon={Download}
    disabled={downloading || !!questionsError || (selectionEnabled && !options)} onClick={handleDownload}>
    {downloading ? 'Gerando PDF…' : 'Baixar PDF'}
  </Button>;
  const copyButton = <Button type="button" variant="secondary" size="sm"
    disabled={!!questionsError || !markdownContent || (selectionEnabled && !options)} onClick={handleCopy} leftIcon={copied ? Check : Copy}>
    {copied ? 'Copiado!' : 'Copiar texto'}
  </Button>;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resumo para consulta médica"
      description="Um resumo dos seus principais dados para você revisar e levar à consulta."
      icon={
        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
          <Stethoscope className="h-5 w-5" />
        </div>
      }
      size="3xl"
      closeButtonAriaLabel="Fechar"
      headerAction={
        <div className="hidden sm:flex items-center gap-2">
          {downloadButton}
          {copyButton}
        </div>
      }
      footer={
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full">
          <div className="flex flex-wrap sm:hidden items-center gap-2">
            {downloadButton}
            {copyButton}
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
          <span className="font-bold shrink-0">Importante:</span>
          <span className="leading-relaxed">
            Este resumo organiza seus dados para facilitar sua conversa com o profissional de saúde. Ele não substitui avaliação, diagnóstico ou orientação médica.
          </span>
        </div>
        <FormField id="briefing-questions" label="Perguntas para a consulta"
          helperText="Uma por linha. As perguntas entram no texto copiado e no PDF." error={questionsError}>
          <Textarea id="briefing-questions" rows={3} maxLength={3010} value={questionsText}
            onChange={event => { setQuestionsText(event.target.value); setSelectedPreview(''); }} aria-invalid={!!questionsError}
            aria-describedby={questionsError ? 'briefing-questions-error' : 'briefing-questions-helper'} />
        </FormField>
        <label className="flex min-h-11 items-center gap-2 text-sm"><Checkbox checked={selectionEnabled} onChange={event => { setSelectionEnabled(event.target.checked); setSelectedPreview(''); setOptions(null); }} /> Selecionar exames e eventos para o resumo</label>
        {selectionEnabled && options && <div className="space-y-3 text-sm">
          <p>Selecione os resultados e eventos desejados. As estimativas e demais seções do resumo permanecem disponíveis.</p>
          <fieldset><legend>Exames (até 500 recentes)</legend>{options.labs.map(lab => <label className="flex min-h-11 items-center gap-2" key={lab.id}><Checkbox checked={selectedLabs.includes(lab.id)} onChange={event => { setSelectedLabs(current => event.target.checked ? [...current, lab.id] : current.filter(id => id !== lab.id)); setSelectedPreview(''); }} /> {lab.collected_at} — {lab.metric_name} ({lab.record_origin || 'origem não informada'})</label>)}</fieldset>
          <fieldset><legend>Eventos (até 500 recentes)</legend>{options.events.map(item => <label className="flex min-h-11 items-center gap-2" key={item.id}><Checkbox checked={selectedEvents.includes(item.id)} onChange={event => { setSelectedEvents(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id)); setSelectedPreview(''); }} /> {item.date_ref} — {item.title} ({item.source || 'origem não informada'})</label>)}</fieldset>
          <Button type="button" variant="secondary" disabled={!!questionsError} onClick={() => { setActionError(''); loadSelectedMarkdown().catch(() => setActionError('Não foi possível atualizar a prévia.')); }}>Atualizar prévia selecionada</Button>
          {!selectedPreview && <p>Atualize a prévia para visualizar a seleção; cópia e PDF também usam a seleção atual.</p>}
        </div>}
        {actionError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{actionError}</p>}
        <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
          {selectionEnabled ? selectedPreview || 'Prévia da seleção ainda não atualizada.' : markdownContent || 'Gerando resumo...'}
        </div>
      </div>
    </Modal>
  );
};
