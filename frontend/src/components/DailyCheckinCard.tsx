import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Sparkles, Smile, Activity, Zap, Check } from 'lucide-react'
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

const emptyCheckin = (dateRef: string): CheckinState => ({
  date_ref: dateRef,
  energy_score: null,
  mood_score: null,
  perceived_stress: null,
  tags: [],
  notes: '',
})

const normalizeCheckin = (data: CheckinState, fallbackDate: string): CheckinState => ({
  ...emptyCheckin(fallbackDate),
  ...data,
  date_ref: data?.date_ref || fallbackDate,
  tags: Array.isArray(data?.tags) ? data.tags : [],
})

export const DailyCheckinCard: React.FC<DailyCheckinCardProps> = ({ selectedDate, onCheckinUpdated }) => {
  const [checkin, setCheckin] = useState<CheckinState>(() => emptyCheckin(selectedDate))
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const checkinRef = useRef<CheckinState>(emptyCheckin(selectedDate))
  const selectedDateRef = useRef(selectedDate)
  const isMountedRef = useRef(true)
  const localRevisionRef = useRef(0)
  const loadRevisionRef = useRef(0)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const delayedSaveRef = useRef<CheckinState | null>(null)
  const pendingSavesRef = useRef<CheckinState[]>([])
  const failedSavesRef = useRef(new Map<string, CheckinState>())
  const saveInFlightRef = useRef(false)
  const flushSaveQueueRef = useRef<() => void>(() => {})
  const onCheckinUpdatedRef = useRef(onCheckinUpdated)
  onCheckinUpdatedRef.current = onCheckinUpdated

  const flushSaveQueue = useCallback(async () => {
    if (saveInFlightRef.current) return

    const dataToSave = pendingSavesRef.current.shift()
    if (!dataToSave) {
      if (isMountedRef.current) setSaving(false)
      return
    }

    saveInFlightRef.current = true
    if (isMountedRef.current) {
      setSaving(true)
      setErrorMsg(null)
    }

    try {
      await requestJson(`/api/checkins/${encodeURIComponent(dataToSave.date_ref)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
      })

      const hasNewerSaveForDate = (
        pendingSavesRef.current.some((pendingSave) => pendingSave.date_ref === dataToSave.date_ref)
        || delayedSaveRef.current?.date_ref === dataToSave.date_ref
      )
      if (
        isMountedRef.current
        && dataToSave.date_ref === selectedDateRef.current
        && !hasNewerSaveForDate
      ) {
        setSavedSuccess(true)
        if (successTimerRef.current) clearTimeout(successTimerRef.current)
        successTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setSavedSuccess(false)
        }, 2000)
      }
      failedSavesRef.current.delete(dataToSave.date_ref)
      if (isMountedRef.current) onCheckinUpdatedRef.current?.()
    } catch {
      const hasNewerSaveForDate = (
        pendingSavesRef.current.some((pendingSave) => pendingSave.date_ref === dataToSave.date_ref)
        || delayedSaveRef.current?.date_ref === dataToSave.date_ref
      )
      if (!hasNewerSaveForDate) {
        failedSavesRef.current.set(dataToSave.date_ref, dataToSave)
        if (isMountedRef.current && dataToSave.date_ref === selectedDateRef.current) {
          setErrorMsg('Não foi possível salvar o check-in.')
        }
      }
    } finally {
      saveInFlightRef.current = false
      if (pendingSavesRef.current.length > 0) {
        flushSaveQueueRef.current()
      } else if (isMountedRef.current) {
        setSaving(false)
      }
    }
  }, [])

  flushSaveQueueRef.current = () => {
    void flushSaveQueue()
  }

  const enqueueSave = useCallback((dataToSave: CheckinState) => {
    const queuedIndex = pendingSavesRef.current.findIndex(
      (pendingSave) => pendingSave.date_ref === dataToSave.date_ref,
    )
    if (queuedIndex >= 0) {
      pendingSavesRef.current[queuedIndex] = dataToSave
    } else {
      pendingSavesRef.current.push(dataToSave)
    }
    flushSaveQueueRef.current()
  }, [])

  const scheduleSave = useCallback((dataToSave: CheckinState) => {
    const previousDelayedSave = delayedSaveRef.current
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (previousDelayedSave && previousDelayedSave.date_ref !== dataToSave.date_ref) {
      delayedSaveRef.current = null
      enqueueSave(previousDelayedSave)
    }
    failedSavesRef.current.delete(dataToSave.date_ref)
    delayedSaveRef.current = dataToSave
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      const delayedSave = delayedSaveRef.current
      delayedSaveRef.current = null
      if (delayedSave) enqueueSave(delayedSave)
    }, 600)
  }, [enqueueSave])

  const applyLocalChange = (change: (current: CheckinState) => CheckinState) => {
    const updated = change(checkinRef.current)
    localRevisionRef.current += 1
    checkinRef.current = updated
    setCheckin(updated)
    scheduleSave(updated)
  }

  const handleScoreChange = (key: keyof CheckinState, value: number) => {
    applyLocalChange((current) => ({ ...current, date_ref: selectedDateRef.current, [key]: value }))
  }

  const handleToggleTag = (tagId: string) => {
    applyLocalChange((current) => {
      const currentTags = Array.isArray(current.tags) ? current.tags : []
      const tags = currentTags.includes(tagId)
        ? currentTags.filter((tag) => tag !== tagId)
        : [...currentTags, tagId]
      return { ...current, date_ref: selectedDateRef.current, tags }
    })
  }

  const retryFailedSave = () => {
    const failedSave = failedSavesRef.current.get(selectedDateRef.current)
    if (!failedSave) return
    failedSavesRef.current.delete(failedSave.date_ref)
    setErrorMsg(null)
    enqueueSave(failedSave)
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      const delayedSave = delayedSaveRef.current
      delayedSaveRef.current = null
      if (delayedSave) enqueueSave(delayedSave)
    }
  }, [enqueueSave])

  useEffect(() => {
    const delayedSave = delayedSaveRef.current
    if (delayedSave && delayedSave.date_ref !== selectedDate) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      delayedSaveRef.current = null
      enqueueSave(delayedSave)
    }
    selectedDateRef.current = selectedDate
    const requestRevision = ++loadRevisionRef.current
    const localRevision = localRevisionRef.current
    const fallback = emptyCheckin(selectedDate)
    checkinRef.current = fallback
    setCheckin(fallback)
    setSavedSuccess(false)
    setErrorMsg(
      failedSavesRef.current.has(selectedDate)
        ? 'Não foi possível salvar o check-in.'
        : null,
    )

    requestJson<CheckinState>(`/api/checkins/${encodeURIComponent(selectedDate)}`)
      .then((data) => {
        if (
          isMountedRef.current
          && requestRevision === loadRevisionRef.current
          && localRevision === localRevisionRef.current
        ) {
          const normalized = normalizeCheckin(data, selectedDate)
          checkinRef.current = normalized
          setCheckin(normalized)
        }
      })
      .catch(() => {
        if (
          isMountedRef.current
          && requestRevision === loadRevisionRef.current
          && localRevision === localRevisionRef.current
        ) {
          checkinRef.current = fallback
          setCheckin(fallback)
        }
      })
  }, [selectedDate, enqueueSave])

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
        {saving && !savedSuccess && !errorMsg && (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 text-xs font-bold border border-cyan-500/20">
            Salvando…
          </span>
        )}
        {errorMsg && (
          <div role="alert" className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={retryFailedSave}
              className="underline underline-offset-2 hover:text-rose-700 dark:hover:text-rose-200"
            >
              Tentar novamente
            </button>
          </div>
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
