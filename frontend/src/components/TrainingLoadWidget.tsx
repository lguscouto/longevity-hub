import React, { useState } from 'react'
import {
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from './ui'

interface TrainingLoadWidgetProps {
  dailyLoad?: number | null
  rollingLoad?: number | null
  optimalMin?: number | null
  optimalMax?: number | null
  workoutCount?: number | null
  workoutDurationMin?: number | null
}

export const TrainingLoadWidget: React.FC<TrainingLoadWidgetProps> = ({
  dailyLoad,
  rollingLoad,
  optimalMin,
  optimalMax,
  workoutCount,
  workoutDurationMin,
}) => {
  const [showModelDetails, setShowModelDetails] = useState(false)

  const hasData =
    rollingLoad != null ||
    dailyLoad != null ||
    (workoutCount != null && workoutCount > 0)

  if (!hasData) {
    return (
      <div className="glass-card p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="p-2 rounded-radius-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Carga de Treino & Recuperação
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Carga cardiovascular acumulada Zepp
            </p>
          </div>
        </div>

        <div className="py-5 text-center space-y-1.5">
          <div className="w-10 h-10 rounded-radius-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-2">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sem registros de carga cardiovascular no período
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Sincronize seu relógio Zepp OS com telemetria cardíaca para acompanhar a carga de treino aguda (7 dias) e sua faixa ótima.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Modelo Banister TRIMP / Firstbeat</span>
          <span>Janela móvel de 7 dias</span>
        </div>
      </div>
    )
  }

  // Avaliação do status de carga com semântica de referência (U22-P1-61)
  let statusBadge: React.ReactNode = null

  if (rollingLoad != null && optimalMin != null && optimalMax != null) {
    if (rollingLoad >= optimalMin && rollingLoad <= optimalMax) {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20"
          title="Carga na faixa ideal de estímulo atlético e recuperação sustentável"
        >
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Faixa Ótima
        </span>
      )
    } else if (rollingLoad < optimalMin) {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-500/20"
          title="Carga abaixo do limite de manutenção (recuperação ou destreino gradual)"
        >
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Abaixo da Faixa
        </span>
      )
    } else {
      statusBadge = (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-radius-full bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-500/20"
          title="Carga excessiva em relação à capacidade atual (risco de overreaching)"
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Sobrecarga Aguda
        </span>
      )
    }
  }

  return (
    <div className="glass-card p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-radius-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <Dumbbell className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Carga de Treino & Recuperação Sustentável
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Carga cardiovascular acumulada Zepp
            </p>
          </div>
        </div>

        {statusBadge}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
            Carga Hoje
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            {dailyLoad != null ? dailyLoad : '—'}
          </span>
        </div>

        <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
            Carga Acumulada
          </span>
          <span className="text-xl font-black text-slate-900 dark:text-white">
            {rollingLoad != null ? rollingLoad : '—'}
          </span>
        </div>

        <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
            Faixa Ótima
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {optimalMin != null && optimalMax != null
              ? `${optimalMin} - ${optimalMax}`
              : '—'}
          </span>
        </div>

        <div className="p-3 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
            Sessões / Duração
          </span>
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {workoutCount != null
              ? `${workoutCount} treinos (${
                  workoutDurationMin != null
                    ? Math.round(workoutDurationMin) + 'm'
                    : '0m'
                })`
              : '—'}
          </span>
        </div>
      </div>

      {/* Explicação Semântica de Referência (U22-P1-61) */}
      <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowModelDetails((prev) => !prev)}
          aria-expanded={showModelDetails}
          className="flex items-center justify-between w-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-1 transition rounded-radius-sm min-h-0 h-auto px-2"
        >
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            Entenda o modelo e a referência de carga de treino
          </span>
          {showModelDetails ? (
            <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
        </Button>

        {showModelDetails && (
          <div className="mt-2.5 p-3 rounded-radius-md bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <strong className="text-slate-900 dark:text-white block">O que representa:</strong>
                <span>Estresse cardiovascular agudo ponderado por zonas cardíacas e EPOC.</span>
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white block">Janela Temporal:</strong>
                <span>Média ponderada exponencial móvel de 7 dias rolantes (rolling load).</span>
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white block">Modelo Fisiológico:</strong>
                <span>Baseado em Banister TRIMP / Firstbeat Analytics (Zepp OS).</span>
              </div>
              <div>
                <strong className="text-slate-900 dark:text-white block">Tipo de Referência:</strong>
                <span>Alvo dinâmico personalizado (recalibrado com base no seu VO2max e histórico atlético recente).</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
