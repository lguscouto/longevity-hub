import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Link2,
  Info,
  ChevronRight,
} from 'lucide-react'

import { Modal, Button, Input } from './ui'
import type { ExerciseMedia } from '../types'
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
  const [isPaused, setIsPaused] = useState(false)

  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    setIsPaused(false)
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
      setIsPaused(false)
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

  const togglePlayPause = () => {
    if (!isPaused) {
      if (imgRef.current && canvasRef.current) {
        const img = imgRef.current
        const canvas = canvasRef.current
        canvas.width = img.naturalWidth || img.width || 300
        canvas.height = img.naturalHeight || img.height || 300
        try {
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          }
        } catch (e) {
          console.warn('Canvas export restriction:', e)
        }
      }
      setIsPaused(true)
    } else {
      setIsPaused(false)
    }
  }

  const handleRestart = () => {
    setIsPaused(false)
    if (imgRef.current && activeGifSrc) {
      const src = activeGifSrc
      setGifLoaded(false)
      imgRef.current.src = ''
      setTimeout(() => {
        if (imgRef.current) imgRef.current.src = src
      }, 20)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={exerciseTitle}
      description={currentMedia?.name}
      icon={
        <div className="p-2.5 rounded-radius-lg bg-purple-50 dark:bg-purple-500/15 border border-purple-200 dark:border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0">
          <Dumbbell className="h-5 w-5" aria-hidden="true" />
        </div>
      }
      size="2xl"
      closeButtonAriaLabel="Fechar detalhes do exercício"
      footer={
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Fechar
          </Button>
        </div>
      }
      contentClassName="p-0"
    >
      {/* Feedback de Vínculo */}
      {linkFeedback && (
        <div
          className={`mx-6 mt-4 p-3 rounded-radius-lg border text-xs flex items-center justify-between ${
            linkFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {linkFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" aria-hidden="true" />
            )}
            <span>{linkFeedback.message}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLinkFeedback(null)}
            className="text-xs font-bold underline min-h-0 h-auto p-1"
          >
            OK
          </Button>
        </div>
      )}

      {/* Corpo */}
      <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
        {/* Mídia: GIF Animado em Alta Definição com Controles de Reprodução (U22-P1-63) */}
        <div className="flex flex-col rounded-radius-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="relative flex flex-col items-center justify-center min-h-[260px] p-2">
            {activeGifSrc && !gifError ? (
              <>
                {!gifLoaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-slate-950 z-10">
                    <RefreshCw className="h-7 w-7 text-purple-600 dark:text-purple-400 animate-spin" aria-hidden="true" />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Carregando animação...
                    </span>
                  </div>
                )}
                <img
                  ref={imgRef}
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
                    isPaused ? 'hidden' : gifLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <canvas
                  ref={canvasRef}
                  className={`w-full max-h-[320px] object-contain ${isPaused ? 'block' : 'hidden'}`}
                  aria-label={`Quadro pausado do exercício ${exerciseTitle}`}
                />
                {isPaused && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/30 pointer-events-none">
                    <div className="p-3 rounded-radius-full bg-slate-900/80 text-white shadow-lg">
                      <Pause className="h-6 w-6" aria-hidden="true" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 px-4 text-center">
                <Dumbbell className="h-12 w-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" aria-hidden="true" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma demonstração visual vinculada
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  Você pode pesquisar e vincular este movimento com qualquer um dos 1.300+ exercícios da biblioteca.
                </p>
              </div>
            )}
          </div>

          {/* Barra de Controles de Mídia Acessível (U22-P1-63) */}
          {activeGifSrc && !gifError && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={togglePlayPause}
                  aria-label={isPaused ? `Reproduzir animação do exercício ${exerciseTitle}` : `Pausar animação do exercício ${exerciseTitle}`}
                  aria-pressed={isPaused}
                  leftIcon={isPaused ? Play : Pause}
                  className="text-xs font-bold min-h-0 h-auto py-1 px-2.5"
                >
                  {isPaused ? 'Reproduzir' : 'Pausar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  aria-label={`Reiniciar animação do exercício ${exerciseTitle}`}
                  leftIcon={RotateCcw}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 min-h-0 h-auto py-1 px-2"
                >
                  Reiniciar
                </Button>
              </div>

              <div
                role="status"
                aria-live="polite"
                className="text-xs text-slate-500 dark:text-slate-400 font-medium"
              >
                {isPaused ? 'Pausado' : 'Reproduzindo'}
              </div>
            </div>
          )}
        </div>

        {/* Badges de Grupos Musculares e Equipamento */}
        {currentMedia && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentMedia.target_pt && (
              <span className="text-xs font-bold px-3 py-1 rounded-radius-lg bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-radius-full bg-purple-600" aria-hidden="true"></span>
                Foco Muscular: {currentMedia.target_pt}
              </span>
            )}

            {currentMedia.body_part_pt && (
              <span className="text-xs font-semibold px-3 py-1 rounded-radius-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                Região: {currentMedia.body_part_pt}
              </span>
            )}

            {currentMedia.equipment_pt && (
              <span className="text-xs font-semibold px-3 py-1 rounded-radius-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
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
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                Passo a Passo de Execução
              </h4>
              {/* Seletor de Idioma de Instrução */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-radius-md border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('es')}
                  className={`px-2 py-0.5 rounded-radius-sm ${
                    selectedLanguage === 'es'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Espanhol
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLanguage('en')}
                  className={`px-2 py-0.5 rounded-radius-sm ${
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
                  <span className="flex-shrink-0 w-5 h-5 rounded-radius-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
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
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowReLinkSearch(true)}
              leftIcon={Link2}
              className="w-full text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400"
            >
              Vincular outro GIF / Trocar Exercício da Biblioteca
            </Button>
          ) : (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-radius-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Buscar exercício na biblioteca (1.300+)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReLinkSearch(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-0.5 px-2"
                >
                  Cancelar
                </Button>
              </div>

              <div className="w-full">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchCatalog(e.target.value)}
                  placeholder="Ex: bench press, squat, bicep curl..."
                  leftIcon={<Search className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  rightIcon={isSearching ? <RefreshCw className="h-4 w-4 text-purple-600 animate-spin" aria-hidden="true" /> : undefined}
                  autoFocus
                />
              </div>

              {/* Lista de Resultados de Busca */}
              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {searchResults.map((item) => (
                    <div
                      key={item.catalog_id || (item as any).id}
                      className="flex items-center justify-between p-2 rounded-radius-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500/50 transition group"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-9 h-9 rounded-radius-md object-cover bg-slate-100 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-radius-md bg-purple-100 dark:bg-purple-950 flex items-center justify-center flex-shrink-0">
                            <Dumbbell className="h-4 w-4 text-purple-600" aria-hidden="true" />
                          </div>
                        )}
                        <div className="truncate text-left">
                          <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate capitalize">
                            {item.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                            {item.target_pt || item.target || item.body_part_pt || ''}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSelectExerciseToLink(item)}
                        disabled={isSubmittingLink}
                        loading={isSubmittingLink}
                        className="text-purple-700 dark:text-purple-300 flex-shrink-0 ml-2 py-1 px-2.5 text-xs"
                      >
                        Vincular
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
