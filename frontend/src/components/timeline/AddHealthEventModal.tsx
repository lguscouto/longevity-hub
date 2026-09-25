import React, { useState } from 'react'
import {
  AlertCircle,
  Clock,
  Coffee,
  FileText,
  Flame,
  Plane,
  PlusCircle,
  Thermometer,
  Utensils,
  Wine,
  X,
  Zap,
} from 'lucide-react'
import { createHealthEvent } from './api'
import type { HealthEventCreatePayload } from './types'

interface AddHealthEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  defaultDate?: string
}

type PresetKey = 'alcohol' | 'caffeine' | 'symptom' | 'travel' | 'stress' | 'meal' | 'custom'

export const AddHealthEventModal: React.FC<AddHealthEventModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate,
}) => {
  const todayStr = defaultDate || new Date().toISOString().split('T')[0]

  const [activePreset, setActivePreset] = useState<PresetKey>('alcohol')
  const [dateRef, setDateRef] = useState<string>(todayStr)
  const [timeRef, setTimeRef] = useState<string>('21:00')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Campos específicos dos Presets
  const [servings, setServings] = useState<number>(2)
  const [drinkType, setDrinkType] = useState<string>('Vinho')
  const [caffeineCups, setCaffeineCups] = useState<number>(2)
  const [caffeineType, setCaffeineType] = useState<string>('Café expresso')
  const [symptomType, setSymptomType] = useState<string>('Resfriado / Congestão')
  const [severity, setSeverity] = useState<string>('Moderada')
  const [travelDestination, setTravelDestination] = useState<string>('')
  const [timezoneDiffHours, setTimezoneDiffHours] = useState<number>(3)
  const [stressLevel, setStressLevel] = useState<string>('Elevado')
  const [stressReason, setStressReason] = useState<string>('Trabalho')
  const [mealType, setMealType] = useState<string>('Jantar pesado & tardio')

  // Campos Modo Livre
  const [customTitle, setCustomTitle] = useState<string>('')
  const [customDescription, setCustomDescription] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('lifestyle')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      let payload: HealthEventCreatePayload

      if (activePreset === 'alcohol') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'alcohol',
          category: 'lifestyle',
          title: `Consumo de álcool: ${servings} ${servings === 1 ? 'dose' : 'doses'}`,
          description: `${drinkType} • ${servings} ${servings === 1 ? 'dose' : 'doses'}${notes ? ` (${notes})` : ''}`,
          significance: servings >= 3 ? 'significativa' : 'notável',
          confidence: 'high',
          metadata: { servings, drink_type: drinkType, notes },
        }
      } else if (activePreset === 'caffeine') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'caffeine',
          category: 'lifestyle',
          title: `Cafeína tardia (${timeRef})`,
          description: `${caffeineCups} ${caffeineCups === 1 ? 'xícara' : 'xícaras'} de ${caffeineType}${notes ? ` • ${notes}` : ''}`,
          significance: 'notável',
          confidence: 'high',
          metadata: { cups: caffeineCups, type: caffeineType, notes },
        }
      } else if (activePreset === 'symptom') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'symptom',
          category: 'symptom',
          title: `Sintoma: ${symptomType}`,
          description: `Severidade ${severity}${notes ? ` • ${notes}` : ''}`,
          significance: severity === 'Severa' ? 'significativa' : 'notável',
          confidence: 'high',
          metadata: { symptom: symptomType, severity, notes },
        }
      } else if (activePreset === 'travel') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'travel',
          category: 'lifestyle',
          title: travelDestination ? `Viagem: ${travelDestination}` : 'Viagem / Deslocamento',
          description: `Diferença de fuso: ${timezoneDiffHours > 0 ? `+${timezoneDiffHours}` : timezoneDiffHours}h${notes ? ` • ${notes}` : ''}`,
          significance: Math.abs(timezoneDiffHours) >= 3 ? 'significativa' : 'notável',
          confidence: 'high',
          metadata: { destination: travelDestination, timezone_diff: timezoneDiffHours, notes },
        }
      } else if (activePreset === 'stress') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'stress',
          category: 'lifestyle',
          title: `Estresse ${stressLevel.toLowerCase()}`,
          description: `Origem: ${stressReason}${notes ? ` • ${notes}` : ''}`,
          significance: stressLevel === 'Extremo' ? 'significativa' : 'notável',
          confidence: 'high',
          metadata: { stress_level: stressLevel, reason: stressReason, notes },
        }
      } else if (activePreset === 'meal') {
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'nutrition',
          category: 'lifestyle',
          title: mealType,
          description: notes || 'Refeição registrada',
          significance: 'notável',
          confidence: 'high',
          metadata: { meal_type: mealType, notes },
        }
      } else {
        if (!customTitle.trim()) {
          throw new Error('Informe o título do evento.')
        }
        payload = {
          date_ref: dateRef,
          time_ref: timeRef,
          event_type: 'custom',
          category: customCategory,
          title: customTitle.trim(),
          description: customDescription.trim() || undefined,
          significance: 'notável',
          confidence: 'high',
          metadata: { notes },
        }
      }

      await createHealthEvent(payload)
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar evento.')
    } finally {
      setSubmitting(false)
    }
  }

  const presetButtons = [
    { key: 'alcohol', label: 'Álcool', icon: Wine, color: 'text-amber-500' },
    { key: 'caffeine', label: 'Cafeína Tardia', icon: Coffee, color: 'text-orange-500' },
    { key: 'symptom', label: 'Sintoma / Resfriado', icon: Thermometer, color: 'text-rose-500' },
    { key: 'travel', label: 'Viagem / Fuso', icon: Plane, color: 'text-cyan-500' },
    { key: 'stress', label: 'Estresse Elevado', icon: Zap, color: 'text-yellow-500' },
    { key: 'meal', label: 'Refeição / Jejum', icon: Utensils, color: 'text-emerald-500' },
    { key: 'custom', label: 'Personalizado', icon: FileText, color: 'text-indigo-400' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Adicionar Evento de Contexto</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Contextualize dados não capturados por wearables</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Presets Bar */}
        <div className="px-6 pt-4 pb-2">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
            Selecione o Tipo de Evento
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {presetButtons.map(p => {
              const Icon = p.icon
              const isSelected = activePreset === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setActivePreset(p.key as PresetKey)
                    if (p.key === 'caffeine' && timeRef === '21:00') setTimeRef('17:00')
                    if (p.key === 'alcohol' && timeRef === '17:00') setTimeRef('21:30')
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 font-bold shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 mb-1 ${p.color}`} />
                  <span className="truncate w-full text-center text-[11px]">{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input
                type="date"
                value={dateRef}
                onChange={e => setDateRef(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Horário aproximado</label>
              <div className="relative">
                <input
                  type="time"
                  value={timeRef}
                  onChange={e => setTimeRef(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Dynamic Preset Fields */}
          {activePreset === 'alcohol' && (
            <div className="space-y-3 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/50 dark:border-amber-900/40">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Número de doses
                  </label>
                  <select
                    value={servings}
                    onChange={e => setServings(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={1}>1 dose (leve)</option>
                    <option value={2}>2 doses (moderado)</option>
                    <option value={3}>3 doses (significativo)</option>
                    <option value={4}>4 doses</option>
                    <option value={5}>5+ doses (intenso)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Bebida</label>
                  <select
                    value={drinkType}
                    onChange={e => setDrinkType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Vinho tinto">Vinho tinto</option>
                    <option value="Vinho branco">Vinho branco</option>
                    <option value="Cerveja">Cerveja</option>
                    <option value="Destilado / Whisky / Gin">Destilado / Gin / Whisky</option>
                    <option value="Coquetel">Coquetel</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activePreset === 'caffeine' && (
            <div className="space-y-3 bg-orange-50/40 dark:bg-orange-950/20 p-3.5 rounded-2xl border border-orange-200/50 dark:border-orange-900/40">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Quantidade</label>
                  <select
                    value={caffeineCups}
                    onChange={e => setCaffeineCups(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={1}>1 dose / xícara</option>
                    <option value={2}>2 doses / xícaras</option>
                    <option value={3}>3+ doses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fonte</label>
                  <select
                    value={caffeineType}
                    onChange={e => setCaffeineType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Café expresso">Café expresso</option>
                    <option value="Café coado">Café coado</option>
                    <option value="Pré-treino">Pré-treino estimulante</option>
                    <option value="Energético">Bebida energética</option>
                    <option value="Chá verde / Matcha">Chá verde / Matcha</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activePreset === 'symptom' && (
            <div className="space-y-3 bg-rose-50/40 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-200/50 dark:border-rose-900/40">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Sintoma</label>
                  <select
                    value={symptomType}
                    onChange={e => setSymptomType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Resfriado / Congestão">Resfriado / Congestão</option>
                    <option value="Febre / Calafrios">Febre / Calafrios</option>
                    <option value="Dor muscular / Lesão">Dor muscular / Lesão</option>
                    <option value="Dor de cabeça / Enxaqueca">Dor de cabeça</option>
                    <option value="Desconforto digestivo">Desconforto digestivo</option>
                    <option value="Fadiga intensa">Fadiga intensa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Severidade</label>
                  <select
                    value={severity}
                    onChange={e => setSeverity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Leve">Leve</option>
                    <option value="Moderada">Moderada</option>
                    <option value="Severa">Severa</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activePreset === 'travel' && (
            <div className="space-y-3 bg-cyan-50/40 dark:bg-cyan-950/20 p-3.5 rounded-2xl border border-cyan-200/50 dark:border-cyan-900/40">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Destino</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo, Londres..."
                    value={travelDestination}
                    onChange={e => setTravelDestination(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Fuso horário</label>
                  <select
                    value={timezoneDiffHours}
                    onChange={e => setTimezoneDiffHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value={0}>Mesmo fuso</option>
                    <option value={1}>+1 hora</option>
                    <option value={2}>+2 horas</option>
                    <option value={3}>+3 horas</option>
                    <option value={4}>+4 ou mais horas</option>
                    <option value={-1}>-1 hora</option>
                    <option value={-3}>-3 ou mais horas</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activePreset === 'stress' && (
            <div className="space-y-3 bg-yellow-50/40 dark:bg-yellow-950/20 p-3.5 rounded-2xl border border-yellow-200/50 dark:border-yellow-900/40">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nível de Estresse</label>
                  <select
                    value={stressLevel}
                    onChange={e => setStressLevel(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Moderado">Moderado</option>
                    <option value="Elevado">Elevado</option>
                    <option value="Extremo">Extremo / Crítico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Origem principal</label>
                  <select
                    value={stressReason}
                    onChange={e => setStressReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Trabalho">Trabalho / Sobrecarga</option>
                    <option value="Pessoal / Emocional">Pessoal / Emocional</option>
                    <option value="Privação de Sono">Privação de sono</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activePreset === 'meal' && (
            <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Evento Nutricional</label>
                <select
                  value={mealType}
                  onChange={e => setMealType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Jantar pesado & tardio">Jantar pesado & tardio</option>
                  <option value="Jejum intermitente (> 16h)">Jejum intermitente (&gt; 16h)</option>
                  <option value="Excesso calórico / Festa">Excesso calórico / Festa</option>
                  <option value="Refeição com alto teor de sódio">Refeição com alto teor de sódio</option>
                </select>
              </div>
            </div>
          )}

          {activePreset === 'custom' && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Título do Evento</label>
                <input
                  type="text"
                  placeholder="Ex: Noite mal dormida por barulho, Dor nas costas..."
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
                  <select
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="lifestyle">Estilo de vida</option>
                    <option value="symptom">Sintoma</option>
                    <option value="intervention">Intervenção</option>
                    <option value="exercise">Exercício</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Detalhes</label>
                  <input
                    type="text"
                    placeholder="Descrição breve..."
                    value={customDescription}
                    onChange={e => setCustomDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Campo de notas gerais */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Observações adicionais (opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Adicione detalhes contextuais que possam ajudar a entender seu organismo..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
