import React, { useState, useEffect, useMemo } from 'react'
import {
  X,
  Dumbbell,
  Play,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link2,
  Info,
  ChevronRight,
} from 'lucide-react'

import { ExerciseMedia } from '../types'
export type { ExerciseMedia }

interface ExerciseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  exerciseTitle: string
  media: ExerciseMedia | null
  onReLinkSuccess?: (updatedMedia: ExerciseMedia) => void
}

export const ExerciseDetailModal: React.FC<ExerciseDetailModalProps> = ({
  isOpen,
  onClose,
  exerciseTitle,
  media,
  onReLinkSuccess,
}) => {
  const [currentMedia, setCurrentMedia] = useState<ExerciseMedia | null>(media)
  const [gifLoaded, setGifLoaded] = useState(false)
  const [gifError, setGifError] = useState(false)
  const [useFallback, setUseFallback] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'es' | 'en'>('es')

  // Seletor de busca para trocar vínculo manual
  const [showReLinkSearch, setShowReLinkSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExerciseMedia[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmittingLink, setIsSubmittingLink] = useState(false)
  const [linkFeedback, setLinkFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    setCurrentMedia(media)
    setGifLoaded(false)
    setGifError(false)
    setUseFallback(false)
    setShowReLinkSearch(false)
    setLinkFeedback(null)
  }, [media, exerciseTitle, isOpen])

  const rawInstructions =
    currentMedia?.instructions?.[selectedLanguage] ||
    currentMedia?.instructions?.['es'] ||
    currentMedia?.instructions?.['en'] ||
    []

  const instructionsList: string[] = useMemo(() => {
    if (Array.isArray(rawInstructions)) {
      return rawInstructions.map((s) => String(s).trim()).filter(Boolean)
    }
    if (typeof rawInstructions === 'string' && rawInstructions.trim()) {
      return rawInstructions
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    return []
  }, [rawInstructions])

  const secondaryMusclesList: string[] = useMemo(() => {
    const sec = currentMedia?.secondary_muscles as unknown
    if (Array.isArray(sec)) {
      return sec.map((m) => String(m).trim()).filter(Boolean)
    }
    if (typeof sec === 'string' && sec.trim()) {
      try {
        const parsed = JSON.parse(sec)
        if (Array.isArray(parsed)) return parsed
      } catch {
        return [sec]
      }
    }
    return []
  }, [currentMedia?.secondary_muscles])

  if (!isOpen) return null

  const handleSearchCatalog = async (q: string) => {
    setSearchQuery(q)
    if (!q || q.trim().length < 2) {
      setSearchResults([])
      return
    }
    try {
      setIsSearching(true)
      const res = await fetch(`/api/workouts/catalog?query=${encodeURIComponent(q.trim())}&limit=12`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.items || [])
      }
    } catch (err) {
      console.error('Erro ao buscar exercícios do catálogo:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectExerciseToLink = async (chosen: ExerciseMedia) => {
    try {
      setIsSubmittingLink(true)
      setLinkFeedback(null)
      const res = await fetch('/api/workouts/exercises/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise_title: exerciseTitle,
          catalog_id: chosen.catalog_id || chosen.media_id || (chosen as any).id,
        }),
      })

      if (!res.ok) {
        throw new Error('Falha ao salvar vínculo do exercício.')
      }

      const data = await res.json()
      const newLinked = data.linked_exercise || chosen
      setCurrentMedia(newLinked)
      setGifLoaded(false)
      setGifError(false)
      setUseFallback(false)
      setShowReLinkSearch(false)
      setLinkFeedback({ type: 'success', message: 'Exercício vinculado com sucesso!' })

      if (onReLinkSuccess) {
        onReLinkSuccess(newLinked)
      }
    } catch (err: any) {
      setLinkFeedback({ type: 'error', message: err?.message || 'Erro ao vincular exercício.' })
    } finally {
      setIsSubmittingLink(false)
    }
  }

  const activeGifSrc = useFallback
    ? currentMedia?.gif_fallback || currentMedia?.image_fallback
    : currentMedia?.gif_url || currentMedia?.image_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
                {exerciseTitle}
              </h3>
              {currentMedia?.name && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize">
                  {currentMedia.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Feedback de Vínculo */}
        {linkFeedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl border text-xs flex items-center justify-between ${
              linkFeedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {linkFeedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{linkFeedback.message}</span>
            </div>
            <button onClick={() => setLinkFeedback(null)} className="text-xs font-bold underline">
              OK
            </button>
          </div>
        )}

        {/* Corpo */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Mídia: GIF Animado em Alta Definição */}
          <div className="relative flex flex-col items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[260px]">
            {activeGifSrc && !gifError ? (
              <>
                {!gifLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-950 z-10">
                    <RefreshCw className="h-7 w-7 text-purple-600 dark:text-purple-400 animate-spin" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Carregando animação...
                    </span>
                  </div>
                )}
                <img
                  src={activeGifSrc}
                  alt={currentMedia?.name || exerciseTitle}
                  onLoad={() => setGifLoaded(true)}
                  onError={() => {
                    if (!useFallback && currentMedia?.gif_fallback) {
                      setUseFallback(true)
                    } else {
                      setGifError(true)
                      setGifLoaded(true)
                    }
                  }}
                  className={`w-full max-h-[320px] object-contain transition-opacity duration-300 ${
                    gifLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
              </>
            ) : (
              <div className="py-12 px-4 text-center">
                <Dumbbell className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma demonstração visual vinculada
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Você pode pesquisar e vincular este movimento com qualquer um dos 1.300+ exercícios da biblioteca.
                </p>
              </div>
            )}
          </div>

          {/* Badges de Grupos Musculares e Equipamento */}
          {currentMedia && (
            <div className="flex items-center gap-2 flex-wrap">
              {currentMedia.target_pt && (
                <span className="text-xs font-bold px-3 py-1 rounded-xl bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                  Alvo: {currentMedia.target_pt}
                </span>
              )}

              {currentMedia.body_part_pt && (
                <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                  Região: {currentMedia.body_part_pt}
                </span>
              )}

              {currentMedia.equipment_pt && (
                <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Equipamento: {currentMedia.equipment_pt}
                </span>
              )}

              {secondaryMusclesList.length > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Secundários: {secondaryMusclesList.join(', ')}
                </span>
              )}
            </div>
          )}

          {/* Instruções de Execução */}
          {instructionsList.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Passo a Passo de Execução
                </h4>
                {/* Seletor de Idioma de Instrução */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold">
                  <button
                    onClick={() => setSelectedLanguage('es')}
                    className={`px-2 py-0.5 rounded ${
                      selectedLanguage === 'es'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Espanhol
                  </button>
                  <button
                    onClick={() => setSelectedLanguage('en')}
                    className={`px-2 py-0.5 rounded ${
                      selectedLanguage === 'en'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Inglês
                  </button>
                </div>
              </div>

              <ol className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                {instructionsList.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Área de Re-vinculação Manual */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            {!showReLinkSearch ? (
              <button
                onClick={() => setShowReLinkSearch(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 shadow-2xs transition"
              >
                <Link2 className="h-4 w-4" />
                Vincular outro GIF / Trocar Exercício da Biblioteca
              </button>
            ) : (
              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Buscar exercício na biblioteca (1.300+)
                  </span>
                  <button
                    onClick={() => setShowReLinkSearch(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchCatalog(e.target.value)}
                    placeholder="Ex: bench press, squat, bicep curl..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                  {isSearching && (
                    <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 text-purple-600 animate-spin" />
                  )}
                </div>

                {/* Lista de Resultados de Busca */}
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {searchResults.map((item) => (
                      <div
                        key={item.catalog_id || (item as any).id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 transition group"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-9 h-9 rounded-lg object-cover bg-slate-100 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                              <Dumbbell className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                          <div className="truncate text-left">
                            <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate capitalize">
                              {item.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                              {item.target_pt || item.target || item.body_part_pt || ''}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectExerciseToLink(item)}
                          disabled={isSubmittingLink}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 hover:bg-purple-600 hover:text-white transition disabled:opacity-50 flex-shrink-0 ml-2"
                        >
                          Vincular
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
