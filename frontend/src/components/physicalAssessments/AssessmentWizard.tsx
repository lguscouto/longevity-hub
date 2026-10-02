import React from 'react';
import {
  Calendar,
  Ruler,
  Percent,
  Camera,
  CheckCircle2,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCcw,
  AlertCircle,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import { NewPhotoDraft, WIZARD_STEPS } from './types';

interface AssessmentWizardProps {
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  hasDraftLoaded: boolean;
  onClearDraft: () => void;
  createError: string | null;
  formDate: string;
  setFormDate: (v: string) => void;
  formTitle: string;
  setFormTitle: (v: string) => void;
  formWeight: string;
  setFormWeight: (v: string) => void;
  formBodyFat: string;
  setFormBodyFat: (v: string) => void;
  formWaist: string;
  setFormWaist: (v: string) => void;
  formAbdomen: string;
  setFormAbdomen: (v: string) => void;
  formHip: string;
  setFormHip: (v: string) => void;
  formNotes: string;
  setFormNotes: (v: string) => void;
  photoDrafts: NewPhotoDraft[];
  setPhotoDrafts: React.Dispatch<React.SetStateAction<NewPhotoDraft[]>>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onRemoveDraft: (index: number) => void;
  submitting: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  onCancel: () => void;
}

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  currentStep,
  setCurrentStep,
  hasDraftLoaded,
  onClearDraft,
  createError,
  formDate,
  setFormDate,
  formTitle,
  setFormTitle,
  formWeight,
  setFormWeight,
  formBodyFat,
  setFormBodyFat,
  formWaist,
  setFormWaist,
  formAbdomen,
  setFormAbdomen,
  formHip,
  setFormHip,
  formNotes,
  setFormNotes,
  photoDrafts,
  setPhotoDrafts,
  onFileSelect,
  onDrop,
  onRemoveDraft,
  submitting,
  onSubmit,
  onCancel,
}) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Draft Notification Badge */}
      {hasDraftLoaded && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
          <span className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4 shrink-0" />
            Rascunho de avaliação anterior recuperado automaticamente deste navegador.
          </span>
          <button
            type="button"
            onClick={onClearDraft}
            className="font-bold underline hover:no-underline ml-2 cursor-pointer"
          >
            Descartar rascunho
          </button>
        </div>
      )}

      {/* Stepper Navigation Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
        <nav aria-label="Etapas da Avaliação Física">
          <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {WIZARD_STEPS.map((step) => {
              const isCurrent = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(step.id)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                      isCurrent
                        ? 'bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                        : isCompleted
                        ? 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        : 'bg-white dark:bg-slate-950/40 border-slate-200/60 dark:border-slate-800/60 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950'
                          : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold truncate">{step.label}</span>
                      <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate hidden sm:block">
                        {step.description}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {createError && (
        <div role="alert" className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{createError}</span>
        </div>
      )}

      {/* STEP 1: DADOS BÁSICOS */}
      {currentStep === 1 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" /> Dados Principais da Avaliação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Defina o momento do registro e as informações cadastrais iniciais da avaliação.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="assessment-date-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Data da Avaliação <span className="text-rose-400">*</span>
              </label>
              <input
                id="assessment-date-input"
                type="date"
                required
                value={formDate}
                onChange={e => setFormDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="assessment-title-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Título (Opcional)
              </label>
              <input
                id="assessment-title-input"
                type="text"
                placeholder="Ex: Início do cutting / Medição mensal"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label htmlFor="assessment-weight-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Peso (kg)
              </label>
              <input
                id="assessment-weight-input"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 78.5"
                value={formWeight}
                onChange={e => setFormWeight(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: MEDIDAS & CIRCUNFERÊNCIAS */}
      {currentStep === 2 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Ruler className="h-5 w-5 text-cyan-500" /> Medidas Antropométricas & Circunferências
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Registre as circunferências em centímetros utilizando fita métrica flexível.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="assessment-waist-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Cintura (cm)
              </label>
              <input
                id="assessment-waist-input"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 82.0"
                value={formWaist}
                onChange={e => setFormWaist(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Ponto mais estreito do tronco</span>
            </div>

            <div>
              <label htmlFor="assessment-abdomen-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Abdômen (cm)
              </label>
              <input
                id="assessment-abdomen-input"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 85.0"
                value={formAbdomen}
                onChange={e => setFormAbdomen(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Na altura da cicatriz umbilical</span>
            </div>

            <div>
              <label htmlFor="assessment-hip-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Quadril (cm)
              </label>
              <input
                id="assessment-hip-input"
                type="number"
                step="0.5"
                inputMode="decimal"
                placeholder="Ex: 96.0"
                value={formHip}
                onChange={e => setFormHip(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Ponto de maior proeminência glútea</span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: COMPOSIÇÃO CORPORAL */}
      {currentStep === 3 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Percent className="h-5 w-5 text-indigo-500" /> Composição Corporal & Percentual de Gordura
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Obtido por bioimpedância médica, adipômetro ou DXA.
            </p>
          </div>

          <div className="max-w-md">
            <label htmlFor="assessment-bodyfat-input" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Gordura Corporal (%)
            </label>
            <div className="relative">
              <input
                id="assessment-bodyfat-input"
                type="number"
                step="0.1"
                inputMode="decimal"
                placeholder="Ex: 15.2"
                value={formBodyFat}
                onChange={e => setFormBodyFat(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3.5 top-2.5 text-slate-400 font-semibold text-sm">%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Este valor será utilizado no gráfico histórico e no acompanhamento longitudinal da massa magra.
            </p>
          </div>
        </div>
      )}

      {/* STEP 4: REGISTRO FOTOGRÁFICO */}
      {currentStep === 4 && (
        <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Camera className="h-5 w-5 text-cyan-500" /> Fotografias Corporais
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Envie fotos nos 4 ângulos clássicos (frente, costas, lados) para viabilizar comparações futuras.
            </p>
          </div>

          <div
            onDragOver={e => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500/50 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl p-8 text-center transition-all cursor-pointer group"
          >
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={onFileSelect}
              className="hidden"
              id="photo-upload-input"
            />
            <label htmlFor="photo-upload-input" className="cursor-pointer block">
              <Upload className="h-10 w-10 text-slate-400 group-hover:text-cyan-500 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-1">
                Clique ou arraste e solte fotos corporais aqui
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formatos aceitos: JPEG, PNG, WebP (máx. 15 MB por imagem, até 20 fotos)
              </p>
            </label>
          </div>

          {/* Photo Drafts List */}
          {photoDrafts.length > 0 && (
            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                Fotos Selecionadas ({photoDrafts.length}) — Classifique os ângulos:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photoDrafts.map((draft, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex gap-4 items-center shadow-sm"
                  >
                    <img
                      src={draft.previewUrl}
                      alt="Draft"
                      className="w-20 h-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 space-y-2 text-xs">
                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Ângulo Corporal</label>
                        <select
                          value={draft.angle}
                          onChange={e => {
                            const val = e.target.value as any;
                            setPhotoDrafts(prev => {
                              const copy = [...prev];
                              copy[idx].angle = val;
                              return copy;
                            });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
                        >
                          <option value="front">Frente</option>
                          <option value="back">Costas</option>
                          <option value="left_side">Lado Esquerdo</option>
                          <option value="right_side">Lado Direito</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">Estado Corporal</label>
                        <select
                          value={draft.body_state}
                          onChange={e => {
                            const val = e.target.value as any;
                            setPhotoDrafts(prev => {
                              const copy = [...prev];
                              copy[idx].body_state = val;
                              return copy;
                            });
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
                        >
                          <option value="relaxed">Relaxado</option>
                          <option value="flexed">Contraído</option>
                          <option value="unspecified">Não informado</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveDraft(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      title="Remover foto"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: OBSERVAÇÕES & REVISÃO */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-500" /> Observações Pessoais & Protocolo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Adicione anotações sobre horário de pesagem, refeições prévias ou dados de bioimpedância.
              </p>
            </div>

            <div>
              <textarea
                rows={3}
                placeholder="Ex: Medição realizada em jejum pela manhã logo após acordar..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>

          {/* Review Card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Resumo para Conferência
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block font-semibold">Data da Avaliação</span>
                <strong className="text-slate-900 dark:text-white text-sm">
                  {new Date(formDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </strong>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block font-semibold">Peso</span>
                <strong className="text-emerald-600 dark:text-emerald-400 text-sm">
                  {formWeight ? `${formWeight} kg` : 'Não informado'}
                </strong>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block font-semibold">% Gordura</span>
                <strong className="text-cyan-600 dark:text-cyan-400 text-sm">
                  {formBodyFat ? `${formBodyFat}%` : 'Não informado'}
                </strong>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-slate-400 block font-semibold">Circunferências</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">
                  Cintura: {formWaist ? `${formWaist}cm` : '—'} | Abd: {formAbdomen ? `${formAbdomen}cm` : '—'} | Quad: {formHip ? `${formHip}cm` : '—'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <span>Fotos anexadas: <strong className="text-slate-800 dark:text-slate-200">{photoDrafts.length}</strong></span>
              <span>Título: <strong className="text-slate-800 dark:text-slate-200">{formTitle || 'Não especificado'}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Stepper Navigation Actions */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep(prev => prev - 1)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Etapa Anterior
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {currentStep < 5 ? (
            <>
              {/* Atalho para salvar antes de passar por todas as etapas se o usuário tiver dados parciais */}
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Salvar Avaliação Física
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Próxima Etapa <ChevronRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Salvando Avaliação...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Salvar Avaliação Física
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
};
