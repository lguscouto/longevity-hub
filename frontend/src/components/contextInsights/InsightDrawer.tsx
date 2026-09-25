import React, { useEffect, useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  HelpCircle,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
import {
  fetchContextExplanation,
  submitInsightFeedback,
  synthesizeContextExplanation,
} from './api'
import type { ContextExplanation, FactorAttribution } from './types'

interface InsightDrawerProps {
  isOpen: boolean
  onClose: () => void
  metric: string
  date: string
  onOpenAddEvent?: (defaultDate: string) => void
}

export const InsightDrawer: React.FC<InsightDrawerProps> = ({
  isOpen,
  onClose,
  metric,
  date,
  onOpenAddEvent,
}) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ContextExplanation | null>(null)

  // Síntese por IA
  const [synthesizing, setSynthesizing] = useState<boolean>(false)
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiNote, setAiNote] = useState<string | null>(null)

  // Feedback
  const [feedbackSent, setFeedbackSent] = useState<boolean>(false)
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false)

  useEffect(() => {
    if (!isOpen || !metric || !date) return

    setLoading(true)
    setError(null)
    setAiText(null)
    setAiNote(null)
    setFeedbackSent(false)

    fetchContextExplanation(metric, date, 30)
      .then(res => {
        setData(res)
      })
      .catch(err => {
        setError(err?.message || 'Falha ao carregar análise de contexto.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, metric, date])

  if (!isOpen) return null

  const handleSynthesizeWithAi = async () => {
    if (!metric || !date) return
    setSynthesizing(true)
    try {
      const res = await synthesizeContextExplanation(metric, date)
      setAiText(res.text)
      if (res.note) setAiNote(res.note)
    } catch (err: any) {
      alert(err?.message || 'Não foi possível gerar síntese por IA.')
    } finally {
      setSynthesizing(false)
    }
  }

  const handleFeedback = async (isHelpful: boolean, factorKey?: string) => {
    if (!metric || !date || feedbackSent) return
    setFeedbackLoading(true)
    try {
      await submitInsightFeedback({
        metric,
        date_ref: date,
        is_helpful: isHelpful,
        factor_key: factorKey,
        user_rating: isHelpful ? 'relevant' : 'irrelevant',
      })
      setFeedbackSent(true)
    } catch {
      // Ignora erro de rede no feedback para não travar a UX
      setFeedbackSent(true)
    } finally {
      setFeedbackLoading(false)
    }
  }

  const getStrengthBadge = (strength: string) => {
    if (strength === 'forte') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Associação forte
        </span>
      )
    }
    if (strength === 'moderada') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Associação moderada
        </span>
      )
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
        Associação fraca
      </span>
    )
  }

  const getConfidenceBadge = (confidence: string) => {
    if (confidence === 'alta') {
      return (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
          Alta
        </span>
      )
    }
    if (confidence === 'moderada') {
      return (
        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
          Moderada
        </span>
      )
    }
    return (
      <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
        Baixa
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                  Contextual Insight Engine
                </span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                  {date}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {data?.metric_name || metric} — Entender Mudança
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
                <span>Processando baseline e fatores associados...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            ) : data ? (
              <>
                {/* 1. O que mudou? */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      O que mudou?
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        data.significance === 'significativa'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      Alteração {data.significance}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        {data.observed_value} <span className="text-sm font-semibold text-slate-400">{data.unit}</span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Baseline pessoal (30d): <span className="font-semibold text-slate-700 dark:text-slate-300">{data.baseline_value} {data.unit}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-lg font-black flex items-center justify-end gap-1 ${
                          data.delta_percent < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {data.delta_percent < 0 ? <TrendingDown className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                        {data.delta_percent > 0 ? `+${data.delta_percent}%` : `${data.delta_percent}%`}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        Z-Score: {data.robust_z_score > 0 ? `+${data.robust_z_score}` : data.robust_z_score}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    {data.summary_headline}
                  </p>
                </div>

                {/* 2. Possíveis fatores associados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Possíveis Fatores Associados
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {data.factors.length} {data.factors.length === 1 ? 'fator encontrado' : 'fatores encontrados'}
                    </span>
                  </div>

                  {data.factors.length > 0 ? (
                    <div className="space-y-2.5">
                      {data.factors.map((f, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-sm space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {f.factor_name}
                            </span>
                            {getStrengthBadge(f.strength)}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {f.summary}
                          </p>
                          {f.personal_evidence && (
                            <div className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-xl flex items-start gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-500" />
                              <span>{f.personal_evidence}</span>
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> Janela: {f.window_hours}h anteriores
                            </span>
                            <span>•</span>
                            <span>Score: {f.strength_score.toFixed(2)}</span>
                            {f.personal_stats && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                  n = {f.personal_stats.sample_size} (calibrado)
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                      Nenhum evento registrado encontrado na janela temporal de busca (álcool, treino intenso ou sintomas).
                    </div>
                  )}
                </div>

                {/* 3. Síntese Textual & Copiloto IA */}
                <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500" /> Síntese Contextual
                    </span>

                    <button
                      onClick={handleSynthesizeWithAi}
                      disabled={synthesizing}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Sparkles className={`h-3 w-3 ${synthesizing ? 'animate-spin' : ''}`} />
                      {synthesizing ? 'Sintetizando...' : 'Aprofundar com Copiloto IA'}
                    </button>
                  </div>

                  {aiText ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {aiText}
                      </p>
                      {aiNote && <p className="text-[10px] text-slate-400 italic">{aiNote}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {data.structured_explanation}
                    </p>
                  )}
                </div>

                {/* 4. Confiança da Análise & Proveniência */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Confiança da Análise:</span>
                    {getConfidenceBadge(data.analysis_confidence)}
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Cobertura do Histórico:</span>
                    <span className="font-medium">{data.data_coverage_days} de {data.total_baseline_days} dias</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Método estatístico:</span>
                    <span className="font-mono text-[11px]">Mediana + MAD</span>
                  </div>
                </div>

                {/* 5. Rodapé obrigatório de salvaguarda */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>{data.disclaimer}</span>
                </div>

                {/* 6. Loop de Feedback do Usuário */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Esta análise parece correta no seu caso?
                  </span>

                  {feedbackSent ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Obrigado! Feedback registrado para calibração pessoal.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(true)}
                        disabled={feedbackLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 transition"
                      >
                        <ThumbsUp className="h-3.5 w-3.5" /> Parece correto
                      </button>
                      <button
                        onClick={() => handleFeedback(false)}
                        disabled={feedbackLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-200 transition"
                      >
                        <ThumbsDown className="h-3.5 w-3.5" /> Não relevante
                      </button>
                    </div>
                  )}

                  {onOpenAddEvent && (
                    <button
                      onClick={() => onOpenAddEvent(date)}
                      className="w-full flex items-center justify-center gap-1.5 pt-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline border-t border-slate-100 dark:border-slate-700"
                    >
                      <PlusCircle className="h-3.5 w-3.5" /> Algo importante aconteceu nesta data? (+ Registrar Evento)
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
