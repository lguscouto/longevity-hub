import React, { useEffect, useState } from 'react'
import { BatteryCharging, Sun, Coffee, Moon, Sparkles } from 'lucide-react'
import { requestJson } from '../lib/api'

interface EnergyCircadianWidgetProps {
  selectedDate: string
}

interface EnergyCircadianResponse {
  date_ref: string
  energy_bank: {
    status: string
    current_level: number
    recharge: number
    drain: number
    recommendation: string
  }
  circadian: {
    wake_time: string
    target_bedtime: string
    morning_sun_window: string
    caffeine_cutoff_time: string
    wind_down_start_time: string
    recommendation: string
  }
}

export const EnergyCircadianWidget: React.FC<EnergyCircadianWidgetProps> = ({ selectedDate }) => {
  const [data, setData] = useState<EnergyCircadianResponse | null>(null)

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
    <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <BatteryCharging className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bateria Corporal & Ritmo Circadiano</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Recarga do sono, consumo e janelas de luz/cafeína</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Nível da Bateria Corporal */}
        <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Energy Bank (Bateria Corporal)</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {energy_bank?.current_level != null ? `${energy_bank.current_level}%` : 'Indisponível'}
            </span>
          </div>

          {energy_bank?.current_level != null ? (
            <>
              <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all ${
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
                <span>⚡ Recarga Sono: +{energy_bank.recharge}%</span>
                <span>🔥 Consumo Dia: -{energy_bank.drain}%</span>
              </div>
            </>
          ) : null}

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">
            {energy_bank?.recommendation || 'Sincronize dados para calcular a bateria corporal.'}
          </p>
        </div>

        {/* Timeline Circadiana & Cafeína */}
        <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">Linha do Tempo Circadiana</span>

          <div className="flex items-center gap-2 text-xs">
            <Sun className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Luz Matinal:</span>
            <span className="font-bold text-slate-900 dark:text-white">{circadian?.morning_sun_window || '—'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Limite de Cafeína (Cutoff):</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">{circadian?.caffeine_cutoff_time || '—'}</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Moon className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400">Desaceleramento Noturno:</span>
            <span className="font-bold text-slate-900 dark:text-white">{circadian?.wind_down_start_time || '—'}</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">{circadian?.recommendation || ''}</p>
        </div>
      </div>
    </div>
  )
}
