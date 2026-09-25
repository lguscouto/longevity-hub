import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  Scale,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react'
import { fetchBeforeAfterIntervention, fetchNOf1Confounders } from './api'
import type { BeforeAfterAnalysisResponse, ConfounderReport, CovariateItem } from './types'

export interface ConfounderBalanceModalProps {
  isOpen: boolean
  onClose: () => void
  experimentId?: number
  experimentTitle?: string
  interventionId?: number
  interventionName?: string
  initialData?: ConfounderReport
}

export const ConfounderBalanceModal: React.FC<ConfounderBalanceModalProps> = ({
  isOpen,
  onClose,
  experimentId,
  experimentTitle,
  interventionId,
  interventionName,
  initialData,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<ConfounderReport | null>(initialData || null)
  const [beforeAfterData, setBeforeAfterData] = useState<BeforeAfterAnalysisResponse | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (initialData) {
      setReport(initialData)
      return
    }

    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        if (experimentId) {
          const res = await fetchNOf1Confounders(experimentId)
          setReport(res)
        } else if (interventionId) {
          const res = await fetchBeforeAfterIntervention(interventionId)
          setBeforeAfterData(res)
          setReport(res.confounder_report)
        }
      } catch (err: any) {
        setError(err.message || 'Falha ao carregar balanço de covariáveis.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [isOpen, experimentId, interventionId, initialData])

  if (!isOpen) return null

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'substance':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
            Substância
          </span>
        )
      case 'exercise':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
            Exercício
          </span>
        )
      case 'routine':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
            Rotina
          </span>
        )
      case 'supplement':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
            Suplementação
          </span>
        )
      case 'sleep':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20">
            Sono
          </span>
        )
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
            {category}
          </span>
        )
    }
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confounder-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/70 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 max-w-3xl w-full shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                <Scale className="h-5 w-5" />
              </span>
              <h2 id="confounder-modal-title" className="text-base sm:text-lg font-bold">
                Balanço de Confundidores & Covariáveis
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Avaliação de fatores exógenos entre controle e intervenção para prevenir falsa causalidade.
            </p>
            {(experimentTitle || interventionName) && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60">
                {experimentTitle || interventionName}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="overflow-y-auto flex-1 py-4 space-y-4 pr-1">
          {loading && (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-xs font-medium">Calculando balanço padronizado de covariáveis...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={onClose}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 font-semibold"
              >
                Fechar
              </button>
            </div>
          )}

          {!loading && !error && report && (
            <>
              {/* Janelas Temporais */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                    Período de Controle
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    {report.control_period.start} até {report.control_period.end} ({report.control_period.days} dias)
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-violet-500/5 dark:bg-violet-950/30 border border-violet-500/20">
                  <span className="text-[10px] uppercase font-bold text-violet-600 dark:text-violet-400 block tracking-wider">
                    Período de Intervenção
                  </span>
                  <span className="font-semibold text-violet-900 dark:text-violet-200 mt-0.5 block">
                    {report.treatment_period.start} até {report.treatment_period.end} ({report.treatment_period.days} dias)
                  </span>
                </div>
              </div>

              {/* Banner de Viés Explicativo */}
              {report.has_severe_confounding ? (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Possível Confundidor Detectado ({report.imbalanced_factors_count} fator{report.imbalanced_factors_count > 1 ? 'es' : ''})</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {report.warning_summary}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-emerald-800 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Covariáveis Balanceadas (Baixo Risco de Viés)</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                    {report.warning_summary}
                  </p>
                </div>
              )}

              {/* Tabela de Balanço de Covariáveis */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Tabela de Balanço de Covariáveis (Covariate Balance)
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Critério de Desequilíbrio: |d| ≥ 0.30 ou |Δ%| ≥ 20%
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                        <th className="py-2.5 px-3 font-semibold">Covariável Exógena</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Controle</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Intervenção</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Δ%</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Cohen's d</th>
                        <th className="py-2.5 px-3 font-semibold text-center">Balanço</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {report.covariates.map((cov: CovariateItem) => {
                        const isPos = cov.delta_pct > 0
                        return (
                          <tr
                            key={cov.key}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                              cov.is_imbalanced ? 'bg-amber-50/40 dark:bg-amber-950/15' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-white">
                                  {cov.name}
                                </span>
                                {getCategoryBadge(cov.category)}
                              </div>
                              {cov.detail_text && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {cov.detail_text}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {cov.control_mean} {cov.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                              {cov.treatment_mean} {cov.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold">
                              <span
                                className={
                                  cov.delta_pct === 0
                                    ? 'text-slate-500'
                                    : isPos
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400'
                                }
                              >
                                {cov.delta_pct > 0 ? `+${cov.delta_pct}%` : `${cov.delta_pct}%`}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                              {cov.standardized_diff}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {cov.is_imbalanced ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30">
                                  <AlertTriangle className="h-3 w-3" /> Desequilibrado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3" /> Balanceado
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Salvaguarda Clínica / Aviso Metodológico */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
                <ShieldAlert className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Princípio Clínico: Associação Temporal ≠ Causalidade
                  </span>
                  <p className="leading-relaxed">
                    {report.disclaimer}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
