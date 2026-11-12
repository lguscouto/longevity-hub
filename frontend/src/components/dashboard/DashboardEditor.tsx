import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Plus, X } from 'lucide-react'
import { Button, IconButton, Modal, Select } from '../ui'
import {
  AREA_LABELS, DASHBOARD_MODELS, TREND_METRICS, WIDGET_LABELS,
  dashboardAreas, defaultDashboardLayout, widgetCatalog,
  type CustomModel, type DashboardLayout, type TrendMetric, type WidgetArea, type WidgetId,
} from './preferences'

interface DashboardEditorProps {
  model: CustomModel
  layout: DashboardLayout
  onSave: (layout: DashboardLayout) => void
  onClose: () => void
}

export function DashboardEditor({ model, layout, onSave, onClose }: DashboardEditorProps) {
  const [draft, setDraft] = useState(layout)
  const [announcement, setAnnouncement] = useState('')
  const dragging = useRef<WidgetId | null>(null)
  const available = widgetCatalog(model).filter(id => !draft.widgets.some(widget => widget.id === id))

  function moveWidget(id: WidgetId, area: WidgetArea, target?: WidgetId, after = false) {
    setDraft(current => {
      const widget = current.widgets.find(item => item.id === id)
      if (!widget || id === target) return current
      const widgets = current.widgets.filter(item => item.id !== id)
      const targetIndex = target ? widgets.findIndex(item => item.id === target && item.area === area) : -1
      const insertionIndex = targetIndex < 0 ? widgets.length : targetIndex + Number(after)
      widgets.splice(insertionIndex, 0, { ...widget, area })
      return { ...current, widgets }
    })
    setAnnouncement(`${WIDGET_LABELS[id]} movido para a área ${AREA_LABELS[area]}.`)
  }

  function dropWidget(area: WidgetArea, target?: WidgetId, after = false) {
    if (dragging.current) moveWidget(dragging.current, area, target, after)
    dragging.current = null
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Personalizar painel"
      description={DASHBOARD_MODELS[model]}
      size="full"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => onSave(draft)}>Salvar alterações</Button>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <h3 className="font-semibold">Prévia da composição</h3>
          {model === 'trends' && (
            <div className="max-w-xs space-y-1">
              <label htmlFor="dashboard-trend-metric" className="text-sm font-medium">Métrica do gráfico principal</label>
              <Select
                id="dashboard-trend-metric"
                value={draft.trendMetric}
                onChange={event => setDraft(current => ({ ...current, trendMetric: event.target.value as TrendMetric }))}
              >
                {Object.entries(TREND_METRICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </Select>
            </div>
          )}
          <div className="space-y-3">
            {dashboardAreas(model).map(area => {
              const widgets = draft.widgets.filter(widget => widget.area === area)
              return (
                <section
                  key={area}
                  aria-label={AREA_LABELS[area]}
                  className="rounded-radius-xl border border-dashed border-slate-300 dark:border-slate-700 p-2.5 sm:p-3"
                  onDragOver={event => { if (dragging.current) event.preventDefault() }}
                  onDrop={event => { event.preventDefault(); dropWidget(area) }}
                >
                  {model !== 'modular' && <h4 className="mb-2 text-sm font-semibold">{AREA_LABELS[area]}</h4>}
                  <div className={model === 'modular' ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2'}>
                    {widgets.map((widget, index) => {
                      const label = WIDGET_LABELS[widget.id]
                      return (
                        <div
                          key={widget.id}
                          className={`min-w-0 rounded-radius-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-2.5 ${widget.width === 'full' ? 'sm:col-span-2' : ''}`}
                          onDrop={event => {
                            event.preventDefault()
                            event.stopPropagation()
                            const rect = event.currentTarget.getBoundingClientRect()
                            dropWidget(area, widget.id, event.clientY > rect.top + rect.height / 2)
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <span
                                className="hidden cursor-grab sm:inline-flex"
                                data-testid={`dashboard-drag-handle-${widget.id}`}
                                draggable
                                onDragStart={event => {
                                  dragging.current = widget.id
                                  event.dataTransfer.setData('text/plain', widget.id)
                                  event.dataTransfer.effectAllowed = 'move'
                                }}
                                onDragEnd={() => { dragging.current = null }}
                                aria-hidden="true"
                              >
                                <GripVertical size={16} />
                              </span>
                              <span className="text-sm font-semibold">{label}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <IconButton icon={ArrowUp} aria-label={`Mover ${label} para cima`} variant="ghost" className="min-h-11 min-w-11" disabled={index === 0} onClick={() => moveWidget(widget.id, area, widgets[index - 1]?.id)} />
                              <IconButton icon={ArrowDown} aria-label={`Mover ${label} para baixo`} variant="ghost" className="min-h-11 min-w-11" disabled={index === widgets.length - 1} onClick={() => moveWidget(widget.id, area, widgets[index + 1]?.id, true)} />
                              <IconButton icon={X} aria-label={`Remover ${label}`} variant="ghost" className="min-h-11 min-w-11" onClick={() => {
                                setDraft(current => ({ ...current, widgets: current.widgets.filter(item => item.id !== widget.id) }))
                                setAnnouncement(`${label} removido do rascunho.`)
                              }} />
                            </div>
                          </div>
                          {model === 'modular' ? (
                            <Select aria-label={`Largura de ${label}`} value={widget.width} onChange={event => {
                              const width = event.target.value === 'full' ? 'full' : 'normal'
                              setDraft(current => ({ ...current, widgets: current.widgets.map(item => item.id === widget.id ? { ...item, width } : item) }))
                            }}>
                              <option value="normal">Largura normal</option>
                              <option value="full">Largura inteira</option>
                            </Select>
                          ) : (
                            <Select aria-label={`Área de ${label}`} value={area} onChange={event => moveWidget(widget.id, event.target.value as WidgetArea)}>
                              {dashboardAreas(model).map(target => <option key={target} value={target}>{AREA_LABELS[target]}</option>)}
                            </Select>
                          )}
                        </div>
                      )
                    })}
                    {widgets.length === 0 && <p className="p-2 text-sm text-slate-600 dark:text-slate-400">Nenhum widget nesta área.</p>}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
        <aside className="min-w-0 space-y-3 lg:border-l lg:border-slate-200 lg:pl-5 dark:lg:border-slate-700" aria-label="Widgets disponíveis">
          <h3 className="font-semibold">Widgets disponíveis</h3>
          {available.map(id => (
            <Button
              key={id}
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              leftIcon={Plus}
              aria-label={`Adicionar ${WIDGET_LABELS[id]}`}
              onClick={() => {
                setDraft(current => ({ ...current, widgets: [...current.widgets, { id, area: 'main', width: 'normal' }] }))
                setAnnouncement(`${WIDGET_LABELS[id]} adicionado ao rascunho.`)
              }}
            >{WIDGET_LABELS[id]}</Button>
          ))}
          {available.length === 0 && <p className="text-sm text-slate-600 dark:text-slate-400">Todos os widgets estão no painel.</p>}
          <Button variant="ghost" onClick={() => {
            setDraft(defaultDashboardLayout(model))
            setAnnouncement('Composição original carregada no rascunho.')
          }}>Restaurar modelo</Button>
        </aside>
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </Modal>
  )
}
