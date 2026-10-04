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
import { Drawer, Button, useToast, SourceTag } from '../ui'

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
  const { showToast } = useToast()
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
      showToast(err?.message || 'Não foi possível gerar síntese por IA.', 'error')
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
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          Associação forte
        </span>
      )
    }
    if (strength === 'moderada') {
      return (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Associação moderada
        </span>
      )
    }
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
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
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${data?.metric_name || metric} — Entender Mudança`}
      badge={
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Análise de Mudança
          </span>
          <span className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
            {date}
          </span>
        </div>
      }
      size="md"
      closeButtonAriaLabel="Fechar painel lateral"
      contentClassName="space-y-5"
    >
            {loading ? (
              <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
                <span>Comparando com sua linha de base e fatores associados...</span>
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
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
                        Linha de base (30 dias): <span className="font-semibold text-slate-700 dark:text-slate-300">{data.baseline_value} {data.unit}</span>
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
                      <div className="text-xs text-slate-400 font-medium">
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
                    <span className="text-xs text-slate-400 font-medium">
                      {(data.factors || []).length} {(data.factors || []).length === 1 ? 'fator encontrado' : 'fatores encontrados'}
                    </span>
                  </div>

                  {data.factors && data.factors.length > 0 ? (
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
                            <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 p-2 rounded-xl flex items-start gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60">
                              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-indigo-500" />
                              <span>{f.personal_evidence}</span>
                            </div>
                          )}
                          <div className="text-xs text-slate-400 flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
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
                      <SourceTag kind="inference" compact />
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSynthesizeWithAi}
                      loading={synthesizing}
                      loadingText="Sintetizando..."
                      leftIcon={Sparkles}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 min-h-0 h-auto p-0"
                    >
                      Aprofundar com o Copiloto
                    </Button>
                  </div>

                  {aiText ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                        {aiText}
                      </p>
                      {aiNote && <p className="text-xs text-slate-400 italic">{aiNote}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {data.structured_explanation}
                    </p>
                  )}
                </div>

                {/* 4. Confiança da Análise e Origem dos Dados */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Confiança da análise:</span>
                    {getConfidenceBadge(data.analysis_confidence)}
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Cobertura do histórico:</span>
                    <span className="font-medium">{data.data_coverage_days} de {data.total_baseline_days} dias</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                    <span>Método estatístico:</span>
                    <span className="font-mono text-xs">Mediana + MAD</span>
                  </div>
                </div>

                {/* 5. Rodapé obrigatório de salvaguarda */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFeedback(true)}
                        disabled={feedbackLoading}
                        leftIcon={ThumbsUp}
                        className="flex-1 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                      >
                        Parece correto
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFeedback(false)}
                        disabled={feedbackLoading}
                        leftIcon={ThumbsDown}
                        className="flex-1"
                      >
                        Não relevante
                      </Button>
                    </div>
                  )}

                  {onOpenAddEvent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenAddEvent(date)}
                      leftIcon={PlusCircle}
                      className="w-full text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline border-t border-slate-100 dark:border-slate-700 pt-2 min-h-0 h-auto"
                    >
                      Algo importante aconteceu nesta data? (+ Registrar Evento)
                    </Button>
                  )}
                </div>
              </>
            ) : null}
    </Drawer>
  )
}
