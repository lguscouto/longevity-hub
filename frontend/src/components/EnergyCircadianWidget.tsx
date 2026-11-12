import React, { useEffect, useState } from 'react'
import { BatteryCharging, Sun, Coffee, Moon, Sparkles } from 'lucide-react'
import { requestJson } from '../lib/api'
import { Button } from './ui'

interface EnergyCircadianWidgetProps {
  selectedDate: string
}

interface EnergyCircadianResponse {
  date_ref: string
  energy_bank: {
    status: string
    current_level: number | null
    recharge: number
    drain: number
    recommendation: string
    missing_components?: string[]
  }
  circadian: {
    wake_time: string
    target_bedtime: string
    wake_time_source: string
    target_bedtime_source: string
    morning_sun_window: string
    caffeine_cutoff_time: string
    wind_down_start_time: string
    recommendation: string
  }
}

export const EnergyCircadianWidget: React.FC<EnergyCircadianWidgetProps> = ({ selectedDate }) => {
  const [data, setData] = useState<EnergyCircadianResponse | null>(null)
  const [showEnergy, setShowEnergy] = useState(() => {
    try { return localStorage.getItem('longevity-show-energy-index') !== 'false' } catch { return true }
  })

  const toggleEnergy = () => {
    const next = !showEnergy
    setShowEnergy(next)
    try { localStorage.setItem('longevity-show-energy-index', String(next)) } catch { /* preferência indisponível */ }
  }

  useEffect(() => {
    let isMounted = true
    requestJson<EnergyCircadianResponse>(`/api/energy-circadian?date_ref=${selectedDate}`)
      .then((res) => {
        if (isMounted) setData(res)
      })
      .catch(() => {
        if (isMounted) setData(null)
      })
    return () => {
      isMounted = false
    }
  }, [selectedDate])

  if (!data) return null

  const { energy_bank, circadian } = data

  return (
    <div className="surface-card p-6 rounded-radius-xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-radius-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <BatteryCharging className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Energia e ritmo circadiano</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Estimativas informativas a partir dos dados disponíveis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nível da Bateria Corporal */}
        <div className="space-y-3 p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Bateria Corporal</span>
            <Button variant="secondary" size="sm" onClick={toggleEnergy} aria-expanded={showEnergy}>
              {showEnergy ? 'Ocultar índice' : 'Mostrar índice'}
            </Button>
          </div>

          {showEnergy && energy_bank?.current_level != null ? (
            <>
              <span className="text-lg font-black text-slate-900 dark:text-white">{energy_bank.current_level}/100</span>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-radius-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-radius-full transition-all ${
                    energy_bank.current_level >= 70
                      ? 'bg-emerald-500'
                      : energy_bank.current_level >= 40
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${energy_bank.current_level}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span>Recarga estimada: {energy_bank.recharge}/100</span>
                <span>Consumo estimado: {energy_bank.drain}/100</span>
              </div>
            </>
          ) : null}

          {showEnergy && <>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">{energy_bank?.current_level == null ? 'Índice indisponível. ' : ''}{energy_bank?.recommendation}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">Estimativa própria, não validada clinicamente. Combina sono, VFC, frequência cardíaca, passos, carga de treino e estresse informado.</p>
            {!!energy_bank?.missing_components?.length && <p className="text-xs text-slate-600 dark:text-slate-300">Dados de atividade incompletos.</p>}
          </>}
        </div>

        {/* Timeline Circadiana & Cafeína */}
        <div className="space-y-2.5 p-4 rounded-radius-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Ritmo do dia</span>
          <p className="text-xs text-slate-600 dark:text-slate-300">Despertar: {circadian?.wake_time || '—'} ({circadian?.wake_time_source || 'não informado'}); horário de dormir: {circadian?.target_bedtime || '—'} ({circadian?.target_bedtime_source || 'não informado'}).</p>

          <div className="flex items-center gap-2 text-xs">
            <Sun className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400">Luz Matinal:</span>
            <span className="font-bold text-slate-900 dark:text-white">{circadian?.morning_sun_window || '—'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400">Referência para cafeína (10 h antes):</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{circadian?.caffeine_cutoff_time || '—'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Moon className="h-4 w-4 text-indigo-500 shrink-0" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400">Hora de desacelerar:</span>
            <span className="font-bold text-slate-900 dark:text-white">{circadian?.wind_down_start_time || '—'}</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">{circadian?.recommendation || ''}</p>
        </div>
      </div>
    </div>
  )
}
