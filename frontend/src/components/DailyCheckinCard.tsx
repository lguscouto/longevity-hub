import React, { useEffect, useRef, useState } from 'react'
import { Sparkles, Coffee, Smile, Activity, Zap, Check } from 'lucide-react'
import { requestJson } from '../lib/api'

interface DailyCheckinCardProps {
  selectedDate: string
  onCheckinUpdated?: () => void
}

interface CheckinState {
  date_ref: string
  energy_score?: number | null
  mood_score?: number | null
  perceived_stress?: number | null
  soreness_score?: number | null
  caffeine_last_at?: string | null
  tags: string[]
  notes?: string | null
}

const AVAILABLE_TAGS = [
  { id: 'cafe_pos_14h', label: '☕ Café após 14h' },
  { id: 'alcool', label: '🍷 Álcool' },
  { id: 'sauna', label: '🧖 Sauna' },
  { id: 'meditacao', label: '🧘 Meditação' },
  { id: 'luz_matinal', label: '☀️ Luz Matinal' },
  { id: 'dor_cabeca', label: '🤕 Dor de Cabeça' },
]

export const DailyCheckinCard: React.FC<DailyCheckinCardProps> = ({ selectedDate, onCheckinUpdated }) => {
  const [checkin, setCheckin] = useState<CheckinState>({
    date_ref: selectedDate,
    energy_score: null,
    mood_score: null,
    perceived_stress: null,
    tags: [],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  useEffect(() => {
    let isMounted = true
    requestJson<CheckinState>(`/api/checkins/${selectedDate}`)
      .then((data) => {
        if (isMounted)
          setCheckin({
            ...data,
            tags: Array.isArray(data?.tags) ? data.tags : [],
          })
      })
      .catch(() => {
        if (isMounted)
          setCheckin({
            date_ref: selectedDate,
            energy_score: null,
            mood_score: null,
            perceived_stress: null,
            tags: [],
            notes: '',
          })
      })
    return () => {
      isMounted = false
    }
  }, [selectedDate])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSave = (dataToSave: CheckinState) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      void saveCheckin(dataToSave)
    }, 600)
  }

  const handleScoreChange = (key: keyof CheckinState, value: number) => {
    const updated = { ...checkin, date_ref: selectedDate, [key]: value }
    setCheckin(updated)
    debouncedSave(updated)
  }

  const handleToggleTag = (tagId: string) => {
    const currentTags = Array.isArray(checkin.tags) ? checkin.tags : []
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter((t) => t !== tagId)
      : [...currentTags, tagId]
    const updated = { ...checkin, date_ref: selectedDate, tags: newTags }
    setCheckin(updated)
    debouncedSave(updated)
  }

  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const saveCheckin = async (dataToSave: CheckinState) => {
    setSaving(true)
    setErrorMsg(null)
    try {
      await requestJson(`/api/checkins/${selectedDate}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
      if (onCheckinUpdated) onCheckinUpdated()
    } catch (err) {
      console.error(err)
      setErrorMsg('Não foi possível salvar o check-in.')
      setTimeout(() => setErrorMsg(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Check-in Diário de Percepção (30s)</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Contexto subjetivo de energia, estresse e hábitos</p>
          </div>
        </div>

        {savedSuccess && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <Check className="h-3 w-3" /> Salvo
          </span>
        )}
        {errorMsg && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20">
            {errorMsg}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Disposição / Energia */}
        <div className="space-y-1.5" role="group" aria-label="Energia Percebida">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Energia Percebida
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                aria-label={`Energia nível ${level}`}
                aria-pressed={checkin.energy_score === level}
                onClick={() => void handleScoreChange('energy_score', level)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                  checkin.energy_score === level
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Humor */}
        <div className="space-y-1.5" role="group" aria-label="Humor e Ânimo">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Smile className="h-3.5 w-3.5 text-emerald-500" /> Humor / Ânimo
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                aria-label={`Humor nível ${level}`}
                aria-pressed={checkin.mood_score === level}
                onClick={() => void handleScoreChange('mood_score', level)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                  checkin.mood_score === level
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Estresse Subjetivo */}
        <div className="space-y-1.5" role="group" aria-label="Estresse Mental">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
            <Activity className="h-3.5 w-3.5 text-rose-500" /> Estresse Mental
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                aria-label={`Estresse nível ${level}`}
                aria-pressed={checkin.perceived_stress === level}
                onClick={() => void handleScoreChange('perceived_stress', level)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                  checkin.perceived_stress === level
                    ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-rose-500/50'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tags de Hábitos e Sintomas */}
      <div className="space-y-1.5 pt-1" role="group" aria-label="Fatores do Dia (Tags Rápidas)">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fatores do Dia (Tags Rápidas)</span>
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = Array.isArray(checkin?.tags) && checkin.tags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                aria-label={`Tag ${tag.label}`}
                aria-pressed={isSelected}
                onClick={() => void handleToggleTag(tag.id)}
                className={`px-3 py-1 rounded-xl text-xs font-medium border transition ${
                  isSelected
                    ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40 font-bold'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-400'
                }`}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
